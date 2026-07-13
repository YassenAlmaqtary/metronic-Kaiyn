import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { buildApiUrl, toApiPath } from '../api-url';
import { ApiResponse } from '../models/api-response.model';

/** Generated from Swagger tag: CheckBooks */
@Injectable({ providedIn: 'root' })
export class CheckBooksApiService {
  private http = inject(HttpClient);

  getAll() {
    return this.http.get<ApiResponse<unknown>>(buildApiUrl('/api/CheckBooks'));
  }

  create(body: unknown) {
    return this.http.post<ApiResponse<unknown>>(buildApiUrl('/api/CheckBooks'), body);
  }

  getBankAccountByBankAccountId(bankAccountId: number) {
    return this.http.get<ApiResponse<unknown>>(buildApiUrl(toApiPath(`/api/CheckBooks/bank-account/{bankAccountId}`, { bankAccountId: bankAccountId })));
  }

  getLowStock() {
    return this.http.get<ApiResponse<unknown>>(buildApiUrl('/api/CheckBooks/low-stock'));
  }

  deleteById(id: number) {
    return this.http.delete<ApiResponse<unknown>>(buildApiUrl(toApiPath(`/api/CheckBooks/{id}`, { id: id })));
  }

  getById(id: number) {
    return this.http.get<ApiResponse<unknown>>(buildApiUrl(toApiPath(`/api/CheckBooks/{id}`, { id: id })));
  }

  update(id: number, body: unknown) {
    return this.http.put<ApiResponse<unknown>>(buildApiUrl(toApiPath(`/api/CheckBooks/{id}`, { id: id })), body);
  }

  postToggleStatus(id: number) {
    return this.http.post<ApiResponse<unknown>>(buildApiUrl(toApiPath(`/api/CheckBooks/{id}/toggle-status`, { id: id })), null);
  }
}
