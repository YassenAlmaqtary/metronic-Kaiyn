import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';

import { buildApiUrl, toApiPath } from '../api/api-url';
import { ApiResponse } from '../api/models/api-response.model';
import { StoreLookup } from '../api/models/store.models';
import { unwrapApiResponse } from '../api/utils/api-response.util';

@Injectable({ providedIn: 'root' })
export class StoresService {
  private http = inject(HttpClient);
  private readonly basePath = '/api/Stores';

  getAll(): Observable<StoreLookup[]> {
    return this.http
      .get<ApiResponse<StoreLookup[]>>(buildApiUrl(this.basePath))
      .pipe(map((response) => unwrapApiResponse(response)));
  }

  getByBranch(branchId: number): Observable<StoreLookup[]> {
    return this.http
      .get<ApiResponse<StoreLookup[]>>(
        buildApiUrl(toApiPath(`${this.basePath}/branch/{branchId}`, { branchId })),
      )
      .pipe(map((response) => unwrapApiResponse(response)));
  }
}
