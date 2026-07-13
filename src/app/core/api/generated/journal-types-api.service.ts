import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { buildApiUrl, toApiPath } from '../api-url';
import { ApiResponse } from '../models/api-response.model';

/** Generated from Swagger tag: JournalTypes */
@Injectable({ providedIn: 'root' })
export class JournalTypesApiService {
  private http = inject(HttpClient);

  getAll() {
    return this.http.get<ApiResponse<unknown>>(buildApiUrl('/api/JournalTypes'));
  }

  create(body: unknown) {
    return this.http.post<ApiResponse<unknown>>(buildApiUrl('/api/JournalTypes'), body);
  }

  getActive() {
    return this.http.get<ApiResponse<unknown>>(buildApiUrl('/api/JournalTypes/active'));
  }

  getCodeByCode(code: string) {
    return this.http.get<ApiResponse<unknown>>(buildApiUrl(toApiPath(`/api/JournalTypes/code/{code}`, { code: code })));
  }

  deleteById(id: number) {
    return this.http.delete<ApiResponse<unknown>>(buildApiUrl(toApiPath(`/api/JournalTypes/{id}`, { id: id })));
  }

  getById(id: number) {
    return this.http.get<ApiResponse<unknown>>(buildApiUrl(toApiPath(`/api/JournalTypes/{id}`, { id: id })));
  }

  update(id: number, body: unknown) {
    return this.http.put<ApiResponse<unknown>>(buildApiUrl(toApiPath(`/api/JournalTypes/{id}`, { id: id })), body);
  }
}
