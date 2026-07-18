import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';

import { buildApiUrl, toApiPath } from '../api/api-url';
import { ApiResponse } from '../api/models/api-response.model';
import {
  CreateFiscalYearRequest,
  FiscalYear,
  UpdateFiscalYearRequest,
} from '../api/models/fiscal-year.models';

@Injectable({ providedIn: 'root' })
export class FiscalYearsService {
  private http = inject(HttpClient);
  private readonly basePath = '/api/FiscalYears';

  getAll(): Observable<FiscalYear[]> {
    return this.http
      .get<FiscalYear[] | ApiResponse<FiscalYear[]>>(buildApiUrl(this.basePath))
      .pipe(map((response) => this.normalizeList(response)));
  }

  getOpen(): Observable<FiscalYear[]> {
    return this.http
      .get<FiscalYear[] | ApiResponse<FiscalYear[]>>(buildApiUrl(`${this.basePath}/open`))
      .pipe(map((response) => this.normalizeList(response)));
  }

  getClosed(): Observable<FiscalYear[]> {
    return this.http
      .get<FiscalYear[] | ApiResponse<FiscalYear[]>>(buildApiUrl(`${this.basePath}/closed`))
      .pipe(map((response) => this.normalizeList(response)));
  }

  getCurrent(): Observable<FiscalYear> {
    return this.http
      .get<FiscalYear | ApiResponse<FiscalYear>>(buildApiUrl(`${this.basePath}/current`))
      .pipe(map((response) => this.normalizeItem(response)));
  }

  getByYear(year: number): Observable<FiscalYear> {
    return this.http
      .get<FiscalYear | ApiResponse<FiscalYear>>(
        buildApiUrl(toApiPath(`${this.basePath}/year/{year}`, { year })),
      )
      .pipe(map((response) => this.normalizeItem(response)));
  }

  getById(id: number): Observable<FiscalYear> {
    return this.http
      .get<FiscalYear | ApiResponse<FiscalYear>>(
        buildApiUrl(toApiPath(`${this.basePath}/{id}`, { id })),
      )
      .pipe(map((response) => this.normalizeItem(response)));
  }

  create(request: CreateFiscalYearRequest): Observable<FiscalYear> {
    return this.http
      .post<FiscalYear | ApiResponse<FiscalYear>>(buildApiUrl(this.basePath), request)
      .pipe(map((response) => this.normalizeItem(response)));
  }

  update(id: number, request: UpdateFiscalYearRequest): Observable<FiscalYear> {
    return this.http
      .put<FiscalYear | ApiResponse<FiscalYear>>(
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

  close(id: number): Observable<FiscalYear> {
    return this.http
      .post<FiscalYear | ApiResponse<FiscalYear>>(
        buildApiUrl(toApiPath(`${this.basePath}/{id}/close`, { id })),
        null,
      )
      .pipe(map((response) => this.normalizeItem(response)));
  }

  reopen(id: number): Observable<FiscalYear> {
    return this.http
      .post<FiscalYear | ApiResponse<FiscalYear>>(
        buildApiUrl(toApiPath(`${this.basePath}/{id}/reopen`, { id })),
        null,
      )
      .pipe(map((response) => this.normalizeItem(response)));
  }

  private normalizeList(response: FiscalYear[] | ApiResponse<FiscalYear[]>): FiscalYear[] {
    if (Array.isArray(response)) {
      return response;
    }

    if (response.success && Array.isArray(response.data)) {
      return response.data;
    }

    throw new Error(response.message || response.errors?.join(', ') || 'Request failed');
  }

  private normalizeItem(response: FiscalYear | ApiResponse<FiscalYear>): FiscalYear {
    if (response && typeof response === 'object' && 'fiscalYearId' in response) {
      return response;
    }

    const wrapped = response as ApiResponse<FiscalYear>;
    if (wrapped.success && wrapped.data) {
      return wrapped.data;
    }

    throw new Error(wrapped.message || wrapped.errors?.join(', ') || 'Request failed');
  }
}
