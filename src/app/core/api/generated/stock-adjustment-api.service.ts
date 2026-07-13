import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { buildApiUrl, toApiPath } from '../api-url';
import { ApiResponse } from '../models/api-response.model';

/** Generated from Swagger tag: StockAdjustment */
@Injectable({ providedIn: 'root' })
export class StockAdjustmentApiService {
  private http = inject(HttpClient);

  getAll() {
    return this.http.get<ApiResponse<unknown>>(buildApiUrl('/api/StockAdjustment'));
  }

  create(body: unknown) {
    return this.http.post<ApiResponse<unknown>>(buildApiUrl('/api/StockAdjustment'), body);
  }

  getDrafts() {
    return this.http.get<ApiResponse<unknown>>(buildApiUrl('/api/StockAdjustment/drafts'));
  }

  getItemsFromTakingByTakingId(takingId: number) {
    return this.http.get<ApiResponse<unknown>>(buildApiUrl(toApiPath(`/api/StockAdjustment/items-from-taking/{takingId}`, { takingId: takingId })));
  }

  getNextNumber() {
    return this.http.get<ApiResponse<unknown>>(buildApiUrl('/api/StockAdjustment/next-number'));
  }

  getById(id: number) {
    return this.http.get<ApiResponse<unknown>>(buildApiUrl(toApiPath(`/api/StockAdjustment/{id}`, { id: id })));
  }

  postPost(id: number, body: unknown) {
    return this.http.post<ApiResponse<unknown>>(buildApiUrl(toApiPath(`/api/StockAdjustment/{id}/post`, { id: id })), body);
  }
}
