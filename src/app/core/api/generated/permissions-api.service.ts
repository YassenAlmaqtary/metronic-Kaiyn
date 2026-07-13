import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { buildApiUrl, toApiPath } from '../api-url';
import { ApiResponse } from '../models/api-response.model';

/** Generated from Swagger tag: Permissions */
@Injectable({ providedIn: 'root' })
export class PermissionsApiService {
  private http = inject(HttpClient);

  getAll() {
    return this.http.get<ApiResponse<unknown>>(buildApiUrl('/api/Permissions'));
  }

  getKeyByKey(key: string) {
    return this.http.get<ApiResponse<unknown>>(buildApiUrl(toApiPath(`/api/Permissions/key/{key}`, { key: key })));
  }

  postRolesSet(body: unknown) {
    return this.http.post<ApiResponse<unknown>>(buildApiUrl('/api/Permissions/roles/set'), body);
  }

  postRolesSetBulk(body: unknown) {
    return this.http.post<ApiResponse<unknown>>(buildApiUrl('/api/Permissions/roles/set-bulk'), body);
  }

  getRolesMatrixByRoleId(roleId: number) {
    return this.http.get<ApiResponse<unknown>>(buildApiUrl(toApiPath(`/api/Permissions/roles/{roleId}/matrix`, { roleId: roleId })));
  }

  postUsersCheck(body: unknown) {
    return this.http.post<ApiResponse<unknown>>(buildApiUrl('/api/Permissions/users/check'), body);
  }

  postUsersCopy(body: unknown) {
    return this.http.post<ApiResponse<unknown>>(buildApiUrl('/api/Permissions/users/copy'), body);
  }

  postUsersOverridesSet(body: unknown) {
    return this.http.post<ApiResponse<unknown>>(buildApiUrl('/api/Permissions/users/overrides/set'), body);
  }

  postUsersOverridesSetBulk(body: unknown) {
    return this.http.post<ApiResponse<unknown>>(buildApiUrl('/api/Permissions/users/overrides/set-bulk'), body);
  }

  getUsersByUserId(userId: number) {
    return this.http.get<ApiResponse<unknown>>(buildApiUrl(toApiPath(`/api/Permissions/users/{userId}`, { userId: userId })));
  }

  getUsersBranchesByUserIdBranchId(userId: number, branchId: number) {
    return this.http.get<ApiResponse<unknown>>(buildApiUrl(toApiPath(`/api/Permissions/users/{userId}/branches/{branchId}`, { userId: userId, branchId: branchId })));
  }

  getUsersOverridesByUserId(userId: number) {
    return this.http.get<ApiResponse<unknown>>(buildApiUrl(toApiPath(`/api/Permissions/users/{userId}/overrides`, { userId: userId })));
  }

  getById(id: number) {
    return this.http.get<ApiResponse<unknown>>(buildApiUrl(toApiPath(`/api/Permissions/{id}`, { id: id })));
  }
}
