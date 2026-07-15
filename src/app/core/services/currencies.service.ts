import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';

import { buildApiUrl, toApiPath } from '../api/api-url';
import { ApiResponse } from '../api/models/api-response.model';
import {
  CreateCurrencyRequest,
  Currency,
  UpdateCurrencyRequest,
} from '../api/models/currency.models';
import { unwrapApiResponse } from '../api/utils/api-response.util';

@Injectable({ providedIn: 'root' })
export class CurrenciesService {
  private http = inject(HttpClient);
  private readonly basePath = '/api/Currencies';

  getAll(): Observable<Currency[]> {
    return this.http
      .get<ApiResponse<Currency[]>>(buildApiUrl(this.basePath))
      .pipe(map((response) => unwrapApiResponse(response)));
  }

  getActive(): Observable<Currency[]> {
    return this.http
      .get<ApiResponse<Currency[]>>(buildApiUrl(`${this.basePath}/active`))
      .pipe(map((response) => unwrapApiResponse(response)));
  }

  getBase(): Observable<Currency> {
    return this.http
      .get<ApiResponse<Currency>>(buildApiUrl(`${this.basePath}/base`))
      .pipe(map((response) => unwrapApiResponse(response)));
  }

  getById(id: number): Observable<Currency> {
    return this.http
      .get<ApiResponse<Currency>>(buildApiUrl(toApiPath(`${this.basePath}/{id}`, { id })))
      .pipe(map((response) => unwrapApiResponse(response)));
  }

  create(request: CreateCurrencyRequest): Observable<Currency> {
    return this.http
      .post<ApiResponse<Currency>>(buildApiUrl(this.basePath), request)
      .pipe(map((response) => unwrapApiResponse(response)));
  }

  update(id: number, request: UpdateCurrencyRequest): Observable<Currency> {
    return this.http
      .put<ApiResponse<Currency>>(buildApiUrl(toApiPath(`${this.basePath}/{id}`, { id })), request)
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
