import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';

import { buildApiUrl, toApiPath } from '../api/api-url';
import { ApiResponse } from '../api/models/api-response.model';
import { NextVoucherNumber } from '../api/models/stock-shared.models';
import {
  PostAdjustmentResult,
  SaveStockAdjustmentRequest,
  StockAdjustmentDetail,
  StockAdjustmentHeader,
  StockAdjustmentListItem,
} from '../api/models/stock-adjustment.models';
import { unwrapApiResponse } from '../api/utils/api-response.util';

@Injectable({ providedIn: 'root' })
export class StockAdjustmentsService {
  private http = inject(HttpClient);
  private readonly basePath = '/api/StockAdjustment';

  getAll(): Observable<StockAdjustmentListItem[]> {
    return this.http
      .get<ApiResponse<StockAdjustmentListItem[]>>(buildApiUrl(this.basePath))
      .pipe(map((r) => unwrapApiResponse(r)));
  }

  getDrafts(): Observable<StockAdjustmentListItem[]> {
    return this.http
      .get<ApiResponse<StockAdjustmentListItem[]>>(buildApiUrl(`${this.basePath}/drafts`))
      .pipe(map((r) => unwrapApiResponse(r)));
  }

  getById(id: number): Observable<StockAdjustmentHeader> {
    return this.http
      .get<ApiResponse<StockAdjustmentHeader>>(
        buildApiUrl(toApiPath(`${this.basePath}/{id}`, { id })),
      )
      .pipe(map((r) => unwrapApiResponse(r)));
  }

  getNextNumber(): Observable<NextVoucherNumber> {
    return this.http
      .get<ApiResponse<NextVoucherNumber>>(buildApiUrl(`${this.basePath}/next-number`))
      .pipe(map((r) => unwrapApiResponse(r)));
  }

  getItemsFromTaking(takingId: number): Observable<StockAdjustmentDetail[]> {
    return this.http
      .get<ApiResponse<StockAdjustmentDetail[]>>(
        buildApiUrl(toApiPath(`${this.basePath}/items-from-taking/{takingId}`, { takingId })),
      )
      .pipe(map((r) => unwrapApiResponse(r)));
  }

  save(request: SaveStockAdjustmentRequest): Observable<StockAdjustmentHeader> {
    return this.http
      .post<ApiResponse<StockAdjustmentHeader>>(buildApiUrl(this.basePath), request)
      .pipe(map((r) => unwrapApiResponse(r)));
  }

  post(id: number): Observable<PostAdjustmentResult> {
    return this.http
      .post<ApiResponse<PostAdjustmentResult>>(
        buildApiUrl(toApiPath(`${this.basePath}/{id}/post`, { id })),
        {},
      )
      .pipe(map((r) => unwrapApiResponse(r)));
  }
}
