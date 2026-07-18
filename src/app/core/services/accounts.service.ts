import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';

import { buildApiUrl, toApiPath } from '../api/api-url';
import { ApiResponse } from '../api/models/api-response.model';
import {
  Account,
  CreateAccountRequest,
  UpdateAccountRequest,
} from '../api/models/account.models';
import { unwrapApiResponse } from '../api/utils/api-response.util';

@Injectable({ providedIn: 'root' })
export class AccountsService {
  private http = inject(HttpClient);
  private readonly basePath = '/api/Accounts';

  getAll(): Observable<Account[]> {
    return this.http
      .get<Account[] | ApiResponse<Account[]>>(buildApiUrl(this.basePath))
      .pipe(map((response) => this.normalizeList(response)));
  }

  getById(id: number): Observable<Account> {
    return this.http
      .get<Account | ApiResponse<Account>>(buildApiUrl(toApiPath(`${this.basePath}/{id}`, { id })))
      .pipe(map((response) => this.normalizeItem(response)));
  }

  getNextCode(parentCode?: number | null, accType?: number | null): Observable<number> {
    let params = new HttpParams();
    if (parentCode != null) {
      params = params.set('parentCode', String(parentCode));
    }
    if (accType != null) {
      params = params.set('accType', String(accType));
    }

    return this.http
      .get<ApiResponse<number> | number>(buildApiUrl(`${this.basePath}/next-code`), { params })
      .pipe(
        map((response) => {
          if (typeof response === 'number') {
            return response;
          }
          return unwrapApiResponse(response);
        }),
      );
  }

  create(request: CreateAccountRequest): Observable<Account> {
    return this.http
      .post<Account | ApiResponse<Account>>(buildApiUrl(this.basePath), request)
      .pipe(map((response) => this.normalizeItem(response)));
  }

  update(id: number, request: UpdateAccountRequest): Observable<Account> {
    return this.http
      .put<Account | ApiResponse<Account>>(
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

  private normalizeList(response: Account[] | ApiResponse<Account[]>): Account[] {
    if (Array.isArray(response)) {
      return response;
    }

    if (response.success && Array.isArray(response.data)) {
      return response.data;
    }

    throw new Error(response.message || response.errors?.join(', ') || 'Request failed');
  }

  private normalizeItem(response: Account | ApiResponse<Account>): Account {
    if (response && typeof response === 'object' && 'accId' in response) {
      return response;
    }

    const wrapped = response as ApiResponse<Account>;
    if (wrapped.success && wrapped.data) {
      return wrapped.data;
    }

    throw new Error(wrapped.message || wrapped.errors?.join(', ') || 'Request failed');
  }
}
