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
import { supabase } from '../lib/supabaseClient';
import toast from 'react-hot-toast';

const storeSchema = z.object({
  name: z.string().min(2, 'Store name must be at least 2 characters'),
  type: z.enum(['restaurant','cafe','retail','salon','pharmacy','other'], {
    errorMap: () => ({ message: 'Please select a store type' })
  }),
  address: z.string().min(5, 'Address must be at least 5 characters'),
  city: z.string().min(2, 'Please select or enter a city'),
  state: z.string().min(2, 'Please select a state'),
  country: z.string().min(2, 'Please select a country'),
  pincode: z.string().min(3, 'Pincode must be at least 3 characters').max(10, 'Pincode cannot exceed 10 characters'),
  phone: z.string().refine((v) => v && isPossiblePhoneNumber(v), 'Please enter a valid phone number'),
  secondary_phone: z.string().optional(),
  email: z.string().email('Please enter a valid email').optional(),
  gst_number: z.string().optional(),
  language: z.enum(['en','hi','ar','mr']).default('en'),
  currency: z.enum(['INR','USD','EUR','AED','GBP']).default('INR'),
  theme: z.enum(['light','dark']).default('light'),
});

type StoreFormData = z.infer<typeof storeSchema> & StoreFormShape;

export function OnboardingScreen() {
  const { t } = useTranslation();
  const { state, completeOnboarding, logout } = useAuth();
  const navigate = useNavigate();
  const progressLoadedRef = React.useRef(false);
  const profileVerifiedRef = React.useRef(false);

  const defaultCountry = 'IN';
  const defaultEmail = state.user?.email ?? '';
  const defaultPhone = (state.user as any)?.phone ?? '';

  const { register, handleSubmit, setValue, watch, reset, formState: { errors, isSubmitting } } = useForm<StoreFormData>({
    resolver: zodResolver(storeSchema),
    defaultValues: {
      language: 'en',
      currency: 'INR',
      theme: 'light',
      country: '',
      email: defaultEmail,
      phone: defaultPhone,
    },
  });

  // Verify profile exists in database (single API call on mount)
  React.useEffect(() => {
    if (!state.user || profileVerifiedRef.current) return;

    profileVerifiedRef.current = true;

    (async () => {
      try {
        const { data: profile, error } = await supabase
          .from('profiles')
          .select('id')
          .eq('id', state.user!.uid)
          .maybeSingle();

        if (error || !profile) {
          console.error('Profile not found in database - logging out');
          toast.error('Account profile not found. Please sign in again.');
          await logout();
          navigate('/login', { replace: true });
        }
      } catch (err) {
        console.error('Profile verification error:', err);
        toast.error('Unable to verify account. Please sign in again.');
        await logout();
        navigate('/login', { replace: true });
      }
    })();
  }, [state.user, logout, navigate]); // Run only once on mount

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
    await completeOnboarding(data as any);
    if (state.user) await onboardingAPI.clear(state.user.uid);
    navigate('/dashboard', { replace: true });
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <OnboardingHeader />
      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-xl">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          <form className="space-y-6" onSubmit={handleSubmit(onSubmit)}>
            <StoreBasics register={register as any} errors={errors as any} setValue={setValue} watch={watch} onBlur={saveProgress} />
            <StoreContacts watch={watch as any} setValue={setValue as any} errors={errors as any} defaultCountry={defaultCountry} email={defaultEmail} disableEmail onBlur={saveProgress} />
            <div>
              <button type="submit" disabled={isSubmitting} className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-orange-600 hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 disabled:opacity-50">
                {isSubmitting ? t('onboarding.submitting') : t('onboarding.completeSetup')}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
