import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { buildApiUrl, toApiPath } from '../api-url';
import { ApiResponse } from '../models/api-response.model';

/** Generated from Swagger tag: FiscalYears */
@Injectable({ providedIn: 'root' })
export class FiscalYearsApiService {
  private http = inject(HttpClient);

  getAll() {
    return this.http.get<ApiResponse<unknown>>(buildApiUrl('/api/FiscalYears'));
  }

  create(body: unknown) {
    return this.http.post<ApiResponse<unknown>>(buildApiUrl('/api/FiscalYears'), body);
  }

  getClosed() {
    return this.http.get<ApiResponse<unknown>>(buildApiUrl('/api/FiscalYears/closed'));
  }

  getCurrent() {
    return this.http.get<ApiResponse<unknown>>(buildApiUrl('/api/FiscalYears/current'));
  }

  getOpen() {
    return this.http.get<ApiResponse<unknown>>(buildApiUrl('/api/FiscalYears/open'));
  }

  getYearByYear(year: string) {
    return this.http.get<ApiResponse<unknown>>(buildApiUrl(toApiPath(`/api/FiscalYears/year/{year}`, { year: year })));
  }

  deleteById(id: number) {
    return this.http.delete<ApiResponse<unknown>>(buildApiUrl(toApiPath(`/api/FiscalYears/{id}`, { id: id })));
  }

  getById(id: number) {
    return this.http.get<ApiResponse<unknown>>(buildApiUrl(toApiPath(`/api/FiscalYears/{id}`, { id: id })));
  }

  update(id: number, body: unknown) {
    return this.http.put<ApiResponse<unknown>>(buildApiUrl(toApiPath(`/api/FiscalYears/{id}`, { id: id })), body);
  }

  postClose(id: number) {
    return this.http.post<ApiResponse<unknown>>(buildApiUrl(toApiPath(`/api/FiscalYears/{id}/close`, { id: id })), null);
  }

  postReopen(id: number) {
    return this.http.post<ApiResponse<unknown>>(buildApiUrl(toApiPath(`/api/FiscalYears/{id}/reopen`, { id: id })), null);
  }
}
