import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';

import { buildApiUrl, toApiPath } from '../api/api-url';
import { ApiResponse } from '../api/models/api-response.model';
import {
  AssignUserBranchesDto,
  CreateUserBranchDto,
  UpdateUserBranchDto,
  UserBranchDto,
} from '../api/models/user-branch.models';
import { unwrapApiResponse } from '../api/utils/api-response.util';

@Injectable({ providedIn: 'root' })
export class UserBranchesService {
  private http = inject(HttpClient);
  private readonly basePath = '/api/UserBranches';

  getByUserId(userId: number): Observable<UserBranchDto[]> {
    return this.http
      .get<ApiResponse<UserBranchDto[]>>(
        buildApiUrl(toApiPath(`${this.basePath}/users/{userId}`, { userId })),
      )
      .pipe(map((response) => unwrapApiResponse(response)));
  }

  create(request: CreateUserBranchDto): Observable<UserBranchDto> {
    return this.http
      .post<ApiResponse<UserBranchDto>>(buildApiUrl(this.basePath), request)
      .pipe(map((response) => unwrapApiResponse(response)));
  }

  assign(request: AssignUserBranchesDto): Observable<UserBranchDto[]> {
    return this.http
      .post<ApiResponse<UserBranchDto[]>>(buildApiUrl(`${this.basePath}/assign`), request)
      .pipe(map((response) => unwrapApiResponse(response)));
  }

  update(id: number, request: UpdateUserBranchDto): Observable<UserBranchDto> {
    return this.http
      .put<ApiResponse<UserBranchDto>>(
        buildApiUrl(toApiPath(`${this.basePath}/{id}`, { id })),
        request,
      )
      .pipe(map((response) => unwrapApiResponse(response)));
  }

  delete(id: number): Observable<void> {
    return this.http
      .delete<ApiResponse<unknown>>(
        buildApiUrl(toApiPath(`${this.basePath}/{id}`, { id })),
      )
      .pipe(
        map((response) => unwrapApiResponse(response)),
        map(() => undefined),
      );
  }

  setDefault(userId: number, branchId: number): Observable<UserBranchDto> {
    return this.http
      .put<ApiResponse<UserBranchDto>>(
        buildApiUrl(
          toApiPath(`${this.basePath}/users/{userId}/branches/{branchId}/set-default`, {
            userId,
            branchId,
          }),
        ),
        {},
      )
      .pipe(map((response) => unwrapApiResponse(response)));
  }

  getDefault(userId: number): Observable<UserBranchDto> {
    return this.http
      .get<ApiResponse<UserBranchDto>>(
        buildApiUrl(toApiPath(`${this.basePath}/users/{userId}/default`, { userId })),
      )
      .pipe(map((response) => unwrapApiResponse(response)));
  }
}
