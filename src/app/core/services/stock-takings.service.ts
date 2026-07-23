import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';

import { buildApiUrl, toApiPath } from '../api/api-url';
import { ApiResponse } from '../api/models/api-response.model';
import { NextVoucherNumber } from '../api/models/stock-shared.models';
import {
  SaveStockTakingRequest,
  StockTakingHeader,
  StockTakingListItem,
  StoreItemForTaking,
  TakingAvailableForAdjustment,
} from '../api/models/stock-taking.models';
import { unwrapApiResponse } from '../api/utils/api-response.util';

@Injectable({ providedIn: 'root' })
export class StockTakingsService {
  private http = inject(HttpClient);
  private readonly basePath = '/api/StockTaking';

  getAll(): Observable<StockTakingListItem[]> {
    return this.http
      .get<ApiResponse<StockTakingListItem[]>>(buildApiUrl(this.basePath))
      .pipe(map((r) => unwrapApiResponse(r)));
  }

  getDrafts(): Observable<StockTakingListItem[]> {
    return this.http
      .get<ApiResponse<StockTakingListItem[]>>(buildApiUrl(`${this.basePath}/drafts`))
      .pipe(map((r) => unwrapApiResponse(r)));
  }

  getById(id: number): Observable<StockTakingHeader> {
    return this.http
      .get<ApiResponse<StockTakingHeader>>(buildApiUrl(toApiPath(`${this.basePath}/{id}`, { id })))
      .pipe(map((r) => unwrapApiResponse(r)));
  }

  getNextNumber(): Observable<NextVoucherNumber> {
    return this.http
      .get<ApiResponse<NextVoucherNumber>>(buildApiUrl(`${this.basePath}/next-number`))
      .pipe(map((r) => unwrapApiResponse(r)));
  }

  getStoreItems(storeId: number): Observable<StoreItemForTaking[]> {
    return this.http
      .get<ApiResponse<StoreItemForTaking[] | { $values?: StoreItemForTaking[] }>>(
        buildApiUrl(toApiPath(`${this.basePath}/store-items/{storeId}`, { storeId })),
      )
      .pipe(
        map((r) => {
          const data = unwrapApiResponse(r);
          if (Array.isArray(data)) {
            return data;
          }
          if (data && typeof data === 'object' && Array.isArray(data.$values)) {
            return data.$values;
          }
          return [];
        }),
      );
  }

  getAvailableForAdjustment(): Observable<TakingAvailableForAdjustment[]> {
    return this.http
      .get<ApiResponse<TakingAvailableForAdjustment[]>>(
        buildApiUrl(`${this.basePath}/available-for-adjustment`),
      )
      .pipe(map((r) => unwrapApiResponse(r)));
  }

  save(request: SaveStockTakingRequest): Observable<StockTakingHeader> {
    return this.http
      .post<ApiResponse<StockTakingHeader>>(buildApiUrl(this.basePath), request)
      .pipe(map((r) => unwrapApiResponse(r)));
  }

  post(id: number): Observable<unknown> {
    return this.http
      .post<ApiResponse<unknown>>(buildApiUrl(toApiPath(`${this.basePath}/{id}/post`, { id })), {})
      .pipe(map((r) => unwrapApiResponse(r)));
  }

  cancel(id: number): Observable<unknown> {
    return this.http
      .post<ApiResponse<unknown>>(
        buildApiUrl(toApiPath(`${this.basePath}/{id}/cancel`, { id })),
        {},
      )
      .pipe(map((r) => unwrapApiResponse(r)));
  }
}
