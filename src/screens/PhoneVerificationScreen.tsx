import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';
import { OTPInput } from '../components/ui/OTPInput';
import { smsAPI } from '../api/sms';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';

interface LocationState {
  phone: string;
  email: string;
  name: string;
  password?: string;
  isSignup?: boolean;
}

export function PhoneVerificationScreen() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const { register, state: authState } = useAuth();
  
  const locationState = location.state as LocationState;
  
  // Redirect if no phone number provided
  useEffect(() => {
    if (!locationState?.phone || !locationState?.email) {
      toast.error('Invalid verification flow. Please start again.');
      navigate('/signup', { replace: true });
    }
  }, [locationState, navigate]);

  const [otp, setOtp] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [error, setError] = useState('');
  const [isInitializing, setIsInitializing] = useState(true);

  // Send initial OTP when component mounts
  useEffect(() => {
    if (locationState?.phone) {
      sendInitialOTP();
    }
  }, [locationState?.phone]);

  const sendInitialOTP = async () => {
    try {
      setIsInitializing(true);
      const result = await smsAPI.sendOTP(locationState.phone);
      
      if (!result.success) {
        throw new Error(result.message);
      }
      
      toast.success('OTP sent to your phone number');
    } catch (error: any) {
      console.error('Error sending initial OTP:', error);
      toast.error(error.message || 'Failed to send OTP');
      setError(error.message || 'Failed to send OTP');
    } finally {
      setIsInitializing(false);
    }
  };

  const handleOTPComplete = async (completedOTP: string) => {
    await verifyOTP(completedOTP);
  };

  const verifyOTP = async (otpToVerify: string) => {
    try {
      setIsVerifying(true);
      setError('');

      console.log('[PhoneVerification] Verifying OTP:', otpToVerify);

      const result = await smsAPI.verifyOTP(locationState.phone, otpToVerify);
      
      if (result.success) {
        toast.success('Phone number verified successfully!');
        
        // If this is signup flow, complete registration
        if (locationState.isSignup && locationState.password) {
          console.log('[PhoneVerification] Completing signup with verified phone');
          
          await register(
            locationState.email,
            locationState.password,
            locationState.name,
            locationState.phone
          );
          
          // Registration success is handled by AuthContext
          // User will be redirected to onboarding or dashboard
        } else {
          // For login flow or other scenarios
          navigate('/dashboard');
        }
      } else {
        throw new Error(result.message);
      }
    } catch (error: any) {
      console.error('[PhoneVerification] Verification error:', error);
      setError(error.message || 'Invalid OTP. Please try again.');
      setOtp(''); // Clear OTP on error
    } finally {
      setIsVerifying(false);
    }
  };

  const handleResend = async () => {
    try {
      setIsResending(true);
      setError('');
      
      const result = await smsAPI.resendOTP(locationState.phone);
      
      if (result.success) {
        toast.success('New OTP sent to your phone number');
        setOtp(''); // Clear current OTP
      } else {
        throw new Error(result.message);
      }
    } catch (error: any) {
      console.error('Error resending OTP:', error);
      toast.error(error.message || 'Failed to resend OTP');
      setError(error.message || 'Failed to resend OTP');
    } finally {
      setIsResending(false);
    }
  };

  const handleGoBack = () => {
    navigate(-1);
  };

  if (!locationState?.phone || !locationState?.email) {
    return null; // Component will redirect via useEffect
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col">
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
              disabled={isVerifying}
            >
              <ArrowLeftIcon className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-lg font-semibold text-gray-900 dark:text-white">
                {t('auth.phoneVerification')}
              </h1>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {locationState.isSignup ? t('auth.verifyToCompleteSignup') : t('auth.verifyToContinue')}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          {isInitializing ? (
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600 dark:text-gray-400">
                {t('auth.sendingOtp')}...
              </p>
            </div>
          ) : (
            <OTPInput
              value={otp}
              onChange={setOtp}
              onComplete={handleOTPComplete}
              disabled={isVerifying}
              error={error}
              phone={locationState.phone}
              onResend={handleResend}
              isResending={isResending}
            />
          )}

          {/* Loading Overlay */}
          {isVerifying && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-sm mx-4">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                  <p className="text-gray-900 dark:text-white font-medium">
                    {t('auth.verifyingOtp')}...
                  </p>
                  <p className="text-gray-600 dark:text-gray-400 text-sm mt-2">
                    {t('auth.pleaseWait')}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Footer Info */}
      <div className="bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700">
        <div className="max-w-md mx-auto px-4 py-4">
          <div className="text-center">
            <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
              {t('auth.otpFooterText')}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}