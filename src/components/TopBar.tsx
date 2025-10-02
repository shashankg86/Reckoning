import React, { useState } from 'react';
import { usePOS } from '../context/POSContext';
import { Store, User, Sun, Moon, Globe } from 'lucide-react';
import { Button } from './ui/Button';

interface TopBarProps {
  title?: string;
}

export function TopBar({ title }: TopBarProps) {
  const { state, dispatch } = usePOS();
  const [showProfile, setShowProfile] = useState(false);

  const toggleTheme = () => {
    const newTheme = state.store?.theme === 'dark' ? 'light' : 'dark';
    dispatch({ type: 'SET_THEME', payload: newTheme });
  };

  const toggleLanguage = () => {
    const newLanguage = state.store?.language === 'en' ? 'hi' : 'en';
    dispatch({ type: 'SET_LANGUAGE', payload: newLanguage });
  };

  const t = (en: string, hi: string) => state.store?.language === 'hi' ? hi : en;

  return (
    <header className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700 sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center">
            <div className="flex-shrink-0 lg:hidden">
              <Store className="h-8 w-8 text-orange-500" />
            </div>
            <div className="ml-4 lg:ml-0">
              <h1 className="text-lg font-semibold text-gray-900 dark:text-white">
                {title || state.store?.name || t('POS System', 'पीओएस सिस्टम')}
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
              {state.store?.theme === 'dark' ? (
                <Sun className="h-5 w-5" />
              ) : (
                <Moon className="h-5 w-5" />
              )}
            </Button>
            
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleLanguage}
              className="p-2"
            >
              <Globe className="h-5 w-5" />
              <span className="ml-1 text-sm">
                {state.store?.language === 'hi' ? 'EN' : 'हि'}
              </span>
            </Button>

            <div className="relative">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowProfile(!showProfile)}
                className="p-2"
              >
                <User className="h-5 w-5" />
              </Button>

              {showProfile && (
                <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-md shadow-lg py-1 z-50">
                  <div className="px-4 py-2 text-sm text-gray-700 dark:text-gray-300 border-b border-gray-200 dark:border-gray-700">
                    <div className="font-medium">{state.store?.name}</div>
                    <div className="text-gray-500 dark:text-gray-400 capitalize">
                      {state.store?.type}
                    </div>
                  </div>
                  <button className="block w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700">
                    {t('Settings', 'सेटिंग्स')}
                  </button>
                  <button className="block w-full text-left px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-gray-100 dark:hover:bg-gray-700">
                    {t('Logout', 'लॉग आउट')}
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