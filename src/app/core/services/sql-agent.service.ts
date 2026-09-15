import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map, timeout } from 'rxjs';

import { environment } from '../../../environments/environment';
import {
  SqlAgentAskRequest,
  SqlAgentAskResponse,
} from '../api/models/sql-agent.models';
import { TokenStorageService } from '../api/token-storage.service';

export interface SqlAgentStreamHandlers {
  onChunk: (text: string) => void;
  onDone: () => void;
  onError: (error: unknown) => void;
}

@Injectable({ providedIn: 'root' })
export class SqlAgentService {
  private http = inject(HttpClient);
  private tokenStorage = inject(TokenStorageService);

  private readonly baseUrl = environment.sqlAgent.baseUrl.replace(/\/$/, '');
  private readonly askTimeoutMs = environment.sqlAgent.askTimeoutMs ?? 180_000;

  /** Non-streaming ask — uses ERP JWT via HttpClient interceptor. */
  ask(query: string): Observable<string> {
    const body: SqlAgentAskRequest = { query: query.trim() };
    return this.http
      .post<SqlAgentAskResponse>(`${this.baseUrl}${environment.sqlAgent.askPath}`, body)
      .pipe(
        timeout(this.askTimeoutMs),
        map((response) => {
          const output = response?.output?.trim();
          if (!output) {
            throw new Error('Empty agent response');
          }
          return output;
        }),
      );
  }

  health(): Observable<unknown> {
    return this.http.get(`${this.baseUrl}${environment.sqlAgent.healthPath}`);
  }

  /**
   * SSE stream via fetch (POST). Prefer JWT stream path when available;
   * falls back to configured stream path (may be unauthenticated in local/dev).
   */
  askStream(query: string, handlers: SqlAgentStreamHandlers, signal?: AbortSignal): void {
    const path = environment.sqlAgent.streamPath;
    if (!path) {
      handlers.onError(new Error('Stream path is not configured'));
      return;
    }

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Accept: 'text/event-stream',
    };

    if (environment.sqlAgent.streamRequiresAuth) {
      const token = this.tokenStorage.getToken();
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
    }

    void fetch(`${this.baseUrl}${path}`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ query: query.trim() } satisfies SqlAgentAskRequest),
      signal,
    })
      .then(async (response) => {
        if (!response.ok) {
          const text = await response.text().catch(() => '');
          throw new Error(text || `HTTP ${response.status}`);
        }
        if (!response.body) {
          throw new Error('Empty stream body');
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) {
            break;
          }

          buffer += decoder.decode(value, { stream: true });
          const parts = buffer.split('\n');
          buffer = parts.pop() ?? '';

          for (const line of parts) {
            const chunk = this.parseSseLine(line);
            if (chunk) {
              handlers.onChunk(chunk);
            }
          }
        }

        if (buffer.trim()) {
          const chunk = this.parseSseLine(buffer);
          if (chunk) {
            handlers.onChunk(chunk);
          }
        }

        handlers.onDone();
      })
      .catch((error: unknown) => {
        if (signal?.aborted) {
          return;
        }
        handlers.onError(error);
      });
  }

  private parseSseLine(line: string): string | null {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith(':')) {
      return null;
    }
    if (trimmed.startsWith('data:')) {
      const data = trimmed.slice(5).trim();
      if (!data || data === '[DONE]') {
        return null;
      }
      try {
        const parsed = JSON.parse(data) as {
          chunk?: string;
          output?: string;
          token?: string;
          content?: string;
          done?: boolean;
        };
        if (parsed.done === true && parsed.chunk == null && parsed.output == null) {
          return null;
        }
        return parsed.chunk ?? parsed.output ?? parsed.token ?? parsed.content ?? data;
      } catch {
        return data;
      }
    }
    return null;
  }
}
