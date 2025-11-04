import React, { useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { OnboardingHeader } from './onboarding/OnboardingHeader';
import { StoreBasics } from './onboarding/StoreBasics';
import { StoreContacts } from './onboarding/StoreContacts';
import { LogoUpload } from '../components/form/LogoUpload';
import { useAuth } from '../contexts/AuthContext';
import { isPossiblePhoneNumber } from 'react-phone-number-input';
import { onboardingAPI, OnboardingData } from '../api/onboardingProgress';
import { supabase } from '../lib/supabaseClient';
import toast from 'react-hot-toast';
import type { Store } from '../types';
import type { OnboardingFormData } from '../types/onboarding';

// GSTIN validation regex (15 characters: 2-digit state code + 10-char PAN + 3 additional)
const GSTIN_REGEX = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;

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
}).refine((data) => {
  // Conditional GSTIN validation: only validate if country is India and field is not empty
  if (data.country === 'India' && data.gst_number && data.gst_number.trim() !== '') {
    return GSTIN_REGEX.test(data.gst_number);
  }
  return true;
}, {
  message: 'Invalid GSTIN format. Example: 29ABCDE1234F1Z5',
  path: ['gst_number']
});

export function OnboardingScreen() {
  const { t } = useTranslation();
  const { state, completeOnboarding } = useAuth();
  const navigate = useNavigate();
  const progressLoadedRef = React.useRef(false);

  // Logo state
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);

  const defaultCountry = 'IN';
  const defaultEmail = state.user?.email ?? '';
  const defaultPhone = state.user?.phone ?? '';

  const { register, handleSubmit, setValue, watch, reset, formState: { errors, isSubmitting } } = useForm<OnboardingFormData>({
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

  // Load saved progress once on mount
  React.useEffect(() => {
    if (progressLoadedRef.current || !state.user) return;

    (async () => {
      const savedProgress = await onboardingAPI.get(state.user!.uid);
      if (savedProgress?.data) {
        // Merge saved progress with user profile data
        const mergedData: Partial<OnboardingFormData> = {
          ...savedProgress.data,
          email: defaultEmail, // Always use profile email
          phone: savedProgress.data.phone || defaultPhone, // Prefer saved, fallback to profile
        };

        // Restore logo preview if exists
        if (savedProgress.data.logoUrl) {
          setLogoPreview(savedProgress.data.logoUrl);
        }

        reset(mergedData);
      }
      progressLoadedRef.current = true;
    })();
  }, [state.user, reset, defaultEmail, defaultPhone]);

  // Save progress on blur/input events
  const saveProgress = React.useCallback(() => {
    if (!state.user || !progressLoadedRef.current) return;
    const currentValues = watch();
    const dataToSave: OnboardingData = {
      ...currentValues,
      logoUrl: logoPreview ?? undefined, // Save logo preview URL
    };
    onboardingAPI.save(state.user.uid, 'basics', dataToSave).catch(() => {});
  }, [state.user, watch, logoPreview]);

  // Save on page unload/refresh
  React.useEffect(() => {
    const handleBeforeUnload = () => saveProgress();
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [saveProgress]);

  // Handle logo file change
  const handleLogoChange = (file: File | null, previewUrl: string | null) => {
    setLogoFile(file);
    setLogoPreview(previewUrl);
    saveProgress(); // Auto-save when logo changes
  };

  // Upload logo to Supabase storage
  const uploadLogo = async (): Promise<string | null> => {
    if (!logoFile || !state.user) return null;

    try {
      setIsUploadingLogo(true);

      // Generate unique filename
      const fileExt = logoFile.name.split('.').pop();
      const fileName = `${state.user.uid}-${Date.now()}.${fileExt}`;
      const filePath = `store-logos/${fileName}`;

      // Upload to Supabase storage
      const { data, error } = await supabase.storage
        .from('store-assets')
        .upload(filePath, logoFile, {
          cacheControl: '3600',
          upsert: false,
        });

      if (error) {
        console.error('Logo upload error:', error);
        throw error;
      }

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('store-assets')
        .getPublicUrl(filePath);

      setIsUploadingLogo(false);
      return publicUrl;
    } catch (error) {
      setIsUploadingLogo(false);
      console.error('Failed to upload logo:', error);
      toast.error('Failed to upload logo. Please try again.');
      return null;
    }
  };

  const onSubmit = async (data: OnboardingFormData) => {
    try {
      let logoUrl = logoPreview; // Use existing preview if no new file

      // Upload logo if a new file is selected
      if (logoFile) {
        const uploadedUrl = await uploadLogo();
        if (uploadedUrl) {
          logoUrl = uploadedUrl;
        }
      }

      // Complete onboarding with logo URL
      const storeData: Store = {
        name: data.name,
        type: data.type,
        language: data.language,
        currency: data.currency,
        theme: data.theme,
        logoURL: logoUrl ?? undefined,
      };

      await completeOnboarding(storeData);

      if (state.user) await onboardingAPI.clear(state.user.uid);
      navigate('/dashboard', { replace: true });
    } catch (error) {
      console.error('Onboarding submission error:', error);
      toast.error('Failed to complete onboarding. Please try again.');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <OnboardingHeader />
      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-xl">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          <form className="space-y-6" onSubmit={handleSubmit(onSubmit)}>
            {/* Logo Upload */}
            <LogoUpload
              value={logoPreview || undefined}
              onChange={handleLogoChange}
              disabled={isUploadingLogo || isSubmitting}
            />

            {/* Store Basics */}
            <StoreBasics
              register={register}
              errors={errors}
              setValue={setValue}
              watch={watch}
              onBlur={saveProgress}
            />

            {/* Store Contacts */}
            <StoreContacts
              watch={watch}
              setValue={setValue}
              errors={errors}
              defaultCountry={defaultCountry}
              email={defaultEmail}
              disableEmail
              onBlur={saveProgress}
            />

            {/* Submit Button */}
            <div>
              <button
                type="submit"
                disabled={isSubmitting || isUploadingLogo}
                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-orange-600 hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isUploadingLogo
                  ? t('onboarding.uploadingLogo') || 'Uploading logo...'
                  : isSubmitting
                  ? t('onboarding.submitting')
                  : t('onboarding.completeSetup')}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
