import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';

import { buildApiUrl, toApiPath } from '../api/api-url';
import { ApiResponse } from '../api/models/api-response.model';
import { CreateSystemLogRequest, SystemLog } from '../api/models/system-log.models';

@Injectable({ providedIn: 'root' })
export class SystemLogService {
  private http = inject(HttpClient);
  private readonly basePath = '/api/SystemLog';

  getAll(): Observable<SystemLog[]> {
    return this.http
      .get<SystemLog[] | ApiResponse<SystemLog[]>>(buildApiUrl(this.basePath))
      .pipe(map((response) => this.normalizeList(response)));
  }

  getById(id: number): Observable<SystemLog> {
    return this.http
      .get<SystemLog | ApiResponse<SystemLog>>(buildApiUrl(toApiPath(`${this.basePath}/{id}`, { id })))
      .pipe(map((response) => this.normalizeItem(response)));
  }

  create(request: CreateSystemLogRequest): Observable<SystemLog> {
    return this.http
      .post<SystemLog | ApiResponse<SystemLog>>(buildApiUrl(this.basePath), request)
      .pipe(map((response) => this.normalizeItem(response)));
  }

  private normalizeList(response: SystemLog[] | ApiResponse<SystemLog[]>): SystemLog[] {
    if (Array.isArray(response)) {
      return response;
    }

    if (response.success && Array.isArray(response.data)) {
      return response.data;
    }

    throw new Error(response.message || response.errors?.join(', ') || 'Request failed');
  }

  private normalizeItem(response: SystemLog | ApiResponse<SystemLog>): SystemLog {
    if (response && typeof response === 'object' && 'logID' in response) {
      return response;
    }

    const wrapped = response as ApiResponse<SystemLog>;
    if (wrapped.success && wrapped.data) {
      return wrapped.data;
    }

    throw new Error(wrapped.message || wrapped.errors?.join(', ') || 'Request failed');
  }
}
