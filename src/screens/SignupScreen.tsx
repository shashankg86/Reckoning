import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { isPossiblePhoneNumber } from 'react-phone-number-input';
import { useAuth } from '../contexts/AuthContext';
import { authAPI } from '../api/auth';
import { smsAPI } from '../api/sms';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { PhoneField } from '../components/form/PhoneField';
import { EnvelopeIcon, LockClosedIcon, EyeIcon, EyeSlashIcon, UserIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import { BRAND } from '../constants/branding';
import { ensureMinimalProfile } from '../api/profileUtils';

const signupSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(50, 'Name too long'),
  phone: z.string().refine((phone) => phone && isPossiblePhoneNumber(phone), 'Please enter a valid phone number'),
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
});

type SignupFormData = z.infer<typeof signupSchema>;

export function SignupScreen() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { register: authRegister, loginWithGoogle, state } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isCheckingEmail, setIsCheckingEmail] = useState(false);

  const { register, handleSubmit, setValue, watch, setError, formState: { errors, isSubmitting } } = useForm<SignupFormData>({
    resolver: zodResolver(signupSchema),
  });

  const phoneValue = watch('phone');

  const onSubmit = async (data: SignupFormData) => {
    try {
      setIsCheckingEmail(true);
      const emailExists = await authAPI.checkEmailExists(data.email);
      if (emailExists) {
        setError('email', { message: t('auth.emailAlreadyExists') });
        toast.error(t('auth.emailAlreadyExists'));
        navigate('/login', { state: { email: data.email } });
        return;
      }
      setIsCheckingEmail(false);

      if (smsAPI.isConfigured()) {
        navigate('/phone-verification', { state: { phone: data.phone, email: data.email, name: data.name, password: data.password, isSignup: true } });
      } else {
        await authRegister(data.email, data.password, data.name, data.phone);
        // Email confirmation required - show success message
        toast.success('Please check your email to verify your account.');
        navigate('/login', { state: { email: data.email, emailSent: true } });
      }
    } catch (error: any) {
      if (error?.message?.includes('email')) {
        setError('email', { message: error.message });
      }
    } finally {
      setIsCheckingEmail(false);
    }
  };

  const isLoading = state.isLoading || isCheckingEmail || isSubmitting;

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-red-50 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white dark:bg-gray-800 rounded-lg shadow-xl p-8">
        <div className="text-center mb-8">
          <div className="mx-auto w-16 h-16 bg-orange-100 dark:bg-orange-900 rounded-full flex items-center justify-center mb-4">
            <img src={BRAND.LOGO_URL} alt={BRAND.NAME} className="w-10 h-10 object-contain" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">{t('auth.createAccount')}</h1>
          <p className="text-gray-600 dark:text-gray-400">{t('auth.joinUs')}</p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div className="relative">
            <Input label={t('auth.fullName')} type="text" {...register('name')} placeholder={t('auth.enterFullName')} required error={errors.name?.message} disabled={isLoading} className="pl-10" />
            <UserIcon className="absolute left-3 top-9 h-5 w-5 text-gray-400" />
          </div>

          <PhoneField
            label={t('auth.mobileNumber') + ' *'}
            value={phoneValue}
            onChange={(v) => setValue('phone', v as string, { shouldValidate: true })}
            defaultCountry="IN"
            placeholder={t('auth.enterMobileNumber')}
            disabled={isLoading}
            error={errors.phone?.message}
          />

          <div className="relative">
            <Input label={t('auth.email')} type="email" {...register('email')} placeholder={t('auth.enterEmail')} required error={errors.email?.message} disabled={isLoading} className="pl-10" />
            <EnvelopeIcon className="absolute left-3 top-9 h-5 w-5 text-gray-400" />
          </div>

          <div className="relative">
            <Input label={t('auth.password')} type={showPassword ? 'text' : 'password'} {...register('password')} placeholder={t('auth.createPassword')} required error={errors.password?.message} helper={t('auth.passwordHelper')} disabled={isLoading} className="pl-10 pr-10" />
            <LockClosedIcon className="absolute left-3 top-9 h-5 w-5 text-gray-400" />
            <button type="button" onClick={() => setShowPassword(!showPassword)} disabled={isLoading} className="absolute right-3 top-9 h-5 w-5 text-gray-400 hover:text-gray-600 disabled:opacity-50">{showPassword ? <EyeSlashIcon /> : <EyeIcon />}</button>
          </div>

          <div className="relative">
            <Input label={t('auth.confirmPassword')} type={showConfirmPassword ? 'text' : 'password'} {...register('confirmPassword')} placeholder={t('auth.confirmNewPassword')} required error={errors.confirmPassword?.message} disabled={isLoading} className="pl-10 pr-10" />
            <LockClosedIcon className="absolute left-3 top-9 h-5 w-5 text-gray-400" />
            <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} disabled={isLoading} className="absolute right-3 top-9 h-5 w-5 text-gray-400 hover:text-gray-600 disabled:opacity-50">{showConfirmPassword ? <EyeSlashIcon /> : <EyeIcon />}</button>
          </div>

          <Button type="submit" disabled={isLoading} className="w-full">
            {isCheckingEmail ? t('auth.checkingEmail') : isSubmitting ? (smsAPI.isConfigured() ? t('auth.preparingVerification') : t('auth.creatingAccount')) : (smsAPI.isConfigured() ? t('auth.continueToVerification') : t('auth.signup'))}
          </Button>

          <div className="relative">
            <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-300" /></div>
            <div className="relative flex justify-center text-sm"><span className="px-2 bg-white dark:bg-gray-800 text-gray-500">{t('auth.orContinueWith')}</span></div>
          </div>

          <Button type="button" variant="secondary" onClick={loginWithGoogle} disabled={isLoading} className="w-full">
            <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
            {t('auth.continueWithGoogle')}
          </Button>

          <div className="text-center"><span className="text-gray-600 dark:text-gray-400">{t('auth.alreadyHaveAccount')}{' '}</span><Link to="/login" className="text-orange-500 hover:text-orange-600 font-medium">{t('auth.login')}</Link></div>
        </form>
      </div>
    </div>
  );
}