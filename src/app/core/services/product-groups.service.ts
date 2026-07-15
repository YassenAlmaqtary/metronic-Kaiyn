import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';

import { buildApiUrl, toApiPath } from '../api/api-url';
import { ApiResponse } from '../api/models/api-response.model';
import {
  CreateProductGroupRequest,
  ProductGroup,
  UpdateProductGroupRequest,
} from '../api/models/product-group.models';
import { unwrapApiResponse } from '../api/utils/api-response.util';

@Injectable({ providedIn: 'root' })
export class ProductGroupsService {
  private http = inject(HttpClient);
  private readonly basePath = '/api/ProductsGroups';

  getAll(): Observable<ProductGroup[]> {
    return this.http
      .get<ApiResponse<ProductGroup[]>>(buildApiUrl(this.basePath))
      .pipe(map((response) => unwrapApiResponse(response)));
  }

  getById(id: number): Observable<ProductGroup> {
    return this.http
      .get<ApiResponse<ProductGroup>>(buildApiUrl(toApiPath(`${this.basePath}/{id}`, { id })))
      .pipe(map((response) => unwrapApiResponse(response)));
  }

  create(request: CreateProductGroupRequest): Observable<ProductGroup> {
    return this.http
      .post<ApiResponse<ProductGroup>>(buildApiUrl(this.basePath), request)
      .pipe(map((response) => unwrapApiResponse(response)));
  }

  update(id: number, request: UpdateProductGroupRequest): Observable<ProductGroup> {
    return this.http
      .put<ApiResponse<ProductGroup>>(buildApiUrl(toApiPath(`${this.basePath}/{id}`, { id })), request)
      .pipe(map((response) => unwrapApiResponse(response)));
  }

  delete(id: number): Observable<void> {
    return this.http
      .delete<ApiResponse<unknown>>(buildApiUrl(toApiPath(`${this.basePath}/{id}`, { id })))
      .pipe(
        map((response) => unwrapApiResponse(response)),
        map(() => undefined),
      );
  }
}
