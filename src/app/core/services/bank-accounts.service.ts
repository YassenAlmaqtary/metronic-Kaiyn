import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';

import { buildApiUrl, toApiPath } from '../api/api-url';
import { ApiResponse } from '../api/models/api-response.model';
import {
  BankAccount,
  CreateBankAccountRequest,
  UpdateBankAccountRequest,
} from '../api/models/bank-account.models';
import { unwrapApiResponse } from '../api/utils/api-response.util';

@Injectable({ providedIn: 'root' })
export class BankAccountsService {
  private http = inject(HttpClient);
  private readonly basePath = '/api/BankAccounts';

  getAll(bankId?: number): Observable<BankAccount[]> {
    let params = new HttpParams();
    if (bankId != null) {
      params = params.set('bankId', String(bankId));
    }

    return this.http
      .get<ApiResponse<BankAccount[]>>(buildApiUrl(this.basePath), { params })
      .pipe(map((response) => unwrapApiResponse(response)));
  }

  getById(id: number): Observable<BankAccount> {
    return this.http
      .get<ApiResponse<BankAccount>>(buildApiUrl(toApiPath(`${this.basePath}/{id}`, { id })))
      .pipe(map((response) => unwrapApiResponse(response)));
  }

  create(request: CreateBankAccountRequest): Observable<BankAccount> {
    return this.http
      .post<ApiResponse<BankAccount>>(buildApiUrl(this.basePath), request)
      .pipe(map((response) => unwrapApiResponse(response)));
  }

  update(id: number, request: UpdateBankAccountRequest): Observable<BankAccount> {
    return this.http
      .put<ApiResponse<BankAccount>>(
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

  toggleStatus(id: number): Observable<BankAccount> {
    return this.http
      .post<ApiResponse<BankAccount>>(
        buildApiUrl(toApiPath(`${this.basePath}/{id}/toggle-status`, { id })),
        null,
      )
      .pipe(map((response) => unwrapApiResponse(response)));
  }
}
