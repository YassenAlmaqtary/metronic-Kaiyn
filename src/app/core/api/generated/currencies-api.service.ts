import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { buildApiUrl, toApiPath } from '../api-url';
import { ApiResponse } from '../models/api-response.model';

/** Generated from Swagger tag: Currencies */
@Injectable({ providedIn: 'root' })
export class CurrenciesApiService {
  private http = inject(HttpClient);

  getAll() {
    return this.http.get<ApiResponse<unknown>>(buildApiUrl('/api/Currencies'));
  }

  create(body: unknown) {
    return this.http.post<ApiResponse<unknown>>(buildApiUrl('/api/Currencies'), body);
  }

  getActive() {
    return this.http.get<ApiResponse<unknown>>(buildApiUrl('/api/Currencies/active'));
  }

  getBase() {
    return this.http.get<ApiResponse<unknown>>(buildApiUrl('/api/Currencies/base'));
  }

  deleteById(id: number) {
    return this.http.delete<ApiResponse<unknown>>(buildApiUrl(toApiPath(`/api/Currencies/{id}`, { id: id })));
  }

  getById(id: number) {
    return this.http.get<ApiResponse<unknown>>(buildApiUrl(toApiPath(`/api/Currencies/{id}`, { id: id })));
  }

  update(id: number, body: unknown) {
    return this.http.put<ApiResponse<unknown>>(buildApiUrl(toApiPath(`/api/Currencies/{id}`, { id: id })), body);
  }
}
