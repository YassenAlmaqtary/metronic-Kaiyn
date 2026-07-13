import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { buildApiUrl, toApiPath } from '../api-url';
import { ApiResponse } from '../models/api-response.model';

/** Generated from Swagger tag: Employees */
@Injectable({ providedIn: 'root' })
export class EmployeesApiService {
  private http = inject(HttpClient);

  getLookup() {
    return this.http.get<ApiResponse<unknown>>(buildApiUrl('/api/Employees/lookup'));
  }
}
