import { Injectable, inject, signal } from '@angular/core';
import { finalize } from 'rxjs';

import { environment } from '../../../environments/environment';
import { AiAssistantMessage } from '../api/models/sql-agent.models';
import { extractApiErrorMessage } from '../api/utils/api-response.util';
import { TranslationKey } from '../i18n';
import { LanguageService } from './language.service';
import { SqlAgentService } from './sql-agent.service';

@Injectable({ providedIn: 'root' })
export class AiAssistantService {
  private sqlAgent = inject(SqlAgentService);
  private language = inject(LanguageService);

  readonly open = signal(false);
  readonly sending = signal(false);
  readonly messages = signal<AiAssistantMessage[]>([]);

  private abortController: AbortController | null = null;

  show(): void {
    this.open.set(true);
    if (!this.messages().length) {
      this.messages.set([this.systemWelcome()]);
    }
  }

  hide(): void {
    this.open.set(false);
  }

  toggle(): void {
    if (this.open()) {
      this.hide();
    } else {
      this.show();
    }
  }

  clear(): void {
    this.cancel();
    this.messages.set([this.systemWelcome()]);
  }

  cancel(): void {
    this.abortController?.abort();
    this.abortController = null;
    this.sending.set(false);
    this.messages.update((list) =>
      list.map((message) =>
        message.streaming ? { ...message, streaming: false } : message,
      ),
    );
  }

  send(rawQuery: string): void {
    const query = rawQuery.trim();
    if (!query || this.sending()) {
      return;
    }

    const userMessage = this.createMessage('user', query);
    const placeholder = this.createMessage('assistant', '', { streaming: true });

    this.messages.update((list) => [...list, userMessage, placeholder]);
    this.sending.set(true);

    if (environment.sqlAgent.preferStream && environment.sqlAgent.streamPath) {
      this.sendViaStream(query, placeholder.id);
      return;
    }

    this.sendViaAsk(query, placeholder.id);
  }

  private sendViaAsk(query: string, assistantId: string): void {
    this.sqlAgent
      .ask(query)
      .pipe(finalize(() => this.sending.set(false)))
      .subscribe({
        next: (output) => this.finishAssistant(assistantId, output),
        error: (error) =>
          this.failAssistant(assistantId, this.describeAgentError(error)),
      });
  }

  private describeAgentError(error: unknown): string {
    const askUrl = `${environment.sqlAgent.baseUrl}${environment.sqlAgent.askPath}`;

    const status =
      error && typeof error === 'object' && 'status' in error
        ? Number((error as { status?: number }).status)
        : undefined;

    const isNetwork =
      status === 0 ||
      (typeof TypeError !== 'undefined' && error instanceof TypeError) ||
      (error instanceof Error && /failed to fetch|networkerror|load failed/i.test(error.message));

    if (isNetwork) {
      return `${this.t('aiAssistant.corsOrNetwork')}\n(${askUrl})`;
    }

    if (status === 401) {
      return `${this.t('aiAssistant.unauthorized')}\n(${askUrl})`;
    }

    if (status === 404) {
      return `${this.t('aiAssistant.proxyMissing')}\n(${askUrl})`;
    }

    const base = extractApiErrorMessage(error, this.t('aiAssistant.error'));
    return `${base}\n(${askUrl})`;
  }

  private sendViaStream(query: string, assistantId: string): void {
    this.abortController?.abort();
    this.abortController = new AbortController();
    let received = '';

    this.sqlAgent.askStream(
      query,
      {
        onChunk: (chunk) => {
          if (environment.sqlAgent.streamCumulative) {
            received = chunk;
          } else if (received && chunk.startsWith(received)) {
            received = chunk;
          } else {
            received += chunk;
          }
          this.patchAssistant(assistantId, received, true);
        },
        onDone: () => {
          this.sending.set(false);
          this.abortController = null;
          const text = received.trim() || this.t('aiAssistant.emptyResponse');
          this.finishAssistant(assistantId, text);
        },
        onError: (error) => {
          // Stream may be unavailable (auth/path/CORS) — fall back to /ask*.
          if (!received) {
            this.sendViaAsk(query, assistantId);
            return;
          }
          this.sending.set(false);
          this.abortController = null;
          this.failAssistant(
            assistantId,
            this.describeAgentError(error),
          );
        },
      },
      this.abortController.signal,
    );
  }

  private finishAssistant(id: string, content: string): void {
    this.patchAssistant(id, content, false, false);
  }

  private failAssistant(id: string, content: string): void {
    this.patchAssistant(id, content, false, true);
  }

  private patchAssistant(
    id: string,
    content: string,
    streaming: boolean,
    error = false,
  ): void {
    this.messages.update((list) =>
      list.map((message) =>
        message.id === id
          ? { ...message, content, streaming, error }
          : message,
      ),
    );
  }

  private systemWelcome(): AiAssistantMessage {
    return this.createMessage('system', this.t('aiAssistant.welcome'));
  }

  private createMessage(
    role: AiAssistantMessage['role'],
    content: string,
    extras: Partial<AiAssistantMessage> = {},
  ): AiAssistantMessage {
    return {
      id: `${role}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      role,
      content,
      createdAt: Date.now(),
      ...extras,
    };
  }

  private t(key: string): string {
    return this.language.translate(key as TranslationKey);
  }
}
