import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { buildApiUrl, toApiPath } from '../api-url';
import { ApiResponse } from '../models/api-response.model';

/** Generated from Swagger tag: Auth */
@Injectable({ providedIn: 'root' })
export class AuthApiService {
  private http = inject(HttpClient);

  postLogin(body: unknown) {
    return this.http.post<ApiResponse<unknown>>(buildApiUrl('/api/Auth/login'), body);
  }

  postLogout() {
    return this.http.post<ApiResponse<unknown>>(buildApiUrl('/api/Auth/logout'), null);
  }

  postRefreshToken(body: unknown) {
    return this.http.post<ApiResponse<unknown>>(buildApiUrl('/api/Auth/refresh-token'), body);
  }
}
