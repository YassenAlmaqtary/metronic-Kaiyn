import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';

import { buildApiUrl, toApiPath } from '../api/api-url';
import { ApiResponse } from '../api/models/api-response.model';
import {
  AccountGroup,
  CreateAccountGroupRequest,
  UpdateAccountGroupRequest,
} from '../api/models/account-group.models';

@Injectable({ providedIn: 'root' })
export class AccountGroupsService {
  private http = inject(HttpClient);
  private readonly basePath = '/api/AccountGroups';

  getAll(): Observable<AccountGroup[]> {
    return this.http
      .get<AccountGroup[] | ApiResponse<AccountGroup[]>>(buildApiUrl(this.basePath))
      .pipe(map((response) => this.normalizeList(response)));
  }

  getById(id: number): Observable<AccountGroup> {
    return this.http
      .get<AccountGroup | ApiResponse<AccountGroup>>(
        buildApiUrl(toApiPath(`${this.basePath}/{id}`, { id })),
      )
      .pipe(map((response) => this.normalizeItem(response)));
  }

  getByName(name: string): Observable<AccountGroup> {
    return this.http
      .get<AccountGroup | ApiResponse<AccountGroup>>(
        buildApiUrl(toApiPath(`${this.basePath}/name/{name}`, { name })),
      )
      .pipe(map((response) => this.normalizeItem(response)));
  }

  create(request: CreateAccountGroupRequest): Observable<AccountGroup> {
    return this.http
      .post<AccountGroup | ApiResponse<AccountGroup>>(buildApiUrl(this.basePath), request)
      .pipe(map((response) => this.normalizeItem(response)));
  }

  update(id: number, request: UpdateAccountGroupRequest): Observable<AccountGroup> {
    return this.http
      .put<AccountGroup | ApiResponse<AccountGroup>>(
        buildApiUrl(toApiPath(`${this.basePath}/{id}`, { id })),
        request,
      )
      .pipe(map((response) => this.normalizeItem(response)));
  }

  delete(id: number): Observable<void> {
    return this.http
      .delete<unknown | ApiResponse<unknown>>(
        buildApiUrl(toApiPath(`${this.basePath}/{id}`, { id })),
      )
      .pipe(map(() => undefined));
  }

  private normalizeList(response: AccountGroup[] | ApiResponse<AccountGroup[]>): AccountGroup[] {
    if (Array.isArray(response)) {
      return response;
    }

    if (response.success && Array.isArray(response.data)) {
      return response.data;
    }

    throw new Error(response.message || response.errors?.join(', ') || 'Request failed');
  }

  private normalizeItem(response: AccountGroup | ApiResponse<AccountGroup>): AccountGroup {
    if (response && typeof response === 'object' && 'groupId' in response) {
      return response;
    }

    const wrapped = response as ApiResponse<AccountGroup>;
    if (wrapped.success && wrapped.data) {
      return wrapped.data;
    }

    throw new Error(wrapped.message || wrapped.errors?.join(', ') || 'Request failed');
  }
}
