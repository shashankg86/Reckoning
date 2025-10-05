import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { BuildingStorefrontIcon, ChevronRightIcon } from '@heroicons/react/24/outline';
import type { Language, Currency, Theme } from '../context/POSContext';

export function OnboardingScreen() {
  const { t, i18n } = useTranslation();
  const { completeOnboarding, state } = useAuth();
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    storeType: '',
    storeName: '',
    language: 'en' as Language,
    currency: 'INR' as Currency,
    theme: 'light' as Theme,
  });

  const storeTypes = [
    { value: '', label: t('onboarding.selectStoreType') },
    { value: 'restaurant', label: t('onboarding.storeTypes.restaurant') },
    { value: 'cafe', label: t('onboarding.storeTypes.cafe') },
    { value: 'retail', label: t('onboarding.storeTypes.retail') },
    { value: 'salon', label: t('onboarding.storeTypes.salon') },
    { value: 'pharmacy', label: t('onboarding.storeTypes.pharmacy') },
    { value: 'other', label: t('onboarding.storeTypes.other') },
  ];

  const languages = [
    { value: 'en', label: 'English' },
    { value: 'hi', label: 'हिंदी' },
    { value: 'ar', label: 'العربية' },
    { value: 'mr', label: 'मराठी' },
  ];

  const currencies = [
    { value: 'INR', label: '₹ Indian Rupee' },
    { value: 'AED', label: 'د.إ UAE Dirham' },
  ];

  const themes = [
    { value: 'light', label: t('onboarding.themes.light') },
    { value: 'dark', label: t('onboarding.themes.dark') },
  ];

  const handleComplete = async () => {
    const storeData = {
      name: formData.storeName,
      type: formData.storeType,
      language: formData.language,
      currency: formData.currency,
      theme: formData.theme,
    };

    await completeOnboarding(storeData);
  };

  const nextStep = () => {
    if (step < 4) setStep(step + 1);
    else handleComplete();
  };

  const prevStep = () => {
    if (step > 1) setStep(step - 1);
  };

  const canProceed = () => {
    switch (step) {
      case 1:
        return formData.storeType !== '';
      case 2:
        return formData.storeName.trim() !== '';
      case 3:
      case 4:
        return true;
      default:
        return false;
    }
  };

  const handleLanguageChange = (language: Language) => {
    setFormData({ ...formData, language });
    i18n.changeLanguage(language);
    
    // Auto-set currency based on language
    const defaultCurrency = language === 'ar' ? 'AED' : 'INR';
    setFormData(prev => ({ ...prev, language, currency: defaultCurrency }));
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-red-50 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white dark:bg-gray-800 rounded-lg shadow-xl p-8">
        <div className="text-center mb-8">
          <div className="mx-auto w-16 h-16 bg-orange-100 dark:bg-orange-900 rounded-full flex items-center justify-center mb-4">
            <BuildingStorefrontIcon className="w-8 h-8 text-orange-500 dark:text-orange-400" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            {t('onboarding.welcome')}
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            {t('onboarding.letsSetup')}
          </p>
        </div>

        {/* Progress Indicator */}
        <div className="flex justify-center mb-8">
          <div className="flex space-x-2">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className={`w-2 h-2 rounded-full ${i <= step ? 'bg-orange-500' : 'bg-gray-300 dark:bg-gray-600'
                  }`}
              />
            ))}
          </div>
        </div>

        <div className="space-y-6">
          {step === 1 && (
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                {t('onboarding.businessType')}
              </h2>
              <Select
                value={formData.storeType}
                onChange={(e) =>
                  setFormData({ ...formData, storeType: e.target.value })
                }
                options={storeTypes}
              />
            </div>
          )}

          {step === 2 && (
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                {t('onboarding.storeName')}
              </h2>
              <Input
                value={formData.storeName}
                onChange={(e) =>
                  setFormData({ ...formData, storeName: e.target.value })
                }
                placeholder={t('onboarding.enterStoreName')}
                autoFocus
              />
            </div>
          )}

          {step === 3 && (
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                {t('onboarding.chooseLanguage')}
              </h2>
              <Select
                value={formData.language}
                onChange={(e) => handleLanguageChange(e.target.value as Language)}
                options={languages}
              />
              <div className="mt-4">
                <h3 className="text-md font-medium text-gray-900 dark:text-white mb-2">
                  {t('onboarding.chooseCurrency')}
                </h3>
                <Select
                  value={formData.currency}
                  onChange={(e) =>
                    setFormData({ ...formData, currency: e.target.value as Currency })
                  }
                  options={currencies}
                />
              </div>
            </div>
          )}

          {step === 4 && (
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                {t('onboarding.chooseTheme')}
              </h2>
              <Select
                value={formData.theme}
                onChange={(e) =>
                  setFormData({ ...formData, theme: e.target.value as Theme })
                }
                options={themes}
              />
            </div>
          )}

          <div className="flex justify-between pt-4">
            {step > 1 && (
              <Button variant="secondary" onClick={prevStep}>
                {t('onboarding.back')}
              </Button>
            )}
            <Button
              onClick={nextStep}
              disabled={!canProceed()}
              className={step === 1 ? 'w-full' : 'ml-auto'}
            >
              {step === 4
                ? t('onboarding.getStarted')
                : t('onboarding.next')}
              <ChevronRightIcon className="w-4 h-4 ml-2" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}