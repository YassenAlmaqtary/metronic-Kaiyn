import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';

import { buildApiUrl, toApiPath } from '../api/api-url';
import { ApiResponse } from '../api/models/api-response.model';
import {
  CreateTaxSetupRequest,
  TaxSetup,
  UpdateTaxSetupRequest,
} from '../api/models/tax-setup.models';

@Injectable({ providedIn: 'root' })
export class TaxSetupsService {
  private http = inject(HttpClient);
  private readonly basePath = '/api/TaxSetups';

  getAll(): Observable<TaxSetup[]> {
    return this.http
      .get<TaxSetup[] | ApiResponse<TaxSetup[]>>(buildApiUrl(this.basePath))
      .pipe(map((response) => this.normalizeList(response)));
  }

  getActive(): Observable<TaxSetup[]> {
    return this.http
      .get<TaxSetup[] | ApiResponse<TaxSetup[]>>(buildApiUrl(`${this.basePath}/active`))
      .pipe(map((response) => this.normalizeList(response)));
  }

  getById(id: number): Observable<TaxSetup> {
    return this.http
      .get<TaxSetup | ApiResponse<TaxSetup>>(buildApiUrl(toApiPath(`${this.basePath}/{id}`, { id })))
      .pipe(map((response) => this.normalizeItem(response)));
  }

  create(request: CreateTaxSetupRequest): Observable<TaxSetup> {
    return this.http
      .post<TaxSetup | ApiResponse<TaxSetup>>(buildApiUrl(this.basePath), request)
      .pipe(map((response) => this.normalizeItem(response)));
  }

  update(id: number, request: UpdateTaxSetupRequest): Observable<TaxSetup> {
    return this.http
      .put<TaxSetup | ApiResponse<TaxSetup>>(
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

  private normalizeList(response: TaxSetup[] | ApiResponse<TaxSetup[]>): TaxSetup[] {
    if (Array.isArray(response)) {
      return response;
    }
    if (response.success && Array.isArray(response.data)) {
      return response.data;
    }
    throw new Error(response.message || response.errors?.join(', ') || 'Request failed');
  }

  private normalizeItem(response: TaxSetup | ApiResponse<TaxSetup>): TaxSetup {
    if (response && typeof response === 'object' && 'taxSetupId' in response) {
      return response;
    }
    const wrapped = response as ApiResponse<TaxSetup>;
    if (wrapped.success && wrapped.data) {
      return wrapped.data;
    }
    throw new Error(wrapped.message || wrapped.errors?.join(', ') || 'Request failed');
  }
}
