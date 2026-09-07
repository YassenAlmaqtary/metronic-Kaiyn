import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';

import { buildApiUrl, toApiPath } from '../api/api-url';
import { ApiResponse } from '../api/models/api-response.model';
import {
  SaveStockReceivingTypeRequest,
  StockReceivingType,
} from '../api/models/stock-receiving-type.models';
import { unwrapApiResponse } from '../api/utils/api-response.util';

@Injectable({ providedIn: 'root' })
export class StockReceivingTypesService {
  private http = inject(HttpClient);
  private readonly basePath = '/api/StockReceivingTypes';

  getAll(): Observable<StockReceivingType[]> {
    return this.http
      .get<ApiResponse<StockReceivingType[]>>(buildApiUrl(this.basePath))
      .pipe(map((response) => unwrapApiResponse(response)));
  }

  getById(id: number): Observable<StockReceivingType> {
    return this.http
      .get<ApiResponse<StockReceivingType>>(buildApiUrl(toApiPath(`${this.basePath}/{id}`, { id })))
      .pipe(map((response) => unwrapApiResponse(response)));
  }

  create(request: SaveStockReceivingTypeRequest): Observable<StockReceivingType> {
    return this.http
      .post<ApiResponse<StockReceivingType>>(buildApiUrl(this.basePath), request)
      .pipe(map((response) => unwrapApiResponse(response)));
  }

  update(id: number, request: SaveStockReceivingTypeRequest): Observable<StockReceivingType> {
    return this.http
      .put<ApiResponse<StockReceivingType>>(
        buildApiUrl(toApiPath(`${this.basePath}/{id}`, { id })),
        request,
      )
      .pipe(map((response) => unwrapApiResponse(response)));
  }

  delete(id: number): Observable<void> {
    return this.http
      .delete<ApiResponse<unknown>>(buildApiUrl(toApiPath(`${this.basePath}/{id}`, { id })))
      .pipe(
        map((response) => unwrapApiResponse(response)),
        map(() => undefined),
      );
  }
}
