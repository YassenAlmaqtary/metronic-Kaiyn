import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';

import { buildApiUrl, toApiPath } from '../api/api-url';
import { ApiResponse } from '../api/models/api-response.model';
import {
  CostCenter,
  CreateCostCenterRequest,
  UpdateCostCenterRequest,
} from '../api/models/cost-center.models';

@Injectable({ providedIn: 'root' })
export class CostCentersService {
  private http = inject(HttpClient);
  private readonly basePath = '/api/CostCenters';

  getAll(): Observable<CostCenter[]> {
    return this.http
      .get<CostCenter[] | ApiResponse<CostCenter[]>>(buildApiUrl(this.basePath))
      .pipe(map((response) => this.normalizeList(response)));
  }

  getActive(): Observable<CostCenter[]> {
    return this.http
      .get<CostCenter[] | ApiResponse<CostCenter[]>>(buildApiUrl(`${this.basePath}/active`))
      .pipe(map((response) => this.normalizeList(response)));
  }

  getById(id: number): Observable<CostCenter> {
    return this.http
      .get<CostCenter | ApiResponse<CostCenter>>(
        buildApiUrl(toApiPath(`${this.basePath}/{id}`, { id })),
      )
      .pipe(map((response) => this.normalizeItem(response)));
  }

  create(request: CreateCostCenterRequest): Observable<CostCenter> {
    return this.http
      .post<CostCenter | ApiResponse<CostCenter>>(buildApiUrl(this.basePath), request)
      .pipe(map((response) => this.normalizeItem(response)));
  }

  update(id: number, request: UpdateCostCenterRequest): Observable<CostCenter> {
    return this.http
      .put<CostCenter | ApiResponse<CostCenter>>(
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

  private normalizeList(response: CostCenter[] | ApiResponse<CostCenter[]>): CostCenter[] {
    if (Array.isArray(response)) {
      return response;
    }
    if (response.success && Array.isArray(response.data)) {
      return response.data;
    }
    throw new Error(response.message || response.errors?.join(', ') || 'Request failed');
  }

  private normalizeItem(response: CostCenter | ApiResponse<CostCenter>): CostCenter {
    if (response && typeof response === 'object' && 'costCenterId' in response) {
      return response;
    }
    const wrapped = response as ApiResponse<CostCenter>;
    if (wrapped.success && wrapped.data) {
      return wrapped.data;
    }
    throw new Error(wrapped.message || wrapped.errors?.join(', ') || 'Request failed');
  }
}
