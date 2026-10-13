import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { buildApiUrl, toApiPath } from '../api-url';
import { ApiResponse } from '../models/api-response.model';

/** Generated from Swagger tag: GeneralLedger */
@Injectable({ providedIn: 'root' })
export class GeneralLedgerApiService {
  private http = inject(HttpClient);

  getLedger(accId?: number, fromDate?: string, toDate?: string, branchId?: number, costCenterId?: number) {
    let params = new HttpParams();
    if (accId != null) {
      for (const value of Array.isArray(accId) ? accId : [accId]) {
        params = params.append('accId', String(value));
      }
    }
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
    if (branchId != null) {
      for (const value of Array.isArray(branchId) ? branchId : [branchId]) {
        params = params.append('branchId', String(value));
      }
    }
    if (costCenterId != null) {
      for (const value of Array.isArray(costCenterId) ? costCenterId : [costCenterId]) {
        params = params.append('costCenterId', String(value));
      }
    }
    return this.http.get<ApiResponse<unknown>>(buildApiUrl('/api/GeneralLedger/ledger'), { params });
  }

  getTrialBalance(fromDate?: string, toDate?: string, branchId?: number) {
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
    if (branchId != null) {
      for (const value of Array.isArray(branchId) ? branchId : [branchId]) {
        params = params.append('branchId', String(value));
      }
    }
    return this.http.get<ApiResponse<unknown>>(buildApiUrl('/api/GeneralLedger/trial-balance'), { params });
  }
}
