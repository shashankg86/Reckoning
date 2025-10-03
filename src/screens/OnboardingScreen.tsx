import {
  BuildingStorefrontIcon,
  ChevronRightIcon
} from '@heroicons/react/24/outline';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { usePOS } from '../context/POSContext';

export function OnboardingScreen() {
  const { t, i18n } = useTranslation();
  const { dispatch } = usePOS();
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    storeType: '',
    storeName: '',
    language: 'en', // Default to English
    theme: 'light',
  });

  // Store type options using translations
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

  const themes = [
    { value: 'light', label: t('onboarding.themes.light') },
    { value: 'dark', label: t('onboarding.themes.dark') },
  ];

  const handleComplete = () => {
    dispatch({
      type: 'SET_STORE',
      payload: {
        type: formData.storeType,
        name: formData.storeName,
        language: formData.language as 'en' | 'hi',
        theme: formData.theme as 'light' | 'dark',
      },
    });
    dispatch({ type: 'SET_ONBOARDED', payload: true });
    dispatch({ type: 'SET_CURRENT_SCREEN', payload: 'dashboard' });
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
                onChange={(e) => {
                  setFormData({ ...formData, language: e.target.value });
                  i18n.changeLanguage(e.target.value);
                }}
                options={languages}
              />
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
                  setFormData({ ...formData, theme: e.target.value })
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
