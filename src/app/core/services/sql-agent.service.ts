import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map, timeout } from 'rxjs';

import { environment } from '../../../environments/environment';
import {
  AiAssistantStepKey,
  SqlAgentAskRequest,
  SqlAgentAskResponse,
  SqlAgentSessionHistory,
  SqlAgentSessionSummary,
} from '../api/models/sql-agent.models';
import { TokenStorageService } from '../api/token-storage.service';

export interface SqlAgentStreamHandlers {
  onChunk: (text: string, mode?: 'delta' | 'cumulative') => void;
  onActivity?: (activity: AiAssistantStepKey) => void;
  onMemoryWarning?: () => void;
  onDone: () => void;
  onError: (error: unknown) => void;
}

interface ParsedStreamChunk {
  text: string;
  mode: 'delta' | 'cumulative';
}

@Injectable({ providedIn: 'root' })
export class SqlAgentService {
  private http = inject(HttpClient);
  private tokenStorage = inject(TokenStorageService);

  private readonly baseUrl = environment.sqlAgent.baseUrl.replace(/\/$/, '');
  private readonly askTimeoutMs = environment.sqlAgent.askTimeoutMs ?? 180_000;

  /** Non-streaming ask — uses ERP JWT via HttpClient interceptor. */
  ask(query: string, sessionId: string): Observable<SqlAgentAskResponse & { answer: string }> {
    const body: SqlAgentAskRequest = {
      query: query.trim(),
      session_id: sessionId,
      memory_enabled: true,
    };
    return this.http
      .post<SqlAgentAskResponse>(`${this.baseUrl}${environment.sqlAgent.askPath}`, body)
      .pipe(
        timeout(this.askTimeoutMs),
        map((response) => {
          const answer = (response?.answer ?? response?.output)?.trim();
          if (!answer) {
            throw new Error('Empty agent response');
          }
          return { ...response, answer };
        }),
      );
  }

  health(): Observable<unknown> {
    return this.http.get(`${this.baseUrl}${environment.sqlAgent.healthPath}`);
  }

  listSessions(): Observable<SqlAgentSessionSummary[]> {
    return this.http.get<SqlAgentSessionSummary[]>(`${this.baseUrl}/memory/sessions`);
  }

  getSession(sessionId: string): Observable<SqlAgentSessionHistory> {
    return this.http.get<SqlAgentSessionHistory>(
      `${this.baseUrl}/memory/sessions/${encodeURIComponent(sessionId)}`,
    );
  }

  deleteSession(sessionId: string): Observable<{ status: string }> {
    return this.http.delete<{ status: string }>(
      `${this.baseUrl}/memory/sessions/${encodeURIComponent(sessionId)}`,
    );
  }

  deleteAllMemory(): Observable<{ status: string }> {
    return this.http.delete<{ status: string }>(`${this.baseUrl}/memory/me`);
  }

  /**
   * SSE stream via fetch (POST). Prefer JWT stream path when available;
   * falls back to configured stream path (may be unauthenticated in local/dev).
   */
  askStream(
    query: string,
    sessionId: string,
    handlers: SqlAgentStreamHandlers,
    signal?: AbortSignal,
  ): void {
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
      body: JSON.stringify({
        query: query.trim(),
        session_id: sessionId,
        memory_enabled: true,
      } satisfies SqlAgentAskRequest),
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
        let eventData: string[] = [];
        let sseEventName = '';
        let activityCompleted = false;

        const emitRecord = (record: string, eventNameHint = ''): void => {
          const activity = this.parseActivity(record, eventNameHint);
          if (activity && !(activity === 'completed' && activityCompleted)) {
            handlers.onActivity?.(activity);
            activityCompleted = activity === 'completed';
          }
          if (this.isMemoryWarning(record, eventNameHint)) {
            handlers.onMemoryWarning?.();
          }
          const chunk = this.parseStreamRecord(
            record,
            environment.sqlAgent.streamCumulative,
            eventNameHint,
          );
          if (chunk) {
            handlers.onChunk(chunk.text, chunk.mode);
          }
        };

        const processLine = (line: string): void => {
          const trimmed = line.trim();
          if (!trimmed) {
            if (eventData.length) {
              emitRecord(eventData.join('\n'), sseEventName);
              eventData = [];
            }
            sseEventName = '';
            return;
          }
          if (trimmed.startsWith(':')) {
            return;
          }
          if (trimmed.startsWith('data:')) {
            eventData.push(trimmed.slice(5).trimStart());
            return;
          }
          if (trimmed.startsWith('event:')) {
            sseEventName = trimmed.slice(6).trim();
            return;
          }
          if (/^(id|retry):/.test(trimmed)) {
            return;
          }
          emitRecord(trimmed);
        };

        while (true) {
          const { done, value } = await reader.read();
          if (done) {
            break;
          }

          buffer += decoder.decode(value, { stream: true });
          const parts = buffer.split(/\r?\n/);
          buffer = parts.pop() ?? '';

          for (const line of parts) {
            processLine(line);
          }
        }

        buffer += decoder.decode();
        if (buffer.trim()) {
          processLine(buffer);
        }
        if (eventData.length) {
          emitRecord(eventData.join('\n'), sseEventName);
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

  private isMemoryWarning(record: string, eventNameHint: string): boolean {
    let parsed: unknown;
    try {
      parsed = JSON.parse(record.trim());
    } catch {
      return false;
    }

    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return false;
    }

    const event = parsed as Record<string, unknown>;
    const eventName =
      typeof event['event'] === 'string'
        ? event['event'].toLowerCase()
        : eventNameHint.toLowerCase();
    return eventName === 'memory_warning';
  }

  private parseActivity(record: string, eventNameHint: string): AiAssistantStepKey | null {
    let parsed: unknown;
    try {
      parsed = JSON.parse(record.trim());
    } catch {
      return null;
    }

    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return null;
    }

    const event = parsed as Record<string, unknown>;
    const eventName =
      typeof event['event'] === 'string'
        ? event['event'].toLowerCase()
        : eventNameHint.toLowerCase();
    const nodeName = typeof event['node'] === 'string' ? event['node'].toLowerCase() : '';
    const isAnswerNode = nodeName === 'generate_answer' || nodeName === 'memory_answer';

    if (
      eventName === 'complete' ||
      (eventName === 'on_chain_end' && isAnswerNode)
    ) {
      return 'completed';
    }
    if (eventName === 'on_tool_error' || eventName === 'on_chain_error') {
      return 'failed';
    }
    if (eventName === 'on_tool_start') {
      return 'querying';
    }
    if (eventName === 'on_tool_end') {
      return 'dataReady';
    }
    if (eventName === 'on_chat_model_start' || eventName === 'on_chat_model_stream') {
      return 'answering';
    }
    if (eventName === 'on_chain_start') {
      if (nodeName.includes('generate_answer') || nodeName.includes('memory_answer')) {
        return 'answering';
      }
      if (/sql|query|database|tool|retriev|search/.test(nodeName)) {
        return 'querying';
      }
      return 'analyzing';
    }
    if (eventName === 'on_chain_end' && /sql|query|database|tool|retriev|search/.test(nodeName)) {
      return 'dataReady';
    }

    return null;
  }

