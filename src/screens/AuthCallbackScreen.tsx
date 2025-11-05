import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircleIcon, ExclamationCircleIcon } from '@heroicons/react/24/outline';
import { useTranslation } from 'react-i18next';
import { supabase } from '../lib/supabaseClient';
import { authAPI } from '../api/auth';
import toast from 'react-hot-toast';
import { BRAND } from '../constants/branding';
import { LoadingScreen } from '../components/ui/Loader';

type VerificationStatus = 'verifying' | 'success' | 'error';

export function AuthCallbackScreen() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [status, setStatus] = useState<VerificationStatus>('verifying');
  const [errorMessage, setErrorMessage] = useState<string>('');

  useEffect(() => {
    const handleEmailVerification = async () => {
      try {
        // Get the token from URL hash
        const hashParams = new URLSearchParams(window.location.hash.substring(1));
        const accessToken = hashParams.get('access_token');
        const type = hashParams.get('type');

        // Check if this is an email confirmation
        if (type !== 'signup' && type !== 'email') {
          throw new Error('Invalid verification type');
        }

        if (!accessToken) {
          throw new Error('No verification token found');
        }

        // Get the current session (Supabase auto-exchanges the token)
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();

        if (sessionError) throw sessionError;

        if (!session) {
          throw new Error('Failed to create session after verification');
        }

        // CRITICAL: Ensure profile exists after email verification
        const user = session.user;

        // Verify email is confirmed
        if (!user.email_confirmed_at) {
          throw new Error('Email not verified');
        }

        const name = user.user_metadata?.name || user.email?.split('@')[0] || 'User';
        const phone = user.user_metadata?.phone || '';

        console.log('[AuthCallback] User metadata:', user.user_metadata);
        console.log('[AuthCallback] Creating profile for verified user:', {
          userId: user.id,
          email: user.email,
          name: name,
          phone: phone,
          emailVerified: true
        });

        try {
          await authAPI.ensureProfile(user.id, user.email, name, phone);
          console.log('[AuthCallback] Profile created successfully');
        } catch (profileError: any) {
          console.error('[AuthCallback] FAILED to create profile:', profileError);
          throw new Error(`Profile creation failed: ${profileError.message}. Please contact support.`);
        }

        // Email verified successfully!
        setStatus('success');
        toast.success('Email verified! Redirecting to onboarding...');

        // Redirect directly to onboarding since user is already authenticated
        setTimeout(() => {
          navigate('/onboarding', { replace: true });
        }, 1500);

      } catch (error: any) {
        console.error('Email verification error:', error);
        setStatus('error');
        setErrorMessage(error.message || 'Failed to verify email');
        toast.error(error.message || 'Email verification failed');

        // Redirect to signup after 3 seconds on error
        setTimeout(() => {
          navigate('/signup', { replace: true });
        }, 3000);
      }
    };

    handleEmailVerification();
  }, [navigate]);

  // Show loading screen while verifying
  if (status === 'verifying') {
    return <LoadingScreen />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-red-50 dark:from-gray-900 dark:to-gray-800 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        {/* Logo */}
        <div className="flex justify-center">
          <div className="w-16 h-16 bg-orange-100 dark:bg-orange-900 rounded-full flex items-center justify-center mb-4">
            <img src={BRAND.LOGO_URL} alt={BRAND.NAME} className="w-10 h-10 object-contain" />
          </div>
        </div>

        {/* Card */}
        <div className="mt-8 bg-white dark:bg-gray-800 py-8 px-4 shadow-xl sm:rounded-lg sm:px-10">
          <div className="flex flex-col items-center">
            {status === 'success' && (
              <>
                <div className="rounded-full bg-green-100 dark:bg-green-900/50 p-3 mb-4">
                  <CheckCircleIcon className="h-16 w-16 text-green-600 dark:text-green-400" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                  {t('auth.emailVerified')}
                </h2>
                <p className="text-sm text-gray-600 dark:text-gray-400 text-center mb-4">
                  {t('auth.verificationSuccess')}
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400 text-center">
                  Redirecting to onboarding...
                </p>
              </>
            )}

            {status === 'error' && (
              <>
                <div className="rounded-full bg-red-100 dark:bg-red-900/50 p-3 mb-4">
                  <ExclamationCircleIcon className="h-16 w-16 text-red-600 dark:text-red-400" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                  {t('auth.verificationFailed')}
                </h2>
                <p className="text-sm text-gray-600 dark:text-gray-400 text-center mb-4">
                  {errorMessage || t('auth.verificationError')}
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400 text-center">
                  Redirecting to signup...
                </p>
                <button
                  onClick={() => navigate('/signup', { replace: true })}
                  className="mt-4 text-sm text-orange-600 dark:text-orange-400 hover:text-orange-800 dark:hover:text-orange-300 font-medium"
                >
                  Go to Signup
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
