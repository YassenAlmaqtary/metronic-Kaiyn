import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';

import { buildApiUrl, toApiPath } from '../api/api-url';
import { ApiResponse } from '../api/models/api-response.model';
import {
  CheckBook,
  CreateCheckBookRequest,
  UpdateCheckBookRequest,
} from '../api/models/check-book.models';
import { unwrapApiResponse } from '../api/utils/api-response.util';

@Injectable({ providedIn: 'root' })
export class CheckBooksService {
  private http = inject(HttpClient);
  private readonly basePath = '/api/CheckBooks';

  getAll(): Observable<CheckBook[]> {
    return this.http
      .get<ApiResponse<CheckBook[]>>(buildApiUrl(this.basePath))
      .pipe(map((response) => unwrapApiResponse(response)));
  }

  getById(id: number): Observable<CheckBook> {
    return this.http
      .get<ApiResponse<CheckBook>>(buildApiUrl(toApiPath(`${this.basePath}/{id}`, { id })))
      .pipe(map((response) => unwrapApiResponse(response)));
  }

  getByBankAccount(bankAccountId: number): Observable<CheckBook[]> {
    return this.http
      .get<ApiResponse<CheckBook[]>>(
        buildApiUrl(
          toApiPath(`${this.basePath}/bank-account/{bankAccountId}`, { bankAccountId }),
        ),
      )
      .pipe(map((response) => unwrapApiResponse(response)));
  }

  getLowStock(): Observable<CheckBook[]> {
    return this.http
      .get<ApiResponse<CheckBook[]>>(buildApiUrl(`${this.basePath}/low-stock`))
      .pipe(map((response) => unwrapApiResponse(response)));
  }

  create(request: CreateCheckBookRequest): Observable<CheckBook> {
    return this.http
      .post<ApiResponse<CheckBook>>(buildApiUrl(this.basePath), request)
      .pipe(map((response) => unwrapApiResponse(response)));
  }

  update(id: number, request: UpdateCheckBookRequest): Observable<CheckBook> {
    return this.http
      .put<ApiResponse<CheckBook>>(
        buildApiUrl(toApiPath(`${this.basePath}/{id}`, { id })),
        request,
      )
      .pipe(map((response) => unwrapApiResponse(response)));
  }

  delete(id: number): Observable<void> {
    return this.http
      .delete<ApiResponse<unknown>>(buildApiUrl(toApiPath(`${this.basePath}/{id}`, { id })))
      .pipe(map(() => undefined));
  }

  toggleStatus(id: number): Observable<CheckBook> {
    return this.http
      .post<ApiResponse<CheckBook>>(
        buildApiUrl(toApiPath(`${this.basePath}/{id}/toggle-status`, { id })),
        null,
      )
      .pipe(map((response) => unwrapApiResponse(response)));
  }
}
