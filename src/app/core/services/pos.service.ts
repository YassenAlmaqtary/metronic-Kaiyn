import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, catchError, forkJoin, map, of, switchMap, throwError } from 'rxjs';

import { buildApiUrl, toApiPath } from '../api/api-url';
import { ApiResponse } from '../api/models/api-response.model';
import {
  CloseShiftRequest,
  CreatePosCashierRequest,
  CreatePosDeviceRequest,
  OpenShiftRequest,
  PosCashier,
  PosDevice,
  PosOrderHeader,
  PosOrderListItem,
  PosProductTile,
  PosReturnResponse,
  PosShift,
  ProductBatch,
  ProductTaxInfo,
  SavePosOrderRequest,
  SavePosReturnRequest,
  UpdatePosCashierRequest,
  UpdatePosDeviceRequest,
  UpsertPosSettingsRequest,
} from '../api/models/pos.models';
import { unwrapApiResponse } from '../api/utils/api-response.util';

const DEVICE_KEY = 'kayian.pos.deviceName';

function pickNum(raw: Record<string, unknown>, ...keys: string[]): number | null {
  for (const key of keys) {
    const value = raw[key];
    if (typeof value === 'number' && Number.isFinite(value)) {
      return value;
    }
    if (typeof value === 'string' && value.trim() && !Number.isNaN(Number(value))) {
      return Number(value);
    }
  }
  return null;
}

function pickStr(raw: Record<string, unknown>, ...keys: string[]): string | null {
  for (const key of keys) {
    const value = raw[key];
    if (typeof value === 'string' && value.trim()) {
      return value;
    }
  }
  return null;
}

function pickBool(raw: Record<string, unknown>, ...keys: string[]): boolean | null {
  for (const key of keys) {
    const value = raw[key];
    if (typeof value === 'boolean') {
      return value;
    }
  }
  return null;
}

function normalizeCashier(data: unknown): PosCashier | null {
  if (!data || typeof data !== 'object') {
    return null;
  }
  const raw = data as Record<string, unknown>;
  const cashierId = pickNum(raw, 'cashierId', 'CashierId');
  const userId = pickNum(raw, 'userId', 'UserId') ?? 0;
  if (cashierId == null) {
    return null;
  }
  return {
    cashierId,
    userId,
    userName: pickStr(raw, 'userName', 'UserName', 'fullName', 'FullName'),
    branchId: pickNum(raw, 'branchId', 'BranchId'),
    isActive: pickBool(raw, 'isActive', 'IsActive'),
  };
}

function normalizeDevice(data: unknown): PosDevice | null {
  if (!data || typeof data !== 'object') {
    return null;
  }
  const raw = data as Record<string, unknown>;
  const deviceId = pickNum(raw, 'deviceId', 'DeviceId');
  const branchId = pickNum(raw, 'branchId', 'BranchId');
  const storeId = pickNum(raw, 'storeId', 'StoreId');
  if (deviceId == null || branchId == null || storeId == null) {
    return null;
  }
  return {
    deviceId,
    deviceName: pickStr(raw, 'deviceName', 'DeviceName'),
    branchId,
    storeId,
    isActive: pickBool(raw, 'isActive', 'IsActive') ?? true,
  };
}

function normalizeShift(data: unknown): PosShift | null {
  if (!data || typeof data !== 'object') {
    return null;
  }
  const raw = data as Record<string, unknown>;
  const shiftId = pickNum(raw, 'shiftId', 'ShiftId');
  const cashierId = pickNum(raw, 'cashierId', 'CashierId') ?? 0;
  const deviceId = pickNum(raw, 'deviceId', 'DeviceId') ?? 0;
  if (shiftId == null) {
    return null;
  }
  return {
    shiftId,
    cashierId,
    deviceId,
    branchId: pickNum(raw, 'branchId', 'BranchId'),
    status: pickStr(raw, 'status', 'Status'),
    // API/DB aliases: OpenDateTime / CloseDateTime / OpeningAmount / ClosingAmount
    openedAt: pickStr(raw, 'openedAt', 'OpenedAt', 'openDateTime', 'OpenDateTime'),
    closedAt: pickStr(raw, 'closedAt', 'ClosedAt', 'closeDateTime', 'CloseDateTime'),
    openingBalance: pickNum(
      raw,
      'openingBalance',
      'OpeningBalance',
      'openingAmount',
      'OpeningAmount',
    ),
    closingBalance: pickNum(
      raw,
      'closingBalance',
      'ClosingBalance',
      'closingAmount',
      'ClosingAmount',
    ),
  };
}

