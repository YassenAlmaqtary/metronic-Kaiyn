import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';

import { buildApiUrl, toApiPath } from '../api/api-url';
import { ApiResponse } from '../api/models/api-response.model';
import {
  BulkSetRolePermissionsRequest,
  Permission,
  RolePermissionsMatrix,
  SetRolePermissionRequest,
} from '../api/models/permission.models';
import { unwrapApiResponse } from '../api/utils/api-response.util';

@Injectable({ providedIn: 'root' })
export class PermissionsService {
  private http = inject(HttpClient);
  private readonly basePath = '/api/Permissions';

  getAll(): Observable<Permission[]> {
    return this.http
      .get<ApiResponse<Permission[]>>(buildApiUrl(this.basePath))
      .pipe(map((response) => unwrapApiResponse(response)));
  }

  getById(id: number): Observable<Permission> {
    return this.http
      .get<ApiResponse<Permission>>(buildApiUrl(toApiPath(`${this.basePath}/{id}`, { id })))
      .pipe(map((response) => unwrapApiResponse(response)));
  }

  getRoleMatrix(roleId: number): Observable<RolePermissionsMatrix> {
    return this.http
      .get<ApiResponse<RolePermissionsMatrix>>(
        buildApiUrl(toApiPath(`${this.basePath}/roles/{roleId}/matrix`, { roleId })),
      )
      .pipe(map((response) => unwrapApiResponse(response)));
  }

  setRolePermission(request: SetRolePermissionRequest): Observable<boolean> {
    return this.http
      .post<ApiResponse<boolean>>(buildApiUrl(`${this.basePath}/roles/set`), request)
      .pipe(map((response) => unwrapApiResponse(response)));
  }

  setRolePermissionsBulk(request: BulkSetRolePermissionsRequest): Observable<boolean> {
    return this.http
      .post<ApiResponse<boolean>>(buildApiUrl(`${this.basePath}/roles/set-bulk`), request)
      .pipe(map((response) => unwrapApiResponse(response)));
  }
}
