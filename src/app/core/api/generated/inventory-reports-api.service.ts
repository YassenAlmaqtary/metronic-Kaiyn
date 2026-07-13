import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { buildApiUrl, toApiPath } from '../api-url';
import { ApiResponse } from '../models/api-response.model';

/** Generated from Swagger tag: InventoryReports */
@Injectable({ providedIn: 'root' })
export class InventoryReportsApiService {
  private http = inject(HttpClient);

  postInventoryCurrentStock(body: unknown) {
    return this.http.post<ApiResponse<unknown>>(buildApiUrl('/api/reports/inventory/current-stock'), body);
  }

  postInventoryItemMovement(body: unknown) {
    return this.http.post<ApiResponse<unknown>>(buildApiUrl('/api/reports/inventory/item-movement'), body);
  }

  postInventoryStockIssue(body: unknown) {
    return this.http.post<ApiResponse<unknown>>(buildApiUrl('/api/reports/inventory/stock-issue'), body);
  }
}