/** Backend stores open status as Arabic `فتح`. */
export function isPosShiftOpen(shift: PosShift | null | undefined): shift is PosShift {
  if (!shift?.shiftId) {
    return false;
  }
  const status = String(shift.status || '').trim().toLowerCase();
  if (!status) {
    return true;
  }
  if (
    status === 'closed' ||
    status === 'close' ||
    status === 'مغلق' ||
    status === 'اغلاق' ||
    status === 'إغلاق'
  ) {
    return false;
  }
  // `فتح` / open / opened / active
  return true;
}

function deviceError(err: unknown, fallback: string): Error {
  if (err instanceof HttpErrorResponse) {
    const status = err.status ? `HTTP ${err.status}` : 'HTTP';
    const body = err.error as
      | {
          message?: string;
          title?: string;
          detail?: string;
          errors?: string[] | Record<string, unknown>;
        }
      | string
      | null;
    let detail = '';
    if (typeof body === 'string' && body.trim() && !body.includes('<')) {
      detail = body.trim();
    } else if (body && typeof body === 'object') {
      detail =
        body.message ||
        body.detail ||
        body.title ||
        (Array.isArray(body.errors) ? body.errors.join(', ') : '') ||
        '';
    }
    // Middleware may wrap: "An error occurred: <arabic business message>"
    const occurredPrefix = /an error occurred:\s*/i;
    if (occurredPrefix.test(detail)) {
      detail = detail.replace(occurredPrefix, '').trim();
    }
    detail = detail.replace(/^\.+/, '').trim();
    const generic =
      !detail ||
      detail.toLowerCase() === 'an error occurred while processing your request' ||
      detail.toLowerCase() === 'an error occurred while processing your request.';
    return new Error(generic ? `${fallback} (${status})` : detail);
  }
  if (err instanceof Error && err.message) {
    return err;
  }
  return new Error(fallback);
}

@Injectable({ providedIn: 'root' })
export class PosService {
  private http = inject(HttpClient);

