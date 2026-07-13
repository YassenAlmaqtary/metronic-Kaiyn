import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { buildApiUrl, toApiPath } from '../api-url';
import { ApiResponse } from '../models/api-response.model';

/** Generated from Swagger tag: TaxSetups */
@Injectable({ providedIn: 'root' })
export class TaxSetupsApiService {
  private http = inject(HttpClient);

  getAll() {
    return this.http.get<ApiResponse<unknown>>(buildApiUrl('/api/TaxSetups'));
  }

  create(body: unknown) {
    return this.http.post<ApiResponse<unknown>>(buildApiUrl('/api/TaxSetups'), body);
  }

  getAccountByAccountId(accountId: number) {
    return this.http.get<ApiResponse<unknown>>(buildApiUrl(toApiPath(`/api/TaxSetups/account/{accountId}`, { accountId: accountId })));
  }

  getActive() {
    return this.http.get<ApiResponse<unknown>>(buildApiUrl('/api/TaxSetups/active'));
  }

  getCodeByCode(code: string) {
    return this.http.get<ApiResponse<unknown>>(buildApiUrl(toApiPath(`/api/TaxSetups/code/{code}`, { code: code })));
  }

  getTypeByTaxType(taxType: string) {
    return this.http.get<ApiResponse<unknown>>(buildApiUrl(toApiPath(`/api/TaxSetups/type/{taxType}`, { taxType: taxType })));
  }

  deleteById(id: number) {
    return this.http.delete<ApiResponse<unknown>>(buildApiUrl(toApiPath(`/api/TaxSetups/{id}`, { id: id })));
  }

  getById(id: number) {
    return this.http.get<ApiResponse<unknown>>(buildApiUrl(toApiPath(`/api/TaxSetups/{id}`, { id: id })));
  }

  update(id: number, body: unknown) {
    return this.http.put<ApiResponse<unknown>>(buildApiUrl(toApiPath(`/api/TaxSetups/{id}`, { id: id })), body);
  }
}
