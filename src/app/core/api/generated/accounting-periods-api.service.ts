import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { buildApiUrl, toApiPath } from '../api-url';
import { ApiResponse } from '../models/api-response.model';

/** Generated from Swagger tag: AccountingPeriods */
@Injectable({ providedIn: 'root' })
export class AccountingPeriodsApiService {
  private http = inject(HttpClient);

  getAll() {
    return this.http.get<ApiResponse<unknown>>(buildApiUrl('/api/AccountingPeriods'));
  }

  create(body: unknown) {
    return this.http.post<ApiResponse<unknown>>(buildApiUrl('/api/AccountingPeriods'), body);
  }

  getClosed() {
    return this.http.get<ApiResponse<unknown>>(buildApiUrl('/api/AccountingPeriods/closed'));
  }

  getCurrent() {
    return this.http.get<ApiResponse<unknown>>(buildApiUrl('/api/AccountingPeriods/current'));
  }

  getFiscalyearByFiscalYear(fiscalYear: string) {
    return this.http.get<ApiResponse<unknown>>(buildApiUrl(toApiPath(`/api/AccountingPeriods/fiscalyear/{fiscalYear}`, { fiscalYear: fiscalYear })));
  }

  getOpen() {
    return this.http.get<ApiResponse<unknown>>(buildApiUrl('/api/AccountingPeriods/open'));
  }

  deleteById(id: number) {
    return this.http.delete<ApiResponse<unknown>>(buildApiUrl(toApiPath(`/api/AccountingPeriods/{id}`, { id: id })));
  }

  getById(id: number) {
    return this.http.get<ApiResponse<unknown>>(buildApiUrl(toApiPath(`/api/AccountingPeriods/{id}`, { id: id })));
  }

  update(id: number, body: unknown) {
    return this.http.put<ApiResponse<unknown>>(buildApiUrl(toApiPath(`/api/AccountingPeriods/{id}`, { id: id })), body);
  }

  postClose(id: number, body: unknown) {
    return this.http.post<ApiResponse<unknown>>(buildApiUrl(toApiPath(`/api/AccountingPeriods/{id}/close`, { id: id })), body);
  }

  postReopen(id: number) {
    return this.http.post<ApiResponse<unknown>>(buildApiUrl(toApiPath(`/api/AccountingPeriods/{id}/reopen`, { id: id })), null);
  }
}
