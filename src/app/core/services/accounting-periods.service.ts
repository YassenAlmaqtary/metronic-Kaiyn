import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';

import { buildApiUrl, toApiPath } from '../api/api-url';
import { ApiResponse } from '../api/models/api-response.model';
import {
  AccountingPeriod,
  AccountingPeriodLookup,
  CreateAccountingPeriodRequest,
  UpdateAccountingPeriodRequest,
} from '../api/models/accounting-period.models';

@Injectable({ providedIn: 'root' })
export class AccountingPeriodsService {
  private http = inject(HttpClient);
  private readonly basePath = '/api/AccountingPeriods';

  getAll(): Observable<AccountingPeriod[]> {
    return this.http
      .get<AccountingPeriod[] | ApiResponse<AccountingPeriod[]>>(buildApiUrl(this.basePath))
      .pipe(map((response) => this.normalizeList(response)));
  }

  getOpen(): Observable<AccountingPeriodLookup[]> {
    return this.http
      .get<AccountingPeriod[] | ApiResponse<AccountingPeriod[]>>(
        buildApiUrl(`${this.basePath}/open`),
      )
      .pipe(map((response) => this.normalizeList(response)));
  }

  getClosed(): Observable<AccountingPeriod[]> {
    return this.http
      .get<AccountingPeriod[] | ApiResponse<AccountingPeriod[]>>(
        buildApiUrl(`${this.basePath}/closed`),
      )
      .pipe(map((response) => this.normalizeList(response)));
  }

  getCurrent(): Observable<AccountingPeriodLookup> {
    return this.http
      .get<AccountingPeriod | ApiResponse<AccountingPeriod>>(
        buildApiUrl(`${this.basePath}/current`),
      )
      .pipe(map((response) => this.normalizeItem(response)));
  }

  getByFiscalYear(fiscalYear: number): Observable<AccountingPeriod[]> {
    return this.http
      .get<AccountingPeriod[] | ApiResponse<AccountingPeriod[]>>(
        buildApiUrl(toApiPath(`${this.basePath}/fiscalyear/{fiscalYear}`, { fiscalYear })),
      )
      .pipe(map((response) => this.normalizeList(response)));
  }

  getById(id: number): Observable<AccountingPeriod> {
    return this.http
      .get<AccountingPeriod | ApiResponse<AccountingPeriod>>(
        buildApiUrl(toApiPath(`${this.basePath}/{id}`, { id })),
      )
      .pipe(map((response) => this.normalizeItem(response)));
  }

  create(request: CreateAccountingPeriodRequest): Observable<AccountingPeriod> {
    return this.http
      .post<AccountingPeriod | ApiResponse<AccountingPeriod>>(buildApiUrl(this.basePath), request)
      .pipe(map((response) => this.normalizeItem(response)));
  }

  update(id: number, request: UpdateAccountingPeriodRequest): Observable<AccountingPeriod> {
    return this.http
      .put<AccountingPeriod | ApiResponse<AccountingPeriod>>(
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

  close(id: number, closedByUserId: number): Observable<AccountingPeriod> {
    return this.http
      .post<AccountingPeriod | ApiResponse<AccountingPeriod>>(
        buildApiUrl(toApiPath(`${this.basePath}/{id}/close`, { id })),
        closedByUserId,
      )
      .pipe(map((response) => this.normalizeItem(response)));
  }

  reopen(id: number): Observable<AccountingPeriod> {
    return this.http
      .post<AccountingPeriod | ApiResponse<AccountingPeriod>>(
        buildApiUrl(toApiPath(`${this.basePath}/{id}/reopen`, { id })),
        {},
      )
      .pipe(map((response) => this.normalizeItem(response)));
  }

  private normalizeList(
    response: AccountingPeriod[] | ApiResponse<AccountingPeriod[]>,
  ): AccountingPeriod[] {
    if (Array.isArray(response)) {
      return response;
    }

    if (response.success && Array.isArray(response.data)) {
      return response.data;
    }

    throw new Error(response.message || response.errors?.join(', ') || 'Request failed');
  }

  private normalizeItem(
    response: AccountingPeriod | ApiResponse<AccountingPeriod>,
  ): AccountingPeriod {
    if (response && typeof response === 'object' && 'periodId' in response) {
      return response;
    }

    const wrapped = response as ApiResponse<AccountingPeriod>;
    if (wrapped.success && wrapped.data) {
      return wrapped.data;
    }

    throw new Error(wrapped.message || wrapped.errors?.join(', ') || 'Request failed');
  }
}