  /** Stable browser device name for detect/register. */
  getOrCreateDeviceName(): string {
    try {
      const existing = localStorage.getItem(DEVICE_KEY)?.trim();
      if (existing) {
        const cleaned = existing.replace(/[^a-zA-Z0-9_-]/g, '').replace(/^-+/, '');
        if (cleaned) {
          if (cleaned !== existing) {
            localStorage.setItem(DEVICE_KEY, cleaned);
          }
          return cleaned.slice(0, 100);
        }
      }
      const generated = `WEB-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
      localStorage.setItem(DEVICE_KEY, generated);
      return generated;
    } catch {
      return `WEB-${Date.now().toString(36).toUpperCase()}`;
    }
  }

  getCurrentCashier(): Observable<PosCashier> {
    return this.http
      .get<ApiResponse<unknown>>(buildApiUrl('/api/PosCashiers/current'))
      .pipe(
        map((r) => {
          const cashier = normalizeCashier(r.data);
          if (!r.success || !cashier) {
            throw new Error(r.message || r.errors?.join(', ') || 'Cashier not found');
          }
          return cashier;
        }),
      );
  }

  detectDevice(machineName?: string): Observable<PosDevice | null> {
    let params = new HttpParams();
    if (machineName) {
      params = params.set('machineName', machineName);
    }
    return this.http
      .get<ApiResponse<unknown>>(buildApiUrl('/api/PosDevices/detect'), { params })
      .pipe(
        map((r) => (r.success ? normalizeDevice(r.data) : null)),
        catchError((err: HttpErrorResponse) => {
          // Treat all detect failures as "not found" — callers may create next.
          if (err.status >= 500) {
            return of(null);
          }
          return of(null);
        }),
      );
  }

  createDevice(request: CreatePosDeviceRequest): Observable<PosDevice> {
    return this.http
      .post<ApiResponse<unknown>>(buildApiUrl('/api/PosDevices'), request)
      .pipe(
        map((r) => {
          const device = normalizeDevice(r.data);
          if (!r.success || !device) {
            throw new Error(r.message || r.errors?.join(', ') || 'Device registration failed');
          }
          return device;
        }),
        catchError((err) => throwError(() => deviceError(err, 'Failed to register POS device'))),
      );
  }

  getDevices(): Observable<PosDevice[]> {
    return this.http
      .get<ApiResponse<unknown>>(buildApiUrl('/api/PosDevices'))
      .pipe(
        map((r) => {
          const data = unwrapApiResponse(r);
          const list = Array.isArray(data) ? data : [];
          return list.map(normalizeDevice).filter((d): d is PosDevice => !!d);
        }),
        catchError(() => of([] as PosDevice[])),
      );
  }

  updateDevice(id: number, request: UpdatePosDeviceRequest): Observable<PosDevice> {
    return this.http
      .put<ApiResponse<unknown>>(buildApiUrl(toApiPath('/api/PosDevices/{id}', { id })), request)
      .pipe(
        map((r) => {
          const device = normalizeDevice(unwrapApiResponse(r));
          if (!device) {
            throw new Error('Failed to update device');
          }
          return device;
        }),
      );
  }

  getCashiers(): Observable<PosCashier[]> {
    return this.http
      .get<ApiResponse<unknown>>(buildApiUrl('/api/PosCashiers'))
      .pipe(
        map((r) => {
          const data = unwrapApiResponse(r);
          const list = Array.isArray(data) ? data : [];
          return list.map(normalizeCashier).filter((c): c is PosCashier => !!c);
        }),
        catchError(() => of([] as PosCashier[])),
      );
  }

  createCashier(request: CreatePosCashierRequest): Observable<PosCashier> {
    return this.http
      .post<ApiResponse<unknown>>(buildApiUrl('/api/PosCashiers'), request)
      .pipe(
        map((r) => {
          const cashier = normalizeCashier(unwrapApiResponse(r));
          if (!cashier) {
            throw new Error('Failed to create cashier');
          }
          return cashier;
        }),
      );
  }

  updateCashier(id: number, request: UpdatePosCashierRequest): Observable<PosCashier> {
    return this.http
      .put<ApiResponse<unknown>>(buildApiUrl(toApiPath('/api/PosCashiers/{id}', { id })), request)
      .pipe(
        map((r) => {
          const cashier = normalizeCashier(unwrapApiResponse(r));
          if (!cashier) {
            throw new Error('Failed to update cashier');
          }
          return cashier;
        }),
      );
  }

  getShifts(opts?: {
    status?: string;
    branchId?: number;
    cashierId?: number;
    from?: string;
    to?: string;
  }): Observable<PosShift[]> {
    let params = new HttpParams();
    if (opts?.status) {
      params = params.set('status', opts.status);
    }
    if (opts?.branchId != null) {
      params = params.set('branchId', String(opts.branchId));
    }
    if (opts?.cashierId != null) {
      params = params.set('cashierId', String(opts.cashierId));
    }
    if (opts?.from) {
      params = params.set('from', opts.from);
    }
    if (opts?.to) {
      params = params.set('to', opts.to);
    }
    return this.http
      .get<ApiResponse<unknown>>(buildApiUrl('/api/PosShifts'), { params })
      .pipe(
        map((r) => {
          const data = unwrapApiResponse(r);
          const list = Array.isArray(data) ? data : [];
          return list.map(normalizeShift).filter((s): s is PosShift => !!s);
        }),
        catchError(() => of([] as PosShift[])),
      );
  }

  saveSettings(request: UpsertPosSettingsRequest): Observable<void> {
    return this.http
      .put<ApiResponse<unknown>>(buildApiUrl('/api/PosPermissions/settings'), request)
      .pipe(
        map((r) => {
          if (!r.success) {
            throw new Error(r.message || r.errors?.join(', ') || 'Failed to save settings');
          }
          return undefined;
        }),
      );
  }

  /**
   * Detect existing device or register a new one for branch/store.
   * Does not retry on HTTP 5xx (backend failure).
   */
  ensureDevice(branchId: number, storeId: number): Observable<PosDevice> {
    const base = this.sanitizeDeviceName(this.getOrCreateDeviceName());
    const scoped = this.sanitizeDeviceName(`${base}-B${branchId}-S${storeId}`);

    return this.detectDevice(scoped).pipe(
      switchMap((scopedHit) => {
        if (
          scopedHit?.deviceId &&
          scopedHit.isActive !== false &&
          scopedHit.branchId === branchId &&
          scopedHit.storeId === storeId
        ) {
          return of(scopedHit);
        }
        return this.detectDevice(base).pipe(
          switchMap((baseHit) => {
            if (
              baseHit?.deviceId &&
              baseHit.isActive !== false &&
              baseHit.branchId === branchId &&
              baseHit.storeId === storeId
            ) {
              return of(baseHit);
            }
            return this.createDevice({
              deviceName: scoped,
              branchId,
              storeId,
            }).pipe(
              catchError((err) => {
                // Only re-detect on likely duplicate/conflict, not on 5xx.
                if (err instanceof HttpErrorResponse && err.status >= 500) {
                  return throwError(() => err);
                }
                if (err instanceof Error && /\(HTTP 5\d\d\)/.test(err.message)) {
                  return throwError(() => err);
                }
                return this.detectDevice(scoped).pipe(
                  switchMap((again) =>
                    again?.deviceId
                      ? of(again)
                      : throwError(() => deviceError(err, 'Failed to register POS device')),
                  ),
                );
              }),
            );
          }),
        );
      }),
    );
  }

  private sanitizeDeviceName(name: string): string {
    const cleaned = (name || '')
      .trim()
      .replace(/[^a-zA-Z0-9_-]/g, '')
      .replace(/^-+/, '')
      .slice(0, 100);
    return cleaned || `WEB-${Date.now().toString(36).toUpperCase()}`;
  }

  getActiveShift(cashierId?: number, deviceId?: number): Observable<PosShift | null> {
    let params = new HttpParams();
    if (cashierId != null) {
      params = params.set('cashierId', String(cashierId));
    }
    if (deviceId != null) {
      params = params.set('deviceId', String(deviceId));
    }
    return this.http
      .get<ApiResponse<unknown>>(buildApiUrl('/api/PosShifts/active'), { params })
      .pipe(
        map((r) => (r.success ? normalizeShift(r.data) : null)),
        catchError(() => of(null)),
      );
  }

  /**
   * Backend active lookup requires BOTH cashierId + deviceId.
   * Probe preferred device, then known browser device names.
   */
  findActiveShift(
    cashierId: number,
    preferredDeviceId?: number | null,
    opts?: { branchId?: number | null; storeId?: number | null },
  ): Observable<{ shift: PosShift; deviceId: number } | null> {
    const base = this.sanitizeDeviceName(this.getOrCreateDeviceName());
    const names = new Set<string>([base]);
    if (opts?.branchId != null && opts?.storeId != null) {
      names.add(this.sanitizeDeviceName(`${base}-B${opts.branchId}-S${opts.storeId}`));
      names.add(this.sanitizeDeviceName(`${base}-S${opts.storeId}`));
    }
    // Previously used devices on this browser.
    for (const id of this.getKnownDeviceIds()) {
      // kept for direct id probes below
      void id;
    }

    const deviceIds: number[] = [];
    const pushId = (id?: number | null) => {
      if (id != null && id > 0 && !deviceIds.includes(id)) {
        deviceIds.push(id);
      }
    };
    pushId(preferredDeviceId);
    for (const id of this.getKnownDeviceIds()) {
      pushId(id);
    }
    // Fallback: broader id scan — backend cannot list shifts by cashier alone.
    for (let id = 1; id <= 30; id++) {
      pushId(id);
    }

    const resolveNames$ =
      names.size === 0
        ? of(deviceIds)
        : forkJoin([...names].map((n) => this.detectDevice(n))).pipe(
            map((found) => {
              for (const d of found) {
                pushId(d?.deviceId);
              }
              return deviceIds;
            }),
          );

    return resolveNames$.pipe(
      switchMap((ids) => {
        if (!ids.length) {
          return of(null);
        }
        // Sequentially probe until an open shift is found.
        const tryAt = (index: number): Observable<{ shift: PosShift; deviceId: number } | null> => {
          if (index >= ids.length) {
            return of(null);
          }
          const deviceId = ids[index];
          return this.getActiveShift(cashierId, deviceId).pipe(
            switchMap((shift) => {
              if (isPosShiftOpen(shift)) {
                this.rememberDeviceId(deviceId);
                return of({ shift, deviceId });
              }
              return tryAt(index + 1);
            }),
          );
        };
        return tryAt(0);
      }),
    );
  }

  rememberDeviceId(deviceId: number): void {
    try {
      const key = 'kayian.pos.knownDeviceIds';
      const raw = localStorage.getItem(key);
      const list: number[] = raw ? (JSON.parse(raw) as number[]) : [];
      const next = [deviceId, ...list.filter((x) => x !== deviceId)].slice(0, 12);
      localStorage.setItem(key, JSON.stringify(next));
    } catch {
      // ignore
    }
  }

  private getKnownDeviceIds(): number[] {
    try {
      const raw = localStorage.getItem('kayian.pos.knownDeviceIds');
      if (!raw) {
        return [];
      }
      const list = JSON.parse(raw) as unknown;
      if (!Array.isArray(list)) {
        return [];
      }
      return list.map(Number).filter((n) => Number.isFinite(n) && n > 0);
    } catch {
      return [];
    }
  }

  openShift(request: OpenShiftRequest): Observable<PosShift> {
    // Send only defined fields; include branchId when provided (DB column is required).
    const body: Record<string, unknown> = {
      cashierId: request.cashierId,
      deviceId: request.deviceId,
      openingBalance: request.openingBalance ?? 0,
    };
    if (request.branchId != null) {
      body['branchId'] = request.branchId;
      body['BranchId'] = request.branchId;
    }
    return this.http
      .post<ApiResponse<unknown> | unknown>(buildApiUrl('/api/PosShifts/open'), body)
      .pipe(
        map((r) => {
          const envelope = r as ApiResponse<unknown>;
          const raw =
            envelope && typeof envelope === 'object' && 'data' in envelope
              ? envelope.data
              : r;
          const shift = normalizeShift(raw);
          if ((envelope?.success === false) || !shift) {
            throw new Error(
              envelope?.message ||
                envelope?.errors?.join(', ') ||
                'Failed to open shift',
            );
          }
          return shift;
        }),
        catchError((err) => throwError(() => deviceError(err, 'Failed to open shift'))),
      );
  }

  closeShift(id: number, request: CloseShiftRequest): Observable<PosShift> {
    return this.http
      .post<ApiResponse<unknown>>(
        buildApiUrl(toApiPath('/api/PosShifts/{id}/close', { id })),
        request,
      )
      .pipe(
        map((r) => {
          const shift = normalizeShift(r.data);
          if (!r.success || !shift) {
            throw new Error(r.message || r.errors?.join(', ') || 'Failed to close shift');
          }
          return shift;
        }),
      );
  }

  getUserPermissions(): Observable<Record<string, boolean>> {
    return this.http
      .get<ApiResponse<Record<string, boolean>>>(buildApiUrl('/api/PosPermissions/user'))
      .pipe(
        map((r) => unwrapApiResponse(r)),
        catchError(() => of({} as Record<string, boolean>)),
      );
  }

  getSettings(branchId?: number, deviceId?: number): Observable<Record<string, string>> {
    let params = new HttpParams();
    if (branchId != null) {
      params = params.set('branchId', String(branchId));
    }
    if (deviceId != null) {
      params = params.set('deviceId', String(deviceId));
    }
    return this.http
      .get<ApiResponse<Record<string, string>>>(buildApiUrl('/api/PosPermissions/settings'), {
        params,
      })
      .pipe(
        map((r) => unwrapApiResponse(r)),
        catchError(() => of({} as Record<string, string>)),
      );
  }

  getProducts(opts: {
    storeId?: number;
    branchId?: number;
    groupId?: number;
  }): Observable<PosProductTile[]> {
    let params = new HttpParams();
    if (opts.storeId != null) {
      params = params.set('storeId', String(opts.storeId));
    }
    if (opts.branchId != null) {
      params = params.set('branchId', String(opts.branchId));
    }
    if (opts.groupId != null) {
      params = params.set('groupId', String(opts.groupId));
    }
    return this.http
      .get<ApiResponse<PosProductTile[]>>(buildApiUrl('/api/PosProducts'), { params })
      .pipe(map((r) => unwrapApiResponse(r) ?? []));
  }

  lookupBarcode(
    barcode: string,
    opts?: { storeId?: number; branchId?: number },
  ): Observable<PosProductTile | null> {
    let params = new HttpParams();
    if (opts?.storeId != null) {
      params = params.set('storeId', String(opts.storeId));
    }
    if (opts?.branchId != null) {
      params = params.set('branchId', String(opts.branchId));
    }
    return this.http
      .get<ApiResponse<PosProductTile>>(
        buildApiUrl(toApiPath('/api/PosProducts/barcode/{barcode}', { barcode })),
        { params },
      )
      .pipe(
        map((r) => (r.success && r.data ? r.data : null)),
        catchError(() => of(null)),
      );
  }

  getPrice(productId: number, unitId?: number, branchId?: number): Observable<number> {
    let params = new HttpParams();
    if (unitId != null) {
      params = params.set('unitId', String(unitId));
    }
    if (branchId != null) {
      params = params.set('branchId', String(branchId));
    }
    return this.http
      .get<ApiResponse<number>>(
        buildApiUrl(toApiPath('/api/PosProducts/{id}/price', { id: productId })),
        { params },
      )
      .pipe(map((r) => Number(unwrapApiResponse(r) ?? 0)));
  }

  getStock(
    productId: number,
    opts?: {
      storeId?: number;
      unitId?: number;
      batchNumber?: string;
      expiryDate?: string;
    },
  ): Observable<number> {
    let params = new HttpParams();
    if (opts?.storeId != null) {
      params = params.set('storeId', String(opts.storeId));
    }
    if (opts?.unitId != null) {
      params = params.set('unitId', String(opts.unitId));
    }
    if (opts?.batchNumber) {
      params = params.set('batchNumber', opts.batchNumber);
    }
    if (opts?.expiryDate) {
      params = params.set('expiryDate', opts.expiryDate);
    }
    return this.http
      .get<ApiResponse<number>>(
        buildApiUrl(toApiPath('/api/PosProducts/{id}/stock', { id: productId })),
        { params },
      )
      .pipe(map((r) => Number(unwrapApiResponse(r) ?? 0)));
  }

  getTax(productId: number): Observable<ProductTaxInfo> {
    return this.http
      .get<ApiResponse<ProductTaxInfo>>(
        buildApiUrl(toApiPath('/api/PosProducts/{id}/tax', { id: productId })),
      )
      .pipe(
        map((r) => unwrapApiResponse(r)),
        catchError(() => of({ taxRate: 0, isPriceInclusive: false })),
      );
  }

  getBatches(productId: number, storeId?: number): Observable<ProductBatch[]> {
    let params = new HttpParams();
    if (storeId != null) {
      params = params.set('storeId', String(storeId));
    }
    return this.http
      .get<ApiResponse<ProductBatch[]>>(
        buildApiUrl(toApiPath('/api/PosProducts/{id}/batches', { id: productId })),
        { params },
      )
      .pipe(
        map((r) => unwrapApiResponse(r) ?? []),
        catchError(() => of([] as ProductBatch[])),
      );
  }

  getNextOrderNumber(): Observable<number> {
    return this.http
      .get<ApiResponse<number>>(buildApiUrl('/api/PosOrders/next-number'))
      .pipe(map((r) => unwrapApiResponse(r)));
  }

  saveOrder(request: SavePosOrderRequest): Observable<PosOrderHeader> {
    return this.http
      .post<ApiResponse<PosOrderHeader>>(buildApiUrl('/api/PosOrders'), request)
      .pipe(map((r) => unwrapApiResponse(r)));
  }

  getOrder(id: number): Observable<PosOrderHeader> {
    return this.http
      .get<ApiResponse<PosOrderHeader>>(
        buildApiUrl(toApiPath('/api/PosOrders/{id}', { id })),
      )
      .pipe(map((r) => unwrapApiResponse(r)));
  }

  deleteOrder(id: number): Observable<void> {
    return this.http
      .delete<ApiResponse<unknown>>(buildApiUrl(toApiPath('/api/PosOrders/{id}', { id })))
      .pipe(
        map((r) => {
          if (!r.success) {
            throw new Error(r.message || r.errors?.join(', ') || 'Request failed');
          }
          return undefined;
        }),
      );
  }

  getSuspended(shiftId?: number): Observable<PosOrderHeader[]> {
    let params = new HttpParams();
    if (shiftId != null) {
      params = params.set('shiftId', String(shiftId));
    }
    return this.http
      .get<ApiResponse<PosOrderHeader[]>>(buildApiUrl('/api/PosOrders/suspended'), { params })
      .pipe(
        map((r) => unwrapApiResponse(r) ?? []),
        catchError(() => of([] as PosOrderHeader[])),
      );
  }

  resumeOrder(id: number): Observable<PosOrderHeader> {
    return this.http
      .post<ApiResponse<PosOrderHeader>>(
        buildApiUrl(toApiPath('/api/PosOrders/{id}/resume', { id })),
        null,
      )
      .pipe(map((r) => unwrapApiResponse(r)));
  }

  getPaid(search?: string): Observable<PosOrderListItem[]> {
    let params = new HttpParams();
    if (search) {
      params = params.set('search', search);
    }
    return this.http
      .get<ApiResponse<PosOrderListItem[]>>(buildApiUrl('/api/PosOrders/paid'), { params })
      .pipe(
        map((r) => unwrapApiResponse(r) ?? []),
        catchError(() => of([] as PosOrderListItem[])),
      );
  }

  createReturn(request: SavePosReturnRequest): Observable<PosReturnResponse> {
    return this.http
      .post<ApiResponse<PosReturnResponse>>(buildApiUrl('/api/PosReturns'), request)
      .pipe(map((r) => unwrapApiResponse(r)));
  }

  /** Ensure an open shift exists for cashier+device. */
  ensureOpenShift(
    cashierId: number,
    deviceId: number,
    openingBalance = 0,
  ): Observable<PosShift> {
    return this.getActiveShift(cashierId, deviceId).pipe(
      switchMap((active) => {
        if (active?.shiftId && String(active.status || '').toLowerCase() !== 'closed') {
          return of(active);
        }
        return this.openShift({ cashierId, deviceId, openingBalance });
      }),
      switchMap((shift) => {
        if (!shift?.shiftId) {
          return throwError(() => new Error('Failed to open POS shift'));
        }
        return of(shift);
      }),
    );
  }
}
