import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { buildApiUrl, toApiPath } from '../api-url';
import { ApiResponse } from '../models/api-response.model';

/** Generated from Swagger tag: SalesInvoice */
@Injectable({ providedIn: 'root' })
export class SalesInvoiceApiService {
  private http = inject(HttpClient);

  getAll(status?: number, branchId?: number) {
    return this.http.get<ApiResponse<unknown>>(buildApiUrl('/api/SalesInvoice'));
  }

  create(body: unknown) {
    return this.http.post<ApiResponse<unknown>>(buildApiUrl('/api/SalesInvoice'), body);
  }

  getDrafts() {
    return this.http.get<ApiResponse<unknown>>(buildApiUrl('/api/SalesInvoice/drafts'));
  }

  getNextNumber(branchId?: number) {
    return this.http.get<ApiResponse<unknown>>(buildApiUrl('/api/SalesInvoice/next-number'));
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
