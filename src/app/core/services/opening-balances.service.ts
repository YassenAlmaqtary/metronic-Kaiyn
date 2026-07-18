import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';

import { buildApiUrl, toApiPath } from '../api/api-url';
import { ApiResponse } from '../api/models/api-response.model';
import {
  CreateOpeningBalanceRequest,
  OpeningBalance,
  UpdateOpeningBalanceRequest,
} from '../api/models/opening-balance.models';

@Injectable({ providedIn: 'root' })
export class OpeningBalancesService {
  private http = inject(HttpClient);
  private readonly basePath = '/api/OpeningBalances';

  getAll(): Observable<OpeningBalance[]> {
    return this.http
      .get<OpeningBalance[] | ApiResponse<OpeningBalance[]>>(buildApiUrl(this.basePath))
      .pipe(map((response) => this.normalizeList(response)));
  }

  getById(id: number): Observable<OpeningBalance> {
    return this.http
      .get<OpeningBalance | ApiResponse<OpeningBalance>>(
        buildApiUrl(toApiPath(`${this.basePath}/{id}`, { id })),
      )
      .pipe(map((response) => this.normalizeItem(response)));
  }

  create(request: CreateOpeningBalanceRequest): Observable<OpeningBalance> {
    return this.http
      .post<OpeningBalance | ApiResponse<OpeningBalance>>(buildApiUrl(this.basePath), request)
      .pipe(map((response) => this.normalizeItem(response)));
  }

  update(id: number, request: UpdateOpeningBalanceRequest): Observable<OpeningBalance> {
    return this.http
      .put<OpeningBalance | ApiResponse<OpeningBalance>>(
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

  post(id: number): Observable<void> {
    return this.http
      .post<unknown | ApiResponse<unknown>>(
        buildApiUrl(toApiPath(`${this.basePath}/{id}/post`, { id })),
        {},
      )
      .pipe(map(() => undefined));
  }

  private normalizeList(
    response: OpeningBalance[] | ApiResponse<OpeningBalance[]>,
  ): OpeningBalance[] {
    if (Array.isArray(response)) {
      return response;
    }

    if (response.success && Array.isArray(response.data)) {
      return response.data;
    }

    throw new Error(response.message || response.errors?.join(', ') || 'Request failed');
  }

  private normalizeItem(
    response: OpeningBalance | ApiResponse<OpeningBalance>,
  ): OpeningBalance {
    if (response && typeof response === 'object' && 'openingId' in response) {
      return response;
    }

    const wrapped = response as ApiResponse<OpeningBalance>;
    if (wrapped.success && wrapped.data) {
      return wrapped.data;
    }

    throw new Error(wrapped.message || wrapped.errors?.join(', ') || 'Request failed');
  }
}
