import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { supabase } from '../lib/supabaseClient';
import { authAPI } from '../api/auth';
import { LoadingScreen } from '../components/ui/Loader';
import toast from 'react-hot-toast';

// Flag to prevent multiple simultaneous exchanges
let isExchanging = false;

export function AuthCallbackScreen() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handleAuthCallback = async () => {
      // Prevent multiple simultaneous calls
      if (isExchanging) {
        console.log('[AuthCallback] Already exchanging code, skipping...');
        return;
      }

      try {
        isExchanging = true;

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

        // Backup and restore code_verifier to handle multiple exchange attempts
        // Supabase removes it from localStorage after first successful exchange
        const BACKUP_KEY = 'pkce_code_verifier_backup';
        const BACKUP_STORAGE_KEY = 'pkce_storage_key_backup';
        let codeVerifierBackup: string | null = null;
        let storageKeyBackup: string | null = null;

        try {
          // First check if we have a backup in sessionStorage
          codeVerifierBackup = sessionStorage.getItem(BACKUP_KEY);
          storageKeyBackup = sessionStorage.getItem(BACKUP_STORAGE_KEY);

          if (codeVerifierBackup && storageKeyBackup) {
            console.log('[AuthCallback] Found backup in sessionStorage, restoring to localStorage...');
            localStorage.setItem(storageKeyBackup, codeVerifierBackup);
          } else {
            // No backup yet - find and backup code_verifier from localStorage
            for (let i = 0; i < localStorage.length; i++) {
              const key = localStorage.key(i);
              if (key && key.includes('code-verifier')) {
                codeVerifierBackup = localStorage.getItem(key);
                storageKeyBackup = key;

                // Save to sessionStorage for persistence across multiple calls
                if (codeVerifierBackup) {
                  sessionStorage.setItem(BACKUP_KEY, codeVerifierBackup);
                  sessionStorage.setItem(BACKUP_STORAGE_KEY, key);
                  console.log('[AuthCallback] Backed up code_verifier to sessionStorage from key:', key);
                }
                break;
              }
            }
          }
        } catch (e) {
          console.warn('[AuthCallback] Could not backup/restore code_verifier:', e);
        }

        console.log('[AuthCallback] Exchanging code for session...');

        // Exchange the code for a session
        const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

        if (exchangeError) {
          // If exchange failed and we have backup, try to restore it
          if (codeVerifierBackup && storageKeyBackup) {
            console.log('[AuthCallback] Exchange failed, restoring code_verifier to localStorage...');
            try {
              localStorage.setItem(storageKeyBackup, codeVerifierBackup);
              console.log('[AuthCallback] Restored code_verifier to key:', storageKeyBackup);
            } catch (e) {
              console.warn('[AuthCallback] Could not restore code_verifier:', e);
            }
          }
          throw exchangeError;
        }

        // Exchange successful - restore code_verifier for any subsequent calls
        if (codeVerifierBackup && storageKeyBackup) {
          try {
            localStorage.setItem(storageKeyBackup, codeVerifierBackup);
            console.log('[AuthCallback] Exchange successful, restored code_verifier for subsequent calls');
          } catch (e) {
            console.warn('[AuthCallback] Could not restore code_verifier after success:', e);
          }
        }

        if (!data.session || !data.user) {
          throw new Error('Failed to create session');
        }

        console.log('[AuthCallback] Code exchange successful!');

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

        // Clean up backup from sessionStorage - no longer needed
        try {
          sessionStorage.removeItem(BACKUP_KEY);
          sessionStorage.removeItem(BACKUP_STORAGE_KEY);
          console.log('[AuthCallback] Cleaned up code_verifier backup from sessionStorage');
        } catch (e) {
          console.warn('[AuthCallback] Could not clean up backup:', e);
        }

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
      } finally {
        isExchanging = false;
      }
    };

    handleAuthCallback();
  }, [searchParams, navigate, t]);

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
