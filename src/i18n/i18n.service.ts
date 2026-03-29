import { Injectable } from '@nestjs/common';
import * as fr from './translations/fr.json';
import * as en from './translations/en.json';

type TranslationMap = Record<string, Record<string, string>>;

const translations: Record<string, TranslationMap> = { fr, en };

@Injectable()
export class I18nService {
  private defaultLang = 'fr';

  /**
   * Get a translated string by dot-notation key
   * Example: t('missions.notFound', 'en') → "Mission not found"
   */
  t(key: string, lang?: string, params?: Record<string, string | number>): string {
    const language = lang || this.defaultLang;
    const [namespace, messageKey] = key.split('.');

    const map = translations[language] || translations[this.defaultLang];
    const ns = map?.[namespace];
    let message = ns?.[messageKey] || key;

    // Interpolate params: {min}, {max}, etc.
    if (params) {
      for (const [paramKey, value] of Object.entries(params)) {
        message = message.replace(`{${paramKey}}`, String(value));
      }
    }

    return message;
  }

  /**
   * Extract language from Accept-Language header
   */
  detectLanguage(acceptLanguage?: string): string {
    if (!acceptLanguage) return this.defaultLang;

    const preferred = acceptLanguage.split(',')[0]?.split('-')[0]?.toLowerCase();
    return translations[preferred] ? preferred : this.defaultLang;
  }
}
