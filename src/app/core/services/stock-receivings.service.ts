import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map, of, switchMap, throwError, timer } from 'rxjs';

import { buildApiUrl, toApiPath } from '../api/api-url';
import { ApiResponse } from '../api/models/api-response.model';
import {
  AvailableQtyResult,
  ItemUnitLookup,
  NextVoucherNumber,
  ProductBarcodeResult,
  StockDocStatus,
  isStockDocPosted,
  normalizeStockDocStatusFields,
} from '../api/models/stock-shared.models';
import {
  SaveStockReceivingRequest,
  StockReceivingHeader,
  StockReceivingListItem,
  StockReceivingType,
} from '../api/models/stock-receiving.models';
import { unwrapApiAction, unwrapApiResponse } from '../api/utils/api-response.util';

@Injectable({ providedIn: 'root' })
export class StockReceivingsService {
  private http = inject(HttpClient);
  private readonly basePath = '/api/StockReceiving';
  private readonly typesPath = '/api/StockReceivingTypes';

  getAll(): Observable<StockReceivingListItem[]> {
    return this.http
      .get<ApiResponse<unknown>>(buildApiUrl(this.basePath))
      .pipe(map((r) => this.normalizeList(unwrapApiResponse(r))));
  }

  getPending(): Observable<StockReceivingListItem[]> {
    return this.http
      .get<ApiResponse<unknown>>(buildApiUrl(`${this.basePath}/pending`))
      .pipe(map((r) => this.normalizeList(unwrapApiResponse(r))));
  }

  getById(id: number): Observable<StockReceivingHeader> {
    return this.http
      .get<ApiResponse<unknown>>(buildApiUrl(toApiPath(`${this.basePath}/{id}`, { id })))
      .pipe(map((r) => this.normalizeOne(unwrapApiResponse(r))));
  }

  getNextNumber(branchId?: number): Observable<NextVoucherNumber> {
    let params = new HttpParams();
    if (branchId != null) params = params.set('branchId', String(branchId));
    return this.http
      .get<ApiResponse<NextVoucherNumber>>(buildApiUrl(`${this.basePath}/next-number`), { params })
      .pipe(map((r) => unwrapApiResponse(r)));
  }

  save(request: SaveStockReceivingRequest): Observable<StockReceivingHeader> {
    return this.http
      .post<ApiResponse<unknown>>(buildApiUrl(this.basePath), request)
      .pipe(map((r) => this.normalizeOne(unwrapApiResponse(r))));
  }

  /** Posts then re-reads the document so UI reflects the real server status. */
  post(id: number): Observable<StockReceivingHeader> {
    return this.http
      .post<ApiResponse<unknown>>(buildApiUrl(toApiPath(`${this.basePath}/{id}/post`, { id })), {})
      .pipe(
        map((r) => {
          unwrapApiAction(r);
          return undefined;
        }),
        switchMap(() => this.waitUntilPosted(id)),
      );
  }

  delete(id: number): Observable<void> {
    return this.http
      .delete<ApiResponse<unknown>>(buildApiUrl(toApiPath(`${this.basePath}/{id}`, { id })))
      .pipe(
        map((r) => {
          unwrapApiAction(r);
          return undefined;
        }),
      );
  }

  private waitUntilPosted(id: number, attempt = 0): Observable<StockReceivingHeader> {
    return this.getById(id).pipe(
      switchMap((doc) => {
        if (isStockDocPosted(doc.status, doc.datePosted, { kind: 'receiving' })) {
          return of(doc);
        }
        if (attempt >= 4) {
          return throwError(
            () =>
              new Error(
                'تم استلام رد نجاح من الخادم لكن المستند ما زال معلّقًا — تحقق من الترحيل في الخادم أو أعد المحاولة',
              ),
          );
        }
        return timer(350).pipe(switchMap(() => this.waitUntilPosted(id, attempt + 1)));
      }),
    );
  }

