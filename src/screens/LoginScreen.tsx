import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { usePOS } from '../context/POSContext';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { BuildingStorefrontIcon, EnvelopeIcon, LockClosedIcon, EyeIcon, EyeSlashIcon } from '@heroicons/react/24/outline';

export function LoginScreen() {
  const { t } = useTranslation();
  const { dispatch } = usePOS();
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    rememberMe: false
  });
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    dispatch({ type: 'SET_AUTHENTICATED', payload: true });
    dispatch({ type: 'SET_USER', payload: { email: formData.email } });
    dispatch({ type: 'SET_CURRENT_SCREEN', payload: 'onboarding' });
    
    setIsLoading(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-red-50 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white dark:bg-gray-800 rounded-lg shadow-xl p-8">
        <div className="text-center mb-8">
          <div className="mx-auto w-16 h-16 bg-orange-100 dark:bg-orange-900 rounded-full flex items-center justify-center mb-4">
            <BuildingStorefrontIcon className="w-8 h-8 text-orange-500 dark:text-orange-400" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            {t('auth.login')}
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            {t('auth.welcomeBack')}
          </p>
        </div>

        <form onSubmit={handleLogin} className="space-y-6">
          <div className="relative">
            <Input
              label={t('auth.mobileOrEmail')}
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              placeholder={t('auth.enterMobile')}
              required
              className="pl-10"
            />
            <EnvelopeIcon className="absolute left-3 top-9 h-5 w-5 text-gray-400" />
          </div>

          <div className="relative">
            <Input
              label={t('auth.password')}
              type={showPassword ? 'text' : 'password'}
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              placeholder={t('auth.enterPassword')}
              required
              className="pl-10 pr-10"
            />
            <LockClosedIcon className="absolute left-3 top-9 h-5 w-5 text-gray-400" />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-9 h-5 w-5 text-gray-400 hover:text-gray-600"
            >
              {showPassword ? <EyeSlashIcon /> : <EyeIcon />}
            </button>
          </div>

          <div className="flex items-center justify-between">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={formData.rememberMe}
                onChange={(e) => setFormData({ ...formData, rememberMe: e.target.checked })}
                className="w-4 h-4 text-orange-500 bg-gray-100 border-gray-300 rounded focus:ring-orange-500 focus:ring-2"
              />
              <span className="ml-2 text-sm text-gray-600 dark:text-gray-400">
                {t('auth.rememberMe')}
              </span>
            </label>
            <button
              type="button"
              onClick={() => dispatch({ type: 'SET_CURRENT_SCREEN', payload: 'forgot-password' })}
              className="text-sm text-orange-500 hover:text-orange-600"
            >
              {t('auth.forgotPassword')}
            </button>
          </div>

          <Button
            type="submit"
            disabled={isLoading}
            className="w-full"
          >
            {isLoading ? t('auth.loggingIn') : t('auth.login')}
          </Button>

          <div className="text-center">
            <span className="text-gray-600 dark:text-gray-400">
              {t('auth.dontHaveAccount')}{' '}
            </span>
            <button
              type="button"
              onClick={() => dispatch({ type: 'SET_CURRENT_SCREEN', payload: 'signup' })}
              className="text-orange-500 hover:text-orange-600 font-medium"
            >
              {t('auth.signup')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}