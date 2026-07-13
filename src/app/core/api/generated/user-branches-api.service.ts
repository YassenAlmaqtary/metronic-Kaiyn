import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { buildApiUrl, toApiPath } from '../api-url';
import { ApiResponse } from '../models/api-response.model';

/** Generated from Swagger tag: UserBranches */
@Injectable({ providedIn: 'root' })
export class UserBranchesApiService {
  private http = inject(HttpClient);

  create(body: unknown) {
    return this.http.post<ApiResponse<unknown>>(buildApiUrl('/api/UserBranches'), body);
  }

  postAssign(body: unknown) {
    return this.http.post<ApiResponse<unknown>>(buildApiUrl('/api/UserBranches/assign'), body);
  }

  getBranchesByBranchId(branchId: number) {
    return this.http.get<ApiResponse<unknown>>(buildApiUrl(toApiPath(`/api/UserBranches/branches/{branchId}`, { branchId: branchId })));
  }

  getUsersByUserId(userId: number) {
    return this.http.get<ApiResponse<unknown>>(buildApiUrl(toApiPath(`/api/UserBranches/users/{userId}`, { userId: userId })));
  }

  getUsersBranchesByUserIdBranchId(userId: number, branchId: number) {
    return this.http.get<ApiResponse<unknown>>(buildApiUrl(toApiPath(`/api/UserBranches/users/{userId}/branches/{branchId}`, { userId: userId, branchId: branchId })));
  }

  updateUsersBranchesSetDefault(userId: number, branchId: number) {
    return this.http.put<ApiResponse<unknown>>(buildApiUrl(toApiPath(`/api/UserBranches/users/{userId}/branches/{branchId}/set-default`, { userId: userId, branchId: branchId })), null);
  }

  getUsersDefaultByUserId(userId: number) {
    return this.http.get<ApiResponse<unknown>>(buildApiUrl(toApiPath(`/api/UserBranches/users/{userId}/default`, { userId: userId })));
  }

  deleteById(id: number) {
    return this.http.delete<ApiResponse<unknown>>(buildApiUrl(toApiPath(`/api/UserBranches/{id}`, { id: id })));
  }

  update(id: number, body: unknown) {
    return this.http.put<ApiResponse<unknown>>(buildApiUrl(toApiPath(`/api/UserBranches/{id}`, { id: id })), body);
  }
}
