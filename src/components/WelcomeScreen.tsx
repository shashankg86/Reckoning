import React from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import { usePOS } from '../context/POSContext';
import { 
  BuildingStorefrontIcon, 
  UserCircleIcon,
  ClockIcon,
  MapPinIcon,
  CurrencyRupeeIcon,
  GlobeAltIcon
} from '@heroicons/react/24/outline';
import { Button } from './ui/Button';
import { Card } from './ui/Card';

interface WelcomeScreenProps {
  onContinue: () => void;
}

export function WelcomeScreen({ onContinue }: WelcomeScreenProps) {
  const { t } = useTranslation();
  const { state: authState } = useAuth();
  const { state } = usePOS();
  const user = authState.user;

  const formatLastLogin = (date: Date) => {
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) return t('common.justNow', 'Just now');
    if (diffInHours < 24) return t('common.hoursAgo', `${diffInHours} hours ago`);
    
    return date.toLocaleDateString();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-red-50 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        {/* Welcome Header */}
        <div className="text-center mb-8">
          <div className="mx-auto w-20 h-20 bg-orange-100 dark:bg-orange-900 rounded-full flex items-center justify-center mb-6">
            <BuildingStorefrontIcon className="w-10 h-10 text-orange-500 dark:text-orange-400" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            {t('welcome.title', 'Welcome back!')}
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-400">
            {t('welcome.subtitle', 'Ready to manage your business?')}
          </p>
        </div>

        {/* User Info Card */}
        <Card className="p-6 mb-6">
          <div className="flex items-center space-x-4 mb-6">
            {user?.photoURL ? (
              <img
                src={user.photoURL}
                alt={user.name || 'User'}
                className="w-16 h-16 rounded-full border-4 border-orange-200 dark:border-orange-800"
              />
            ) : (
              <div className="w-16 h-16 bg-orange-100 dark:bg-orange-900 rounded-full flex items-center justify-center">
                <UserCircleIcon className="w-10 h-10 text-orange-500 dark:text-orange-400" />
              </div>
            )}
            <div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                {user?.name || t('common.user', 'User')}
              </h2>
              <p className="text-gray-600 dark:text-gray-400">{user?.email}</p>
              {user?.lastLoginAt && (
                <div className="flex items-center text-sm text-gray-500 dark:text-gray-400 mt-1">
                  <ClockIcon className="w-4 h-4 mr-1" />
                  {t('welcome.lastLogin', 'Last login')}: {formatLastLogin(user.lastLoginAt)}
                </div>
              )}
            </div>
          </div>

          {/* Store Info */}
          {user?.store && (
            <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                {t('welcome.storeInfo', 'Store Information')}
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-center space-x-3">
                  <BuildingStorefrontIcon className="w-5 h-5 text-gray-400" />
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {t('welcome.storeName', 'Store Name')}
                    </p>
                    <p className="font-medium text-gray-900 dark:text-white">
                      {user.store.name}
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <MapPinIcon className="w-5 h-5 text-gray-400" />
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {t('welcome.storeType', 'Store Type')}
                    </p>
                    <p className="font-medium text-gray-900 dark:text-white capitalize">
                      {user.store.type}
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <GlobeAltIcon className="w-5 h-5 text-gray-400" />
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {t('welcome.language', 'Language')}
                    </p>
                    <p className="font-medium text-gray-900 dark:text-white">
                      {user.store.language === 'en' ? 'English' : 
                       user.store.language === 'hi' ? 'हिंदी' :
                       user.store.language === 'ar' ? 'العربية' : 'मराठी'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <CurrencyRupeeIcon className="w-5 h-5 text-gray-400" />
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {t('welcome.currency', 'Currency')}
                    </p>
                    <p className="font-medium text-gray-900 dark:text-white">
                      {user.store.currency === 'INR' ? '₹ Indian Rupee' : 'د.إ UAE Dirham'}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </Card>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <Card className="p-4 text-center">
            <div className="text-2xl font-bold text-orange-500 dark:text-orange-400">
              {state.items.length}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">
              {t('welcome.totalItems', 'Total Items')}
            </div>
          </Card>
          <Card className="p-4 text-center">
            <div className="text-2xl font-bold text-green-500 dark:text-green-400">
              {state.invoices.length}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">
              {t('welcome.totalInvoices', 'Total Invoices')}
            </div>
          </Card>
          <Card className="p-4 text-center">
            <div className="text-2xl font-bold text-blue-500 dark:text-blue-400">
              {state.cart.length}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">
              {t('welcome.itemsInCart', 'Items in Cart')}
            </div>
          </Card>
        </div>

        {/* Continue Button */}
        <div className="text-center">
          <Button onClick={onContinue} size="lg" className="px-8">
            {t('welcome.continueToDashboard', 'Continue to Dashboard')}
          </Button>
        </div>
      </div>
    </div>
  );
}