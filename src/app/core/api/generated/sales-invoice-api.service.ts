import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { buildApiUrl, toApiPath } from '../api-url';
import { ApiResponse } from '../models/api-response.model';

/** Generated from Swagger tag: SalesInvoice */
@Injectable({ providedIn: 'root' })
export class SalesInvoiceApiService {
  private http = inject(HttpClient);

  getAll(status?: number, branchId?: number) {
    let params = new HttpParams();
    if (status != null) {
      for (const value of Array.isArray(status) ? status : [status]) {
        params = params.append('status', String(value));
      }
    }
    if (branchId != null) {
      for (const value of Array.isArray(branchId) ? branchId : [branchId]) {
        params = params.append('branchId', String(value));
      }
    }
    return this.http.get<ApiResponse<unknown>>(buildApiUrl('/api/SalesInvoice'), { params });
  }

  create(body: unknown) {
    return this.http.post<ApiResponse<unknown>>(buildApiUrl('/api/SalesInvoice'), body);
  }

  getDrafts() {
    return this.http.get<ApiResponse<unknown>>(buildApiUrl('/api/SalesInvoice/drafts'));
  }

  getNextNumber(branchId?: number) {
    let params = new HttpParams();
    if (branchId != null) {
      for (const value of Array.isArray(branchId) ? branchId : [branchId]) {
        params = params.append('branchId', String(value));
      }
    }
    return this.http.get<ApiResponse<unknown>>(buildApiUrl('/api/SalesInvoice/next-number'), { params });
  }

  getById(id: number) {
    return this.http.get<ApiResponse<unknown>>(buildApiUrl(toApiPath(`/api/SalesInvoice/{id}`, { id: id })));
  }

  postCancel(id: number) {
    return this.http.post<ApiResponse<unknown>>(buildApiUrl(toApiPath(`/api/SalesInvoice/{id}/cancel`, { id: id })), null);
  }

  postPost(id: number, body: unknown) {
    return this.http.post<ApiResponse<unknown>>(buildApiUrl(toApiPath(`/api/SalesInvoice/{id}/post`, { id: id })), body);
  }
}
