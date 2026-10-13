import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';

import { buildApiUrl, toApiPath } from '../api/api-url';
import { ApiResponse } from '../api/models/api-response.model';
import {
  CreatePaymentTypeRequest,
  PaymentType,
  UpdatePaymentTypeRequest,
} from '../api/models/payment-type.models';
import { unwrapRawOrApiResponse } from '../api/utils/api-response.util';

@Injectable({ providedIn: 'root' })
export class PaymentTypesService {
  private http = inject(HttpClient);
  private readonly basePath = '/api/PaymentTypes';

  getAll(): Observable<PaymentType[]> {
    return this.http
      .get<PaymentType[] | ApiResponse<PaymentType[]>>(buildApiUrl(this.basePath))
      .pipe(map((response) => unwrapRawOrApiResponse(response) ?? []));
  }

  getById(id: number): Observable<PaymentType> {
    return this.http
      .get<PaymentType | ApiResponse<PaymentType>>(buildApiUrl(toApiPath(`${this.basePath}/{id}`, { id })))
      .pipe(map((response) => unwrapRawOrApiResponse(response)));
  }

  create(request: CreatePaymentTypeRequest): Observable<PaymentType> {
    return this.http
      .post<PaymentType | ApiResponse<PaymentType>>(buildApiUrl(this.basePath), request)
      .pipe(map((response) => unwrapRawOrApiResponse(response)));
  }

  update(id: number, request: UpdatePaymentTypeRequest): Observable<void> {
    return this.http
      .put<unknown>(buildApiUrl(toApiPath(`${this.basePath}/{id}`, { id })), request)
      .pipe(map(() => undefined));
  }

  delete(id: number): Observable<void> {
    return this.http
      .delete<unknown>(buildApiUrl(toApiPath(`${this.basePath}/{id}`, { id })))
      .pipe(map(() => undefined));
  }
}
