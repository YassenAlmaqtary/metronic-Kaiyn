import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';

import { buildApiUrl, toApiPath } from '../api/api-url';
import { ApiResponse } from '../api/models/api-response.model';
import { Bank, CreateBankRequest, UpdateBankRequest } from '../api/models/bank.models';
import { unwrapApiResponse } from '../api/utils/api-response.util';

@Injectable({ providedIn: 'root' })
export class BanksService {
  private http = inject(HttpClient);
  private readonly basePath = '/api/Banks';

  getAll(): Observable<Bank[]> {
    return this.http
      .get<ApiResponse<Bank[]>>(buildApiUrl(this.basePath))
      .pipe(map((response) => unwrapApiResponse(response)));
  }

  getById(id: number): Observable<Bank> {
    return this.http
      .get<ApiResponse<Bank>>(buildApiUrl(toApiPath(`${this.basePath}/{id}`, { id })))
      .pipe(map((response) => unwrapApiResponse(response)));
  }

  create(request: CreateBankRequest): Observable<Bank> {
    return this.http
      .post<ApiResponse<Bank>>(buildApiUrl(this.basePath), request)
      .pipe(map((response) => unwrapApiResponse(response)));
  }

  update(id: number, request: UpdateBankRequest): Observable<Bank> {
    return this.http
      .put<ApiResponse<Bank>>(buildApiUrl(toApiPath(`${this.basePath}/{id}`, { id })), request)
      .pipe(map((response) => unwrapApiResponse(response)));
  }

  delete(id: number): Observable<void> {
    return this.http
      .delete<ApiResponse<unknown>>(buildApiUrl(toApiPath(`${this.basePath}/{id}`, { id })))
      .pipe(map(() => undefined));
  }

  toggleStatus(id: number): Observable<Bank> {
    return this.http
      .post<ApiResponse<Bank>>(
        buildApiUrl(toApiPath(`${this.basePath}/{id}/toggle-status`, { id })),
        null,
      )
      .pipe(map((response) => unwrapApiResponse(response)));
  }

  getAccountCount(id: number): Observable<number> {
    return this.http
      .get<ApiResponse<number>>(buildApiUrl(toApiPath(`${this.basePath}/{id}/account-count`, { id })))
      .pipe(map((response) => unwrapApiResponse(response)));
  }
}
