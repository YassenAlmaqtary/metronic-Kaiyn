import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';

import { buildApiUrl, toApiPath } from '../api/api-url';
import { ApiResponse } from '../api/models/api-response.model';
import {
  CreateJournalTypeRequest,
  JournalType,
  UpdateJournalTypeRequest,
} from '../api/models/journal-type.models';
import { unwrapApiResponse } from '../api/utils/api-response.util';

@Injectable({ providedIn: 'root' })
export class JournalTypesService {
  private http = inject(HttpClient);
  private readonly basePath = '/api/JournalTypes';

  getAll(): Observable<JournalType[]> {
    return this.http
      .get<JournalType[] | ApiResponse<JournalType[]>>(buildApiUrl(this.basePath))
      .pipe(map((response) => this.normalizeList(response)));
  }

  getActive(): Observable<JournalType[]> {
    return this.http
      .get<JournalType[] | ApiResponse<JournalType[]>>(buildApiUrl(`${this.basePath}/active`))
      .pipe(map((response) => this.normalizeList(response)));
  }

  getById(id: number): Observable<JournalType> {
    return this.http
      .get<ApiResponse<JournalType>>(buildApiUrl(toApiPath(`${this.basePath}/{id}`, { id })))
      .pipe(map((response) => unwrapApiResponse(response)));
  }

  create(request: CreateJournalTypeRequest): Observable<JournalType> {
    return this.http
      .post<ApiResponse<JournalType>>(buildApiUrl(this.basePath), request)
      .pipe(map((response) => unwrapApiResponse(response)));
  }

  update(id: number, request: UpdateJournalTypeRequest): Observable<JournalType> {
    return this.http
      .put<ApiResponse<JournalType>>(buildApiUrl(toApiPath(`${this.basePath}/{id}`, { id })), request)
      .pipe(map((response) => unwrapApiResponse(response)));
  }

  delete(id: number): Observable<void> {
    return this.http
      .delete<ApiResponse<unknown>>(buildApiUrl(toApiPath(`${this.basePath}/{id}`, { id })))
      .pipe(
        map((response) => unwrapApiResponse(response)),
        map(() => undefined),
      );
  }

  private normalizeList(response: JournalType[] | ApiResponse<JournalType[]>): JournalType[] {
    if (Array.isArray(response)) {
      return response;
    }

    if (response.success && Array.isArray(response.data)) {
      return response.data;
    }

    throw new Error(response.message || response.errors?.join(', ') || 'Request failed');
  }
}
