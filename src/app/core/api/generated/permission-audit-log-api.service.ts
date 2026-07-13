import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { buildApiUrl, toApiPath } from '../api-url';
import { ApiResponse } from '../models/api-response.model';

/** Generated from Swagger tag: PermissionAuditLog */
@Injectable({ providedIn: 'root' })
export class PermissionAuditLogApiService {
  private http = inject(HttpClient);

  getAll(pageNumber?: number, pageSize?: number) {
    return this.http.get<ApiResponse<unknown>>(buildApiUrl('/api/PermissionAuditLog'));
  }

  getCount() {
    return this.http.get<ApiResponse<unknown>>(buildApiUrl('/api/PermissionAuditLog/count'));
  }

  getEntityByEntityTypeEntityId(entityType: string, entityId: number) {
    return this.http.get<ApiResponse<unknown>>(buildApiUrl(toApiPath(`/api/PermissionAuditLog/entity/{entityType}/{entityId}`, { entityType: entityType, entityId: entityId })));
  }

  getModuleByModuleId(moduleId: number) {
    return this.http.get<ApiResponse<unknown>>(buildApiUrl(toApiPath(`/api/PermissionAuditLog/module/{moduleId}`, { moduleId: moduleId })));
  }

  getUserByUserId(userId: number) {
    return this.http.get<ApiResponse<unknown>>(buildApiUrl(toApiPath(`/api/PermissionAuditLog/user/{userId}`, { userId: userId })));
  }
}
