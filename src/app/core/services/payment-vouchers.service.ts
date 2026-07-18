import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';

import { buildApiUrl, toApiPath } from '../api/api-url';
import { ApiResponse } from '../api/models/api-response.model';
import {
  CreatePaymentVoucherRequest,
  PaymentVoucher,
  UpdatePaymentVoucherRequest,
} from '../api/models/payment-voucher.models';

@Injectable({ providedIn: 'root' })
export class PaymentVouchersService {
  private http = inject(HttpClient);
  private readonly basePath = '/api/PaymentVouchers';

  getAll(): Observable<PaymentVoucher[]> {
    return this.http
      .get<PaymentVoucher[] | ApiResponse<PaymentVoucher[]>>(buildApiUrl(this.basePath))
      .pipe(map((response) => this.normalizeList(response)));
  }

  getById(id: number): Observable<PaymentVoucher> {
    return this.http
      .get<PaymentVoucher | ApiResponse<PaymentVoucher>>(
        buildApiUrl(toApiPath(`${this.basePath}/{id}`, { id })),
      )
      .pipe(map((response) => this.normalizeItem(response)));
  }

  getNextNumber(): Observable<string> {
    return this.http
      .get<string | ApiResponse<string>>(buildApiUrl(`${this.basePath}/next-number`))
      .pipe(map((response) => this.normalizeString(response)));
  }

  create(request: CreatePaymentVoucherRequest): Observable<PaymentVoucher> {
    return this.http
      .post<PaymentVoucher | ApiResponse<PaymentVoucher>>(buildApiUrl(this.basePath), request)
      .pipe(map((response) => this.normalizeItem(response)));
  }

  update(id: number, request: UpdatePaymentVoucherRequest): Observable<PaymentVoucher> {
    return this.http
      .put<PaymentVoucher | ApiResponse<PaymentVoucher>>(
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
    response: PaymentVoucher[] | ApiResponse<PaymentVoucher[]>,
  ): PaymentVoucher[] {
    if (Array.isArray(response)) {
      return response;
    }

    if (response.success && Array.isArray(response.data)) {
      return response.data;
    }

    throw new Error(response.message || response.errors?.join(', ') || 'Request failed');
  }

  private normalizeItem(response: PaymentVoucher | ApiResponse<PaymentVoucher>): PaymentVoucher {
    if (response && typeof response === 'object' && 'voucherId' in response) {
      return response;
    }

    const wrapped = response as ApiResponse<PaymentVoucher>;
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
