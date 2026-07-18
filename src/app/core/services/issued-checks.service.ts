import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';

import { buildApiUrl, toApiPath } from '../api/api-url';
import { ApiResponse } from '../api/models/api-response.model';
import {
  IssueCheckRequest,
  IssuedCheck,
  PayCheckRequest,
  RejectRequest,
} from '../api/models/issued-check.models';
import { unwrapApiResponse } from '../api/utils/api-response.util';

@Injectable({ providedIn: 'root' })
export class IssuedChecksService {
  private http = inject(HttpClient);
  private readonly basePath = '/api/IssuedChecks';

  getAll(): Observable<IssuedCheck[]> {
    return this.http
      .get<ApiResponse<IssuedCheck[]>>(buildApiUrl(this.basePath))
      .pipe(map((response) => unwrapApiResponse(response)));
  }

  getById(id: number): Observable<IssuedCheck> {
    return this.http
      .get<ApiResponse<IssuedCheck>>(buildApiUrl(toApiPath(`${this.basePath}/{id}`, { id })))
      .pipe(map((response) => unwrapApiResponse(response)));
  }

  getByBankAccount(bankAccountId: number): Observable<IssuedCheck[]> {
    return this.http
      .get<ApiResponse<IssuedCheck[]>>(
        buildApiUrl(
          toApiPath(`${this.basePath}/bank-account/{bankAccountId}`, { bankAccountId }),
        ),
      )
      .pipe(map((response) => unwrapApiResponse(response)));
  }

  getByStatus(status: number): Observable<IssuedCheck[]> {
    return this.http
      .get<ApiResponse<IssuedCheck[]>>(
        buildApiUrl(toApiPath(`${this.basePath}/status/{status}`, { status })),
      )
      .pipe(map((response) => unwrapApiResponse(response)));
  }

  getRange(fromDate: string, toDate: string): Observable<IssuedCheck[]> {
    const params = new HttpParams().set('fromDate', fromDate).set('toDate', toDate);
    return this.http
      .get<ApiResponse<IssuedCheck[]>>(buildApiUrl(`${this.basePath}/range`), { params })
      .pipe(map((response) => unwrapApiResponse(response)));
  }

  create(request: IssueCheckRequest): Observable<IssuedCheck> {
    return this.http
      .post<ApiResponse<IssuedCheck>>(buildApiUrl(this.basePath), request)
      .pipe(map((response) => unwrapApiResponse(response)));
  }

  update(id: number, request: IssueCheckRequest): Observable<IssuedCheck> {
    return this.http
      .put<ApiResponse<IssuedCheck>>(
        buildApiUrl(toApiPath(`${this.basePath}/{id}`, { id })),
        request,
      )
      .pipe(map((response) => unwrapApiResponse(response)));
  }

  delete(id: number): Observable<void> {
    return this.http
      .delete<ApiResponse<unknown>>(buildApiUrl(toApiPath(`${this.basePath}/{id}`, { id })))
      .pipe(map(() => undefined));
  }

  post(id: number, userId: number): Observable<IssuedCheck> {
    return this.http
      .post<ApiResponse<IssuedCheck>>(
        buildApiUrl(toApiPath(`${this.basePath}/{id}/post`, { id })),
        userId,
      )
      .pipe(map((response) => unwrapApiResponse(response)));
  }

  pay(id: number, request: PayCheckRequest): Observable<IssuedCheck> {
    return this.http
      .post<ApiResponse<IssuedCheck>>(
        buildApiUrl(toApiPath(`${this.basePath}/{id}/pay`, { id })),
        request,
      )
      .pipe(map((response) => unwrapApiResponse(response)));
  }

  cancel(id: number, request: RejectRequest): Observable<IssuedCheck> {
    return this.http
      .post<ApiResponse<IssuedCheck>>(
        buildApiUrl(toApiPath(`${this.basePath}/{id}/cancel`, { id })),
        request,
      )
      .pipe(map((response) => unwrapApiResponse(response)));
  }

  bounce(id: number, request: RejectRequest): Observable<IssuedCheck> {
    return this.http
      .post<ApiResponse<IssuedCheck>>(
        buildApiUrl(toApiPath(`${this.basePath}/{id}/bounce`, { id })),
        request,
      )
      .pipe(map((response) => unwrapApiResponse(response)));
  }

  approve(id: number, userId: number): Observable<IssuedCheck> {
    return this.http
      .post<ApiResponse<IssuedCheck>>(
        buildApiUrl(toApiPath(`${this.basePath}/{id}/approve`, { id })),
        userId,
      )
      .pipe(map((response) => unwrapApiResponse(response)));
  }

  reject(id: number, request: RejectRequest): Observable<IssuedCheck> {
    return this.http
      .post<ApiResponse<IssuedCheck>>(
        buildApiUrl(toApiPath(`${this.basePath}/{id}/reject`, { id })),
        request,
      )
      .pipe(map((response) => unwrapApiResponse(response)));
  }
}
