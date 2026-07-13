import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { buildApiUrl, toApiPath } from '../api-url';
import { ApiResponse } from '../models/api-response.model';

/** Generated from Swagger tag: GeneralLedger */
@Injectable({ providedIn: 'root' })
export class GeneralLedgerApiService {
  private http = inject(HttpClient);

  getLedger(accId?: string, fromDate?: string, toDate?: string, branchId?: number, costCenterId?: number) {
    return this.http.get<ApiResponse<unknown>>(buildApiUrl('/api/GeneralLedger/ledger'));
  }

  getTrialBalance(fromDate?: string, toDate?: string, branchId?: number) {
    return this.http.get<ApiResponse<unknown>>(buildApiUrl('/api/GeneralLedger/trial-balance'));
  }
}
