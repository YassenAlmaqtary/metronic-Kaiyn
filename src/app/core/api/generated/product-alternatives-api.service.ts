import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { buildApiUrl, toApiPath } from '../api-url';
import { ApiResponse } from '../models/api-response.model';

/** Generated from Swagger tag: ProductAlternatives */
@Injectable({ providedIn: 'root' })
export class ProductAlternativesApiService {
  private http = inject(HttpClient);

  getAll() {
    return this.http.get<ApiResponse<unknown>>(buildApiUrl('/api/ProductAlternatives'));
  }

  create(body: unknown) {
    return this.http.post<ApiResponse<unknown>>(buildApiUrl('/api/ProductAlternatives'), body);
  }

  getProductByProductId(productId: number) {
    return this.http.get<ApiResponse<unknown>>(buildApiUrl(toApiPath(`/api/ProductAlternatives/product/{productId}`, { productId: productId })));
  }

  deleteById(id: number) {
    return this.http.delete<ApiResponse<unknown>>(buildApiUrl(toApiPath(`/api/ProductAlternatives/{id}`, { id: id })));
  }

  getById(id: number) {
    return this.http.get<ApiResponse<unknown>>(buildApiUrl(toApiPath(`/api/ProductAlternatives/{id}`, { id: id })));
  }

  update(id: number, body: unknown) {
    return this.http.put<ApiResponse<unknown>>(buildApiUrl(toApiPath(`/api/ProductAlternatives/{id}`, { id: id })), body);
  }

  postToggleActive(id: number) {
    return this.http.post<ApiResponse<unknown>>(buildApiUrl(toApiPath(`/api/ProductAlternatives/{id}/toggle-active`, { id: id })), null);
  }
}
