import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';

import { buildApiUrl, toApiPath } from '../api/api-url';
import { ApiResponse } from '../api/models/api-response.model';
import {
  PagedResponse,
  PermissionAuditLog,
  SystemAuditLog,
  SystemAuditLogQuery,
} from '../api/models/audit-log.models';
import { unwrapApiResponse } from '../api/utils/api-response.util';

@Injectable({ providedIn: 'root' })
export class AuditLogsService {
  private http = inject(HttpClient);
  private readonly systemPath = '/api/SystemAuditLog';
  private readonly permissionPath = '/api/PermissionAuditLog';

  getSystemLogs(query: SystemAuditLogQuery): Observable<PagedResponse<SystemAuditLog>> {
    let params = new HttpParams()
      .set('pageNumber', String(query.pageNumber))
      .set('pageSize', String(query.pageSize));
    if (query.searchTerm?.trim()) params = params.set('searchTerm', query.searchTerm.trim());
    if (query.tableName?.trim()) params = params.set('tableName', query.tableName.trim());
    if (query.actionType?.trim()) params = params.set('actionType', query.actionType.trim());

    return this.http
      .get<ApiResponse<PagedResponse<SystemAuditLog>>>(buildApiUrl(this.systemPath), { params })
      .pipe(map((response) => unwrapApiResponse(response)));
  }

  getSystemLogById(id: number): Observable<SystemAuditLog> {
    return this.http
      .get<ApiResponse<SystemAuditLog>>(buildApiUrl(toApiPath(`${this.systemPath}/{id}`, { id })))
      .pipe(map((response) => unwrapApiResponse(response)));
  }

  getPermissionLogs(pageNumber: number, pageSize: number): Observable<PermissionAuditLog[]> {
    const params = new HttpParams()
      .set('pageNumber', String(pageNumber))
      .set('pageSize', String(pageSize));
    return this.http
      .get<ApiResponse<PermissionAuditLog[]>>(buildApiUrl(this.permissionPath), { params })
      .pipe(map((response) => unwrapApiResponse(response) ?? []));
  }

  getPermissionLogCount(): Observable<number> {
    return this.http
      .get<ApiResponse<number>>(buildApiUrl(`${this.permissionPath}/count`))
      .pipe(map((response) => Number(unwrapApiResponse(response)) || 0));
  }
}
