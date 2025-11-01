import React, { useState, useEffect, useCallback, useMemo } from 'react';
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
  const [isInitialized, setIsInitialized] = useState(false);

  // Step 1: Extract user data from auth session (no API call needed)
  const userData = useMemo(() => {
    if (!state.isAuthenticated || !state.user) {
      return null;
    }

    return {
      uid: state.user.uid,
      email: state.user.email ?? '',
      phone: (state.user as any)?.phone ?? '',
    };
  }, [state.isAuthenticated, state.user]);

  // Step 2: Initialize form with default values
  const defaultValues: Partial<StoreFormData> = useMemo(() => ({
    language: 'en',
    currency: 'INR',
    theme: 'light',
    country: 'IN',
    email: userData?.email || '',
    phone: userData?.phone || '',
  }), [userData]);

  const { register, handleSubmit, setValue, watch, reset, formState: { errors, isSubmitting } } = useForm<StoreFormData>({
    resolver: zodResolver(storeSchema),
    defaultValues,
  });

  // Step 3: Single initialization effect - verifies profile AND loads saved progress
  useEffect(() => {
    if (!userData || isInitialized) return;

    let isMounted = true;

    const initializeOnboarding = async () => {
      try {
        // Sub-step 3.1: Verify profile exists in database
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('id')
          .eq('id', userData.uid)
          .maybeSingle();

        if (!isMounted) return;

        if (profileError || !profile) {
          console.error('[OnboardingScreen] Profile not found in database - logging out');
          toast.error('Account profile not found. Please sign in again.');
          await logout();
          navigate('/login', { replace: true });
          return;
        }

        // Sub-step 3.2: Fetch saved onboarding progress
        const savedProgress = await onboardingAPI.get(userData.uid);

        if (!isMounted) return;

        // Sub-step 3.3: Prefill form if progress exists
        if (savedProgress?.data && Object.keys(savedProgress.data).length > 0) {
          const prefilledData: Partial<StoreFormData> = {
            ...savedProgress.data,
            email: userData.email,  // Profile email always overrides
            phone: savedProgress.data.phone || userData.phone, // Prefer saved, fallback to profile
          };

          reset(prefilledData);
        }

        setIsInitialized(true);
      } catch (error) {
        console.error('[OnboardingScreen] Initialization failed:', error);

        if (!isMounted) return;

        // Critical error - profile verification failed
        toast.error('Unable to verify account. Please sign in again.');
        await logout();
        navigate('/login', { replace: true });
      }
    };

    initializeOnboarding();

    return () => {
      isMounted = false;
    };
  }, [userData, isInitialized, reset, logout, navigate]);

  // Step 4: Auto-save progress handler (debounced via callback)
  const saveProgress = useCallback(() => {
    if (!userData || !isInitialized) return;

    const currentValues = watch();
    onboardingAPI.save(userData.uid, 'basics', currentValues as any).catch((error) => {
      console.error('[OnboardingScreen] Failed to save progress:', error);
    });
  }, [userData, isInitialized, watch]);

  // Step 5: Save progress before page unload
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (isInitialized) saveProgress();
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isInitialized, saveProgress]);

  // Step 6: Handle form submission
  const onSubmit = async (data: StoreFormData) => {
    if (!userData) return;

    try {
      await completeOnboarding(data as any);
      await onboardingAPI.clear(userData.uid);
      navigate('/dashboard', { replace: true });
    } catch (error) {
      console.error('[OnboardingScreen] Onboarding completion failed:', error);
    }
  };

  // Show loading state while initializing (optional - can be removed if not needed)
  if (!userData || !isInitialized) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-orange-600 border-r-transparent"></div>
          <p className="mt-2 text-sm text-gray-600">{t('onboarding.loadingProgress')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <OnboardingHeader />
      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-xl">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          <form className="space-y-6" onSubmit={handleSubmit(onSubmit)}>
            <StoreBasics
              register={register as any}
              errors={errors as any}
              setValue={setValue}
              watch={watch}
              onBlur={saveProgress}
            />
            <StoreContacts
              watch={watch as any}
              setValue={setValue as any}
              errors={errors as any}
              defaultCountry="IN"
              email={userData.email}
              disableEmail
              onBlur={saveProgress}
            />
            <div>
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-orange-600 hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? t('onboarding.submitting') : t('onboarding.completeSetup')}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
