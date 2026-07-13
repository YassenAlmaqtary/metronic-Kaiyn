import { HttpClient } from '@angular/common/http';
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
    return this.http.get<ApiResponse<unknown>>(buildApiUrl('/api/IssuedChecks/range'));
  }

  getStatusByStatus(status: string) {
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
