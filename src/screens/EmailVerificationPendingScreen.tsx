import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { EnvelopeIcon, CheckCircleIcon, ClockIcon } from '@heroicons/react/24/outline';
import { Button } from '../components/ui/Button';
import { authAPI } from '../api/auth';
import toast from 'react-hot-toast';
import { BRAND } from '../constants/branding';

const RESEND_COOLDOWN = 60; // 60 seconds

export function EmailVerificationPendingScreen() {
  const { t } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  const email = location.state?.email;

  const [countdown, setCountdown] = useState(RESEND_COOLDOWN);
  const [isResending, setIsResending] = useState(false);

  // If no email in state, redirect to signup
  useEffect(() => {
    if (!email) {
      navigate('/signup', { replace: true });
    }
  }, [email, navigate]);

  // Countdown timer
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  const handleResendEmail = async () => {
    if (countdown > 0 || !email) return;

    try {
      setIsResending(true);
      await authAPI.resendVerificationEmail(email);
      toast.success('Verification email sent! Please check your inbox.');
      setCountdown(RESEND_COOLDOWN);
    } catch (error: any) {
      toast.error(error.message || 'Failed to resend email. Please try again.');
    } finally {
      setIsResending(false);
    }
  };

  if (!email) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-red-50 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white dark:bg-gray-800 rounded-lg shadow-xl p-8">
        {/* Logo and Icon */}
        <div className="text-center mb-8">
          <div className="mx-auto w-16 h-16 bg-orange-100 dark:bg-orange-900 rounded-full flex items-center justify-center mb-4">
            <img src={BRAND.LOGO_URL} alt={BRAND.NAME} className="w-10 h-10 object-contain" />
          </div>
          <div className="mx-auto w-20 h-20 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center mb-4">
            <EnvelopeIcon className="w-10 h-10 text-blue-600 dark:text-blue-400" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            Verify Your Email
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            We've sent a verification link to
          </p>
          <p className="text-orange-600 dark:text-orange-400 font-medium mt-1">
            {email}
          </p>
        </div>

        {/* Instructions */}
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-6">
          <div className="flex items-start space-x-3">
            <CheckCircleIcon className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-blue-800 dark:text-blue-300">
              <p className="font-medium mb-1">Check your email</p>
              <p className="text-blue-700 dark:text-blue-400">
                Click the verification link in the email to activate your account. The link will expire in 24 hours.
              </p>
            </div>
          </div>
        </div>

        {/* Resend Email Button */}
        <div className="space-y-4 mb-6">
          <div className="text-center">
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
              Didn't receive the email?
            </p>
            <Button
              type="button"
              variant="secondary"
              onClick={handleResendEmail}
              disabled={countdown > 0 || isResending}
              className="w-full"
            >
              {isResending ? (
                'Sending...'
              ) : countdown > 0 ? (
                <span className="flex items-center justify-center">
                  <ClockIcon className="w-4 h-4 mr-2" />
                  Resend in {countdown}s
                </span>
              ) : (
                'Resend Verification Email'
              )}
            </Button>
          </div>
        </div>

        {/* Tips */}
        <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4 mb-6">
          <p className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
            Tips:
          </p>
          <ul className="text-xs text-gray-600 dark:text-gray-400 space-y-1">
            <li>• Check your spam or junk folder</li>
            <li>• Make sure {email} is correct</li>
            <li>• Wait a few minutes for the email to arrive</li>
          </ul>
        </div>

        {/* Already Verified? */}
        <div className="text-center pt-4 border-t border-gray-200 dark:border-gray-700">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Already verified your email?{' '}
            <Link
              to="/login"
              state={{ email }}
              className="text-orange-500 hover:text-orange-600 font-medium"
            >
              Sign in here
            </Link>
          </p>
        </div>

        {/* Back to Signup */}
        <div className="text-center mt-4">
          <Link
            to="/signup"
            className="text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
          >
            ← Back to signup
          </Link>
        </div>
      </div>
    </div>
  );
}
