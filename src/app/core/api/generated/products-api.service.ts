import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { buildApiUrl, toApiPath } from '../api-url';
import { ApiResponse } from '../models/api-response.model';

/** Generated from Swagger tag: Products */
@Injectable({ providedIn: 'root' })
export class ProductsApiService {
  private http = inject(HttpClient);

  getAll() {
    return this.http.get<ApiResponse<unknown>>(buildApiUrl('/api/Products'));
  }

  create(body: unknown) {
    return this.http.post<ApiResponse<unknown>>(buildApiUrl('/api/Products'), body);
  }

  getAccountMapping(productTypeId?: number, branchId?: number) {
    let params = new HttpParams();
    if (productTypeId != null) {
      for (const value of Array.isArray(productTypeId) ? productTypeId : [productTypeId]) {
        params = params.append('productTypeId', String(value));
      }
    }
    if (branchId != null) {
      for (const value of Array.isArray(branchId) ? branchId : [branchId]) {
        params = params.append('branchId', String(value));
      }
    }
    return this.http.get<ApiResponse<unknown>>(buildApiUrl('/api/Products/account-mapping'), { params });
  }

  getSearch(q?: string) {
    let params = new HttpParams();
    if (q != null) {
      for (const value of Array.isArray(q) ? q : [q]) {
        params = params.append('q', String(value));
      }
    }
    return this.http.get<ApiResponse<unknown>>(buildApiUrl('/api/Products/search'), { params });
  }

  postUploadImage(body: unknown) {
    return this.http.post<ApiResponse<unknown>>(buildApiUrl('/api/Products/upload-image'), body);
  }

  deleteById(id: number) {
    return this.http.delete<ApiResponse<unknown>>(buildApiUrl(toApiPath(`/api/Products/{id}`, { id: id })));
  }

  getById(id: number) {
    return this.http.get<ApiResponse<unknown>>(buildApiUrl(toApiPath(`/api/Products/{id}`, { id: id })));
  }

  update(id: number, body: unknown) {
    return this.http.put<ApiResponse<unknown>>(buildApiUrl(toApiPath(`/api/Products/{id}`, { id: id })), body);
  }

  getComponentsById(id: number) {
    return this.http.get<ApiResponse<unknown>>(buildApiUrl(toApiPath(`/api/Products/{id}/components`, { id: id })));
  }

  getDetailsById(id: number) {
    return this.http.get<ApiResponse<unknown>>(buildApiUrl(toApiPath(`/api/Products/{id}/details`, { id: id })));
  }

  getImagesById(id: number) {
    return this.http.get<ApiResponse<unknown>>(buildApiUrl(toApiPath(`/api/Products/{id}/images`, { id: id })));
  }

  patchToggleStatus(id: number) {
    return this.http.patch<ApiResponse<unknown>>(buildApiUrl(toApiPath(`/api/Products/{id}/toggle-status`, { id: id })), null);
  }

  getUnitsById(id: number) {
    return this.http.get<ApiResponse<unknown>>(buildApiUrl(toApiPath(`/api/Products/{id}/units`, { id: id })));
  }
}
