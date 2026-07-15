import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';

import { buildApiUrl } from '../api/api-url';
import { ApiResponse } from '../api/models/api-response.model';
import { AccountingPeriodLookup } from '../api/models/accounting-period.models';
import { unwrapApiResponse } from '../api/utils/api-response.util';

@Injectable({ providedIn: 'root' })
export class AccountingPeriodsService {
  private http = inject(HttpClient);
  private readonly basePath = '/api/AccountingPeriods';

  getOpen(): Observable<AccountingPeriodLookup[]> {
    return this.http
      .get<ApiResponse<AccountingPeriodLookup[]>>(buildApiUrl(`${this.basePath}/open`))
      .pipe(map((response) => unwrapApiResponse(response)));
  }

  getCurrent(): Observable<AccountingPeriodLookup> {
    return this.http
      .get<ApiResponse<AccountingPeriodLookup>>(buildApiUrl(`${this.basePath}/current`))
      .pipe(map((response) => unwrapApiResponse(response)));
  }
}
