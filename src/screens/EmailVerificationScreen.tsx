import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowLeftIcon, EnvelopeIcon, ArrowPathIcon } from '@heroicons/react/24/outline';
import { authAPI } from '../api/auth';
import { supabase } from '../lib/supabaseClient';
import toast from 'react-hot-toast';

interface LocationState {
  email: string;
  name?: string;
  phone?: string;
  isSignup?: boolean;
}

export function EmailVerificationScreen() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();

  const locationState = location.state as LocationState;

  const [countdown, setCountdown] = useState(60);
  const [canResend, setCanResend] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [isCheckingVerification, setIsCheckingVerification] = useState(false);

  // Redirect if no email provided
  useEffect(() => {
    if (!locationState?.email) {
      toast.error('Invalid verification flow. Please start again.');
      navigate('/signup', { replace: true });
    }
  }, [locationState, navigate]);

  // Countdown timer
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    } else {
      setCanResend(true);
    }
  }, [countdown]);

  // Note: AuthContext now handles auth state changes and profile loading
  // No need for duplicate listener here

  const handleResend = async () => {
    if (!canResend || isResending) return;

    try {
      setIsResending(true);
      await authAPI.resetPassword(locationState.email);
      toast.success('Verification email sent! Please check your inbox.');
      setCountdown(60);
      setCanResend(false);
    } catch (error: any) {
      console.error('Error resending verification email:', error);
      toast.error(error.message || 'Failed to resend verification email');
    } finally {
      setIsResending(false);
    }
  };

  const handleCheckVerification = async () => {
    try {
      setIsCheckingVerification(true);

      // Refresh session to get latest auth state
      const { data, error } = await supabase.auth.refreshSession();

      if (error) {
        throw error;
      }

      if (data.session?.user?.email_confirmed_at) {
        // Email verified! Create profile if needed
        if (locationState.name || locationState.phone) {
          await authAPI.ensureProfile(
            data.session.user.id,
            data.session.user.email,
            locationState.name,
            locationState.phone
          );
        }

        toast.success('Email verified successfully!');

        // AuthContext will handle the auth state update via onAuthStateChange
        // Just navigate to onboarding
        navigate('/get-started', { replace: true });
      } else {
        toast.error('Email not verified yet. Please check your inbox and click the verification link.');
      }
    } catch (error: any) {
      console.error('Error checking verification:', error);
      toast.error('Failed to check verification status');
    } finally {
      setIsCheckingVerification(false);
    }
  };

  const handleGoBack = () => {
    navigate('/signup', { replace: true });
  };

  if (!locationState?.email) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-red-50 dark:from-gray-900 dark:to-gray-800 flex flex-col">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-md mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <button
              onClick={handleGoBack}
              className="
                p-2 rounded-lg text-gray-600 dark:text-gray-400
                hover:bg-gray-100 dark:hover:bg-gray-700
                transition-colors duration-200
              "
            >
              <ArrowLeftIcon className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-lg font-semibold text-gray-900 dark:text-white">
                {t('auth.emailVerification')}
              </h1>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {t('auth.verifyToCompleteSignup')}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-white dark:bg-gray-800 rounded-lg shadow-xl p-8">
          {/* Icon */}
          <div className="text-center mb-6">
            <div className="w-16 h-16 mx-auto mb-4 bg-orange-100 dark:bg-orange-900/20 rounded-full flex items-center justify-center">
              <EnvelopeIcon className="w-8 h-8 text-orange-600 dark:text-orange-400" />
            </div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
              {t('auth.checkYourEmail')}
            </h2>
            <p className="text-gray-600 dark:text-gray-400 text-sm">
              {t('auth.verificationEmailSentTo')}
            </p>
            <p className="text-orange-600 dark:text-orange-400 font-medium mt-1">
              {locationState.email}
            </p>
          </div>

          {/* Instructions */}
          <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4 mb-6">
            <ol className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
              <li className="flex items-start gap-2">
                <span className="flex-shrink-0 w-5 h-5 rounded-full bg-orange-100 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400 text-xs font-semibold flex items-center justify-center">1</span>
                <span>{t('auth.checkInboxSpam')}</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="flex-shrink-0 w-5 h-5 rounded-full bg-orange-100 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400 text-xs font-semibold flex items-center justify-center">2</span>
                <span>{t('auth.clickVerificationLink')}</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="flex-shrink-0 w-5 h-5 rounded-full bg-orange-100 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400 text-xs font-semibold flex items-center justify-center">3</span>
                <span>{t('auth.returnToCompleteSetup')}</span>
              </li>
            </ol>
          </div>

          {/* Check Verification Button */}
          <button
            onClick={handleCheckVerification}
            disabled={isCheckingVerification}
            className="
              w-full mb-4 px-4 py-3 bg-orange-600 hover:bg-orange-700
              text-white font-medium rounded-lg transition-colors duration-200
              disabled:opacity-50 disabled:cursor-not-allowed
              focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2
            "
          >
            {isCheckingVerification ? t('auth.checking') : t('auth.iVerifiedMyEmail')}
          </button>

          {/* Resend Section */}
          <div className="text-center border-t border-gray-200 dark:border-gray-700 pt-4">
            <p className="text-gray-600 dark:text-gray-400 text-sm mb-3">
              {t('auth.didNotReceiveEmail')}
            </p>

            {canResend ? (
              <button
                type="button"
                onClick={handleResend}
                disabled={isResending}
                className="
                  inline-flex items-center gap-2 px-4 py-2 text-sm font-medium
                  text-orange-600 dark:text-orange-400 hover:text-orange-700 dark:hover:text-orange-300
                  transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed
                "
              >
                <ArrowPathIcon className={`w-4 h-4 ${isResending ? 'animate-spin' : ''}`} />
                {isResending ? t('auth.resendingEmail') : t('auth.resendEmail')}
              </button>
            ) : (
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {t('auth.resendEmailIn')} <span className="font-medium">{countdown}s</span>
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Footer Info */}
      <div className="bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700">
        <div className="max-w-md mx-auto px-4 py-4">
          <div className="text-center">
            <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
              {t('auth.emailVerificationFooter')}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
