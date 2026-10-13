import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';

import { buildApiUrl, toApiPath } from '../api/api-url';
import { ApiResponse } from '../api/models/api-response.model';
import {
  CreateReferenceTypeRequest,
  ReferenceType,
  UpdateReferenceTypeRequest,
} from '../api/models/reference-type.models';
import { unwrapRawOrApiResponse } from '../api/utils/api-response.util';

@Injectable({ providedIn: 'root' })
export class ReferenceTypesService {
  private http = inject(HttpClient);
  private readonly basePath = '/api/ReferenceTypes';

  getAll(): Observable<ReferenceType[]> {
    return this.http
      .get<ReferenceType[] | ApiResponse<ReferenceType[]>>(buildApiUrl(this.basePath))
      .pipe(map((response) => unwrapRawOrApiResponse(response) ?? []));
  }

  getById(id: number): Observable<ReferenceType> {
    return this.http
      .get<ReferenceType | ApiResponse<ReferenceType>>(buildApiUrl(toApiPath(`${this.basePath}/{id}`, { id })))
      .pipe(map((response) => unwrapRawOrApiResponse(response)));
  }

  create(request: CreateReferenceTypeRequest): Observable<ReferenceType> {
    return this.http
      .post<ReferenceType | ApiResponse<ReferenceType>>(buildApiUrl(this.basePath), request)
      .pipe(map((response) => unwrapRawOrApiResponse(response)));
  }

  update(id: number, request: UpdateReferenceTypeRequest): Observable<void> {
    return this.http
      .put<unknown>(buildApiUrl(toApiPath(`${this.basePath}/{id}`, { id })), request)
      .pipe(map(() => undefined));
  }

  delete(id: number): Observable<void> {
    return this.http
      .delete<unknown>(buildApiUrl(toApiPath(`${this.basePath}/{id}`, { id })))
      .pipe(map(() => undefined));
  }
}
