import { Component, ElementRef, ViewChild, effect, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { TranslatePipe } from '../../core/pipes/translate.pipe';
import { AiAssistantStepKey } from '../../core/api/models/sql-agent.models';
import { AiAssistantService } from '../../core/services/ai-assistant.service';
import { LanguageService } from '../../core/services/language.service';
import { TranslationKey } from '../../core/i18n';

type DeleteConfirmation = 'session' | 'memory';

@Component({
  selector: 'app-ai-assistant-panel',
  imports: [FormsModule, TranslatePipe],
  templateUrl: './ai-assistant-panel.component.html',
  styleUrl: './ai-assistant-panel.component.scss',
})
export class AiAssistantPanelComponent {
  readonly assistant = inject(AiAssistantService);
  private language = inject(LanguageService);

  draft = signal('');
  readonly deleteConfirmation = signal<DeleteConfirmation | null>(null);
  readonly suggestions: TranslationKey[] = [
    'aiAssistant.suggestion.unpaidInvoices',
    'aiAssistant.suggestion.accountGroupsCount',
    'aiAssistant.suggestion.accountGroupsList',
    'aiAssistant.suggestion.productsCount',
    'aiAssistant.suggestion.customersCount',
  ];

  @ViewChild('messagesEnd') private messagesEnd?: ElementRef<HTMLElement>;

  constructor() {
    effect(() => {
      this.assistant.messages();
      this.assistant.sending();
      queueMicrotask(() => this.scrollToBottom());
    });
  }

  onSubmit(): void {
    const text = this.draft().trim();
    if (!text) {
      return;
    }
    this.draft.set('');
    this.assistant.send(text);
  }

  onComposerKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.onSubmit();
    }
  }

  useSuggestion(key: TranslationKey): void {
    this.draft.set(this.language.translate(key));
    this.onSubmit();
  }

  openDeleteSessionConfirmation(): void {
    this.deleteConfirmation.set('session');
  }

  openDeleteMemoryConfirmation(): void {
    this.deleteConfirmation.set('memory');
  }

  closeDeleteConfirmation(): void {
    this.deleteConfirmation.set(null);
  }

  confirmDeletion(): void {
    const target = this.deleteConfirmation();
    this.deleteConfirmation.set(null);
    if (target === 'session') {
      this.assistant.deleteCurrentSession();
    } else if (target === 'memory') {
      this.assistant.deleteAllMemory();
    }
  }

  stepLabel(key: AiAssistantStepKey): string {
    return this.language.translate(`aiAssistant.step.${key}` as TranslationKey);
  }

  isActiveSession(sessionId: string): boolean {
    return sessionId === this.assistant.activeSessionId();
  }

  onSessionChange(event: Event): void {
    const target = event.target;
    if (target instanceof HTMLSelectElement) {
      this.assistant.selectSession(target.value);
    }
  }

  private scrollToBottom(): void {
    this.messagesEnd?.nativeElement?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }
}
