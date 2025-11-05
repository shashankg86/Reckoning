import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { EnvelopeIcon, ArrowPathIcon, CheckCircleIcon, ExclamationCircleIcon } from '@heroicons/react/24/outline';
import { useTranslation } from 'react-i18next';
import { supabase } from '../lib/supabaseClient';
import toast from 'react-hot-toast';
import { BRAND } from '../constants/branding';

export function EmailVerificationScreen() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const [isResending, setIsResending] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [email, setEmail] = useState<string>('');

  useEffect(() => {
    // Get email from location state (passed from signup screen)
    const stateEmail = (location.state as any)?.email;
    if (stateEmail) {
      setEmail(stateEmail);
    } else {
      // If no email in state, redirect to signup
      navigate('/signup', { replace: true });
    }
  }, [location.state, navigate]);

  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCooldown]);

  const handleResendEmail = async () => {
    if (!email || resendCooldown > 0) return;

    try {
      setIsResending(true);

      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: email,
      });

      if (error) throw error;

      toast.success('Verification email sent! Please check your inbox.');
      setResendCooldown(60); // 60 second cooldown
    } catch (error: any) {
      console.error('Resend error:', error);
      toast.error(error.message || 'Failed to resend email. Please try again.');
    } finally {
      setIsResending(false);
    }
  };

  const handleBackToLogin = () => {
    navigate('/login', { replace: true });
  };

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
          {/* Icon */}
          <div className="flex justify-center mb-6">
            <div className="rounded-full bg-orange-100 dark:bg-orange-900/50 p-3">
              <EnvelopeIcon className="h-12 w-12 text-orange-600 dark:text-orange-400" />
            </div>
          </div>

          {/* Title */}
          <h2 className="text-center text-2xl font-bold text-gray-900 dark:text-white mb-2">
            {t('auth.verifyEmail')}
          </h2>

          {/* Description */}
          <div className="text-center space-y-3 mb-6">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {t('auth.verificationEmailSent')}
            </p>
            <p className="text-sm font-semibold text-gray-900 dark:text-white break-all px-4">
              {email}
            </p>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {t('auth.clickLinkToVerify')}
            </p>
          </div>

          {/* Instructions */}
          <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg p-4 mb-6">
            <div className="flex items-start">
              <ExclamationCircleIcon className="h-5 w-5 text-orange-600 dark:text-orange-400 mr-2 mt-0.5 flex-shrink-0" />
              <div className="text-sm text-orange-800 dark:text-orange-300 space-y-2">
                <p className="font-medium">
                  {t('auth.verificationSteps')}
                </p>
                <ol className="list-decimal list-inside space-y-1 ml-2">
                  <li>{t('auth.checkInbox')}</li>
                  <li>{t('auth.checkSpam')}</li>
                  <li>{t('auth.clickVerificationLink')}</li>
                  <li>{t('auth.returnToLogin')}</li>
                </ol>
              </div>
            </div>
          </div>

          {/* Resend Button */}
          <div className="space-y-4">
            <button
              onClick={handleResendEmail}
              disabled={isResending || resendCooldown > 0}
              className="w-full flex justify-center items-center py-2.5 px-4 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isResending ? (
                <>
                  <ArrowPathIcon className="animate-spin h-4 w-4 mr-2" />
                  {t('auth.sending')}
                </>
              ) : resendCooldown > 0 ? (
                <>
                  <ArrowPathIcon className="h-4 w-4 mr-2" />
                  {t('auth.resendIn')} {resendCooldown}s
                </>
              ) : (
                <>
                  <ArrowPathIcon className="h-4 w-4 mr-2" />
                  {t('auth.resendEmail')}
                </>
              )}
            </button>

            {/* Back to Login */}
            <button
              onClick={handleBackToLogin}
              className="w-full flex justify-center items-center py-2.5 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-orange-600 hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 transition-colors"
            >
              <CheckCircleIcon className="h-4 w-4 mr-2" />
              {t('auth.alreadyVerified')}
            </button>
          </div>

          {/* Help Text */}
          <p className="mt-6 text-center text-xs text-gray-500 dark:text-gray-400">
            {t('auth.verificationEmailHelp')}
          </p>
        </div>
      </div>
    </div>
  );
}
