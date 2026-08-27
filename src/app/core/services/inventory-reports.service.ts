import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';

import { buildApiUrl } from '../api/api-url';
import { ApiResponse } from '../api/models/api-response.model';
import {
  CurrentStockFilter,
  CurrentStockReportResult,
  ItemMovementFilter,
  ItemMovementReportResult,
  StockIssueReportFilter,
  StockIssueReportResult,
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

  getItemMovement(filter: ItemMovementFilter): Observable<ItemMovementReportResult> {
    return this.http
      .post<ApiResponse<ItemMovementReportResult>>(
        buildApiUrl('/api/reports/inventory/item-movement'),
        {
          itemId: filter.itemId,
          fromDate: filter.fromDate ?? null,
          toDate: filter.toDate ?? null,
          branchId: filter.branchId ?? null,
          storeId: filter.storeId ?? null,
          movementTypeId: filter.movementTypeId ?? null,
        },
      )
      .pipe(map((r) => unwrapApiResponse(r)));
  }

  getStockIssueReport(filter: StockIssueReportFilter): Observable<StockIssueReportResult> {
    return this.http
      .post<ApiResponse<StockIssueReportResult>>(
        buildApiUrl('/api/reports/inventory/stock-issue'),
        {
          fromDate: filter.fromDate ?? null,
          toDate: filter.toDate ?? null,
          branchId: filter.branchId ?? null,
          storeId: filter.storeId ?? null,
          status: filter.status ?? 0,
          searchTerm: filter.searchTerm ?? null,
        },
      )
      .pipe(map((r) => unwrapApiResponse(r)));
  }
}
