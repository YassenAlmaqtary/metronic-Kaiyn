import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, forkJoin, map, of, switchMap } from 'rxjs';

import { buildApiUrl, toApiPath } from '../api/api-url';
import { ApiResponse } from '../api/models/api-response.model';
import {
  CreateProductAlternativeRequest,
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
  private readonly alternativesPath = '/api/ProductAlternatives';

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

  uploadImage(file: File): Observable<string> {
    const formData = new FormData();
    formData.append('file', file);

    return this.http
      .post<ApiResponse<string>>(buildApiUrl(`${this.basePath}/upload-image`), formData)
      .pipe(map((response) => unwrapApiResponse(response)));
  }

  create(request: CreateProductRequest): Observable<Product> {
    // Nested alternatives require productId >= 1; on create the product does not exist yet.
    // Create the product first, then attach alternatives via /api/ProductAlternatives.
    const alternatives = request.alternatives?.length ? [...request.alternatives] : [];
    const body: CreateProductRequest = {
      ...request,
      alternatives: null,
    };

    return this.http.post<ApiResponse<Product>>(buildApiUrl(this.basePath), body).pipe(
      map((response) => unwrapApiResponse(response)),
      switchMap((product) => {
        if (!alternatives.length || !product.productId) {
          return of(product);
        }

        return forkJoin(
          alternatives.map((alt) =>
            this.createAlternative({
              ...alt,
              productId: product.productId,
            }),
          ),
        ).pipe(map(() => product));
      }),
    );
  }

  createAlternative(request: CreateProductAlternativeRequest): Observable<unknown> {
    return this.http
      .post<ApiResponse<unknown>>(buildApiUrl(this.alternativesPath), request)
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
