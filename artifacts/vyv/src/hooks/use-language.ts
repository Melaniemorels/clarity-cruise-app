import { useTranslation } from 'react-i18next';
import { useCallback } from 'react';
import { saveLanguage, getTextDirection } from '@/i18n/config';

export type SupportedLanguage = 'en' | 'es';

export interface LanguageOption {
  code: SupportedLanguage;
  name: string;
  nativeName: string;
}

export const SUPPORTED_LANGUAGES: LanguageOption[] = [
  { code: 'en', name: 'English', nativeName: 'English' },
  { code: 'es', name: 'Spanish', nativeName: 'Español' },
];

export function useLanguage() {
  const { i18n, t } = useTranslation();

  const currentLanguage = i18n.language.split('-')[0] as SupportedLanguage;
  const textDirection = getTextDirection(i18n.language);

  const changeLanguage = useCallback(async (lang: SupportedLanguage) => {
    await i18n.changeLanguage(lang);
    saveLanguage(lang);
  }, [i18n]);

  const getCurrentLanguageOption = useCallback((): LanguageOption | undefined => {
    return SUPPORTED_LANGUAGES.find(l => l.code === currentLanguage);
  }, [currentLanguage]);

  return {
    t,
    i18n,
    currentLanguage,
    textDirection,
    changeLanguage,
    supportedLanguages: SUPPORTED_LANGUAGES,
    getCurrentLanguageOption,
  };
}
