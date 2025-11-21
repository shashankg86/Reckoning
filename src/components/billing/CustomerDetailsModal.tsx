import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  XMarkIcon,
  UserIcon,
  PhoneIcon,
  EnvelopeIcon
} from '@heroicons/react/24/outline';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';

interface CustomerDetails {
  name: string;
  phone: string;
  email: string;
  countryCode: string;
}

interface CustomerDetailsModalProps {
  currentDetails?: CustomerDetails;
  defaultCountry?: string; // Store country for pre-selecting country code
  onClose: () => void;
  onSubmit: (details: CustomerDetails) => void;
}

const COUNTRY_CODES = [
  { code: '+91', country: 'IN', flag: '🇮🇳', name: 'India' },
  { code: '+971', country: 'AE', flag: '🇦🇪', name: 'UAE' },
  { code: '+1', country: 'US', flag: '🇺🇸', name: 'United States' },
  { code: '+44', country: 'GB', flag: '🇬🇧', name: 'United Kingdom' },
  { code: '+86', country: 'CN', flag: '🇨🇳', name: 'China' },
  { code: '+81', country: 'JP', flag: '🇯🇵', name: 'Japan' },
  { code: '+49', country: 'DE', flag: '🇩🇪', name: 'Germany' },
  { code: '+33', country: 'FR', flag: '🇫🇷', name: 'France' },
  { code: '+61', country: 'AU', flag: '🇦🇺', name: 'Australia' },
  { code: '+65', country: 'SG', flag: '🇸🇬', name: 'Singapore' },
];

export function CustomerDetailsModal({
  currentDetails,
  defaultCountry = 'IN',
  onClose,
  onSubmit
}: CustomerDetailsModalProps) {
  const { t } = useTranslation();

  // Find default country code based on store country
  const defaultCountryCode = COUNTRY_CODES.find(c => c.country === defaultCountry)?.code || '+91';

  const [name, setName] = useState(currentDetails?.name || '');
  const [countryCode, setCountryCode] = useState(currentDetails?.countryCode || defaultCountryCode);
  const [phone, setPhone] = useState(currentDetails?.phone || '');
  const [email, setEmail] = useState(currentDetails?.email || '');
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Email validation regex
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  // Phone validation (10 digits for India, flexible for others)
  const validatePhone = (phone: string) => {
    const cleaned = phone.replace(/\D/g, '');
    if (countryCode === '+91') {
      return cleaned.length === 10;
    }
    return cleaned.length >= 7 && cleaned.length <= 15;
  };

  const handleSubmit = () => {
    const newErrors: Record<string, string> = {};

    // Validate name
    if (!name.trim()) {
      newErrors.name = t('billing.nameRequired');
    } else if (name.trim().length < 2) {
      newErrors.name = t('billing.nameMinLength');
    }

    // Validate phone
    if (!phone.trim()) {
      newErrors.phone = t('billing.phoneRequired');
    } else if (!validatePhone(phone)) {
      newErrors.phone = t('billing.phoneInvalid');
    }

    // Validate email
    if (!email.trim()) {
      newErrors.email = t('billing.emailRequired');
    } else if (!emailRegex.test(email)) {
      newErrors.email = t('billing.emailInvalid');
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    // All valid, submit
    onSubmit({
      name: name.trim(),
      phone: phone.trim(),
      email: email.trim(),
      countryCode
    });
  };

  // Clear error when user types
  const handleNameChange = (value: string) => {
    setName(value);
    if (errors.name) {
      setErrors({ ...errors, name: '' });
    }
  };

  const handlePhoneChange = (value: string) => {
    // Only allow numbers and basic formatting characters
    const cleaned = value.replace(/[^\d\s\-()]/g, '');
    setPhone(cleaned);
    if (errors.phone) {
      setErrors({ ...errors, phone: '' });
    }
  };

  const handleEmailChange = (value: string) => {
    setEmail(value);
    if (errors.email) {
      setErrors({ ...errors, email: '' });
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg w-full max-w-md">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2">
            <UserIcon className="h-5 w-5 text-orange-500" />
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              {t('billing.customerDetails')}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
          >
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {t('billing.customerDetailsRequired')}
          </p>

          {/* Name Field */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {t('billing.customerName')} <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <UserIcon className="h-5 w-5 text-gray-400" />
              </div>
              <Input
                value={name}
                onChange={(e) => handleNameChange(e.target.value)}
                placeholder={t('billing.enterCustomerName')}
                className={`pl-10 ${errors.name ? 'border-red-500' : ''}`}
              />
            </div>
            {errors.name && (
              <p className="text-red-500 text-xs mt-1">{errors.name}</p>
            )}
          </div>

          {/* Phone Field with Country Code */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {t('billing.customerPhone')} <span className="text-red-500">*</span>
            </label>
            <div className="flex gap-2">
              <select
                value={countryCode}
                onChange={(e) => setCountryCode(e.target.value)}
                className="w-32 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              >
                {COUNTRY_CODES.map(c => (
                  <option key={c.code} value={c.code}>
                    {c.flag} {c.code}
                  </option>
                ))}
              </select>
              <div className="relative flex-1">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <PhoneIcon className="h-5 w-5 text-gray-400" />
                </div>
                <Input
                  value={phone}
                  onChange={(e) => handlePhoneChange(e.target.value)}
                  placeholder={countryCode === '+91' ? '9876543210' : t('billing.enterPhone')}
                  className={`pl-10 ${errors.phone ? 'border-red-500' : ''}`}
                  type="tel"
                />
              </div>
            </div>
            {errors.phone && (
              <p className="text-red-500 text-xs mt-1">{errors.phone}</p>
            )}
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              {countryCode === '+91' ? t('billing.phoneHintIndia') : t('billing.phoneHintGeneral')}
            </p>
          </div>

          {/* Email Field */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {t('billing.customerEmail')} <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <EnvelopeIcon className="h-5 w-5 text-gray-400" />
              </div>
              <Input
                value={email}
                onChange={(e) => handleEmailChange(e.target.value)}
                placeholder={t('billing.enterCustomerEmail')}
                className={`pl-10 ${errors.email ? 'border-red-500' : ''}`}
                type="email"
              />
            </div>
            {errors.email && (
              <p className="text-red-500 text-xs mt-1">{errors.email}</p>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-200 dark:border-gray-700">
          <div className="flex gap-3">
            <Button
              variant="secondary"
              onClick={onClose}
              className="flex-1"
            >
              {t('common.cancel')}
            </Button>
            <Button
              onClick={handleSubmit}
              className="flex-1 bg-orange-500 hover:bg-orange-600"
            >
              {t('billing.proceedToPayment')}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
