import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';

import { buildApiUrl, toApiPath } from '../api/api-url';
import { ApiResponse } from '../api/models/api-response.model';
import {
  CreateSalesmanRequest,
  Salesman,
  UpdateSalesmanRequest,
} from '../api/models/salesman.models';
import { unwrapApiResponse } from '../api/utils/api-response.util';

@Injectable({ providedIn: 'root' })
export class SalesmenService {
  private http = inject(HttpClient);
  private readonly basePath = '/api/Salesmen';

  getAll(): Observable<Salesman[]> {
    return this.http
      .get<ApiResponse<Salesman[]>>(buildApiUrl(this.basePath))
      .pipe(map((response) => unwrapApiResponse(response)));
  }

  getById(id: number): Observable<Salesman> {
    return this.http
      .get<ApiResponse<Salesman>>(buildApiUrl(toApiPath(`${this.basePath}/{id}`, { id })))
      .pipe(map((response) => unwrapApiResponse(response)));
  }

  create(request: CreateSalesmanRequest): Observable<Salesman> {
    return this.http
      .post<ApiResponse<Salesman>>(buildApiUrl(this.basePath), request)
      .pipe(map((response) => unwrapApiResponse(response)));
  }

  update(id: number, request: UpdateSalesmanRequest): Observable<Salesman> {
    return this.http
      .put<ApiResponse<Salesman>>(buildApiUrl(toApiPath(`${this.basePath}/{id}`, { id })), request)
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
