import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { buildApiUrl, toApiPath } from '../api-url';
import { ApiResponse } from '../models/api-response.model';

/** Generated from Swagger tag: Accounts */
@Injectable({ providedIn: 'root' })
export class AccountsApiService {
  private http = inject(HttpClient);

  getAll() {
    return this.http.get<ApiResponse<unknown>>(buildApiUrl('/api/Accounts'));
  }

  create(body: unknown) {
    return this.http.post<ApiResponse<unknown>>(buildApiUrl('/api/Accounts'), body);
  }

  getCodeByCode(code: string) {
    return this.http.get<ApiResponse<unknown>>(buildApiUrl(toApiPath(`/api/Accounts/code/{code}`, { code: code })));
  }

  getLookup() {
    return this.http.get<ApiResponse<unknown>>(buildApiUrl('/api/Accounts/lookup'));
  }

  getNextCode(parentCode?: number, accType?: number) {
    return this.http.get<ApiResponse<unknown>>(buildApiUrl('/api/Accounts/next-code'));
  }

  deleteById(id: number) {
    return this.http.delete<ApiResponse<unknown>>(buildApiUrl(toApiPath(`/api/Accounts/{id}`, { id: id })));
  }

  getById(id: number) {
    return this.http.get<ApiResponse<unknown>>(buildApiUrl(toApiPath(`/api/Accounts/{id}`, { id: id })));
  }

  update(id: number, body: unknown) {
    return this.http.put<ApiResponse<unknown>>(buildApiUrl(toApiPath(`/api/Accounts/{id}`, { id: id })), body);
  }
}
