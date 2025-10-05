import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { BuildingStorefrontIcon, ChevronRightIcon, PhotoIcon, XMarkIcon } from '@heroicons/react/24/outline';
import type { Language, Currency, Theme, StoreType } from '../types';

export function OnboardingScreen() {
  const { t, i18n } = useTranslation();
  const { completeOnboarding, state } = useAuth();
  const [step, setStep] = useState(1);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string>('');
  const [formData, setFormData] = useState({
    storeType: '' as StoreType | '',
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
    { value: 'hi', label: 'हिंदी (Hindi)' },
    { value: 'ar', label: 'العربية (Arabic)' },
    { value: 'mr', label: 'मराठी (Marathi)' },
    { value: 'ur', label: 'اردو (Urdu)' },
    { value: 'bn', label: 'বাংলা (Bengali)' },
    { value: 'ta', label: 'தமிழ் (Tamil)' },
    { value: 'te', label: 'తెలుగు (Telugu)' },
    { value: 'gu', label: 'ગુજરાતી (Gujarati)' },
    { value: 'kn', label: 'ಕನ್ನಡ (Kannada)' },
    { value: 'ml', label: 'മലയാളം (Malayalam)' },
    { value: 'pa', label: 'ਪੰਜਾਬੀ (Punjabi)' },
  ];

  const currencies = [
    { value: 'INR', label: '₹ Indian Rupee' },
    { value: 'AED', label: 'د.إ UAE Dirham' },
    { value: 'USD', label: '$ US Dollar' },
    { value: 'EUR', label: '€ Euro' },
    { value: 'GBP', label: '£ British Pound' },
  ];

  const themes = [
    { value: 'light', label: t('onboarding.themes.light') },
    { value: 'dark', label: t('onboarding.themes.dark') },
  ];

  const handleLogoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setLogoFile(file);
      const reader = new FileReader();
      reader.onload = (e) => {
        setLogoPreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const removeLogo = () => {
    setLogoFile(null);
    setLogoPreview('');
  };

  const getDefaultLogo = (): string => {
    return state.user?.photoURL || '/default-store-logo.png';
  };

  const handleComplete = async () => {
    const logoURL = logoPreview || getDefaultLogo();
    
    const storeData = {
      name: formData.storeName,
      type: formData.storeType as StoreType,
      language: formData.language,
      currency: formData.currency,
      theme: formData.theme,
      logoURL,
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

  const canProceed = (): boolean => {
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
    const defaultCurrency: Currency = 
      language === 'ar' ? 'AED' : 
      language === 'en' ? 'USD' : 'INR';
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
            {state.user?.name && (
              <span className="block text-orange-600 dark:text-orange-400 font-medium">
                {t('common.hello')}, {state.user.name}!
              </span>
            )}
            {t('onboarding.letsSetup')}
          </p>
        </div>

        {/* Progress Indicator */}
        <div className="flex justify-center mb-8">
          <div className="flex space-x-2">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className={`w-2 h-2 rounded-full ${i <= step ? 'bg-orange-500' : 'bg-gray-300 dark:bg-gray-600'}`}
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
                onChange={(e) => setFormData({ ...formData, storeType: e.target.value as StoreType })}
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
                onChange={(e) => setFormData({ ...formData, storeName: e.target.value })}
                placeholder={t('onboarding.enterStoreName')}
                autoFocus
              />
              
              {/* Store Logo Upload */}
              <div className="mt-6">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {t('onboarding.storeLogo')}
                </label>
                <div className="flex items-center space-x-4">
                  <div className="w-20 h-20 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg flex items-center justify-center overflow-hidden">
                    {logoPreview ? (
                      <img src={logoPreview} alt="Store logo" className="w-full h-full object-cover" />
                    ) : (
                      <PhotoIcon className="w-8 h-8 text-gray-400" />
                    )}
                  </div>
                  <div className="flex-1">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleLogoUpload}
                      className="hidden"
                      id="logo-upload"
                    />
                    <label
                      htmlFor="logo-upload"
                      className="cursor-pointer inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500"
                    >
                      {t('onboarding.uploadLogo')}
                    </label>
                    {logoPreview && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={removeLogo}
                        className="ml-2 text-red-600"
                      >
                        <XMarkIcon className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                  {t('onboarding.logoHint')}
                </p>
              </div>
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
                  onChange={(e) => setFormData({ ...formData, currency: e.target.value as Currency })}
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
                onChange={(e) => setFormData({ ...formData, theme: e.target.value as Theme })}
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
              disabled={!canProceed() || state.isLoading}
              className={step === 1 ? 'w-full' : 'ml-auto'}
            >
              {step === 4 ? t('onboarding.getStarted') : t('onboarding.next')}
              <ChevronRightIcon className="w-4 h-4 ml-2" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}