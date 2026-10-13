import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { buildApiUrl, toApiPath } from '../api-url';
import { ApiResponse } from '../models/api-response.model';

/** Generated from Swagger tag: SystemAuditLog */
@Injectable({ providedIn: 'root' })
export class SystemAuditLogApiService {
  private http = inject(HttpClient);

  getAll(pageNumber?: number, pageSize?: number, searchTerm?: string, tableName?: string, actionType?: string) {
    let params = new HttpParams();
    if (pageNumber != null) {
      for (const value of Array.isArray(pageNumber) ? pageNumber : [pageNumber]) {
        params = params.append('pageNumber', String(value));
      }
    }
    if (pageSize != null) {
      for (const value of Array.isArray(pageSize) ? pageSize : [pageSize]) {
        params = params.append('pageSize', String(value));
      }
    }
    if (searchTerm != null) {
      for (const value of Array.isArray(searchTerm) ? searchTerm : [searchTerm]) {
        params = params.append('searchTerm', String(value));
      }
    }
    if (tableName != null) {
      for (const value of Array.isArray(tableName) ? tableName : [tableName]) {
        params = params.append('tableName', String(value));
      }
    }
    if (actionType != null) {
      for (const value of Array.isArray(actionType) ? actionType : [actionType]) {
        params = params.append('actionType', String(value));
      }
    }
    return this.http.get<ApiResponse<unknown>>(buildApiUrl('/api/SystemAuditLog'), { params });
  }

  getById(id: number) {
    return this.http.get<ApiResponse<unknown>>(buildApiUrl(toApiPath(`/api/SystemAuditLog/{id}`, { id: id })));
  }
}
