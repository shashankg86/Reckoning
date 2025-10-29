import React from 'react';
import { useTranslation } from 'react-i18next';
import { UseFormRegister, FieldErrors, UseFormSetValue, UseFormWatch } from 'react-hook-form';
import { locationAPI, Country, State, City } from '../../api/location';

export type StoreFormShape = {
  name: string;
  type: 'restaurant' | 'cafe' | 'retail' | 'salon' | 'pharmacy' | 'other';
  address: string;
  city: string;
  state: string;
  country: string;
  pincode: string;
  customCity?: string;
  gst_number?: string;
};

interface StoreBasicsProps {
  register: UseFormRegister<StoreFormShape>;
  errors: FieldErrors<StoreFormShape>;
  setValue: UseFormSetValue<StoreFormShape>;
  watch: UseFormWatch<StoreFormShape>;
  onBlur?: () => void;
}

export function StoreBasics({ register, errors, setValue, watch, onBlur }: StoreBasicsProps) {
  const { t } = useTranslation();
  const storeTypes = ['restaurant', 'cafe', 'retail', 'salon', 'pharmacy', 'other'] as const;

  const [countries, setCountries] = React.useState<Country[]>([]);
  const [states, setStates] = React.useState<State[]>([]);
  const [cities, setCities] = React.useState<City[]>([]);
  const [loadingStates, setLoadingStates] = React.useState(false);
  const [loadingCities, setLoadingCities] = React.useState(false);

  const selectedCountry = watch('country');
  const selectedState = watch('state');
  const selectedCity = watch('city');

  // Load countries on mount
  React.useEffect(() => {
    locationAPI.getCountries().then(setCountries).catch(console.error);
  }, []);

  // Load states when country changes
  React.useEffect(() => {
    if (!selectedCountry || selectedCountry === '') {
      setStates([]);
      setCities([]);
      setValue('state', '');
      setValue('city', '');
      return;
    }

    setLoadingStates(true);
    locationAPI
      .getStates(selectedCountry)
      .then((stateList) => {
        setStates(stateList);
        setLoadingStates(false);
      })
      .catch((error) => {
        console.error('Error loading states:', error);
        setStates([]);
        setLoadingStates(false);
      });
  }, [selectedCountry, setValue]);

  // Load cities when state changes
  React.useEffect(() => {
    if (!selectedCountry || !selectedState || selectedState === '') {
      setCities([]);
      setValue('city', '');
      return;
    }

    setLoadingCities(true);
    locationAPI
      .getCities(selectedCountry, selectedState)
      .then((cityList) => {
        setCities(cityList);
        setLoadingCities(false);
      })
      .catch((error) => {
        console.error('Error loading cities:', error);
        setCities([]);
        setLoadingCities(false);
      });
  }, [selectedCountry, selectedState, setValue]);

  const showCustomCityInput = selectedCity === 'Other';

  return (
    <>
      <div>
        <label className="block text-sm font-medium text-gray-700">
          {t('onboarding.form.storeName')} *
        </label>
        <input
          {...register('name', { onBlur })}
          className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-orange-500 focus:border-orange-500"
          placeholder={t('onboarding.form.enterStoreName')}
        />
        {errors.name && <p className="mt-1 text-sm text-red-600">{String(errors.name.message)}</p>}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">
          {t('onboarding.form.storeType')} *
        </label>
        <select
          {...register('type', { onBlur })}
          className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-orange-500 focus:border-orange-500"
        >
          <option value="">{t('onboarding.form.selectStoreType')}</option>
          {storeTypes.map((v) => (
            <option key={v} value={v}>
              {t(`onboarding.storeTypes.${v}`)}
            </option>
          ))}
        </select>
        {errors.type && <p className="mt-1 text-sm text-red-600">{String(errors.type.message)}</p>}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">
          {t('onboarding.form.address')} *
        </label>
        <textarea
          {...register('address', { onBlur })}
          rows={2}
          className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-orange-500 focus:border-orange-500"
          placeholder={t('onboarding.form.addressPlaceholder')}
        />
        {errors.address && <p className="mt-1 text-sm text-red-600">{String(errors.address.message)}</p>}
      </div>

      {/* Country Dropdown */}
      <div>
        <label className="block text-sm font-medium text-gray-700">
          {t('onboarding.form.country')} *
        </label>
        <select
          {...register('country', {
            onBlur,
            onChange: (e) => {
              setValue('state', '');
              setValue('city', '');
              onBlur?.();
            },
          })}
          className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-orange-500 focus:border-orange-500"
        >
          <option value="">{t('onboarding.form.selectCountry') || 'Select Country'}</option>
          {countries.map((country) => (
            <option key={country.iso2} value={country.name}>
              {country.name}
            </option>
          ))}
        </select>
        {errors.country && <p className="mt-1 text-sm text-red-600">{String(errors.country.message)}</p>}
      </div>

      {/* State Dropdown */}
      <div>
        <label className="block text-sm font-medium text-gray-700">
          {t('onboarding.form.state')} *
        </label>
        <select
          {...register('state', {
            onBlur,
            onChange: () => {
              setValue('city', '');
              onBlur?.();
            },
          })}
          disabled={!selectedCountry || loadingStates}
          className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-orange-500 focus:border-orange-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
        >
          <option value="">
            {loadingStates
              ? t('onboarding.form.loadingStates') || 'Loading states...'
              : t('onboarding.form.selectState') || 'Select State'}
          </option>
          {states.map((state) => (
            <option key={state.state_code || state.name} value={state.name}>
              {state.name}
            </option>
          ))}
        </select>
        {errors.state && <p className="mt-1 text-sm text-red-600">{String(errors.state.message)}</p>}
      </div>

      <div className="grid grid-cols-2 gap-4">
        {/* City Dropdown */}
        <div>
          <label className="block text-sm font-medium text-gray-700">
            {t('onboarding.form.city')} *
          </label>
          <select
            {...register('city', { onBlur })}
            disabled={!selectedState || loadingCities}
            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-orange-500 focus:border-orange-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
          >
            <option value="">
              {loadingCities
                ? t('onboarding.form.loadingCities') || 'Loading cities...'
                : t('onboarding.form.selectCity') || 'Select City'}
            </option>
            {cities.map((city) => (
              <option key={city.name} value={city.name}>
                {city.name}
              </option>
            ))}
            {cities.length > 0 && (
              <option value="Other">
                {t('onboarding.form.otherCity') || 'Other (Enter manually)'}
              </option>
            )}
          </select>
          {errors.city && <p className="mt-1 text-sm text-red-600">{String(errors.city.message)}</p>}
        </div>

        {/* Pincode */}
        <div>
          <label className="block text-sm font-medium text-gray-700">
            {t('onboarding.form.pincode')} *
          </label>
          <input
            {...register('pincode', { onBlur })}
            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-orange-500 focus:border-orange-500"
            placeholder={t('onboarding.form.pincodePlaceholder')}
          />
          {errors.pincode && <p className="mt-1 text-sm text-red-600">{String(errors.pincode.message)}</p>}
        </div>
      </div>

      {/* Custom City Input (shown when "Other" is selected) */}
      {showCustomCityInput && (
        <div>
          <label className="block text-sm font-medium text-gray-700">
            {t('onboarding.form.enterCityName') || 'Enter City Name'} *
          </label>
          <input
            {...register('customCity', {
              onBlur,
              onChange: (e) => {
                setValue('city', e.target.value);
                onBlur?.();
              },
            })}
            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-orange-500 focus:border-orange-500"
            placeholder={t('onboarding.form.cityPlaceholder')}
          />
        </div>
      )}

      {/* Tax Registration Number (conditional based on country) */}
      {selectedCountry && (
        <div>
          <label className="block text-sm font-medium text-gray-700">
            {selectedCountry === 'India' && (t('onboarding.form.gstNumber') || 'GSTIN Number (Optional)')}
            {selectedCountry === 'United Arab Emirates' && (t('onboarding.form.trnNumber') || 'TRN Number (Optional)')}
            {selectedCountry !== 'India' && selectedCountry !== 'United Arab Emirates' && (t('onboarding.form.taxNumber') || 'Tax/VAT Number (Optional)')}
          </label>
          <input
            {...register('gst_number', { onBlur })}
            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-orange-500 focus:border-orange-500"
            placeholder={
              selectedCountry === 'India'
                ? t('onboarding.form.gstNumberPlaceholder') || 'Enter GSTIN (e.g., 22AAAAA0000A1Z5)'
                : selectedCountry === 'United Arab Emirates'
                ? t('onboarding.form.trnNumberPlaceholder') || 'Enter TRN (e.g., 100123456700003)'
                : t('onboarding.form.taxNumberPlaceholder') || 'Enter Tax/VAT Registration Number'
            }
          />
          {errors.gst_number && <p className="mt-1 text-sm text-red-600">{String(errors.gst_number.message)}</p>}
        </div>
      )}
    </>
  );
}
