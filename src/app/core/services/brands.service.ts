import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';

import { buildApiUrl, toApiPath } from '../api/api-url';
import { ApiResponse } from '../api/models/api-response.model';
import { Brand, CreateBrandRequest, UpdateBrandRequest } from '../api/models/brand.models';
import { unwrapApiResponse } from '../api/utils/api-response.util';

@Injectable({ providedIn: 'root' })
export class BrandsService {
  private http = inject(HttpClient);
  private readonly basePath = '/api/Brands';

  getAll(): Observable<Brand[]> {
    return this.http
      .get<ApiResponse<Brand[]>>(buildApiUrl(this.basePath))
      .pipe(map((response) => unwrapApiResponse(response)));
  }

  getById(id: number): Observable<Brand> {
    return this.http
      .get<ApiResponse<Brand>>(buildApiUrl(toApiPath(`${this.basePath}/{id}`, { id })))
      .pipe(map((response) => unwrapApiResponse(response)));
  }

  create(request: CreateBrandRequest): Observable<Brand> {
    return this.http
      .post<ApiResponse<Brand>>(buildApiUrl(this.basePath), request)
      .pipe(map((response) => unwrapApiResponse(response)));
  }

  update(id: number, request: UpdateBrandRequest): Observable<Brand> {
    return this.http
      .put<ApiResponse<Brand>>(buildApiUrl(toApiPath(`${this.basePath}/{id}`, { id })), request)
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
