import React, { useState, useRef, useEffect } from 'react';
import { ArrowPathIcon, CheckCircleIcon, ExclamationCircleIcon } from '@heroicons/react/24/outline';
import { useTranslation } from 'react-i18next';

interface OTPInputProps {
  length?: number;
  value: string;
  onChange: (otp: string) => void;
  onComplete: (otp: string) => void;
  disabled?: boolean;
  error?: string;
  phone: string;
  onResend: () => Promise<void>;
  isResending?: boolean;
}

export function OTPInput({
  length = 6,
  value,
  onChange,
  onComplete,
  disabled = false,
  error,
  phone,
  onResend,
  isResending = false,
}: OTPInputProps) {
  const { t } = useTranslation();
  const [countdown, setCountdown] = useState(60);
  const [canResend, setCanResend] = useState(false);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Start countdown timer
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    } else {
      setCanResend(true);
    }
  }, [countdown]);

  // Focus first input on mount
  useEffect(() => {
    if (inputRefs.current[0]) {
      inputRefs.current[0].focus();
    }
  }, []);

  // Handle input change
  const handleInputChange = (index: number, inputValue: string) => {
    if (disabled) return;

    // Only allow digits
    const digitValue = inputValue.replace(/\D/g, '');
    
    if (digitValue.length <= 1) {
      const newOTP = value.split('');
      newOTP[index] = digitValue;
      const updatedOTP = newOTP.join('');
      
      onChange(updatedOTP);

      // Auto-focus next input
      if (digitValue && index < length - 1) {
        inputRefs.current[index + 1]?.focus();
      }

      // Call onComplete when OTP is full
      if (updatedOTP.length === length && !updatedOTP.includes('')) {
        onComplete(updatedOTP);
      }
    }
  };

  // Handle backspace
  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (disabled) return;

    if (e.key === 'Backspace') {
      e.preventDefault();
      
      if (value[index]) {
        // Clear current input
        const newOTP = value.split('');
        newOTP[index] = '';
        onChange(newOTP.join(''));
      } else if (index > 0) {
        // Move to previous input and clear it
        const newOTP = value.split('');
        newOTP[index - 1] = '';
        onChange(newOTP.join(''));
        inputRefs.current[index - 1]?.focus();
      }
    } else if (e.key === 'ArrowLeft' && index > 0) {
      inputRefs.current[index - 1]?.focus();
    } else if (e.key === 'ArrowRight' && index < length - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  // Handle paste
  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    if (disabled) return;

    const pastedData = e.clipboardData.getData('text').replace(/\D/g, '');
    if (pastedData.length <= length) {
      onChange(pastedData.padEnd(length, ''));
      
      // Focus appropriate input
      const nextIndex = Math.min(pastedData.length, length - 1);
      inputRefs.current[nextIndex]?.focus();

      // Call onComplete if OTP is complete
      if (pastedData.length === length) {
        onComplete(pastedData);
      }
    }
  };

  // Handle resend OTP
  const handleResend = async () => {
    if (!canResend || isResending) return;

    await onResend();
    setCountdown(60);
    setCanResend(false);
  };

  // Format phone number for display
  const formatPhone = (phoneNumber: string) => {
    const cleaned = phoneNumber.replace(/\D/g, '');
    if (cleaned.length === 10) {
      return `+91 ${cleaned.slice(0, 5)} ${cleaned.slice(5)}`;
    }
    return phoneNumber;
  };

  return (
    <div className="w-full max-w-md mx-auto">
      {/* Header */}
      <div className="text-center mb-6">
        <div className="w-16 h-16 mx-auto mb-4 bg-blue-50 dark:bg-blue-900/20 rounded-full flex items-center justify-center">
          <CheckCircleIcon className="w-8 h-8 text-blue-600 dark:text-blue-400" />
        </div>
        <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
          {t('auth.verifyPhone')}
        </h3>
        <p className="text-gray-600 dark:text-gray-400 text-sm">
          {t('auth.otpSentTo')} <span className="font-medium">{formatPhone(phone)}</span>
        </p>
      </div>

      {/* OTP Input Fields */}
      <div className="flex justify-center gap-3 mb-6">
        {Array.from({ length }, (_, index) => (
          <input
            key={index}
            ref={(el) => (inputRefs.current[index] = el)}
            type="text"
            inputMode="numeric"
            maxLength={1}
            value={value[index] || ''}
            onChange={(e) => handleInputChange(index, e.target.value)}
            onKeyDown={(e) => handleKeyDown(index, e)}
            onPaste={handlePaste}
            disabled={disabled}
            className={`
              w-12 h-12 text-center text-lg font-semibold border-2 rounded-lg
              transition-all duration-200 focus:outline-none focus:ring-2
              ${error
                ? 'border-red-300 focus:border-red-500 focus:ring-red-200 bg-red-50 dark:bg-red-900/20 dark:border-red-600'
                : 'border-gray-300 dark:border-gray-600 focus:border-blue-500 focus:ring-blue-200 dark:focus:ring-blue-800'
              }
              ${disabled
                ? 'bg-gray-50 dark:bg-gray-800 cursor-not-allowed opacity-50'
                : 'bg-white dark:bg-gray-900 hover:border-gray-400 dark:hover:border-gray-500'
              }
              text-gray-900 dark:text-white
              dark:focus:border-blue-400
            `}
            aria-label={`${t('auth.otpDigit')} ${index + 1}`}
          />
        ))}
      </div>

      {/* Error Message */}
      {error && (
        <div className="flex items-center justify-center gap-2 mb-4 text-red-600 dark:text-red-400">
          <ExclamationCircleIcon className="w-4 h-4 flex-shrink-0" />
          <p className="text-sm font-medium">{error}</p>
        </div>
      )}

      {/* Resend Section */}
      <div className="text-center">
        <p className="text-gray-600 dark:text-gray-400 text-sm mb-3">
          {t('auth.didNotReceiveOtp')}
        </p>
        
        {canResend ? (
          <button
            type="button"
            onClick={handleResend}
            disabled={isResending}
            className="
              inline-flex items-center gap-2 px-4 py-2 text-sm font-medium
              text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300
              transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed
            "
          >
            <ArrowPathIcon className={`w-4 h-4 ${isResending ? 'animate-spin' : ''}`} />
            {isResending ? t('auth.resendingOtp') : t('auth.resendOtp')}
          </button>
        ) : (
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {t('auth.resendOtpIn')} <span className="font-medium">{countdown}s</span>
          </p>
        )}
      </div>

      {/* Helper Text */}
      <div className="mt-6 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
        <p className="text-xs text-gray-600 dark:text-gray-400 text-center leading-relaxed">
          {t('auth.otpHelperText')}
        </p>
      </div>
    </div>
  );
}