import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { buildApiUrl, toApiPath } from '../api-url';
import { ApiResponse } from '../models/api-response.model';

/** Generated from Swagger tag: ReceiptVouchers */
@Injectable({ providedIn: 'root' })
export class ReceiptVouchersApiService {
  private http = inject(HttpClient);

  getAll() {
    return this.http.get<ApiResponse<unknown>>(buildApiUrl('/api/ReceiptVouchers'));
  }

  create(body: unknown) {
    return this.http.post<ApiResponse<unknown>>(buildApiUrl('/api/ReceiptVouchers'), body);
  }

  getNextNumber() {
    return this.http.get<ApiResponse<unknown>>(buildApiUrl('/api/ReceiptVouchers/next-number'));
  }

  deleteById(id: number) {
    return this.http.delete<ApiResponse<unknown>>(buildApiUrl(toApiPath(`/api/ReceiptVouchers/{id}`, { id: id })));
  }

  getById(id: number) {
    return this.http.get<ApiResponse<unknown>>(buildApiUrl(toApiPath(`/api/ReceiptVouchers/{id}`, { id: id })));
  }

  update(id: number, body: unknown) {
    return this.http.put<ApiResponse<unknown>>(buildApiUrl(toApiPath(`/api/ReceiptVouchers/{id}`, { id: id })), body);
  }

  postApprove(id: number) {
    return this.http.post<ApiResponse<unknown>>(buildApiUrl(toApiPath(`/api/ReceiptVouchers/{id}/approve`, { id: id })), null);
  }
}
