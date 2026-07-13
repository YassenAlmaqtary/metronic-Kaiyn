import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';

import { buildApiUrl, toApiPath } from '../api/api-url';
import { ApiResponse } from '../api/models/api-response.model';
import {
  CreateRoleRequest,
  Role,
  UpdateRoleRequest,
} from '../api/models/role.models';
import { unwrapApiResponse } from '../api/utils/api-response.util';

@Injectable({ providedIn: 'root' })
export class RolesService {
  private http = inject(HttpClient);
  private readonly basePath = '/api/Roles';

  getAll(): Observable<Role[]> {
    return this.http
      .get<ApiResponse<Role[]>>(buildApiUrl(this.basePath))
      .pipe(map((response) => unwrapApiResponse(response)));
  }

  getById(id: number): Observable<Role> {
    return this.http
      .get<ApiResponse<Role>>(buildApiUrl(toApiPath(`${this.basePath}/{id}`, { id })))
      .pipe(map((response) => unwrapApiResponse(response)));
  }

  create(request: CreateRoleRequest): Observable<Role> {
    return this.http
      .post<ApiResponse<Role>>(buildApiUrl(this.basePath), request)
      .pipe(map((response) => unwrapApiResponse(response)));
  }

  update(id: number, request: UpdateRoleRequest): Observable<Role> {
    return this.http
      .put<ApiResponse<Role>>(buildApiUrl(toApiPath(`${this.basePath}/{id}`, { id })), request)
      .pipe(map((response) => unwrapApiResponse(response)));
  }

  delete(id: number): Observable<void> {
    return this.http
      .delete<ApiResponse<unknown>>(buildApiUrl(toApiPath(`${this.basePath}/{id}`, { id })))
      .pipe(map((response) => unwrapApiResponse(response)), map(() => undefined));
  }
}
