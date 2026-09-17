/**
 * Multilingual Translations Engine for LAD Board
 * Supporting English (EN) and Spanish (ES) with zero untranslated UI strings.
 */

export type Locale = 'en' | 'es';

import enDictionary from '../../locales/en.json';
import esDictionary from '../../locales/es.json';

export const translations: Record<Locale, any> = {
  en: enDictionary,
  es: esDictionary,
};

export function getNestedTranslation(obj: any, path: string): string | undefined {
  const parts = path.split('.');
  let current = obj;
  for (const part of parts) {
    if (current && typeof current === 'object' && part in current) {
      current = current[part];
    } else {
      return undefined;
    }
  }
  return typeof current === 'string' ? current : undefined;
}

export function formatTranslation(
  template: string,
  params?: Record<string, string | number>
): string {
  if (!params) return template;
  let result = template;
  for (const [key, value] of Object.entries(params)) {
    result = result.replace(new RegExp(`\\{${key}\\}`, 'g'), String(value));
  }
  return result;
}

export function translate(
  locale: Locale,
  key: string,
  params?: Record<string, string | number>
): string {
  const dict = translations[locale] || translations.en;
  let text = getNestedTranslation(dict, key);

  if (!text && locale !== 'en') {
    // Fallback to English
    text = getNestedTranslation(translations.en, key);
  }

  if (!text) {
    console.warn(`Missing translation key: "${key}" for locale "${locale}"`);
    return key;
  }

  return formatTranslation(text, params);
}
