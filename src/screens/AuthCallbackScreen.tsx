import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { supabase } from '../lib/supabaseClient';
import toast from 'react-hot-toast';
import { BRAND } from '../constants/branding';

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

        // Email verified successfully!
        setStatus('success');
        toast.success('Email verified successfully!');

        // Redirect to login after 2 seconds
        setTimeout(() => {
          navigate('/login', {
            replace: true,
            state: { verified: true }
          });
        }, 2000);

      } catch (error: any) {
        console.error('Email verification error:', error);
        setStatus('error');
        setErrorMessage(error.message || 'Failed to verify email');
        toast.error(error.message || 'Email verification failed');

        // Redirect to login after 3 seconds even on error
        setTimeout(() => {
          navigate('/login', { replace: true });
        }, 3000);
      }
    };

    handleEmailVerification();
  }, [navigate]);

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
            {/* Status Icon */}
            {status === 'verifying' && (
              <>
                <Loader2 className="h-16 w-16 text-orange-600 dark:text-orange-400 animate-spin mb-4" />
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                  {t('auth.verifying') || 'Verifying Email...'}
                </h2>
                <p className="text-sm text-gray-600 dark:text-gray-400 text-center">
                  {t('auth.pleaseWait') || 'Please wait while we verify your email address.'}
                </p>
              </>
            )}

            {status === 'success' && (
              <>
                <div className="rounded-full bg-green-100 dark:bg-green-900/50 p-3 mb-4">
                  <CheckCircle className="h-16 w-16 text-green-600 dark:text-green-400" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                  {t('auth.emailVerified') || 'Email Verified!'}
                </h2>
                <p className="text-sm text-gray-600 dark:text-gray-400 text-center mb-4">
                  {t('auth.verificationSuccess') || 'Your email has been successfully verified.'}
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400 text-center">
                  {t('auth.redirectingToLogin') || 'Redirecting to login...'}
                </p>
              </>
            )}

            {status === 'error' && (
              <>
                <div className="rounded-full bg-red-100 dark:bg-red-900/50 p-3 mb-4">
                  <AlertCircle className="h-16 w-16 text-red-600 dark:text-red-400" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                  {t('auth.verificationFailed') || 'Verification Failed'}
                </h2>
                <p className="text-sm text-gray-600 dark:text-gray-400 text-center mb-4">
                  {errorMessage || t('auth.verificationError') || 'Failed to verify your email.'}
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400 text-center">
                  {t('auth.redirectingToLogin') || 'Redirecting to login...'}
                </p>
                <button
                  onClick={() => navigate('/login', { replace: true })}
                  className="mt-4 text-sm text-orange-600 dark:text-orange-400 hover:text-orange-800 dark:hover:text-orange-300 font-medium"
                >
                  {t('auth.goToLogin') || 'Go to Login Now'}
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
