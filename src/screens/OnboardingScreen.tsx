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

const storeSchema = z.object({
  name: z.string().min(2),
  type: z.enum(['restaurant','cafe','retail','salon','pharmacy','other']),
  logo_url: z.union([z.string(), z.instanceof(File)]).optional(),
  address: z.string().min(5),
  city: z.string().min(2),
  state: z.string().min(2),
  country: z.string().min(2),
  pincode: z.string().min(3).max(10),
  gst_number: z.string().optional(),
  phone: z.string().refine((v) => v && isPossiblePhoneNumber(v), 'Invalid phone number'),
  secondary_phone: z.string().optional(),
  email: z.string().email().optional(),
  language: z.enum(['en','hi','ar','mr']).default('en'),
  currency: z.enum(['INR','USD','EUR','AED','GBP']).default('INR'),
  theme: z.enum(['light','dark']).default('light'),
});

type StoreFormData = z.infer<typeof storeSchema> & StoreFormShape;

export function OnboardingScreen() {
  const { t } = useTranslation();
  const { state, completeOnboarding } = useAuth();
  const navigate = useNavigate();
  const progressLoadedRef = React.useRef(false);

  const defaultCountry = 'IN';
  const defaultEmail = state.user?.email ?? '';
  const defaultPhone = (state.user as any)?.phone ?? '';

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
