import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { buildApiUrl, toApiPath } from '../api-url';
import { ApiResponse } from '../models/api-response.model';

/** Generated from Swagger tag: StockTransfer */
@Injectable({ providedIn: 'root' })
export class StockTransferApiService {
  private http = inject(HttpClient);

  getAll() {
    return this.http.get<ApiResponse<unknown>>(buildApiUrl('/api/StockTransfer'));
  }

  create(body: unknown) {
    return this.http.post<ApiResponse<unknown>>(buildApiUrl('/api/StockTransfer'), body);
  }

  getAvailableQty(itemId?: number, storeId?: number, branchId?: number, batchNo?: string, expiryDate?: string, unitId?: number) {
    let params = new HttpParams();
    if (itemId != null) {
      for (const value of Array.isArray(itemId) ? itemId : [itemId]) {
        params = params.append('itemId', String(value));
      }
    }
    if (storeId != null) {
      for (const value of Array.isArray(storeId) ? storeId : [storeId]) {
        params = params.append('storeId', String(value));
      }
    }
    if (branchId != null) {
      for (const value of Array.isArray(branchId) ? branchId : [branchId]) {
        params = params.append('branchId', String(value));
      }
    }
    if (batchNo != null) {
      for (const value of Array.isArray(batchNo) ? batchNo : [batchNo]) {
        params = params.append('batchNo', String(value));
      }
    }
    if (expiryDate != null) {
      for (const value of Array.isArray(expiryDate) ? expiryDate : [expiryDate]) {
        params = params.append('expiryDate', String(value));
      }
    }
    if (unitId != null) {
      for (const value of Array.isArray(unitId) ? unitId : [unitId]) {
        params = params.append('unitId', String(value));
      }
    }
    return this.http.get<ApiResponse<unknown>>(buildApiUrl('/api/StockTransfer/available-qty'), { params });
  }

  getBarcodeByBarcode(barcode: string) {
    return this.http.get<ApiResponse<unknown>>(buildApiUrl(toApiPath(`/api/StockTransfer/barcode/{barcode}`, { barcode: barcode })));
  }

  getExchangeRateByCurrencyId(currencyId: number) {
    return this.http.get<ApiResponse<unknown>>(buildApiUrl(toApiPath(`/api/StockTransfer/exchange-rate/{currencyId}`, { currencyId: currencyId })));
  }

  getItemUnitsByItemId(itemId: number) {
    return this.http.get<ApiResponse<unknown>>(buildApiUrl(toApiPath(`/api/StockTransfer/item-units/{itemId}`, { itemId: itemId })));
  }

  getNextNumber(branchId?: number) {
    let params = new HttpParams();
    if (branchId != null) {
      for (const value of Array.isArray(branchId) ? branchId : [branchId]) {
        params = params.append('branchId', String(value));
      }
    }
    return this.http.get<ApiResponse<unknown>>(buildApiUrl('/api/StockTransfer/next-number'), { params });
  }

  getPending() {
    return this.http.get<ApiResponse<unknown>>(buildApiUrl('/api/StockTransfer/pending'));
  }

  deleteById(id: number) {
    return this.http.delete<ApiResponse<unknown>>(buildApiUrl(toApiPath(`/api/StockTransfer/{id}`, { id: id })));
  }

  getById(id: number) {
    return this.http.get<ApiResponse<unknown>>(buildApiUrl(toApiPath(`/api/StockTransfer/{id}`, { id: id })));
  }

  postPost(id: number, body: unknown) {
    return this.http.post<ApiResponse<unknown>>(buildApiUrl(toApiPath(`/api/StockTransfer/{id}/post`, { id: id })), body);
  }
}
