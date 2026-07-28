import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';

import { buildApiUrl } from '../api/api-url';
import { ApiResponse } from '../api/models/api-response.model';
import {
  CurrentStockFilter,
  CurrentStockReportResult,
} from '../api/models/inventory-reports.models';
import { unwrapApiResponse } from '../api/utils/api-response.util';

@Injectable({ providedIn: 'root' })
export class InventoryReportsService {
  private http = inject(HttpClient);

  getCurrentStock(filter: CurrentStockFilter = {}): Observable<CurrentStockReportResult> {
    return this.http
      .post<ApiResponse<CurrentStockReportResult>>(
        buildApiUrl('/api/reports/inventory/current-stock'),
        {
          branchId: filter.branchId ?? null,
          storeId: filter.storeId ?? null,
          itemId: filter.itemId ?? null,
          barcode: filter.barcode ?? null,
          hideZeroes: filter.hideZeroes ?? false,
        },
      )
      .pipe(map((r) => unwrapApiResponse(r)));
  }
}
