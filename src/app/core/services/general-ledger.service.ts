import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { buildApiUrl } from '../api/api-url';
import {
  AccountLedgerReport,
  GeneralLedgerQueryParams,
  TrialBalanceQueryParams,
  TrialBalanceRow,
} from '../api/models/general-ledger.models';

@Injectable({ providedIn: 'root' })
export class GeneralLedgerService {
  private http = inject(HttpClient);
  private readonly basePath = '/api/GeneralLedger';

  getLedger(params: GeneralLedgerQueryParams): Observable<AccountLedgerReport> {
    let httpParams = new HttpParams().set('accId', String(params.accId));

    if (params.fromDate) {
      httpParams = httpParams.set('fromDate', params.fromDate);
    }
    if (params.toDate) {
      httpParams = httpParams.set('toDate', params.toDate);
    }
    if (params.branchId != null) {
      httpParams = httpParams.set('branchId', String(params.branchId));
    }
    if (params.costCenterId != null) {
      httpParams = httpParams.set('costCenterId', String(params.costCenterId));
    }

    return this.http.get<AccountLedgerReport>(buildApiUrl(`${this.basePath}/ledger`), {
      params: httpParams,
    });
  }

  getTrialBalance(params: TrialBalanceQueryParams): Observable<TrialBalanceRow[]> {
    let httpParams = new HttpParams();

    if (params.fromDate) {
      httpParams = httpParams.set('fromDate', params.fromDate);
    }
    if (params.toDate) {
      httpParams = httpParams.set('toDate', params.toDate);
    }
    if (params.branchId != null) {
      httpParams = httpParams.set('branchId', String(params.branchId));
    }

    return this.http.get<TrialBalanceRow[]>(buildApiUrl(`${this.basePath}/trial-balance`), {
      params: httpParams,
    });
  }
}
