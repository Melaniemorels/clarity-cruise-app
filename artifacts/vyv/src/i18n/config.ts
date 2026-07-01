import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

import en from './locales/en.json';
import es from './locales/es.json';

// Language resources
const resources = {
  en: { translation: en },
  es: { translation: es },
};

// Get saved language from localStorage
const getSavedLanguage = (): string | null => {
  try {
    return localStorage.getItem('vyv-language');
  } catch {
    return null;
  }
};

// Save language to localStorage
export const saveLanguage = (lang: string) => {
  try {
    localStorage.setItem('vyv-language', lang);
  } catch {
    // Ignore storage errors
  }
};

// Determine text direction based on language
export const getTextDirection = (lang: string): 'ltr' | 'rtl' => {
  const rtlLanguages = ['ar', 'he', 'fa', 'ur'];
  const baseLang = lang.split('-')[0];
  return rtlLanguages.includes(baseLang) ? 'rtl' : 'ltr';
};

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: false, // Never fall back to another language — prevents mixing
    supportedLngs: ['en', 'es'],
    
    // Language detection options
    detection: {
      // Order of language detection
      order: ['localStorage', 'navigator', 'htmlTag'],
      // Cache user language in localStorage
      caches: ['localStorage'],
      // localStorage key
      lookupLocalStorage: 'vyv-language',
    },
    
    // If a key is missing, return the key itself (not another language)
    returnNull: false,
    returnEmptyString: false,
    parseMissingKeyHandler: (key: string) => key,
    
    interpolation: {
      escapeValue: false, // React already escapes
    },
    
    // React-specific options
    react: {
      useSuspense: false,
    },
  });

// Apply saved language if exists, otherwise detect and normalize to supported
const savedLang = getSavedLanguage();
if (savedLang && ['en', 'es'].includes(savedLang)) {
  i18n.changeLanguage(savedLang);
} else {
  // Normalize detected language to supported ones
  const detected = i18n.language || navigator.language || 'en';
  const normalized = detected.startsWith('es') ? 'es' : 'en';
  i18n.changeLanguage(normalized);
  saveLanguage(normalized);
}

// Update document direction when language changes
i18n.on('languageChanged', (lng) => {
  document.documentElement.dir = getTextDirection(lng);
  document.documentElement.lang = lng;
  saveLanguage(lng);
});

// Set initial direction
document.documentElement.dir = getTextDirection(i18n.language);
document.documentElement.lang = i18n.language;

export default i18n;
