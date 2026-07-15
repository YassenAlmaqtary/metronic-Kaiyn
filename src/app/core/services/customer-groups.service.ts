import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';

import { buildApiUrl, toApiPath } from '../api/api-url';
import { ApiResponse } from '../api/models/api-response.model';
import {
  CreateCustomerGroupRequest,
  CustomerGroup,
  UpdateCustomerGroupRequest,
} from '../api/models/customer-group.models';
import { unwrapApiResponse } from '../api/utils/api-response.util';

@Injectable({ providedIn: 'root' })
export class CustomerGroupsService {
  private http = inject(HttpClient);
  private readonly basePath = '/api/CustomerGroups';

  getAll(): Observable<CustomerGroup[]> {
    return this.http
      .get<ApiResponse<CustomerGroup[]>>(buildApiUrl(this.basePath))
      .pipe(map((response) => unwrapApiResponse(response)));
  }

  getById(id: number): Observable<CustomerGroup> {
    return this.http
      .get<ApiResponse<CustomerGroup>>(buildApiUrl(toApiPath(`${this.basePath}/{id}`, { id })))
      .pipe(map((response) => unwrapApiResponse(response)));
  }

  create(request: CreateCustomerGroupRequest): Observable<CustomerGroup> {
    return this.http
      .post<ApiResponse<CustomerGroup>>(buildApiUrl(this.basePath), request)
      .pipe(map((response) => unwrapApiResponse(response)));
  }

  update(id: number, request: UpdateCustomerGroupRequest): Observable<CustomerGroup> {
    return this.http
      .put<ApiResponse<CustomerGroup>>(buildApiUrl(toApiPath(`${this.basePath}/{id}`, { id })), request)
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
}
