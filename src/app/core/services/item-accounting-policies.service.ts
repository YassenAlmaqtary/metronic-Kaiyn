import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';

import { buildApiUrl, toApiPath } from '../api/api-url';
import { ApiResponse } from '../api/models/api-response.model';
import {
  CreateItemAccountingPolicyRequest,
  CreateItemAccountingPolicyRuleRequest,
  ItemAccountingPolicy,
  ItemAccountingPolicyRule,
  UpdateItemAccountingPolicyRequest,
  UpdateItemAccountingPolicyRuleRequest,
} from '../api/models/item-accounting-policy.models';
import { unwrapApiResponse } from '../api/utils/api-response.util';

@Injectable({ providedIn: 'root' })
export class ItemAccountingPoliciesService {
  private http = inject(HttpClient);
  private readonly basePath = '/api/ItemAccountingPolicies';

  getAll(): Observable<ItemAccountingPolicy[]> {
    return this.http
      .get<ApiResponse<ItemAccountingPolicy[]>>(buildApiUrl(this.basePath))
      .pipe(map((response) => unwrapApiResponse(response)));
  }

  getById(id: number): Observable<ItemAccountingPolicy> {
    return this.http
      .get<ApiResponse<ItemAccountingPolicy>>(
        buildApiUrl(toApiPath(`${this.basePath}/{id}`, { id })),
      )
      .pipe(map((response) => unwrapApiResponse(response)));
  }

  create(request: CreateItemAccountingPolicyRequest): Observable<ItemAccountingPolicy> {
    return this.http
      .post<ApiResponse<ItemAccountingPolicy>>(buildApiUrl(this.basePath), request)
      .pipe(map((response) => unwrapApiResponse(response)));
  }

  update(id: number, request: UpdateItemAccountingPolicyRequest): Observable<ItemAccountingPolicy> {
    return this.http
      .put<ApiResponse<ItemAccountingPolicy>>(
        buildApiUrl(toApiPath(`${this.basePath}/{id}`, { id })),
        request,
      )
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

  getRules(policyId: number): Observable<ItemAccountingPolicyRule[]> {
    return this.http
      .get<ApiResponse<ItemAccountingPolicyRule[]>>(
        buildApiUrl(toApiPath(`${this.basePath}/{policyId}/rules`, { policyId })),
      )
      .pipe(map((response) => unwrapApiResponse(response)));
  }

  createRule(
    policyId: number,
    request: CreateItemAccountingPolicyRuleRequest,
  ): Observable<ItemAccountingPolicyRule> {
    return this.http
      .post<ApiResponse<ItemAccountingPolicyRule>>(
        buildApiUrl(toApiPath(`${this.basePath}/{policyId}/rules`, { policyId })),
        request,
      )
      .pipe(map((response) => unwrapApiResponse(response)));
  }

  updateRule(
    ruleId: number,
    request: UpdateItemAccountingPolicyRuleRequest,
  ): Observable<ItemAccountingPolicyRule> {
    return this.http
      .put<ApiResponse<ItemAccountingPolicyRule>>(
        buildApiUrl(toApiPath(`${this.basePath}/rules/{ruleId}`, { ruleId })),
        request,
      )
      .pipe(map((response) => unwrapApiResponse(response)));
  }

  deleteRule(ruleId: number): Observable<void> {
    return this.http
      .delete<ApiResponse<unknown>>(
        buildApiUrl(toApiPath(`${this.basePath}/rules/{ruleId}`, { ruleId })),
      )
      .pipe(
        map((response) => unwrapApiResponse(response)),
        map(() => undefined),
      );
  }
}
