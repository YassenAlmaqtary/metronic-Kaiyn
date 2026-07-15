import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';

import { buildApiUrl, toApiPath } from '../api/api-url';
import { ApiResponse } from '../api/models/api-response.model';
import {
  NextSalesInvoiceNumber,
  PostSalesInvoiceRequest,
  SalesInvoiceHeader,
  SalesInvoiceListItem,
  SaveSalesInvoiceRequest,
} from '../api/models/sales-invoice.models';
import { unwrapApiResponse } from '../api/utils/api-response.util';

@Injectable({ providedIn: 'root' })
export class SalesInvoicesService {
  private http = inject(HttpClient);
  private readonly basePath = '/api/SalesInvoice';

  getAll(status?: number, branchId?: number): Observable<SalesInvoiceListItem[]> {
    let params = new HttpParams();
    if (status != null) {
      params = params.set('status', String(status));
    }
    if (branchId != null) {
      params = params.set('branchId', String(branchId));
    }

    return this.http
      .get<ApiResponse<SalesInvoiceListItem[]>>(buildApiUrl(this.basePath), { params })
      .pipe(map((response) => unwrapApiResponse(response)));
  }

  getDrafts(): Observable<SalesInvoiceListItem[]> {
    return this.http
      .get<ApiResponse<SalesInvoiceListItem[]>>(buildApiUrl(`${this.basePath}/drafts`))
      .pipe(map((response) => unwrapApiResponse(response)));
  }

  getNextNumber(branchId?: number): Observable<NextSalesInvoiceNumber> {
    let params = new HttpParams();
    if (branchId != null) {
      params = params.set('branchId', String(branchId));
    }

    return this.http
      .get<ApiResponse<NextSalesInvoiceNumber>>(buildApiUrl(`${this.basePath}/next-number`), {
        params,
      })
      .pipe(map((response) => unwrapApiResponse(response)));
  }

  getById(id: number): Observable<SalesInvoiceHeader> {
    return this.http
      .get<ApiResponse<SalesInvoiceHeader>>(buildApiUrl(toApiPath(`${this.basePath}/{id}`, { id })))
      .pipe(map((response) => unwrapApiResponse(response)));
  }

  /** Create or update draft invoice (API uses a single save endpoint). */
  save(request: SaveSalesInvoiceRequest): Observable<SalesInvoiceHeader> {
    return this.http
      .post<ApiResponse<SalesInvoiceHeader>>(buildApiUrl(this.basePath), request)
      .pipe(map((response) => unwrapApiResponse(response)));
  }

  post(id: number, request: PostSalesInvoiceRequest): Observable<unknown> {
    return this.http
      .post<ApiResponse<unknown>>(
        buildApiUrl(toApiPath(`${this.basePath}/{id}/post`, { id })),
        request,
      )
      .pipe(map((response) => unwrapApiResponse(response)));
  }

  cancel(id: number): Observable<unknown> {
    return this.http
      .post<ApiResponse<unknown>>(
        buildApiUrl(toApiPath(`${this.basePath}/{id}/cancel`, { id })),
        null,
      )
      .pipe(map((response) => unwrapApiResponse(response)));
  }
}
