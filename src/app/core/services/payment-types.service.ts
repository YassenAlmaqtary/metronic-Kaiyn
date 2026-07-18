import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';

import { buildApiUrl } from '../api/api-url';
import { ApiResponse } from '../api/models/api-response.model';
import { PaymentType } from '../api/models/payment-voucher.models';

@Injectable({ providedIn: 'root' })
export class PaymentTypesService {
  private http = inject(HttpClient);
  private readonly basePath = '/api/PaymentTypes';

  getAll(): Observable<PaymentType[]> {
    return this.http
      .get<PaymentType[] | ApiResponse<PaymentType[]>>(buildApiUrl(this.basePath))
      .pipe(map((response) => this.normalizeList(response)));
  }

  private normalizeList(response: PaymentType[] | ApiResponse<PaymentType[]>): PaymentType[] {
    if (Array.isArray(response)) {
      return response;
    }

    if (response.success && Array.isArray(response.data)) {
      return response.data;
    }

    throw new Error(response.message || response.errors?.join(', ') || 'Request failed');
  }
}