  private normalizeList(data: unknown): StockReceivingListItem[] {
    const rows = Array.isArray(data)
      ? data
      : data && typeof data === 'object' && Array.isArray((data as { $values?: unknown[] }).$values)
        ? ((data as { $values: unknown[] }).$values)
        : [];
    return rows.map((row) => this.normalizeOne(row));
  }

  private normalizeOne(data: unknown): StockReceivingHeader {
    const raw = (data && typeof data === 'object' ? data : {}) as Record<string, unknown>;
    const statusFields = normalizeStockDocStatusFields(raw, 'receiving');
    const receivingId = Number(raw['receivingId'] ?? raw['ReceivingId'] ?? raw['id'] ?? raw['Id'] ?? 0);
    return {
      ...(raw as unknown as StockReceivingHeader),
      receivingId,
      receivingNumber: (raw['receivingNumber'] ?? raw['ReceivingNumber'] ?? null) as string | null,
      receivingDate: (raw['receivingDate'] ?? raw['ReceivingDate'] ?? null) as string | null,
      branchId: Number(raw['branchId'] ?? raw['BranchId'] ?? 0),
      branchName: (raw['branchName'] ?? raw['BranchName'] ?? null) as string | null,
      storeId: Number(raw['storeId'] ?? raw['StoreId'] ?? 0),
      storeName: (raw['storeName'] ?? raw['StoreName'] ?? null) as string | null,
      supplierId: (raw['supplierId'] ?? raw['SupplierId'] ?? null) as number | null,
      totalAmount: Number(raw['totalAmount'] ?? raw['TotalAmount'] ?? 0),
      status: statusFields.isPosted
        ? StockDocStatus.ReceivingPosted
        : statusFields.status,
      datePosted: statusFields.datePosted,
      details: (raw['details'] ?? raw['Details'] ?? null) as StockReceivingHeader['details'],
    };
  }

  lookupBarcode(barcode: string): Observable<ProductBarcodeResult> {
    return this.http
      .get<ApiResponse<ProductBarcodeResult>>(
        buildApiUrl(toApiPath(`${this.basePath}/barcode/{barcode}`, { barcode })),
      )
      .pipe(map((r) => unwrapApiResponse(r)));
  }

  getItemUnits(itemId: number): Observable<ItemUnitLookup[]> {
    return this.http
      .get<ApiResponse<ItemUnitLookup[]>>(
        buildApiUrl(toApiPath(`${this.basePath}/item-units/{itemId}`, { itemId })),
      )
      .pipe(map((r) => unwrapApiResponse(r)));
  }

  getAvailableQty(params: {
    itemId: number;
    storeId: number;
    branchId: number;
    unitId?: number;
  }): Observable<AvailableQtyResult> {
    let httpParams = new HttpParams()
      .set('itemId', String(params.itemId))
      .set('storeId', String(params.storeId))
      .set('branchId', String(params.branchId));
    if (params.unitId != null) httpParams = httpParams.set('unitId', String(params.unitId));

    return this.http
      .get<ApiResponse<AvailableQtyResult>>(buildApiUrl(`${this.basePath}/available-qty`), {
        params: httpParams,
      })
      .pipe(map((r) => unwrapApiResponse(r)));
  }

  getTypes(): Observable<StockReceivingType[]> {
    return this.http
      .get<ApiResponse<StockReceivingType[]>>(buildApiUrl(this.typesPath))
      .pipe(map((r) => unwrapApiResponse(r)));
  }

  getExchangeRate(
    currencyId: number,
  ): Observable<{ currencyId?: number; currencyName?: string | null; exchangeRate: number }> {
    return this.http
      .get<ApiResponse<{ currencyId?: number; currencyName?: string | null; exchangeRate: number }>>(
        buildApiUrl(toApiPath(`${this.basePath}/exchange-rate/{currencyId}`, { currencyId })),
      )
      .pipe(map((r) => unwrapApiResponse(r)));
  }
}
