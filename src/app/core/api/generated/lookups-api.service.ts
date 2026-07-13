import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { buildApiUrl, toApiPath } from '../api-url';
import { ApiResponse } from '../models/api-response.model';

/** Generated from Swagger tag: Lookups */
@Injectable({ providedIn: 'root' })
export class LookupsApiService {
  private http = inject(HttpClient);

  getCustomers() {
    return this.http.get<ApiResponse<unknown>>(buildApiUrl('/api/Lookups/customers'));
  }

  getDocumentStatuses() {
    return this.http.get<ApiResponse<unknown>>(buildApiUrl('/api/Lookups/document-statuses'));
  }

  getPartnerTypes() {
    return this.http.get<ApiResponse<unknown>>(buildApiUrl('/api/Lookups/partner-types'));
  }

  getProducts() {
    return this.http.get<ApiResponse<unknown>>(buildApiUrl('/api/Lookups/products'));
  }

  getSuppliers() {
    return this.http.get<ApiResponse<unknown>>(buildApiUrl('/api/Lookups/suppliers'));
  }
}
