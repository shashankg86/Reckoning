import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

import baseEn from '../locales/en.json';
import hi from '../locales/hi.json';
import ar from '../locales/ar.json';
import mr from '../locales/mr.json';
import onboardingEn from '../locales/partials/onboarding.en.json';

const en = { ...baseEn, onboarding: { ...(baseEn as any).onboarding, ...(onboardingEn as any).onboarding } } as const;

const resources = {
  en: { translation: en },
  hi: { translation: hi },
  ar: { translation: ar },
  mr: { translation: mr },
};

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    lng: 'en',
    fallbackLng: 'en',
    debug: false,
    interpolation: { escapeValue: false },
    detection: { order: ['localStorage', 'navigator', 'htmlTag'], caches: ['localStorage'] },
  });

export default i18n;