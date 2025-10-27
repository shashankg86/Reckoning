import React from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { OnboardingHeader } from './onboarding/OnboardingHeader';
import { StoreBasics, StoreFormShape } from './onboarding/StoreBasics';
import { StoreContacts } from './onboarding/StoreContacts';
import { useAuth } from '../contexts/AuthContext';
import { isPossiblePhoneNumber } from 'react-phone-number-input';
import { onboardingAPI } from '../api/onboardingProgress';
import { storageAPI } from '../api/storage';
import { toast } from 'react-hot-toast';
import { validatePostalCode, validateGSTNumber, getPostalCodeFormat } from '../utils/validation';

/**
 * Create validation schema with proper, user-friendly error messages
 */
function createStoreSchema(t: (key: string) => string) {
  return z.object({
    name: z.string({
      required_error: t('validation.storeNameRequired'),
      invalid_type_error: t('validation.storeNameInvalid')
    })
      .min(2, { message: t('validation.storeNameMinLength') })
      .max(100, { message: t('validation.storeNameMaxLength') }),

    type: z.enum(['restaurant', 'cafe', 'retail', 'salon', 'pharmacy', 'other'], {
      required_error: t('validation.storeTypeRequired'),
      invalid_type_error: t('validation.storeTypeInvalid')
    }),

    logo_url: z.union([z.string(), z.instanceof(File)]).optional(),

    address: z.string({
      required_error: t('validation.addressRequired'),
      invalid_type_error: t('validation.addressInvalid')
    })
      .min(10, { message: t('validation.addressMinLength') })
      .max(200, { message: t('validation.addressMaxLength') }),

    city: z.string({
      required_error: t('validation.cityRequired'),
      invalid_type_error: t('validation.cityInvalid')
    })
      .min(2, { message: t('validation.cityMinLength') })
      .max(50, { message: t('validation.cityMaxLength') }),

    state: z.string({
      required_error: t('validation.stateRequired'),
      invalid_type_error: t('validation.stateInvalid')
    })
      .min(2, { message: t('validation.stateMinLength') })
      .max(50, { message: t('validation.stateMaxLength') }),

    country: z.string({
      required_error: t('validation.countryRequired'),
      invalid_type_error: t('validation.countryInvalid')
    })
      .min(2, { message: t('validation.countryMinLength') }),

    pincode: z.string({
      required_error: t('validation.postalCodeRequired'),
      invalid_type_error: t('validation.postalCodeInvalid')
    })
      .min(3, { message: t('validation.postalCodeMinLength') })
      .max(10, { message: t('validation.postalCodeMaxLength') }),

    gst_number: z.string()
      .optional()
      .refine(
        (val) => !val || validateGSTNumber(val),
        { message: t('validation.gstNumberInvalid') }
      ),

    phone: z.string({
      required_error: t('validation.phoneRequired'),
      invalid_type_error: t('validation.phoneInvalid')
    })
      .refine((v) => v && isPossiblePhoneNumber(v), {
        message: t('validation.phoneInvalid')
      }),

    secondary_phone: z.string().optional(),

    email: z.string()
      .email({ message: t('validation.emailInvalid') })
      .optional(),

    language: z.enum(['en', 'hi', 'ar', 'mr']).default('en'),
    currency: z.enum(['INR', 'USD', 'EUR', 'AED', 'GBP']).default('INR'),
    theme: z.enum(['light', 'dark']).default('light'),
  })
  .refine(
    (data) => {
      // Country-specific postal code validation
      if (!data.pincode || !data.country) return true;
      return validatePostalCode(data.pincode, data.country);
    },
    {
      message: (data: any) => {
        const format = getPostalCodeFormat(data.country);
        return `${data.country} postal code format: ${format}`;
      },
      path: ['pincode']
    }
  );
}

type StoreFormData = z.infer<ReturnType<typeof createStoreSchema>> & StoreFormShape;

export function OnboardingScreen() {
  const { t } = useTranslation();
  const { state, completeOnboarding } = useAuth();
  const navigate = useNavigate();
  const progressLoadedRef = React.useRef(false);

  const defaultCountry = 'IN';
  const defaultEmail = state.user?.email ?? '';
  const defaultPhone = (state.user as any)?.phone ?? '';

  // Create schema with translated error messages
  const storeSchema = React.useMemo(() => createStoreSchema(t), [t]);

  const { register, handleSubmit, setValue, watch, reset, control, formState: { errors, isSubmitting } } = useForm<StoreFormData>({
    resolver: zodResolver(storeSchema),
    defaultValues: {
      language: 'en',
      currency: 'INR',
      theme: 'light',
      country: '', // Empty so user sees "Select country" placeholder
      email: defaultEmail,
      phone: defaultPhone,
    },
  });

  // Load saved progress once on mount
  React.useEffect(() => {
    if (progressLoadedRef.current || !state.user) return;

    (async () => {
      const savedProgress = await onboardingAPI.get(state.user!.uid);
      if (savedProgress?.data) {
        // Merge saved progress with user profile data
        const mergedData = {
          ...(savedProgress.data as any),
          email: defaultEmail, // Always use profile email
          phone: (savedProgress.data as any).phone || defaultPhone, // Prefer saved, fallback to profile
        };
        reset(mergedData);
      }
      progressLoadedRef.current = true;
    })();
  }, [state.user, reset, defaultEmail, defaultPhone]);

  // Save progress on blur/input events
  const saveProgress = React.useCallback(() => {
    if (!state.user || !progressLoadedRef.current) return;
    const currentValues = watch();
    onboardingAPI.save(state.user.uid, 'basics', currentValues as any).catch(() => {});
  }, [state.user, watch]);

  // Save on page unload/refresh
  React.useEffect(() => {
    const handleBeforeUnload = () => saveProgress();
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [saveProgress]);

  const onSubmit = async (data: StoreFormData) => {
    try {
      let logoUrl = data.logo_url;

      // If logo_url is a File, upload it first
      if (logoUrl instanceof File) {
        toast.loading('Uploading logo...', { id: 'logo-upload' });
        const uploadResult = await storageAPI.uploadStoreLogo(logoUrl);
        logoUrl = uploadResult.url;
        toast.success('Logo uploaded!', { id: 'logo-upload' });
      }

      // Complete onboarding with the logo URL
      const storeData = {
        ...data,
        logo_url: typeof logoUrl === 'string' ? logoUrl : undefined,
      };

      await completeOnboarding(storeData as any);
      if (state.user) await onboardingAPI.clear(state.user.uid);
      navigate('/dashboard', { replace: true });
    } catch (error: any) {
      console.error('Onboarding error:', error);
      toast.error(error.message || 'Failed to complete setup');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <OnboardingHeader />
      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-xl">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          <form className="space-y-6" onSubmit={handleSubmit(onSubmit)}>
            <StoreBasics register={register as any} errors={errors as any} onBlur={saveProgress} watch={watch as any} setValue={setValue as any} control={control as any} />
            <StoreContacts watch={watch as any} setValue={setValue as any} errors={errors as any} defaultCountry={defaultCountry} email={defaultEmail} disableEmail onBlur={saveProgress} />
            <div>
              <button type="submit" disabled={isSubmitting} className="w-full flex justify-center py-2.5 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-orange-500 hover:bg-orange-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 disabled:opacity-50 transition-colors">
                {isSubmitting ? t('onboarding.submitting') : t('onboarding.completeSetup')}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
