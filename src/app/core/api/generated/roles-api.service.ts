import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { buildApiUrl, toApiPath } from '../api-url';
import { ApiResponse } from '../models/api-response.model';

/** Generated from Swagger tag: Roles */
@Injectable({ providedIn: 'root' })
export class RolesApiService {
  private http = inject(HttpClient);

  getAll() {
    return this.http.get<ApiResponse<unknown>>(buildApiUrl('/api/Roles'));
  }

  create(body: unknown) {
    return this.http.post<ApiResponse<unknown>>(buildApiUrl('/api/Roles'), body);
  }

  getNameByName(name: string) {
    return this.http.get<ApiResponse<unknown>>(buildApiUrl(toApiPath(`/api/Roles/name/{name}`, { name: name })));
  }

  deleteById(id: number) {
    return this.http.delete<ApiResponse<unknown>>(buildApiUrl(toApiPath(`/api/Roles/{id}`, { id: id })));
  }

  getById(id: number) {
    return this.http.get<ApiResponse<unknown>>(buildApiUrl(toApiPath(`/api/Roles/{id}`, { id: id })));
  }

  update(id: number, body: unknown) {
    return this.http.put<ApiResponse<unknown>>(buildApiUrl(toApiPath(`/api/Roles/{id}`, { id: id })), body);
  }
}
