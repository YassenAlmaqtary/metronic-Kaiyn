import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';

import { buildApiUrl, toApiPath } from '../api/api-url';
import { ApiResponse } from '../api/models/api-response.model';
import {
  BranchPriceListAssignment,
  BulkUpdatePricesRequest,
  CreateBranchAssignmentRequest,
  CreatePriceListRequest,
  PriceChangeLog,
  PriceChangeLogFilter,
  PriceList,
  PricingDashboardItem,
  UpdateBranchAssignmentRequest,
  UpdatePriceListRequest,
  UpdateProductPriceRequest,
} from '../api/models/pricing.models';
import { unwrapApiResponse } from '../api/utils/api-response.util';

@Injectable({ providedIn: 'root' })
export class PricingService {
  private http = inject(HttpClient);
  private readonly basePath = '/api/Pricing';

  getPriceLists(): Observable<PriceList[]> {
    return this.http
      .get<ApiResponse<PriceList[]>>(buildApiUrl(`${this.basePath}/price-lists`))
      .pipe(map((response) => unwrapApiResponse(response)));
  }

  getPriceListById(id: number): Observable<PriceList> {
    return this.http
      .get<ApiResponse<PriceList>>(
        buildApiUrl(toApiPath(`${this.basePath}/price-lists/{id}`, { id })),
      )
      .pipe(map((response) => unwrapApiResponse(response)));
  }

  createPriceList(request: CreatePriceListRequest): Observable<PriceList> {
    return this.http
      .post<ApiResponse<PriceList>>(buildApiUrl(`${this.basePath}/price-lists`), request)
      .pipe(map((response) => unwrapApiResponse(response)));
  }

  updatePriceList(id: number, request: UpdatePriceListRequest): Observable<PriceList> {
    return this.http
      .put<ApiResponse<PriceList>>(
        buildApiUrl(toApiPath(`${this.basePath}/price-lists/{id}`, { id })),
        request,
      )
      .pipe(map((response) => unwrapApiResponse(response)));
  }

  deletePriceList(id: number): Observable<void> {
    return this.http
      .delete<ApiResponse<unknown>>(
        buildApiUrl(toApiPath(`${this.basePath}/price-lists/{id}`, { id })),
      )
      .pipe(
        map((response) => unwrapApiResponse(response)),
        map(() => undefined),
      );
  }

  getBranchAssignments(): Observable<BranchPriceListAssignment[]> {
    return this.http
      .get<ApiResponse<BranchPriceListAssignment[]>>(
        buildApiUrl(`${this.basePath}/branch-assignments`),
      )
      .pipe(map((response) => unwrapApiResponse(response)));
  }

  createBranchAssignment(
    request: CreateBranchAssignmentRequest,
  ): Observable<BranchPriceListAssignment> {
    return this.http
      .post<ApiResponse<BranchPriceListAssignment>>(
        buildApiUrl(`${this.basePath}/branch-assignments`),
        request,
      )
      .pipe(map((response) => unwrapApiResponse(response)));
  }

  updateBranchAssignment(
    id: number,
    request: UpdateBranchAssignmentRequest,
  ): Observable<BranchPriceListAssignment> {
    return this.http
      .put<ApiResponse<BranchPriceListAssignment>>(
        buildApiUrl(toApiPath(`${this.basePath}/branch-assignments/{id}`, { id })),
        request,
      )
      .pipe(map((response) => unwrapApiResponse(response)));
  }

  deleteBranchAssignment(id: number): Observable<void> {
    return this.http
      .delete<ApiResponse<unknown>>(
        buildApiUrl(toApiPath(`${this.basePath}/branch-assignments/{id}`, { id })),
      )
      .pipe(
        map((response) => unwrapApiResponse(response)),
        map(() => undefined),
      );
  }

  getDashboard(priceListId?: number | null, branchId?: number | null): Observable<PricingDashboardItem[]> {
    let params = new HttpParams();
    if (priceListId != null) {
      params = params.set('priceListId', String(priceListId));
    }
    if (branchId != null) {
      params = params.set('branchId', String(branchId));
    }

    return this.http
      .get<ApiResponse<PricingDashboardItem[]>>(buildApiUrl(`${this.basePath}/dashboard`), {
        params,
      })
      .pipe(map((response) => unwrapApiResponse(response)));
  }

  updatePrice(request: UpdateProductPriceRequest, userId?: number | null): Observable<unknown> {
    let params = new HttpParams();
    if (userId != null) {
      params = params.set('userId', String(userId));
    }

    return this.http
      .post<ApiResponse<unknown>>(buildApiUrl(`${this.basePath}/update-price`), request, {
        params,
      })
      .pipe(map((response) => unwrapApiResponse(response)));
  }

  bulkUpdate(request: BulkUpdatePricesRequest, userId?: number | null): Observable<unknown> {
    let params = new HttpParams();
    if (userId != null) {
      params = params.set('userId', String(userId));
    }

    return this.http
      .post<ApiResponse<unknown>>(buildApiUrl(`${this.basePath}/bulk-update`), request, {
        params,
      })
      .pipe(map((response) => unwrapApiResponse(response)));
  }

  getChangeLog(filter: PriceChangeLogFilter): Observable<PriceChangeLog[]> {
    return this.http
      .post<ApiResponse<PriceChangeLog[]>>(buildApiUrl(`${this.basePath}/change-log`), filter)
      .pipe(map((response) => unwrapApiResponse(response)));
  }
}
