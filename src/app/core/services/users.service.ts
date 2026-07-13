import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';

import { buildApiUrl, toApiPath } from '../api/api-url';
import { ApiResponse } from '../api/models/api-response.model';
import { CreateUserRequest, UpdateUserRequest, User } from '../api/models/user.models';
import { unwrapApiResponse } from '../api/utils/api-response.util';

@Injectable({ providedIn: 'root' })
export class UsersService {
  private http = inject(HttpClient);
  private readonly basePath = '/api/Users';

  getAll(): Observable<User[]> {
    return this.http
      .get<ApiResponse<User[]>>(buildApiUrl(this.basePath))
      .pipe(map((response) => unwrapApiResponse(response)));
  }

  getById(id: number): Observable<User> {
    return this.http
      .get<ApiResponse<User>>(buildApiUrl(toApiPath(`${this.basePath}/{id}`, { id })))
      .pipe(map((response) => unwrapApiResponse(response)));
  }

  create(request: CreateUserRequest): Observable<User> {
    return this.http
      .post<ApiResponse<User>>(buildApiUrl(this.basePath), request)
      .pipe(map((response) => unwrapApiResponse(response)));
  }

  update(id: number, request: UpdateUserRequest): Observable<User> {
    return this.http
      .put<ApiResponse<User>>(buildApiUrl(toApiPath(`${this.basePath}/{id}`, { id })), request)
      .pipe(map((response) => unwrapApiResponse(response)));
  }

  delete(id: number): Observable<void> {
    return this.http
      .delete<ApiResponse<unknown>>(buildApiUrl(toApiPath(`${this.basePath}/{id}`, { id })))
      .pipe(map((response) => unwrapApiResponse(response)), map(() => undefined));
  }
}
