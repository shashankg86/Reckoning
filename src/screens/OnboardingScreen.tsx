import React from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { OnboardingHeader } from './onboarding/OnboardingHeader';
import { StoreBasics, StoreFormShape } from './onboarding/StoreBasics';
import { StoreContacts } from './onboarding/StoreContacts';
import { LogoUpload } from '../components/form/LogoUpload';
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
  const { completeOnboarding, logout } = useAuth();
  const navigate = useNavigate();

  const [userSession, setUserSession] = React.useState<any>(null);
  const [logoFile, setLogoFile] = React.useState<File | null>(null);
  const [logoPreview, setLogoPreview] = React.useState<string | null>(null);

  const { register, handleSubmit, setValue, watch, reset, formState: { errors, isSubmitting } } = useForm<StoreFormData>({
    resolver: zodResolver(storeSchema),
    defaultValues: {
      language: 'en',
      currency: 'INR',
      theme: 'light',
      country: 'IN',
      email: '',
      phone: '',
    },
  });

  // Single init using persisted session (no re-auth) => session -> profile -> progress
  React.useEffect(() => {
    (async () => {
      try {
        const { data: sessionRes } = await supabase.auth.getSession();
        const user = sessionRes?.session?.user;
        if (!user) {
          navigate('/login', { replace: true });
          return;
        }
        setUserSession(user);

        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('id, email, phone, name')
          .eq('id', user.id)
          .single();
        if (profileError || !profile) {
          await logout();
          navigate('/login', { replace: true });
          return;
        }

        const progress = await onboardingAPI.get(user.id);

        const defaults = {
          language: 'en' as const,
          currency: 'INR' as const,
          theme: 'light' as const,
          country: 'IN',
          email: profile.email || user.email || '',
          phone: profile.phone || '',
        };

        if (progress?.data) {
          const merged: any = {
            ...defaults,
            ...(progress.data as any),
            email: defaults.email,
            phone: (progress.data as any).phone || defaults.phone,
          };
          if ((progress.data as any).logoUrl) setLogoPreview((progress.data as any).logoUrl);
          reset(merged);
        } else {
          reset(defaults);
        }
      } catch (e) {
        console.error('Onboarding init failed', e);
        toast.error('Failed to initialize onboarding');
        await logout();
        navigate('/login', { replace: true });
      }
    })();
  }, [logout, navigate, reset]);

  // Debounced save progress
  const saveTimeoutRef = React.useRef<NodeJS.Timeout>();
  const saveProgress = React.useCallback(() => {
    if (!userSession) return;
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(async () => {
      try {
        const values = watch();
        await onboardingAPI.save(userSession.id, 'basics', { ...values, logoUrl: logoPreview });
      } catch (e) {
        console.error('Save progress failed', e);
      }
    }, 800);
  }, [userSession, watch, logoPreview]);

  React.useEffect(() => () => { if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current); }, []);

  const onSubmit = async (data: StoreFormData) => {
    try {
      await completeOnboarding({ ...data, logoURL: logoPreview } as any);
      if (userSession) await onboardingAPI.clear(userSession.id);
      navigate('/dashboard', { replace: true });
    } catch (e) {
      console.error('Onboarding submit failed', e);
      toast.error('Failed to complete onboarding');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <OnboardingHeader />
      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-xl">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          <form className="space-y-6" onSubmit={handleSubmit(onSubmit)}>
            <LogoUpload value={logoPreview || undefined} onChange={(file, url) => { setLogoFile(file); setLogoPreview(url); saveProgress(); }} />
            <StoreBasics register={register as any} errors={errors as any} setValue={setValue} watch={watch} onBlur={saveProgress} />
            <StoreContacts watch={watch as any} setValue={setValue as any} errors={errors as any} defaultCountry="IN" email={userSession?.email || ''} disableEmail onBlur={saveProgress} />
            <div>
              <button type="submit" disabled={isSubmitting} className="w-full flex justify-center py-2 px-4 rounded-md text-white bg-orange-600 hover:bg-orange-700 disabled:opacity-50">
                {isSubmitting ? t('onboarding.submitting') : t('onboarding.completeSetup')}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
