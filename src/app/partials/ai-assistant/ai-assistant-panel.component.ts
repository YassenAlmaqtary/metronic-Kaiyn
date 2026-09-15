import { Component, ElementRef, ViewChild, effect, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { TranslatePipe } from '../../core/pipes/translate.pipe';
import { AiAssistantService } from '../../core/services/ai-assistant.service';
import { LanguageService } from '../../core/services/language.service';
import { TranslationKey } from '../../core/i18n';

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
  readonly suggestions: TranslationKey[] = [
    'aiAssistant.suggestion.stock',
    'aiAssistant.suggestion.accounts',
    'aiAssistant.suggestion.invoices',
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

  private scrollToBottom(): void {
    this.messagesEnd?.nativeElement?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }
}
