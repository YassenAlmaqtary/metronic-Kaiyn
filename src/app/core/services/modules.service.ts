import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';

import { buildApiUrl, toApiPath } from '../api/api-url';
import { ApiResponse } from '../api/models/api-response.model';
import { AppModule, CreateModuleRequest, UpdateModuleRequest } from '../api/models/module.models';
import { unwrapApiResponse } from '../api/utils/api-response.util';

@Injectable({ providedIn: 'root' })
export class ModulesService {
  private http = inject(HttpClient);
  private readonly basePath = '/api/Modules';

  getAll(): Observable<AppModule[]> {
    return this.http
      .get<ApiResponse<AppModule[]>>(buildApiUrl(this.basePath))
      .pipe(map((response) => unwrapApiResponse(response)));
  }

  getById(id: number): Observable<AppModule> {
    return this.http
      .get<ApiResponse<AppModule>>(buildApiUrl(toApiPath(`${this.basePath}/{id}`, { id })))
      .pipe(map((response) => unwrapApiResponse(response)));
  }

  create(request: CreateModuleRequest): Observable<AppModule> {
    return this.http
      .post<ApiResponse<AppModule>>(buildApiUrl(this.basePath), request)
      .pipe(map((response) => unwrapApiResponse(response)));
  }

  update(id: number, request: UpdateModuleRequest): Observable<AppModule> {
    return this.http
      .put<ApiResponse<AppModule>>(buildApiUrl(toApiPath(`${this.basePath}/{id}`, { id })), request)
      .pipe(map((response) => unwrapApiResponse(response)));
  }

  delete(id: number): Observable<void> {
    return this.http
      .delete<ApiResponse<unknown>>(buildApiUrl(toApiPath(`${this.basePath}/{id}`, { id })))
      .pipe(map(() => undefined));
  }
}
