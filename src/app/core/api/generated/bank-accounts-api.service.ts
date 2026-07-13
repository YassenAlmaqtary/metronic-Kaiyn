import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { buildApiUrl, toApiPath } from '../api-url';
import { ApiResponse } from '../models/api-response.model';

/** Generated from Swagger tag: BankAccounts */
@Injectable({ providedIn: 'root' })
export class BankAccountsApiService {
  private http = inject(HttpClient);

  getAll(bankId?: number) {
    return this.http.get<ApiResponse<unknown>>(buildApiUrl('/api/BankAccounts'));
  }

  create(body: unknown) {
    return this.http.post<ApiResponse<unknown>>(buildApiUrl('/api/BankAccounts'), body);
  }

  deleteById(id: number) {
    return this.http.delete<ApiResponse<unknown>>(buildApiUrl(toApiPath(`/api/BankAccounts/{id}`, { id: id })));
  }

  getById(id: number) {
    return this.http.get<ApiResponse<unknown>>(buildApiUrl(toApiPath(`/api/BankAccounts/{id}`, { id: id })));
  }

  update(id: number, body: unknown) {
    return this.http.put<ApiResponse<unknown>>(buildApiUrl(toApiPath(`/api/BankAccounts/{id}`, { id: id })), body);
  }

  postToggleStatus(id: number) {
    return this.http.post<ApiResponse<unknown>>(buildApiUrl(toApiPath(`/api/BankAccounts/{id}/toggle-status`, { id: id })), null);
  }
}
