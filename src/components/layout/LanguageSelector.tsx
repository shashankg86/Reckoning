import React from 'react';
import { useTranslation } from 'react-i18next';
import { GlobeAltIcon, ChevronDownIcon } from '@heroicons/react/24/outline';
import { Button } from '../ui/Button';
import { useAuth } from '../../contexts/AuthContext';
import type { Language } from '../../contexts/POSContext';

// Language metadata from translation files
const AVAILABLE_LANGUAGES: Language[] = ['en', 'hi', 'ar', 'mr'];

export function LanguageSelector() {
  const { t, i18n } = useTranslation();
  const { state, updateStoreSettings } = useAuth();
  const [isOpen, setIsOpen] = React.useState(false);

  const currentLanguage = state.user?.store?.language || 'en';
  
  // Get native name from _meta in translation files
  const currentLangData = i18n.getResourceBundle(currentLanguage, 'translation');
  const currentNativeName = currentLangData?._meta?.nativeName || t(`languages.${currentLanguage}`);

  const handleLanguageChange = async (languageCode: Language) => {
    if (!state.user?.store) return;

    await i18n.changeLanguage(languageCode);
    await updateStoreSettings({ language: languageCode });

    setIsOpen(false);
  };

  return (
    <div className="relative">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-2 px-3 py-2"
        aria-label="Select language"
      >
        <GlobeAltIcon className="h-4 w-4" />
        <span className="text-sm font-medium">{currentNativeName}</span>
        <ChevronDownIcon className="h-3 w-3" />
      </Button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
            aria-hidden="true"
          />
          <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-md shadow-lg py-1 z-20 border border-gray-200 dark:border-gray-700">
            {AVAILABLE_LANGUAGES.map((langCode) => {
              const langData = i18n.getResourceBundle(langCode, 'translation');
              const nativeName = langData?._meta?.nativeName || t(`languages.${langCode}`);
              const name = langData?._meta?.name || t(`languages.${langCode}`);
              const isActive = currentLanguage === langCode;

              return (
                <button
                  key={langCode}
                  onClick={() => handleLanguageChange(langCode)}
                  className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center justify-between ${
                    isActive
                      ? 'bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400'
                      : 'text-gray-700 dark:text-gray-300'
                  }`}
                  aria-current={isActive ? 'true' : 'false'}
                >
                  <div>
                    <div className="font-medium">{nativeName}</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">{name}</div>
                  </div>
                  {isActive && (
                    <div className="w-2 h-2 bg-orange-500 rounded-full" aria-label="Selected" />
                  )}
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
