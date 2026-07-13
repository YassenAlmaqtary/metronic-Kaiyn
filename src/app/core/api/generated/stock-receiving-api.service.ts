import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { buildApiUrl, toApiPath } from '../api-url';
import { ApiResponse } from '../models/api-response.model';

/** Generated from Swagger tag: StockReceiving */
@Injectable({ providedIn: 'root' })
export class StockReceivingApiService {
  private http = inject(HttpClient);

  getAll() {
    return this.http.get<ApiResponse<unknown>>(buildApiUrl('/api/StockReceiving'));
  }

  create(body: unknown) {
    return this.http.post<ApiResponse<unknown>>(buildApiUrl('/api/StockReceiving'), body);
  }

  getAvailableQty(itemId?: number, storeId?: number, branchId?: number, batchNo?: string, expiryDate?: string, unitId?: number) {
    return this.http.get<ApiResponse<unknown>>(buildApiUrl('/api/StockReceiving/available-qty'));
  }

  getBarcodeByBarcode(barcode: string) {
    return this.http.get<ApiResponse<unknown>>(buildApiUrl(toApiPath(`/api/StockReceiving/barcode/{barcode}`, { barcode: barcode })));
  }

  getExchangeRateByCurrencyId(currencyId: number) {
    return this.http.get<ApiResponse<unknown>>(buildApiUrl(toApiPath(`/api/StockReceiving/exchange-rate/{currencyId}`, { currencyId: currencyId })));
  }

  getItemUnitsByItemId(itemId: number) {
    return this.http.get<ApiResponse<unknown>>(buildApiUrl(toApiPath(`/api/StockReceiving/item-units/{itemId}`, { itemId: itemId })));
  }

  getNextNumber(branchId?: number) {
    return this.http.get<ApiResponse<unknown>>(buildApiUrl('/api/StockReceiving/next-number'));
  }

  getPending() {
    return this.http.get<ApiResponse<unknown>>(buildApiUrl('/api/StockReceiving/pending'));
  }

  deleteById(id: number) {
    return this.http.delete<ApiResponse<unknown>>(buildApiUrl(toApiPath(`/api/StockReceiving/{id}`, { id: id })));
  }

  getById(id: number) {
    return this.http.get<ApiResponse<unknown>>(buildApiUrl(toApiPath(`/api/StockReceiving/{id}`, { id: id })));
  }

  postPost(id: number, body: unknown) {
    return this.http.post<ApiResponse<unknown>>(buildApiUrl(toApiPath(`/api/StockReceiving/{id}/post`, { id: id })), body);
  }
}
