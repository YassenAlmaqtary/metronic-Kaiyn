import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';

import { buildApiUrl, toApiPath } from '../api/api-url';
import { ApiResponse } from '../api/models/api-response.model';
import {
  CreateStoreRequest,
  Store,
  UpdateStoreRequest,
} from '../api/models/store.models';
import { unwrapApiResponse } from '../api/utils/api-response.util';

@Injectable({ providedIn: 'root' })
export class StoresService {
  private http = inject(HttpClient);
  private readonly basePath = '/api/Stores';

  getAll(): Observable<Store[]> {
    return this.http
      .get<ApiResponse<Store[]>>(buildApiUrl(this.basePath))
      .pipe(map((response) => unwrapApiResponse(response)));
  }

  getById(id: number): Observable<Store> {
    return this.http
      .get<ApiResponse<Store>>(buildApiUrl(toApiPath(`${this.basePath}/{id}`, { id })))
      .pipe(map((response) => unwrapApiResponse(response)));
  }

  getByBranch(branchId: number): Observable<Store[]> {
    return this.http
      .get<ApiResponse<Store[]>>(
        buildApiUrl(toApiPath(`${this.basePath}/branch/{branchId}`, { branchId })),
      )
      .pipe(map((response) => unwrapApiResponse(response)));
  }

  create(request: CreateStoreRequest): Observable<Store> {
    return this.http
      .post<ApiResponse<Store>>(buildApiUrl(this.basePath), request)
      .pipe(map((response) => unwrapApiResponse(response)));
  }

  update(id: number, request: UpdateStoreRequest): Observable<Store> {
    return this.http
      .put<ApiResponse<Store>>(buildApiUrl(toApiPath(`${this.basePath}/{id}`, { id })), request)
      .pipe(map((response) => unwrapApiResponse(response)));
  }

  delete(id: number): Observable<void> {
    return this.http
      .delete<ApiResponse<unknown>>(buildApiUrl(toApiPath(`${this.basePath}/{id}`, { id })))
      .pipe(map(() => undefined));
  }
}
