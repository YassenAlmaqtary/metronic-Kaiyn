export const SUPPORTED_LOCALES = ['ar', 'en'] as const;

export type Locale = (typeof SUPPORTED_LOCALES)[number];

export const DEFAULT_LOCALE: Locale = 'ar';

export const LOCALE_STORAGE_KEY = 'kayian-erp-lang';

export function isLocale(value: string | null | undefined): value is Locale {
  return value === 'ar' || value === 'en';
}
