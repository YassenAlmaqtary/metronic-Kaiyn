import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';

import { buildApiUrl, toApiPath } from '../api/api-url';
import { ApiResponse } from '../api/models/api-response.model';
import {
  Branch,
  CreateBranchRequest,
  UpdateBranchRequest,
} from '../api/models/branch.models';
import { unwrapApiResponse } from '../api/utils/api-response.util';

@Injectable({ providedIn: 'root' })
export class BranchesService {
  private http = inject(HttpClient);
  private readonly basePath = '/api/Branches';

  getAll(): Observable<Branch[]> {
    return this.http
      .get<ApiResponse<Branch[]>>(buildApiUrl(this.basePath))
      .pipe(map((response) => unwrapApiResponse(response)));
  }

  getById(id: number): Observable<Branch> {
    return this.http
      .get<ApiResponse<Branch>>(buildApiUrl(toApiPath(`${this.basePath}/{id}`, { id })))
      .pipe(map((response) => unwrapApiResponse(response)));
  }

  create(request: CreateBranchRequest): Observable<Branch> {
    return this.http
      .post<ApiResponse<Branch>>(buildApiUrl(this.basePath), request)
      .pipe(map((response) => unwrapApiResponse(response)));
  }

  update(id: number, request: UpdateBranchRequest): Observable<Branch> {
    return this.http
      .put<ApiResponse<Branch>>(buildApiUrl(toApiPath(`${this.basePath}/{id}`, { id })), request)
      .pipe(map((response) => unwrapApiResponse(response)));
  }

  delete(id: number): Observable<void> {
    return this.http
      .delete<ApiResponse<unknown>>(buildApiUrl(toApiPath(`${this.basePath}/{id}`, { id })))
      .pipe(map((response) => unwrapApiResponse(response)), map(() => undefined));
  }
}
