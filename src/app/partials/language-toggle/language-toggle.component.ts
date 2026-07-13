import { Component, HostListener, inject, signal } from '@angular/core';

import { Locale } from '../../core/i18n';
import { TranslatePipe } from '../../core/pipes/translate.pipe';
import { LanguageService } from '../../core/services/language.service';

@Component({
  selector: 'app-language-toggle',
  imports: [TranslatePipe],
  templateUrl: './language-toggle.component.html',
  styleUrl: './language-toggle.component.scss',
})
export class LanguageToggleComponent {
  language = inject(LanguageService);

  isOpen = signal(false);

  readonly options: { locale: Locale; labelKey: 'lang.arabic' | 'lang.english' }[] = [
    { locale: 'ar', labelKey: 'lang.arabic' },
    { locale: 'en', labelKey: 'lang.english' },
  ];

  @HostListener('document:keydown.escape')
  onEscape(): void {
    this.closeMenu();
  }

  toggleMenu(): void {
    this.isOpen.update((open) => !open);
  }

  closeMenu(): void {
    this.isOpen.set(false);
  }

  selectLocale(locale: Locale): void {
    this.language.setLocale(locale);
    this.closeMenu();
  }

  isSelected(locale: Locale): boolean {
    return this.language.locale() === locale;
  }
}
