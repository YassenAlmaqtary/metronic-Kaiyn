import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';

import { buildApiUrl, toApiPath } from '../api/api-url';
import { ApiResponse } from '../api/models/api-response.model';
import {
  BulkPostJournalRequest,
  BulkPostResult,
  CreateJournalEntryRequest,
  JournalEntry,
  UpdateJournalEntryRequest,
} from '../api/models/journal-entry.models';

@Injectable({ providedIn: 'root' })
export class JournalEntriesService {
  private http = inject(HttpClient);
  private readonly basePath = '/api/JournalEntries';

  getAll(): Observable<JournalEntry[]> {
    return this.http
      .get<JournalEntry[] | ApiResponse<JournalEntry[]>>(buildApiUrl(this.basePath))
      .pipe(map((response) => this.normalizeList(response)));
  }

  getPosted(): Observable<JournalEntry[]> {
    return this.http
      .get<JournalEntry[] | ApiResponse<JournalEntry[]>>(buildApiUrl(`${this.basePath}/posted`))
      .pipe(map((response) => this.normalizeList(response)));
  }

  getUnposted(): Observable<JournalEntry[]> {
    return this.http
      .get<JournalEntry[] | ApiResponse<JournalEntry[]>>(buildApiUrl(`${this.basePath}/unposted`))
      .pipe(map((response) => this.normalizeList(response)));
  }

  getByPeriod(periodId: number): Observable<JournalEntry[]> {
    return this.http
      .get<JournalEntry[] | ApiResponse<JournalEntry[]>>(
        buildApiUrl(toApiPath(`${this.basePath}/period/{periodId}`, { periodId })),
      )
      .pipe(map((response) => this.normalizeList(response)));
  }

  getByBranch(branchId: number): Observable<JournalEntry[]> {
    return this.http
      .get<JournalEntry[] | ApiResponse<JournalEntry[]>>(
        buildApiUrl(toApiPath(`${this.basePath}/branch/{branchId}`, { branchId })),
      )
      .pipe(map((response) => this.normalizeList(response)));
  }

  getByType(journalTypeId: number): Observable<JournalEntry[]> {
    return this.http
      .get<JournalEntry[] | ApiResponse<JournalEntry[]>>(
        buildApiUrl(toApiPath(`${this.basePath}/type/{journalTypeId}`, { journalTypeId })),
      )
      .pipe(map((response) => this.normalizeList(response)));
  }

  getById(entryId: number): Observable<JournalEntry> {
    return this.http
      .get<JournalEntry | ApiResponse<JournalEntry>>(
        buildApiUrl(toApiPath(`${this.basePath}/{entryId}`, { entryId })),
      )
      .pipe(map((response) => this.normalizeItem(response)));
  }

  getNextNumber(): Observable<number> {
    return this.http
      .get<number | ApiResponse<number>>(buildApiUrl(`${this.basePath}/next-number`))
      .pipe(map((response) => this.normalizeNumber(response)));
  }

  create(request: CreateJournalEntryRequest): Observable<JournalEntry> {
    return this.http
      .post<JournalEntry | ApiResponse<JournalEntry>>(buildApiUrl(this.basePath), request)
      .pipe(map((response) => this.normalizeItem(response)));
  }

  update(entryId: number, request: UpdateJournalEntryRequest): Observable<JournalEntry> {
    return this.http
      .put<JournalEntry | ApiResponse<JournalEntry>>(
        buildApiUrl(toApiPath(`${this.basePath}/{entryId}`, { entryId })),
        request,
      )
      .pipe(map((response) => this.normalizeItem(response)));
  }

  delete(entryId: number): Observable<void> {
    return this.http
      .delete<unknown | ApiResponse<unknown>>(
        buildApiUrl(toApiPath(`${this.basePath}/{entryId}`, { entryId })),
      )
      .pipe(map(() => undefined));
  }

  post(entryId: number, postedBy: string): Observable<JournalEntry> {
    return this.http
      .post<JournalEntry | ApiResponse<JournalEntry>>(
        buildApiUrl(toApiPath(`${this.basePath}/{entryId}/post`, { entryId })),
        postedBy,
      )
      .pipe(map((response) => this.normalizeItem(response)));
  }

  unpost(entryId: number): Observable<JournalEntry> {
    return this.http
      .post<JournalEntry | ApiResponse<JournalEntry>>(
        buildApiUrl(toApiPath(`${this.basePath}/{entryId}/unpost`, { entryId })),
        null,
      )
      .pipe(map((response) => this.normalizeItem(response)));
  }

  reverse(entryId: number, reversedBy: string): Observable<JournalEntry> {
    return this.http
      .post<JournalEntry | ApiResponse<JournalEntry>>(
        buildApiUrl(toApiPath(`${this.basePath}/{entryId}/reverse`, { entryId })),
        reversedBy,
      )
      .pipe(map((response) => this.normalizeItem(response)));
  }

  postBulk(request: BulkPostJournalRequest): Observable<BulkPostResult> {
    return this.http
      .post<BulkPostResult | ApiResponse<BulkPostResult>>(
        buildApiUrl(`${this.basePath}/post-bulk`),
        request,
      )
      .pipe(map((response) => this.normalizeBulk(response)));
  }

  private normalizeList(
    response: JournalEntry[] | ApiResponse<JournalEntry[]>,
  ): JournalEntry[] {
    if (Array.isArray(response)) {
      return response;
    }

    if (response.success && Array.isArray(response.data)) {
      return response.data;
    }

    throw new Error(response.message || response.errors?.join(', ') || 'Request failed');
  }

  private normalizeItem(response: JournalEntry | ApiResponse<JournalEntry>): JournalEntry {
    if (response && typeof response === 'object' && 'entryId' in response) {
      return response;
    }

    const wrapped = response as ApiResponse<JournalEntry>;
    if (wrapped.success && wrapped.data) {
      return wrapped.data;
    }

    throw new Error(wrapped.message || wrapped.errors?.join(', ') || 'Request failed');
  }

  private normalizeNumber(response: number | ApiResponse<number>): number {
    if (typeof response === 'number') {
      return response;
    }

    if (response.success && typeof response.data === 'number') {
      return response.data;
    }

    throw new Error(response.message || response.errors?.join(', ') || 'Request failed');
  }

  private normalizeBulk(response: BulkPostResult | ApiResponse<BulkPostResult>): BulkPostResult {
    if (response && typeof response === 'object' && 'totalRequested' in response) {
      return response;
    }

    const wrapped = response as ApiResponse<BulkPostResult>;
    if (wrapped.success && wrapped.data) {
      return wrapped.data;
    }

    throw new Error(wrapped.message || wrapped.errors?.join(', ') || 'Request failed');
  }
}
