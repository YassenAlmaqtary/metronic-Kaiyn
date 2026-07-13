import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { buildApiUrl, toApiPath } from '../api-url';
import { ApiResponse } from '../models/api-response.model';

/** Generated from Swagger tag: StockIssue */
@Injectable({ providedIn: 'root' })
export class StockIssueApiService {
  private http = inject(HttpClient);

  getAll() {
    return this.http.get<ApiResponse<unknown>>(buildApiUrl('/api/StockIssue'));
  }

  create(body: unknown) {
    return this.http.post<ApiResponse<unknown>>(buildApiUrl('/api/StockIssue'), body);
  }

  getAvailableQty(itemId?: number, storeId?: number, branchId?: number, batchNo?: string, expiryDate?: string, unitId?: number) {
    return this.http.get<ApiResponse<unknown>>(buildApiUrl('/api/StockIssue/available-qty'));
  }

  getBarcodeByBarcode(barcode: string) {
    return this.http.get<ApiResponse<unknown>>(buildApiUrl(toApiPath(`/api/StockIssue/barcode/{barcode}`, { barcode: barcode })));
  }

  getExchangeRateByCurrencyId(currencyId: number) {
    return this.http.get<ApiResponse<unknown>>(buildApiUrl(toApiPath(`/api/StockIssue/exchange-rate/{currencyId}`, { currencyId: currencyId })));
  }

  getItemUnitsByItemId(itemId: number) {
    return this.http.get<ApiResponse<unknown>>(buildApiUrl(toApiPath(`/api/StockIssue/item-units/{itemId}`, { itemId: itemId })));
  }

  getNextNumber(branchId?: number) {
    return this.http.get<ApiResponse<unknown>>(buildApiUrl('/api/StockIssue/next-number'));
  }

  getPending() {
    return this.http.get<ApiResponse<unknown>>(buildApiUrl('/api/StockIssue/pending'));
  }

  deleteById(id: number) {
    return this.http.delete<ApiResponse<unknown>>(buildApiUrl(toApiPath(`/api/StockIssue/{id}`, { id: id })));
  }

  getById(id: number) {
    return this.http.get<ApiResponse<unknown>>(buildApiUrl(toApiPath(`/api/StockIssue/{id}`, { id: id })));
  }

  postPost(id: number, body: unknown) {
    return this.http.post<ApiResponse<unknown>>(buildApiUrl(toApiPath(`/api/StockIssue/{id}/post`, { id: id })), body);
  }
}
