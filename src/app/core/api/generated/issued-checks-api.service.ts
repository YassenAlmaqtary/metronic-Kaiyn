import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { buildApiUrl, toApiPath } from '../api-url';
import { ApiResponse } from '../models/api-response.model';

/** Generated from Swagger tag: IssuedChecks */
@Injectable({ providedIn: 'root' })
export class IssuedChecksApiService {
  private http = inject(HttpClient);

  getAll() {
    return this.http.get<ApiResponse<unknown>>(buildApiUrl('/api/IssuedChecks'));
  }

  create(body: unknown) {
    return this.http.post<ApiResponse<unknown>>(buildApiUrl('/api/IssuedChecks'), body);
  }

  getBankAccountByBankAccountId(bankAccountId: number) {
    return this.http.get<ApiResponse<unknown>>(buildApiUrl(toApiPath(`/api/IssuedChecks/bank-account/{bankAccountId}`, { bankAccountId: bankAccountId })));
  }

  getRange(fromDate?: string, toDate?: string) {
    let params = new HttpParams();
    if (fromDate != null) {
      for (const value of Array.isArray(fromDate) ? fromDate : [fromDate]) {
        params = params.append('fromDate', String(value));
      }
    }
    if (toDate != null) {
      for (const value of Array.isArray(toDate) ? toDate : [toDate]) {
        params = params.append('toDate', String(value));
      }
    }
    return this.http.get<ApiResponse<unknown>>(buildApiUrl('/api/IssuedChecks/range'), { params });
  }

  getStatusByStatus(status: number) {
    return this.http.get<ApiResponse<unknown>>(buildApiUrl(toApiPath(`/api/IssuedChecks/status/{status}`, { status: status })));
  }

  deleteById(id: number) {
    return this.http.delete<ApiResponse<unknown>>(buildApiUrl(toApiPath(`/api/IssuedChecks/{id}`, { id: id })));
  }

  getById(id: number) {
    return this.http.get<ApiResponse<unknown>>(buildApiUrl(toApiPath(`/api/IssuedChecks/{id}`, { id: id })));
  }

  update(id: number, body: unknown) {
    return this.http.put<ApiResponse<unknown>>(buildApiUrl(toApiPath(`/api/IssuedChecks/{id}`, { id: id })), body);
  }

  postApprove(id: number, body: unknown) {
    return this.http.post<ApiResponse<unknown>>(buildApiUrl(toApiPath(`/api/IssuedChecks/{id}/approve`, { id: id })), body);
  }

  postBounce(id: number, body: unknown) {
    return this.http.post<ApiResponse<unknown>>(buildApiUrl(toApiPath(`/api/IssuedChecks/{id}/bounce`, { id: id })), body);
  }

  postCancel(id: number, body: unknown) {
    return this.http.post<ApiResponse<unknown>>(buildApiUrl(toApiPath(`/api/IssuedChecks/{id}/cancel`, { id: id })), body);
  }

  postPay(id: number, body: unknown) {
    return this.http.post<ApiResponse<unknown>>(buildApiUrl(toApiPath(`/api/IssuedChecks/{id}/pay`, { id: id })), body);
  }

  postPost(id: number, body: unknown) {
    return this.http.post<ApiResponse<unknown>>(buildApiUrl(toApiPath(`/api/IssuedChecks/{id}/post`, { id: id })), body);
  }

  postReject(id: number, body: unknown) {
    return this.http.post<ApiResponse<unknown>>(buildApiUrl(toApiPath(`/api/IssuedChecks/{id}/reject`, { id: id })), body);
  }
}
