import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';

import { buildApiUrl } from '../api/api-url';
import { ApiResponse } from '../api/models/api-response.model';
import { JournalType } from '../api/models/journal-entry.models';

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
