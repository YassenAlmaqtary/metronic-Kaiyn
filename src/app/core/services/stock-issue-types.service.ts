import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';

import { buildApiUrl, toApiPath } from '../api/api-url';
import { ApiResponse } from '../api/models/api-response.model';
import {
  SaveStockIssueTypeRequest,
  StockIssueType,
} from '../api/models/stock-issue-type.models';
import { unwrapApiResponse } from '../api/utils/api-response.util';

@Injectable({ providedIn: 'root' })
export class StockIssueTypesService {
  private http = inject(HttpClient);
  private readonly basePath = '/api/StockIssueTypes';

  getAll(): Observable<StockIssueType[]> {
    return this.http
      .get<ApiResponse<StockIssueType[]>>(buildApiUrl(this.basePath))
      .pipe(map((response) => unwrapApiResponse(response)));
  }

  getById(id: number): Observable<StockIssueType> {
    return this.http
      .get<ApiResponse<StockIssueType>>(buildApiUrl(toApiPath(`${this.basePath}/{id}`, { id })))
      .pipe(map((response) => unwrapApiResponse(response)));
  }

  create(request: SaveStockIssueTypeRequest): Observable<StockIssueType> {
    return this.http
      .post<ApiResponse<StockIssueType>>(buildApiUrl(this.basePath), request)
      .pipe(map((response) => unwrapApiResponse(response)));
  }

  update(id: number, request: SaveStockIssueTypeRequest): Observable<StockIssueType> {
    return this.http
      .put<ApiResponse<StockIssueType>>(buildApiUrl(toApiPath(`${this.basePath}/{id}`, { id })), request)
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
