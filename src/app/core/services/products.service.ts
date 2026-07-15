import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';

import { buildApiUrl, toApiPath } from '../api/api-url';
import { ApiResponse } from '../api/models/api-response.model';
import {
  CreateProductRequest,
  Product,
  ProductLookup,
  ProductUnit,
  UpdateProductRequest,
} from '../api/models/product.models';
import { unwrapApiResponse } from '../api/utils/api-response.util';

@Injectable({ providedIn: 'root' })
export class ProductsService {
  private http = inject(HttpClient);
  private readonly basePath = '/api/Products';

  getAll(): Observable<ProductLookup[]> {
    return this.http
      .get<ApiResponse<Product[]>>(buildApiUrl(this.basePath))
      .pipe(map((response) => unwrapApiResponse(response)));
  }

  getById(id: number): Observable<Product> {
    return this.http
      .get<ApiResponse<Product>>(buildApiUrl(toApiPath(`${this.basePath}/{id}`, { id })))
      .pipe(map((response) => unwrapApiResponse(response)));
  }

  getUnitsById(id: number): Observable<ProductUnit[]> {
    return this.http
      .get<ApiResponse<ProductUnit[]>>(
        buildApiUrl(toApiPath(`${this.basePath}/{id}/units`, { id })),
      )
      .pipe(map((response) => unwrapApiResponse(response)));
  }

  create(request: CreateProductRequest): Observable<Product> {
    return this.http
      .post<ApiResponse<Product>>(buildApiUrl(this.basePath), request)
      .pipe(map((response) => unwrapApiResponse(response)));
  }

  update(id: number, request: UpdateProductRequest): Observable<Product> {
    return this.http
      .put<ApiResponse<Product>>(buildApiUrl(toApiPath(`${this.basePath}/{id}`, { id })), request)
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
