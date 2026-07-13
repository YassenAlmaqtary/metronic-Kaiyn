import { DOCUMENT } from '@angular/common';
import { Injectable, computed, inject, signal } from '@angular/core';

import {
  DEFAULT_LOCALE,
  LOCALE_STORAGE_KEY,
  Locale,
  TranslationKey,
  isLocale,
  translate,
} from '../i18n';

@Injectable({ providedIn: 'root' })
export class LanguageService {
  private document = inject(DOCUMENT);

  readonly locale = signal<Locale>(DEFAULT_LOCALE);
  readonly direction = computed(() => (this.locale() === 'ar' ? 'rtl' : 'ltr'));
  readonly isRtl = computed(() => this.direction() === 'rtl');

  init(): void {
    const saved = localStorage.getItem(LOCALE_STORAGE_KEY);
    this.setLocale(isLocale(saved) ? saved : DEFAULT_LOCALE, false);
  }

  setLocale(locale: Locale, persist = true): void {
    this.locale.set(locale);

    if (persist) {
      localStorage.setItem(LOCALE_STORAGE_KEY, locale);
    }

    const html = this.document.documentElement;
    html.setAttribute('lang', locale);
    html.setAttribute('dir', locale === 'ar' ? 'rtl' : 'ltr');
  }

  toggleLocale(): void {
    this.setLocale(this.locale() === 'ar' ? 'en' : 'ar');
  }

  translate(key: TranslationKey): string {
    return translate(this.locale(), key);
  }
}
