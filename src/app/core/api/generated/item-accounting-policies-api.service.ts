import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { buildApiUrl, toApiPath } from '../api-url';
import { ApiResponse } from '../models/api-response.model';

/** Generated from Swagger tag: ItemAccountingPolicies */
@Injectable({ providedIn: 'root' })
export class ItemAccountingPoliciesApiService {
  private http = inject(HttpClient);

  getAll() {
    return this.http.get<ApiResponse<unknown>>(buildApiUrl('/api/ItemAccountingPolicies'));
  }

  create(body: unknown) {
    return this.http.post<ApiResponse<unknown>>(buildApiUrl('/api/ItemAccountingPolicies'), body);
  }

  deleteRulesByRuleId(ruleId: number) {
    return this.http.delete<ApiResponse<unknown>>(buildApiUrl(toApiPath(`/api/ItemAccountingPolicies/rules/{ruleId}`, { ruleId: ruleId })));
  }

  updateRules(ruleId: number, body: unknown) {
    return this.http.put<ApiResponse<unknown>>(buildApiUrl(toApiPath(`/api/ItemAccountingPolicies/rules/{ruleId}`, { ruleId: ruleId })), body);
  }

  deleteById(id: number) {
    return this.http.delete<ApiResponse<unknown>>(buildApiUrl(toApiPath(`/api/ItemAccountingPolicies/{id}`, { id: id })));
  }

  getById(id: number) {
    return this.http.get<ApiResponse<unknown>>(buildApiUrl(toApiPath(`/api/ItemAccountingPolicies/{id}`, { id: id })));
  }

  update(id: number, body: unknown) {
    return this.http.put<ApiResponse<unknown>>(buildApiUrl(toApiPath(`/api/ItemAccountingPolicies/{id}`, { id: id })), body);
  }

  getRulesByPolicyId(policyId: number) {
    return this.http.get<ApiResponse<unknown>>(buildApiUrl(toApiPath(`/api/ItemAccountingPolicies/{policyId}/rules`, { policyId: policyId })));
  }

  postRules(policyId: number, body: unknown) {
    return this.http.post<ApiResponse<unknown>>(buildApiUrl(toApiPath(`/api/ItemAccountingPolicies/{policyId}/rules`, { policyId: policyId })), body);
  }
}
