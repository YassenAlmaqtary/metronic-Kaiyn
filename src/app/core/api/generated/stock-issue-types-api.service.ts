import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { buildApiUrl, toApiPath } from '../api-url';
import { ApiResponse } from '../models/api-response.model';

/** Generated from Swagger tag: StockIssueTypes */
@Injectable({ providedIn: 'root' })
export class StockIssueTypesApiService {
  private http = inject(HttpClient);

  getAll() {
    return this.http.get<ApiResponse<unknown>>(buildApiUrl('/api/StockIssueTypes'));
  }

  create(body: unknown) {
    return this.http.post<ApiResponse<unknown>>(buildApiUrl('/api/StockIssueTypes'), body);
  }

  deleteById(id: number) {
    return this.http.delete<ApiResponse<unknown>>(buildApiUrl(toApiPath(`/api/StockIssueTypes/{id}`, { id: id })));
  }

  getById(id: number) {
    return this.http.get<ApiResponse<unknown>>(buildApiUrl(toApiPath(`/api/StockIssueTypes/{id}`, { id: id })));
  }

  update(id: number, body: unknown) {
    return this.http.put<ApiResponse<unknown>>(buildApiUrl(toApiPath(`/api/StockIssueTypes/{id}`, { id: id })), body);
  }
}
