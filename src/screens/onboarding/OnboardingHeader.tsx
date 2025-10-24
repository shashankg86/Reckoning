import React from 'react';
import { useTranslation } from 'react-i18next';
import { BRAND } from '../../constants/branding';

export function OnboardingHeader() {
  const { t } = useTranslation();
  return (
    <div className="sm:mx-auto sm:w-full sm:max-w-md">
      <div className="flex justify-center">
        <img src={BRAND.LOGO_URL} alt={BRAND.NAME} className="h-12 w-auto" />
      </div>
      <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
        {t('onboarding.title')}
      </h2>
      <p className="mt-2 text-center text-sm text-gray-600">
        {t('onboarding.subtitle')}
      </p>
    </div>
  );
}
