import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { buildApiUrl, toApiPath } from '../api-url';
import { ApiResponse } from '../models/api-response.model';

/** Generated from Swagger tag: JournalEntries */
@Injectable({ providedIn: 'root' })
export class JournalEntriesApiService {
  private http = inject(HttpClient);

  getAll() {
    return this.http.get<ApiResponse<unknown>>(buildApiUrl('/api/JournalEntries'));
  }

  create(body: unknown) {
    return this.http.post<ApiResponse<unknown>>(buildApiUrl('/api/JournalEntries'), body);
  }

  getBranchByBranchId(branchId: number) {
    return this.http.get<ApiResponse<unknown>>(buildApiUrl(toApiPath(`/api/JournalEntries/branch/{branchId}`, { branchId: branchId })));
  }

  getNextNumber() {
    return this.http.get<ApiResponse<unknown>>(buildApiUrl('/api/JournalEntries/next-number'));
  }

  getPeriodByPeriodId(periodId: number) {
    return this.http.get<ApiResponse<unknown>>(buildApiUrl(toApiPath(`/api/JournalEntries/period/{periodId}`, { periodId: periodId })));
  }

  postPostBulk(body: unknown) {
    return this.http.post<ApiResponse<unknown>>(buildApiUrl('/api/JournalEntries/post-bulk'), body);
  }

  getPosted() {
    return this.http.get<ApiResponse<unknown>>(buildApiUrl('/api/JournalEntries/posted'));
  }

  getTypeByJournalTypeId(journalTypeId: number) {
    return this.http.get<ApiResponse<unknown>>(buildApiUrl(toApiPath(`/api/JournalEntries/type/{journalTypeId}`, { journalTypeId: journalTypeId })));
  }

  getUnposted(fromDate?: string, toDate?: string, branchId?: number) {
    return this.http.get<ApiResponse<unknown>>(buildApiUrl('/api/JournalEntries/unposted'));
  }

  deleteByEntryId(entryId: number) {
    return this.http.delete<ApiResponse<unknown>>(buildApiUrl(toApiPath(`/api/JournalEntries/{entryId}`, { entryId: entryId })));
  }

  getByEntryId(entryId: number) {
    return this.http.get<ApiResponse<unknown>>(buildApiUrl(toApiPath(`/api/JournalEntries/{entryId}`, { entryId: entryId })));
  }

  update(entryId: number, body: unknown) {
    return this.http.put<ApiResponse<unknown>>(buildApiUrl(toApiPath(`/api/JournalEntries/{entryId}`, { entryId: entryId })), body);
  }

  postPost(entryId: number, body: unknown) {
    return this.http.post<ApiResponse<unknown>>(buildApiUrl(toApiPath(`/api/JournalEntries/{entryId}/post`, { entryId: entryId })), body);
  }

  postReverse(entryId: number, body: unknown) {
    return this.http.post<ApiResponse<unknown>>(buildApiUrl(toApiPath(`/api/JournalEntries/{entryId}/reverse`, { entryId: entryId })), body);
  }

  postUnpost(entryId: number) {
    return this.http.post<ApiResponse<unknown>>(buildApiUrl(toApiPath(`/api/JournalEntries/{entryId}/unpost`, { entryId: entryId })), null);
  }
}
