import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { authAPI } from '../api/auth';
import { smsAPI } from '../api/sms';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { BuildingStorefrontIcon, EnvelopeIcon, LockClosedIcon, PhoneIcon, EyeIcon, EyeSlashIcon, UserIcon } from '@heroicons/react/24/outline';
import { isValidEmail, isValidPhone, isValidName, validatePassword } from '../utils/validation';
import toast from 'react-hot-toast';

export function SignupScreen() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { register, loginWithGoogle, state } = useAuth();
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    password: '',
    confirmPassword: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [validationErrors, setValidationErrors] = useState<{
    name?: string;
    phone?: string;
    email?: string;
    password?: string;
    confirmPassword?: string;
  }>({});
  const [isCheckingEmail, setIsCheckingEmail] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const validateForm = (): boolean => {
    const errors: typeof validationErrors = {};

    if (!isValidName(formData.name)) {
      errors.name = 'Please enter a valid name (at least 2 characters, letters only)';
    }

    if (!isValidPhone(formData.phone)) {
      errors.phone = 'Please enter a valid phone number (10-15 digits)';
    }

    if (!isValidEmail(formData.email)) {
      errors.email = 'Please enter a valid email address';
    }

    const passwordValidation = validatePassword(formData.password);
    if (!passwordValidation.isValid) {
      errors.password = passwordValidation.errors[0];
    }

    if (formData.password !== formData.confirmPassword) {
      errors.confirmPassword = 'Passwords do not match';
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleEmailSignup = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    try {
      // Check if email already exists
      setIsCheckingEmail(true);
      const emailExists = await authAPI.checkEmailExists(formData.email);
      
      if (emailExists) {
        setValidationErrors({
          ...validationErrors,
          email: 'This email is already registered. Please log in or use "Sign in with Google" if you signed up with Google.'
        });
        toast.error('This email is already registered. Please log in instead.');
        return;
      }

      setIsCheckingEmail(false);

      console.log('[SignupScreen] Form validation passed, starting registration process');

      // Check if SMS is configured for phone verification
      if (smsAPI.isConfigured()) {
        console.log('[SignupScreen] SMS configured, redirecting to phone verification');
        
        // Navigate to phone verification screen with signup data
        navigate('/phone-verification', {
          state: {
            phone: formData.phone,
            email: formData.email,
            name: formData.name,
            password: formData.password,
            isSignup: true,
          },
        });
      } else {
        console.log('[SignupScreen] SMS not configured, proceeding with direct registration');
        
        // Fallback: Direct registration without phone verification
        const result = await register(formData.email, formData.password, formData.name, formData.phone);
        
        if (!result.requiresPhoneVerification) {
          // Registration completed successfully without phone verification
          console.log('[SignupScreen] Registration completed without phone verification');
        }
      }
    } catch (error: any) {
      console.error('[SignupScreen] Signup error:', error);
      
      // Error handling is done by AuthContext, but we can add specific UI feedback here
      if (error.message?.includes('email')) {
        setValidationErrors({
          ...validationErrors,
          email: error.message
        });
      }
    } finally {
      setIsSubmitting(false);
      setIsCheckingEmail(false);
    }
  };

  const handleGoogleSignup = async () => {
    try {
      // For Google OAuth, we might still need phone verification
      // This will be handled by the AuthContext after successful Google login
      await loginWithGoogle();
    } catch (error: any) {
      console.error('[SignupScreen] Google signup error:', error);
      // Error handling is done by AuthContext
    }
  };

  const isLoading = state.isLoading || isCheckingEmail || isSubmitting;

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-red-50 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white dark:bg-gray-800 rounded-lg shadow-xl p-8">
        <div className="text-center mb-8">
          <div className="mx-auto w-16 h-16 bg-orange-100 dark:bg-orange-900 rounded-full flex items-center justify-center mb-4">
            <BuildingStorefrontIcon className="w-8 h-8 text-orange-500 dark:text-orange-400" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            {t('auth.createAccount')}
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            {t('auth.joinUs')}
          </p>
        </div>

        {state.error && (
          <div className="mb-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 rounded-lg">
            <div className="flex items-center">
              <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
              {state.error}
            </div>
          </div>
        )}

        <form onSubmit={handleEmailSignup} className="space-y-6">
          <div className="relative">
            <Input
              label={t('auth.fullName')}
              type="text"
              value={formData.name}
              onChange={(e) => {
                setFormData({ ...formData, name: e.target.value });
                if (validationErrors.name) {
                  setValidationErrors({ ...validationErrors, name: undefined });
                }
              }}
              placeholder={t('auth.enterFullName')}
              required
              error={validationErrors.name}
              disabled={isLoading}
              className="pl-10"
            />
            <UserIcon className="absolute left-3 top-9 h-5 w-5 text-gray-400" />
          </div>

          <div className="relative">
            <Input
              label={t('auth.mobileNumber')}
              type="tel"
              value={formData.phone}
              onChange={(e) => {
                setFormData({ ...formData, phone: e.target.value });
                if (validationErrors.phone) {
                  setValidationErrors({ ...validationErrors, phone: undefined });
                }
              }}
              placeholder={t('auth.enterMobile')}
              required
              error={validationErrors.phone}
              disabled={isLoading}
              className="pl-10"
            />
            <PhoneIcon className="absolute left-3 top-9 h-5 w-5 text-gray-400" />
            <div className="mt-2">
              <p className="text-xs text-gray-500 dark:text-gray-400">
                📱 {smsAPI.isConfigured() 
                  ? 'Phone verification required - OTP will be sent' 
                  : 'Phone number for account security'
                }
              </p>
            </div>
          </div>

          <div className="relative">
            <Input
              label={t('auth.email')}
              type="email"
              value={formData.email}
              onChange={(e) => {
                setFormData({ ...formData, email: e.target.value });
                if (validationErrors.email) {
                  setValidationErrors({ ...validationErrors, email: undefined });
                }
              }}
              placeholder={t('auth.enterEmail')}
              required
              error={validationErrors.email}
              disabled={isLoading}
              className="pl-10"
            />
            <EnvelopeIcon className="absolute left-3 top-9 h-5 w-5 text-gray-400" />
          </div>

          <div className="relative">
            <Input
              label={t('auth.password')}
              type={showPassword ? 'text' : 'password'}
              value={formData.password}
              onChange={(e) => {
                setFormData({ ...formData, password: e.target.value });
                if (validationErrors.password) {
                  setValidationErrors({ ...validationErrors, password: undefined });
                }
              }}
              placeholder={t('auth.createPassword')}
              required
              error={validationErrors.password}
              helper="At least 8 characters"
              disabled={isLoading}
              className="pl-10 pr-10"
            />
            <LockClosedIcon className="absolute left-3 top-9 h-5 w-5 text-gray-400" />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              disabled={isLoading}
              className="absolute right-3 top-9 h-5 w-5 text-gray-400 hover:text-gray-600 disabled:opacity-50"
            >
              {showPassword ? <EyeSlashIcon /> : <EyeIcon />}
            </button>
          </div>

          <div className="relative">
            <Input
              label={t('auth.confirmPassword')}
              type={showConfirmPassword ? 'text' : 'password'}
              value={formData.confirmPassword}
              onChange={(e) => {
                setFormData({ ...formData, confirmPassword: e.target.value });
                if (validationErrors.confirmPassword) {
                  setValidationErrors({ ...validationErrors, confirmPassword: undefined });
                }
              }}
              placeholder={t('auth.confirmNewPassword')}
              required
              error={validationErrors.confirmPassword}
              disabled={isLoading}
              className="pl-10 pr-10"
            />
            <LockClosedIcon className="absolute left-3 top-9 h-5 w-5 text-gray-400" />
            <button
              type="button"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              disabled={isLoading}
              className="absolute right-3 top-9 h-5 w-5 text-gray-400 hover:text-gray-600 disabled:opacity-50"
            >
              {showConfirmPassword ? <EyeSlashIcon /> : <EyeIcon />}
            </button>
          </div>

          <Button
            type="submit"
            disabled={isLoading}
            className="w-full"
          >
            {isCheckingEmail 
              ? 'Checking email...' 
              : isSubmitting
                ? (smsAPI.isConfigured() ? 'Preparing verification...' : t('auth.creatingAccount'))
                : (smsAPI.isConfigured() ? 'Continue to Phone Verification' : t('auth.signup'))
            }
          </Button>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white dark:bg-gray-800 text-gray-500">
                {t('auth.orContinueWith')}
              </span>
            </div>
          </div>

          <Button
            type="button"
            variant="secondary"
            onClick={handleGoogleSignup}
            disabled={isLoading}
            className="w-full"
          >
            <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            {t('auth.continueWithGoogle')}
          </Button>

          <div className="text-center">
            <span className="text-gray-600 dark:text-gray-400">
              {t('auth.alreadyHaveAccount')}{' '}
            </span>
            <Link
              to="/login"
              className="text-orange-500 hover:text-orange-600 font-medium"
            >
              {t('auth.login')}
            </Link>
          </div>
        </form>

        {/* Development Info */}
        {import.meta.env.DEV && (
          <div className="mt-6 p-3 bg-gray-100 dark:bg-gray-700 rounded-lg">
            <p className="text-xs text-gray-600 dark:text-gray-400 text-center">
              🔧 Dev Mode: SMS {smsAPI.isConfigured() ? '✅ Configured' : '❌ Not Configured'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}