  private parseStreamRecord(
    record: string,
    defaultCumulative: boolean,
    eventNameHint = '',
  ): ParsedStreamChunk | null {
    const trimmed = record.trim();
    if (!trimmed || trimmed === '[DONE]') {
      return null;
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(trimmed);
    } catch {
      return trimmed.startsWith('{') || trimmed.startsWith('[')
        ? null
        : { text: trimmed, mode: defaultCumulative ? 'cumulative' : 'delta' };
    }

    if (typeof parsed === 'string') {
      return parsed
        ? { text: parsed, mode: defaultCumulative ? 'cumulative' : 'delta' }
        : null;
    }
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return null;
    }

    const event = parsed as Record<string, unknown>;
    const eventName =
      typeof event['event'] === 'string'
        ? event['event'].toLowerCase()
        : eventNameHint.toLowerCase();
    const nodeName = typeof event['node'] === 'string' ? event['node'].toLowerCase() : '';
    const data = 'data' in event ? event['data'] : event;

    if (eventName === 'complete' || eventName === 'on_chain_end') {
      if (
        eventName === 'on_chain_end' &&
        nodeName &&
        nodeName !== 'generate_answer' &&
        nodeName !== 'memory_answer'
      ) {
        return null;
      }
      const answer = this.extractAnswerText(data);
      return answer ? { text: answer, mode: 'cumulative' } : null;
    }

    if (
      eventName === 'on_chat_model_stream' ||
      eventName === 'on_llm_new_token' ||
      eventName === 'on_chain_stream'
    ) {
      const text = this.extractStreamText(data);
      return text ? { text, mode: 'delta' } : null;
    }

    if (eventName && !eventName.startsWith('on_')) {
      return null;
    }

    const answer = this.extractAnswerText(data);
    if (answer) {
      return { text: answer, mode: defaultCumulative ? 'cumulative' : 'delta' };
    }
    return null;
  }

  private extractStreamText(value: unknown): string {
    if (typeof value === 'string') {
      return value;
    }
    if (!value || typeof value !== 'object') {
      return '';
    }

    if (Array.isArray(value)) {
      return value.map((part) => this.extractStreamText(part)).join('');
    }

    const record = value as Record<string, unknown>;
    for (const key of ['chunk', 'delta', 'message', 'content', 'text', 'token']) {
      if (key in record) {
        const text = this.extractStreamText(record[key]);
        if (text) {
          return text;
        }
      }
    }
    return '';
  }

  private extractAnswerText(value: unknown, depth = 0): string {
    if (depth > 5 || value == null) {
      return '';
    }
    if (typeof value === 'string') {
      return value;
    }
    if (Array.isArray(value)) {
      return value.map((part) => this.extractAnswerText(part, depth + 1)).join('');
    }
    if (typeof value !== 'object') {
      return '';
    }

    const record = value as Record<string, unknown>;
    for (const key of ['answer', 'final_answer', 'finalAnswer', 'response', 'output', 'text', 'content']) {
      if (key in record) {
        const text = this.extractAnswerText(record[key], depth + 1);
        if (text) {
          return text;
        }
      }
    }
    for (const key of ['data', 'result', 'chunk', 'message']) {
      if (key in record) {
        const text = this.extractAnswerText(record[key], depth + 1);
        if (text) {
          return text;
        }
      }
    }
    return '';
  }
}
