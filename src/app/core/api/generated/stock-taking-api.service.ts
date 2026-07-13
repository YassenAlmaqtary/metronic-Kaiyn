import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { buildApiUrl, toApiPath } from '../api-url';
import { ApiResponse } from '../models/api-response.model';

/** Generated from Swagger tag: StockTaking */
@Injectable({ providedIn: 'root' })
export class StockTakingApiService {
  private http = inject(HttpClient);

  getAll() {
    return this.http.get<ApiResponse<unknown>>(buildApiUrl('/api/StockTaking'));
  }

  create(body: unknown) {
    return this.http.post<ApiResponse<unknown>>(buildApiUrl('/api/StockTaking'), body);
  }

  getAvailableForAdjustment() {
    return this.http.get<ApiResponse<unknown>>(buildApiUrl('/api/StockTaking/available-for-adjustment'));
  }

  getDrafts() {
    return this.http.get<ApiResponse<unknown>>(buildApiUrl('/api/StockTaking/drafts'));
  }

  getNextNumber() {
    return this.http.get<ApiResponse<unknown>>(buildApiUrl('/api/StockTaking/next-number'));
  }

  postSearch(body: unknown) {
    return this.http.post<ApiResponse<unknown>>(buildApiUrl('/api/StockTaking/search'), body);
  }

  getStoreItemsByStoreId(storeId: number) {
    return this.http.get<ApiResponse<unknown>>(buildApiUrl(toApiPath(`/api/StockTaking/store-items/{storeId}`, { storeId: storeId })));
  }

  getById(id: number) {
    return this.http.get<ApiResponse<unknown>>(buildApiUrl(toApiPath(`/api/StockTaking/{id}`, { id: id })));
  }

  postCancel(id: number, body: unknown) {
    return this.http.post<ApiResponse<unknown>>(buildApiUrl(toApiPath(`/api/StockTaking/{id}/cancel`, { id: id })), body);
  }

  postPost(id: number, body: unknown) {
    return this.http.post<ApiResponse<unknown>>(buildApiUrl(toApiPath(`/api/StockTaking/{id}/post`, { id: id })), body);
  }
}
