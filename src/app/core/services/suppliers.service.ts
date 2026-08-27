import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';

import { buildApiUrl, toApiPath } from '../api/api-url';
import { ApiResponse } from '../api/models/api-response.model';
import {
  CreateSupplierRequest,
  Supplier,
  SupplierLookup,
  UpdateSupplierRequest,
} from '../api/models/supplier.models';
import { unwrapApiResponse } from '../api/utils/api-response.util';

@Injectable({ providedIn: 'root' })
export class SuppliersService {
  private http = inject(HttpClient);
  private readonly basePath = '/api/Suppliers';

  getAll(): Observable<Supplier[]> {
    return this.http
      .get<ApiResponse<Supplier[]>>(buildApiUrl(this.basePath))
      .pipe(map((response) => unwrapApiResponse(response)));
  }

  getActive(): Observable<Supplier[]> {
    return this.http
      .get<ApiResponse<Supplier[]>>(buildApiUrl(`${this.basePath}/active`))
      .pipe(map((response) => unwrapApiResponse(response)));
  }

  /** Lookup shape used by opening balances and dropdowns. */
  getLookups(): Observable<SupplierLookup[]> {
    return this.getAll().pipe(
      map((items) =>
        items.map((s) => ({
          supplierId: s.supplierId,
          supplierName: s.supplierName,
          isActive: s.isActive,
        })),
      ),
    );
  }

  getById(id: number): Observable<Supplier> {
    return this.http
      .get<ApiResponse<Supplier>>(buildApiUrl(toApiPath(`${this.basePath}/{id}`, { id })))
      .pipe(map((response) => unwrapApiResponse(response)));
  }

  create(request: CreateSupplierRequest): Observable<Supplier> {
    return this.http
      .post<ApiResponse<Supplier>>(buildApiUrl(this.basePath), request)
      .pipe(map((response) => unwrapApiResponse(response)));
  }

  update(id: number, request: UpdateSupplierRequest): Observable<Supplier> {
    return this.http
      .put<ApiResponse<Supplier>>(buildApiUrl(toApiPath(`${this.basePath}/{id}`, { id })), request)
      .pipe(map((response) => unwrapApiResponse(response)));
  }

  delete(id: number): Observable<unknown> {
    return this.http
      .delete<ApiResponse<unknown>>(buildApiUrl(toApiPath(`${this.basePath}/{id}`, { id })))
      .pipe(map((response) => unwrapApiResponse(response)));
  }

  toggleStatus(id: number): Observable<Supplier> {
    return this.http
      .put<ApiResponse<Supplier>>(buildApiUrl(toApiPath(`${this.basePath}/{id}/toggle-status`, { id })), {})
      .pipe(map((response) => unwrapApiResponse(response)));
  }
}
