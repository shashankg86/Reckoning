import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { usePOS } from '../context/POSContext';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { BuildingStorefrontIcon, EnvelopeIcon, ArrowLeftIcon } from '@heroicons/react/24/outline';

export function ForgotPasswordScreen() {
  const { t } = useTranslation();
  const { dispatch } = usePOS();
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    setIsSubmitted(true);
    setIsLoading(false);
  };

  if (isSubmitted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 to-red-50 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-white dark:bg-gray-800 rounded-lg shadow-xl p-8 text-center">
          <div className="mx-auto w-16 h-16 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center mb-4">
           <EnvelopeIcon className="w-8 h-8 text-green-500 dark:text-green-400" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
           {t('auth.checkEmail')}
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
           {t('auth.resetInstructionsSent')} {email}
          </p>
          <Button
            onClick={() => dispatch({ type: 'SET_CURRENT_SCREEN', payload: 'login' })}
            className="w-full"
          >
           {t('auth.backToLogin')}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-red-50 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white dark:bg-gray-800 rounded-lg shadow-xl p-8">
        <div className="flex items-center mb-6">
          <button
            onClick={() => dispatch({ type: 'SET_CURRENT_SCREEN', payload: 'login' })}
            className="mr-4 p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            <ArrowLeftIcon className="w-5 h-5" />
          </button>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">
            {t('auth.resetPassword')}
          </h1>
        </div>

        <div className="text-center mb-8">
          <div className="mx-auto w-16 h-16 bg-orange-100 dark:bg-orange-900 rounded-full flex items-center justify-center mb-4">
            <BuildingStorefrontIcon className="w-8 h-8 text-orange-500 dark:text-orange-400" />
          </div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            {t('auth.forgotPassword')}
          </h2>
          <p className="text-gray-600 dark:text-gray-400">
            {t('auth.resetPasswordDesc')}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="relative">
            <Input
              label={t('auth.mobileOrEmail')}
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={t('auth.enterMobile')}
              required
              className="pl-10"
            />
            <EnvelopeIcon className="absolute left-3 top-9 h-5 w-5 text-gray-400" />
          </div>

          <Button
            type="submit"
            disabled={isLoading}
            className="w-full"
          >
            {isLoading ? t('auth.sendingReset') : t('auth.sendResetInstructions')}
          </Button>
        </form>
      </div>
    </div>
  );
}