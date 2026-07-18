import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';

import { buildApiUrl, toApiPath } from '../api/api-url';
import { ApiResponse } from '../api/models/api-response.model';
import {
  CreateReceiptVoucherRequest,
  ReceiptVoucher,
  UpdateReceiptVoucherRequest,
} from '../api/models/payment-voucher.models';

@Injectable({ providedIn: 'root' })
export class ReceiptVouchersService {
  private http = inject(HttpClient);
  private readonly basePath = '/api/ReceiptVouchers';

  getAll(): Observable<ReceiptVoucher[]> {
    return this.http
      .get<ReceiptVoucher[] | ApiResponse<ReceiptVoucher[]>>(buildApiUrl(this.basePath))
      .pipe(map((response) => this.normalizeList(response)));
  }

  getById(id: number): Observable<ReceiptVoucher> {
    return this.http
      .get<ReceiptVoucher | ApiResponse<ReceiptVoucher>>(
        buildApiUrl(toApiPath(`${this.basePath}/{id}`, { id })),
      )
      .pipe(map((response) => this.normalizeItem(response)));
  }

  getNextNumber(): Observable<string> {
    return this.http
      .get<string | ApiResponse<string>>(buildApiUrl(`${this.basePath}/next-number`))
      .pipe(map((response) => this.normalizeString(response)));
  }

  create(request: CreateReceiptVoucherRequest): Observable<ReceiptVoucher> {
    return this.http
      .post<ReceiptVoucher | ApiResponse<ReceiptVoucher>>(buildApiUrl(this.basePath), request)
      .pipe(map((response) => this.normalizeItem(response)));
  }

  update(id: number, request: UpdateReceiptVoucherRequest): Observable<ReceiptVoucher> {
    return this.http
      .put<ReceiptVoucher | ApiResponse<ReceiptVoucher>>(
        buildApiUrl(toApiPath(`${this.basePath}/{id}`, { id })),
        request,
      )
      .pipe(map((response) => this.normalizeItem(response)));
  }

  delete(id: number): Observable<void> {
    return this.http
      .delete<unknown | ApiResponse<unknown>>(
        buildApiUrl(toApiPath(`${this.basePath}/{id}`, { id })),
      )
      .pipe(map(() => undefined));
  }

  approve(id: number): Observable<void> {
    return this.http
      .post<unknown | ApiResponse<unknown>>(
        buildApiUrl(toApiPath(`${this.basePath}/{id}/approve`, { id })),
        {},
      )
      .pipe(map(() => undefined));
  }

  private normalizeList(
    response: ReceiptVoucher[] | ApiResponse<ReceiptVoucher[]>,
  ): ReceiptVoucher[] {
    if (Array.isArray(response)) {
      return response;
    }

    if (response.success && Array.isArray(response.data)) {
      return response.data;
    }

    throw new Error(response.message || response.errors?.join(', ') || 'Request failed');
  }

  private normalizeItem(response: ReceiptVoucher | ApiResponse<ReceiptVoucher>): ReceiptVoucher {
    if (response && typeof response === 'object' && 'voucherId' in response) {
      return response;
    }

    const wrapped = response as ApiResponse<ReceiptVoucher>;
    if (wrapped.success && wrapped.data) {
      return wrapped.data;
    }

    throw new Error(wrapped.message || wrapped.errors?.join(', ') || 'Request failed');
  }

  private normalizeString(response: string | ApiResponse<string>): string {
    if (typeof response === 'string') {
      return response;
    }

    if (response.success && typeof response.data === 'string') {
      return response.data;
    }

    throw new Error(response.message || response.errors?.join(', ') || 'Request failed');
  }
}
