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

const storeSchema = z.object({
  name: z.string().min(2),
  type: z.enum(['restaurant','cafe','retail','salon','pharmacy','other']),
  address: z.string().min(5),
  city: z.string().min(2),
  state: z.string().min(2),
  country: z.string().min(2),
  pincode: z.string().min(3).max(10),
  phone: z.string().refine((v) => v && isPossiblePhoneNumber(v), 'Invalid phone number'),
  secondary_phone: z.string().optional(),
  email: z.string().email().optional(),
  gst_number: z.string().optional(),
  language: z.enum(['en','hi','ar','mr']).default('en'),
  currency: z.enum(['INR','USD','EUR','AED','GBP']).default('INR'),
  theme: z.enum(['light','dark']).default('light'),
});

type StoreFormData = z.infer<typeof storeSchema> & StoreFormShape;

export function OnboardingScreen() {
  const { t } = useTranslation();
  const { state, completeOnboarding } = useAuth();
  const navigate = useNavigate();

  const defaultCountry = 'IN';
  const defaultEmail = state.user?.email ?? '';
  const defaultPhone = (state.user as any)?.phone ?? '';

  const { register, handleSubmit, setValue, watch, reset, formState: { errors, isSubmitting } } = useForm<StoreFormData>({
    resolver: zodResolver(storeSchema),
    defaultValues: {
      language: 'en',
      currency: 'INR',
      theme: 'light',
      country: 'India',
      email: defaultEmail,
      phone: defaultPhone,
    },
  });

  // Load saved progress (if any) and restore values
  React.useEffect(() => {
    (async () => {
      if (!state.user) return;
      const p = await onboardingAPI.get(state.user.uid);
      if (p?.data) {
        reset({ ...(p.data as any) });
      }
    })();
  }, [state.user, reset]);

  // Auto-save progress when form changes
  const values = watch();
  React.useEffect(() => {
    const timeout = setTimeout(() => {
      if (!state.user) return;
      onboardingAPI.save(state.user.uid, 'basics', values as any).catch(() => {});
    }, 500);
    return () => clearTimeout(timeout);
  }, [values, state.user]);

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
            <StoreBasics register={register as any} errors={errors as any} />
            <StoreContacts watch={watch as any} setValue={setValue as any} errors={errors as any} defaultCountry={defaultCountry} email={defaultEmail} disableEmail />
            <div>
              <button type="submit" disabled={isSubmitting} className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50">
                {isSubmitting ? t('onboarding.submitting') : t('onboarding.completeSetup')}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
