import React from 'react';
import { useTranslation } from 'react-i18next';
import { UseFormRegister, FieldErrors, Path } from 'react-hook-form';

export type StoreFormShape = {
  name: string;
  type: 'restaurant'|'cafe'|'retail'|'salon'|'pharmacy'|'other';
  address: string;
  city: string;
  state: string;
  country: string;
  pincode: string;
};

export function StoreBasics({ register, errors, onBlur }: { register: UseFormRegister<StoreFormShape>, errors: FieldErrors<StoreFormShape>, onBlur?: () => void }) {
  const { t } = useTranslation();
  const storeTypes = ['restaurant','cafe','retail','salon','pharmacy','other'] as const;

  return (
    <>
      <div>
        <label className="block text-sm font-medium text-gray-700">{t('onboarding.form.storeName')} *</label>
        <input {...register('name', { onBlur })} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500" placeholder={t('onboarding.form.enterStoreName')} />
        {errors.name && <p className="mt-1 text-sm text-red-600">{String(errors.name.message)}</p>}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">{t('onboarding.form.storeType')} *</label>
        <select {...register('type', { onBlur })} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500">
          <option value="">{t('onboarding.form.selectStoreType')}</option>
          {storeTypes.map((v) => <option key={v} value={v}>{t(`onboarding.storeTypes.${v}`)}</option>)}
        </select>
        {errors.type && <p className="mt-1 text-sm text-red-600">{String(errors.type.message)}</p>}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">{t('onboarding.form.address')} *</label>
        <textarea {...register('address', { onBlur })} rows={2} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500" placeholder={t('onboarding.form.addressPlaceholder')} />
        {errors.address && <p className="mt-1 text-sm text-red-600">{String(errors.address.message)}</p>}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">{t('onboarding.form.city')} *</label>
          <input {...register('city', { onBlur })} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500" placeholder={t('onboarding.form.cityPlaceholder')} />
          {errors.city && <p className="mt-1 text-sm text-red-600">{String(errors.city.message)}</p>}
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">{t('onboarding.form.state')} *</label>
          <input {...register('state', { onBlur })} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500" placeholder={t('onboarding.form.statePlaceholder')} />
          {errors.state && <p className="mt-1 text-sm text-red-600">{String(errors.state.message)}</p>}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">{t('onboarding.form.country')} *</label>
          <input {...register('country', { onBlur })} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500" placeholder={t('onboarding.form.countryPlaceholder')} />
          {errors.country && <p className="mt-1 text-sm text-red-600">{String(errors.country.message)}</p>}
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">{t('onboarding.form.pincode')} *</label>
          <input {...register('pincode', { onBlur })} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500" placeholder={t('onboarding.form.pincodePlaceholder')} />
          {errors.pincode && <p className="mt-1 text-sm text-red-600">{String(errors.pincode.message)}</p>}
        </div>
      </div>
    </>
  );
}
