import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { supabase } from '../lib/supabaseClient';
import { authAPI } from '../api/auth';
import { LoadingScreen } from '../components/ui/Loader';
import toast from 'react-hot-toast';

export function AuthCallbackScreen() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        // Get the code from URL params
        const code = searchParams.get('code');
        const errorParam = searchParams.get('error');
        const errorDescription = searchParams.get('error_description');

        if (errorParam) {
          throw new Error(errorDescription || 'Authentication failed');
        }

        if (!code) {
          throw new Error('No verification code found');
        }

        // Exchange the code for a session
        const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

        if (exchangeError) {
          throw exchangeError;
        }

        if (!data.session || !data.user) {
          throw new Error('Failed to create session');
        }

        // Check if email is verified
        if (!data.user.email_confirmed_at) {
          throw new Error('Email not verified');
        }

        // Get user metadata
        const name = data.user.user_metadata?.name || data.user.email?.split('@')[0] || 'User';
        const phone = data.user.user_metadata?.phone || '';

        // Create profile
        await authAPI.ensureProfile(data.user.id, data.user.email, name, phone);

        toast.success('Email verified successfully!');

        // Redirect to onboarding
        navigate('/get-started', { replace: true });
      } catch (error: any) {
        console.error('Auth callback error:', error);
        setError(error.message || 'Failed to verify email');
        toast.error(error.message || 'Failed to verify email');

        // Redirect to login after a delay
        setTimeout(() => {
          navigate('/login', { replace: true });
        }, 3000);
      }
    };

    handleAuthCallback();
  }, [searchParams, navigate]);

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 to-red-50 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-white dark:bg-gray-800 rounded-lg shadow-xl p-8 text-center">
          <div className="w-16 h-16 mx-auto mb-4 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center">
            <svg className="w-8 h-8 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
            {t('auth.verificationFailed')}
          </h2>
          <p className="text-gray-600 dark:text-gray-400 text-sm">
            {error}
          </p>
          <p className="text-gray-500 dark:text-gray-500 text-xs mt-4">
            {t('auth.redirectingToLogin')}
          </p>
        </div>
      </div>
    );
  }

  return <LoadingScreen />;
}
