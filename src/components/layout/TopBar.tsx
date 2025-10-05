import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../contexts/AuthContext';
import { BuildingStorefrontIcon, UserIcon, SunIcon, MoonIcon } from '@heroicons/react/24/outline';
import { Button } from '../ui/Button';
import { LanguageSelector } from './LanguageSelector';
import { CurrencySelector } from './CurrencySelector';

interface TopBarProps {
  title?: string;
}

export function TopBar({ title }: TopBarProps) {
  const { t } = useTranslation();
  const { state, logout } = useAuth();
  const [showProfile, setShowProfile] = useState(false);

  const toggleTheme = () => {
    // TODO: Implement theme toggle
  };

  const handleLogout = async () => {
    await logout();
  };

  return (
    <header className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700 sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center">
            <div className="flex-shrink-0 lg:hidden">
              <BuildingStorefrontIcon className="h-8 w-8 text-orange-500" />
            </div>
            <div className="ml-4 lg:ml-0">
              <h1 className="text-lg font-semibold text-gray-900 dark:text-white">
                {title || state.user?.store?.name || t('app.name')}
              </h1>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleTheme}
              className="p-2"
            >
              {state.user?.store?.theme === 'dark' ? (
                <SunIcon className="h-5 w-5" />
              ) : (
                <MoonIcon className="h-5 w-5" />
              )}
            </Button>
            
            <CurrencySelector />
            <LanguageSelector />

            <div className="relative">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowProfile(!showProfile)}
                className="p-2"
              >
                {state.user?.photoURL ? (
                  <img
                    src={state.user.photoURL}
                    alt={state.user.name || 'User'}
                    className="h-5 w-5 rounded-full"
                  />
                ) : (
                  <UserIcon className="h-5 w-5" />
                )}
              </Button>

              {showProfile && (
                <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-md shadow-lg py-1 z-50">
                  <div className="px-4 py-2 text-sm text-gray-700 dark:text-gray-300 border-b border-gray-200 dark:border-gray-700">
                    <div className="font-medium">{state.user?.name || state.user?.email}</div>
                    <div className="text-gray-500 dark:text-gray-400 capitalize">
                      {state.user?.store?.type}
                    </div>
                  </div>
                  <button 
                    onClick={() => {/* TODO: Navigate to settings */}}
                    className="block w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                  >
                    {t('navigation.settings')}
                  </button>
                  <button 
                    onClick={handleLogout}
                    className="block w-full text-left px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-gray-100 dark:hover:bg-gray-700"
                  >
                    {t('auth.logout')}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}