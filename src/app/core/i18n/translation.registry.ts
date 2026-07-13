import { Locale } from './models/locale.model';
import { ar } from './locales/ar';
import { en } from './locales/en';
import { TranslationKey } from './types/translation-key.type';

export const translationRegistry: Record<Locale, Readonly<Record<TranslationKey, string>>> = {
  ar,
  en,
};

export function translate(
  locale: Locale,
  key: TranslationKey,
  fallbackLocale: Locale = 'ar',
): string {
  return translationRegistry[locale][key]
    ?? translationRegistry[fallbackLocale][key]
    ?? key;
}
