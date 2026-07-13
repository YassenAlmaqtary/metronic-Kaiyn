import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';

import { buildApiUrl, toApiPath } from '../api/api-url';
import { ApiResponse } from '../api/models/api-response.model';
import {
  Company,
  CreateCompanyRequest,
  UpdateCompanyRequest,
} from '../api/models/company.models';
import { unwrapApiResponse } from '../api/utils/api-response.util';

@Injectable({ providedIn: 'root' })
export class CompaniesService {
  private http = inject(HttpClient);
  private readonly basePath = '/api/Companies';

  getAll(): Observable<Company[]> {
    return this.http
      .get<ApiResponse<Company[]>>(buildApiUrl(this.basePath))
      .pipe(map((response) => unwrapApiResponse(response)));
  }

  getById(id: number): Observable<Company> {
    return this.http
      .get<ApiResponse<Company>>(buildApiUrl(toApiPath(`${this.basePath}/{id}`, { id })))
      .pipe(map((response) => unwrapApiResponse(response)));
  }

  create(request: CreateCompanyRequest): Observable<Company> {
    return this.http
      .post<ApiResponse<Company>>(buildApiUrl(this.basePath), request)
      .pipe(map((response) => unwrapApiResponse(response)));
  }

  update(id: number, request: UpdateCompanyRequest): Observable<Company> {
    return this.http
      .put<ApiResponse<Company>>(buildApiUrl(toApiPath(`${this.basePath}/{id}`, { id })), request)
      .pipe(map((response) => unwrapApiResponse(response)));
  }

  delete(id: number): Observable<void> {
    return this.http
      .delete<ApiResponse<unknown>>(buildApiUrl(toApiPath(`${this.basePath}/{id}`, { id })))
      .pipe(map((response) => unwrapApiResponse(response)), map(() => undefined));
  }
}
