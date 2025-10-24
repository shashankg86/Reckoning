import React from 'react';
import { useTranslation } from 'react-i18next';
import { PhoneField } from '../../components/form/PhoneField';
import { UseFormSetValue, FieldErrors, UseFormWatch } from 'react-hook-form';

export type ContactShape = {
  phone: string;
  secondary_phone?: string;
  email: string;
};

export function StoreContacts({ watch, setValue, errors, defaultCountry, email, disableEmail } : { watch: UseFormWatch<ContactShape>, setValue: UseFormSetValue<ContactShape>, errors: FieldErrors<ContactShape>, defaultCountry: string, email: string, disableEmail?: boolean }) {
  const { t } = useTranslation();
  const phone = watch('phone');
  const secondary = watch('secondary_phone');

  return (
    <>
      <label className="block text-sm font-medium text-gray-700 mb-1">{t('onboarding.form.primaryPhone')} *</label>
      <PhoneField value={phone} onChange={(v) => setValue('phone', v, { shouldValidate: true })} defaultCountry={defaultCountry} placeholder={t('onboarding.form.phonePlaceholder')} error={errors.phone?.message as string | undefined} />

      <div className="mt-4">
        <label className="block text-sm font-medium text-gray-700 mb-1">{t('onboarding.form.secondaryPhone')}</label>
        <PhoneField value={secondary} onChange={(v) => setValue('secondary_phone', v, { shouldValidate: false })} defaultCountry={defaultCountry} placeholder={t('onboarding.form.secondaryPhonePlaceholder')} error={errors.secondary_phone?.message as string | undefined} />
      </div>

      <div className="mt-4">
        <label className="block text-sm font-medium text-gray-700">{t('onboarding.form.email')}</label>
        <input value={email} readOnly={disableEmail} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 bg-gray-100 text-gray-600" />
        {disableEmail && <p className="text-xs text-gray-500 mt-1">{t('onboarding.form.emailLocked')}</p>}
      </div>
    </>
  );
}
