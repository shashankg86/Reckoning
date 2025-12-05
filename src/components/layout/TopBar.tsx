/**
 * Top Bar Component
 *
 * Header bar with:
 * - Store name/logo (or StoreSwitcher if user has multiple stores)
 * - Current role badge (for staff members)
 * - Theme toggle
 * - Language/Currency selectors
 * - User profile dropdown
 */

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useStoreContext } from '../../contexts/StoreContext';
import {
  BuildingStorefrontIcon,
  UserIcon,
  SunIcon,
  MoonIcon,
} from '@heroicons/react/24/outline';
import { Button } from '../ui/Button';
import { LanguageSelector } from './LanguageSelector';
import { CurrencySelector } from './CurrencySelector';
import { StoreSwitcher } from './StoreSwitcher';
import type { StoreRole } from '@/types/staff';

// Role badge colors for the top bar
const ROLE_COLORS: Record<StoreRole, { bg: string; text: string }> = {
  owner: { bg: 'bg-purple-100 dark:bg-purple-900/30', text: 'text-purple-700 dark:text-purple-400' },
  manager: { bg: 'bg-blue-100 dark:bg-blue-900/30', text: 'text-blue-700 dark:text-blue-400' },
  cashier: { bg: 'bg-green-100 dark:bg-green-900/30', text: 'text-green-700 dark:text-green-400' },
  waiter: { bg: 'bg-orange-100 dark:bg-orange-900/30', text: 'text-orange-700 dark:text-orange-400' },
};

interface TopBarProps {
  title?: string;
}

export function TopBar({ title }: TopBarProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { state, logout, updateStoreSettings } = useAuth();
  const { currentStore, currentRole, showStoreSwitcher, isLoading: isStoreLoading } = useStoreContext();
  const [showProfile, setShowProfile] = useState(false);

  const toggleTheme = async () => {
    if (!state.user?.store) return;

    const newTheme = state.user.store.theme === 'dark' ? 'light' : 'dark';
    await updateStoreSettings({ theme: newTheme });
  };

  const handleLogout = async () => {
    try {
      await logout();
      setShowProfile(false);
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const handleNavigateToSettings = () => {
    setShowProfile(false);
    navigate('/settings');
  };

  // Determine what to show for the store name
  const displayStoreName = currentStore?.name || state.user?.store?.name || t('app.name');
  const displayStoreLogo = currentStore?.logo_url || state.user?.store?.logo_url;

  return (
    <header className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700 sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Left Side - Store Info / Switcher */}
          <div className="flex items-center gap-3">
            {/* Mobile Logo (only when no switcher) */}
            {!showStoreSwitcher && (
              <div className="flex-shrink-0 lg:hidden">
                {displayStoreLogo ? (
                  <img
                    src={displayStoreLogo}
                    alt={displayStoreName}
                    className="h-8 w-8 rounded-lg object-cover"
                  />
                ) : (
                  <BuildingStorefrontIcon className="h-8 w-8 text-orange-500" />
                )}
              </div>
            )}

            {/* Store Switcher OR Store Name */}
            {showStoreSwitcher ? (
              <StoreSwitcher />
            ) : (
              <div className="ml-2 lg:ml-0">
                <h1 className="text-lg font-semibold text-gray-900 dark:text-white">
                  {title || displayStoreName}
                </h1>
              </div>
            )}

            {/* Role Badge (shown when user is staff, not owner, and not in switcher) */}
            {!showStoreSwitcher && currentRole && currentRole !== 'owner' && !isStoreLoading && (
              <span
                className={`hidden sm:inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${ROLE_COLORS[currentRole].bg} ${ROLE_COLORS[currentRole].text}`}
              >
                {t(`roles.${currentRole}`)}
              </span>
            )}
          </div>

          {/* Right Side - Actions */}
          <div className="flex items-center space-x-2">
            {/* Theme Toggle */}
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

            {/* Currency Selector */}
            <CurrencySelector />

            {/* Language Selector */}
            <LanguageSelector />

            {/* User Profile Dropdown */}
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
                    className="h-6 w-6 rounded-full object-cover"
                  />
                ) : (
                  <UserIcon className="h-5 w-5" />
                )}
              </Button>

              {showProfile && (
                <>
                  {/* Backdrop */}
                  <div
                    className="fixed inset-0 z-10"
                    onClick={() => setShowProfile(false)}
                  />

                  {/* Dropdown Menu */}
                  <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-gray-800 rounded-lg shadow-lg py-1 z-20 border border-gray-200 dark:border-gray-700">
                    {/* User Info */}
                    <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
                      <div className="flex items-center gap-3">
                        {state.user?.photoURL ? (
                          <img
                            src={state.user.photoURL}
                            alt={state.user.name || 'User'}
                            className="h-10 w-10 rounded-full object-cover"
                          />
                        ) : (
                          <div className="h-10 w-10 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                            <UserIcon className="h-5 w-5 text-gray-500 dark:text-gray-400" />
                          </div>
                        )}
                        <div className="min-w-0">
                          <div className="font-medium text-gray-900 dark:text-white truncate">
                            {state.user?.name || state.user?.email?.split('@')[0]}
                          </div>
                          <div className="text-sm text-gray-500 dark:text-gray-400 truncate">
                            {state.user?.email}
                          </div>
                        </div>
                      </div>

                      {/* Current Role (shown in dropdown for mobile) */}
                      {currentRole && (
                        <div className="mt-2 flex items-center gap-2">
                          <span className="text-xs text-gray-500 dark:text-gray-400">
                            {t('staff.currentRole')}:
                          </span>
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${ROLE_COLORS[currentRole].bg} ${ROLE_COLORS[currentRole].text}`}
                          >
                            {t(`roles.${currentRole}`)}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Menu Items */}
                    <button
                      onClick={handleNavigateToSettings}
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
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
