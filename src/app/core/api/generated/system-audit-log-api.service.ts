import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { buildApiUrl, toApiPath } from '../api-url';
import { ApiResponse } from '../models/api-response.model';

/** Generated from Swagger tag: SystemAuditLog */
@Injectable({ providedIn: 'root' })
export class SystemAuditLogApiService {
  private http = inject(HttpClient);

  getAll(pageNumber?: number, pageSize?: number, searchTerm?: string, tableName?: string, actionType?: string) {
    return this.http.get<ApiResponse<unknown>>(buildApiUrl('/api/SystemAuditLog'));
  }

  getById(id: number) {
    return this.http.get<ApiResponse<unknown>>(buildApiUrl(toApiPath(`/api/SystemAuditLog/{id}`, { id: id })));
  }
}
