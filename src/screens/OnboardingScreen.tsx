import React, { useState, useEffect } from 'react';
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

type StoreFormData = z.infer<typeof storeSchema> & StoreFormShape;

export function OnboardingScreen() {
  const { t } = useTranslation();
  const { state, completeOnboarding } = useAuth();
  const navigate = useNavigate();

  // Logo state
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);

  // Extract user data from auth context (no API call needed)
  const userData = {
    uid: state.user?.uid || '',
    email: state.user?.email || '',
    phone: (state.user as any)?.phone || '',
  };

  const { register, handleSubmit, setValue, watch, reset, formState: { errors, isSubmitting } } = useForm<StoreFormData>({
    resolver: zodResolver(storeSchema),
    defaultValues: {
      language: 'en',
      currency: 'INR',
      theme: 'light',
      country: 'IN',
      email: userData.email,
      phone: userData.phone,
    },
  });

  // Simple one-time initialization with pre-fetched data from context
  useEffect(() => {
    console.log('[OnboardingScreen] Initializing with pre-fetched data');

    // Use pre-fetched onboarding progress from AuthContext
    if (state.onboardingProgress) {
      console.log('[OnboardingScreen] Restoring saved progress');
      const mergedData = {
        ...state.onboardingProgress,
        email: userData.email, // Always use profile email
        phone: state.onboardingProgress.phone || userData.phone,
      };

      // Restore logo preview if exists
      if (state.onboardingProgress.logoUrl) {
        setLogoPreview(state.onboardingProgress.logoUrl);
      }

      reset(mergedData);
    }

    console.log('[OnboardingScreen] Initialization complete');
  }, []); // Empty dependency array - runs only once!

  // Save progress on blur/input events
  const saveProgress = React.useCallback(() => {
    if (!userData.uid) return;

    const currentValues = watch();
    const dataToSave = {
      ...currentValues,
      logoUrl: logoPreview,
    };

    onboardingAPI.save(userData.uid, 'basics', dataToSave as any).catch((err) => {
      console.error('[OnboardingScreen] Failed to save progress:', err);
    });
  }, [userData.uid, watch, logoPreview]);

  // Save on page unload/refresh
  useEffect(() => {
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
    if (!logoFile || !userData.uid) return null;

    try {
      setIsUploadingLogo(true);

      const fileExt = logoFile.name.split('.').pop();
      const fileName = `${userData.uid}-${Date.now()}.${fileExt}`;
      const filePath = `store-logos/${fileName}`;

      const { error } = await supabase.storage
        .from('store-assets')
        .upload(filePath, logoFile, {
          cacheControl: '3600',
          upsert: false,
        });

      if (error) {
        console.error('Logo upload error:', error);
        throw error;
      }

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

  const onSubmit = async (data: StoreFormData) => {
    try {
      let logoUrl = logoPreview;

      // Upload logo if a new file is selected
      if (logoFile) {
        const uploadedUrl = await uploadLogo();
        if (uploadedUrl) {
          logoUrl = uploadedUrl;
        }
      }

      // Complete onboarding with logo URL
      await completeOnboarding({
        ...data,
        logoURL: logoUrl,
      } as any);

      if (userData.uid) await onboardingAPI.clear(userData.uid);
      navigate('/dashboard', { replace: true });
    } catch (error) {
      console.error('Onboarding submission error:', error);
      toast.error('Failed to complete onboarding. Please try again.');
    }
  };

  // Loading state check
  if (!state.isAuthenticated || !userData.uid) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-orange-600 border-r-transparent"></div>
          <p className="mt-2 text-sm text-gray-600">{t('common.loading')}</p>
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
            {/* Logo Upload */}
            <LogoUpload
              value={logoPreview || undefined}
              onChange={handleLogoChange}
              disabled={isUploadingLogo || isSubmitting}
            />

            {/* Store Basics */}
            <StoreBasics
              register={register as any}
              errors={errors as any}
              setValue={setValue}
              watch={watch}
              onBlur={saveProgress}
            />

            {/* Store Contacts */}
            <StoreContacts
              watch={watch as any}
              setValue={setValue as any}
              errors={errors as any}
              defaultCountry="IN"
              email={userData.email}
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
