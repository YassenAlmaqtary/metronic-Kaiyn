import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { buildApiUrl, toApiPath } from '../api-url';
import { ApiResponse } from '../models/api-response.model';

/** Generated from Swagger tag: Pricing */
@Injectable({ providedIn: 'root' })
export class PricingApiService {
  private http = inject(HttpClient);

  getBranchAssignments() {
    return this.http.get<ApiResponse<unknown>>(buildApiUrl('/api/Pricing/branch-assignments'));
  }

  postBranchAssignments(body: unknown) {
    return this.http.post<ApiResponse<unknown>>(buildApiUrl('/api/Pricing/branch-assignments'), body);
  }

  deleteBranchAssignmentsById(id: number) {
    return this.http.delete<ApiResponse<unknown>>(buildApiUrl(toApiPath(`/api/Pricing/branch-assignments/{id}`, { id: id })));
  }

  getBranchAssignmentsById(id: number) {
    return this.http.get<ApiResponse<unknown>>(buildApiUrl(toApiPath(`/api/Pricing/branch-assignments/{id}`, { id: id })));
  }

  updateBranchAssignments(id: number, body: unknown) {
    return this.http.put<ApiResponse<unknown>>(buildApiUrl(toApiPath(`/api/Pricing/branch-assignments/{id}`, { id: id })), body);
  }

  postBulkUpdate(body: unknown, userId?: number) {
    return this.http.post<ApiResponse<unknown>>(buildApiUrl('/api/Pricing/bulk-update'), body);
  }

  postChangeLog(body: unknown) {
    return this.http.post<ApiResponse<unknown>>(buildApiUrl('/api/Pricing/change-log'), body);
  }

  getDashboard(priceListId?: number, branchId?: number) {
    return this.http.get<ApiResponse<unknown>>(buildApiUrl('/api/Pricing/dashboard'));
  }

  getPriceLists() {
    return this.http.get<ApiResponse<unknown>>(buildApiUrl('/api/Pricing/price-lists'));
  }

  postPriceLists(body: unknown) {
    return this.http.post<ApiResponse<unknown>>(buildApiUrl('/api/Pricing/price-lists'), body);
  }

  deletePriceListsById(id: number) {
    return this.http.delete<ApiResponse<unknown>>(buildApiUrl(toApiPath(`/api/Pricing/price-lists/{id}`, { id: id })));
  }

  getPriceListsById(id: number) {
    return this.http.get<ApiResponse<unknown>>(buildApiUrl(toApiPath(`/api/Pricing/price-lists/{id}`, { id: id })));
  }

  updatePriceLists(id: number, body: unknown) {
    return this.http.put<ApiResponse<unknown>>(buildApiUrl(toApiPath(`/api/Pricing/price-lists/{id}`, { id: id })), body);
  }

  postUpdatePrice(body: unknown, userId?: number) {
    return this.http.post<ApiResponse<unknown>>(buildApiUrl('/api/Pricing/update-price'), body);
  }
}
