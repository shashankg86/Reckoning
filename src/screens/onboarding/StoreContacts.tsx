import React from 'react';
import { useTranslation } from 'react-i18next';
import { PhoneField } from '../../components/form/PhoneField';
import { UseFormSetValue, FieldErrors, UseFormWatch } from 'react-hook-form';

export type ContactShape = {
  phone: string;
  secondary_phone?: string;
  email: string;
};

export function StoreContacts({ watch, setValue, errors, defaultCountry, email, disableEmail, onBlur } : { watch: UseFormWatch<ContactShape>, setValue: UseFormSetValue<ContactShape>, errors: FieldErrors<ContactShape>, defaultCountry: string, email: string, disableEmail?: boolean, onBlur?: () => void }) {
  const { t } = useTranslation();
  const phone = watch('phone');
  const secondary = watch('secondary_phone');

  return (
    <div className="space-y-5">
      <div>
        <label htmlFor="primary-phone" className="block text-sm font-medium text-gray-700 mb-2">
          {t('onboarding.form.primaryPhone')} <span className="text-red-500">*</span>
        </label>
        <PhoneField
          id="primary-phone"
          label=""
          value={phone}
          onChange={(v) => setValue('phone', v, { shouldValidate: true })}
          defaultCountry={defaultCountry}
          placeholder={t('onboarding.form.phonePlaceholder')}
          error={errors.phone?.message}
          onBlur={onBlur}
        />
      </div>

      <div>
        <label htmlFor="secondary-phone" className="block text-sm font-medium text-gray-700 mb-2">
          {t('onboarding.form.secondaryPhone')} <span className="text-gray-400 text-xs ml-1">(Optional)</span>
        </label>
        <PhoneField
          id="secondary-phone"
          label=""
          value={secondary}
          onChange={(v) => setValue('secondary_phone', v, { shouldValidate: false })}
          defaultCountry={defaultCountry}
          placeholder={t('onboarding.form.secondaryPhonePlaceholder')}
          error={errors.secondary_phone?.message}
          onBlur={onBlur}
        />
      </div>

      <div>
        <label htmlFor="email-input" className="block text-sm font-medium text-gray-700 mb-2">
          {t('onboarding.form.email')}
        </label>
        <input
          id="email-input"
          type="email"
          value={email}
          readOnly={disableEmail}
          className="block w-full border border-gray-300 rounded-md shadow-sm py-2.5 px-3 bg-gray-100 text-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
        />
        {disableEmail && <p className="text-xs text-gray-500 mt-1.5">{t('onboarding.form.emailLocked')}</p>}
      </div>
    </div>
  );
}
