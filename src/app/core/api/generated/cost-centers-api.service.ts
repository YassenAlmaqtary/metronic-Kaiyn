import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { buildApiUrl, toApiPath } from '../api-url';
import { ApiResponse } from '../models/api-response.model';

/** Generated from Swagger tag: CostCenters */
@Injectable({ providedIn: 'root' })
export class CostCentersApiService {
  private http = inject(HttpClient);

  getAll() {
    return this.http.get<ApiResponse<unknown>>(buildApiUrl('/api/CostCenters'));
  }

  create(body: unknown) {
    return this.http.post<ApiResponse<unknown>>(buildApiUrl('/api/CostCenters'), body);
  }

  getActive() {
    return this.http.get<ApiResponse<unknown>>(buildApiUrl('/api/CostCenters/active'));
  }

  getBranchByBranchId(branchId: number) {
    return this.http.get<ApiResponse<unknown>>(buildApiUrl(toApiPath(`/api/CostCenters/branch/{branchId}`, { branchId: branchId })));
  }

  getCodeByCode(code: string) {
    return this.http.get<ApiResponse<unknown>>(buildApiUrl(toApiPath(`/api/CostCenters/code/{code}`, { code: code })));
  }

  getParentByParentId(parentId: number) {
    return this.http.get<ApiResponse<unknown>>(buildApiUrl(toApiPath(`/api/CostCenters/parent/{parentId}`, { parentId: parentId })));
  }

  deleteById(id: number) {
    return this.http.delete<ApiResponse<unknown>>(buildApiUrl(toApiPath(`/api/CostCenters/{id}`, { id: id })));
  }

  getById(id: number) {
    return this.http.get<ApiResponse<unknown>>(buildApiUrl(toApiPath(`/api/CostCenters/{id}`, { id: id })));
  }

  update(id: number, body: unknown) {
    return this.http.put<ApiResponse<unknown>>(buildApiUrl(toApiPath(`/api/CostCenters/{id}`, { id: id })), body);
  }
}
