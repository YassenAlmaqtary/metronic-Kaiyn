import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { buildApiUrl, toApiPath } from '../api-url';
import { ApiResponse } from '../models/api-response.model';

/** Generated from Swagger tag: Modules */
@Injectable({ providedIn: 'root' })
export class ModulesApiService {
  private http = inject(HttpClient);

  getAll() {
    return this.http.get<ApiResponse<unknown>>(buildApiUrl('/api/Modules'));
  }

  create(body: unknown) {
    return this.http.post<ApiResponse<unknown>>(buildApiUrl('/api/Modules'), body);
  }

  getKeyByKey(key: string) {
    return this.http.get<ApiResponse<unknown>>(buildApiUrl(toApiPath(`/api/Modules/key/{key}`, { key: key })));
  }

  getRoot() {
    return this.http.get<ApiResponse<unknown>>(buildApiUrl('/api/Modules/root'));
  }

  getTree() {
    return this.http.get<ApiResponse<unknown>>(buildApiUrl('/api/Modules/tree'));
  }

  deleteById(id: number) {
    return this.http.delete<ApiResponse<unknown>>(buildApiUrl(toApiPath(`/api/Modules/{id}`, { id: id })));
  }

  getById(id: number) {
    return this.http.get<ApiResponse<unknown>>(buildApiUrl(toApiPath(`/api/Modules/{id}`, { id: id })));
  }

  update(id: number, body: unknown) {
    return this.http.put<ApiResponse<unknown>>(buildApiUrl(toApiPath(`/api/Modules/{id}`, { id: id })), body);
  }

  getSubmodulesById(id: number) {
    return this.http.get<ApiResponse<unknown>>(buildApiUrl(toApiPath(`/api/Modules/{id}/submodules`, { id: id })));
  }
}
