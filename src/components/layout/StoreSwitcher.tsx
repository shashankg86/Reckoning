/**
 * Store Switcher Component
 *
 * Dropdown component that allows users to switch between stores.
 * Only visible when:
 * - User owns at least one store
 * - User has membership in multiple stores
 *
 * Shows current store name, logo, and user's role.
 */

import { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ChevronUpDownIcon,
  CheckIcon,
  BuildingStorefrontIcon,
} from '@heroicons/react/24/outline';
import { useStoreContext } from '@/contexts/StoreContext';
import type { StoreMembership, StoreRole } from '@/types/staff';

// Role badge colors
const ROLE_COLORS: Record<StoreRole, { bg: string; text: string }> = {
  owner: { bg: 'bg-purple-100 dark:bg-purple-900/30', text: 'text-purple-700 dark:text-purple-400' },
  manager: { bg: 'bg-blue-100 dark:bg-blue-900/30', text: 'text-blue-700 dark:text-blue-400' },
  cashier: { bg: 'bg-green-100 dark:bg-green-900/30', text: 'text-green-700 dark:text-green-400' },
  waiter: { bg: 'bg-orange-100 dark:bg-orange-900/30', text: 'text-orange-700 dark:text-orange-400' },
};

function RoleBadge({ role, size = 'sm' }: { role: StoreRole; size?: 'sm' | 'xs' }) {
  const { t } = useTranslation();
  const colors = ROLE_COLORS[role];
  const sizeClasses = size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-1.5 py-0.5 text-[10px]';

  return (
    <span className={`inline-flex items-center rounded-full font-medium ${colors.bg} ${colors.text} ${sizeClasses}`}>
      {t(`roles.${role}`)}
    </span>
  );
}

function StoreItem({
  membership,
  isSelected,
  onClick,
}: {
  membership: StoreMembership;
  isSelected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`
        w-full flex items-center gap-3 px-3 py-2.5 text-left transition-colors
        ${isSelected
          ? 'bg-orange-50 dark:bg-orange-900/20'
          : 'hover:bg-gray-50 dark:hover:bg-gray-700/50'
        }
      `}
    >
      {/* Store Logo */}
      <div className="flex-shrink-0">
        {membership.store.logo_url ? (
          <img
            src={membership.store.logo_url}
            alt={membership.store.name}
            className="h-8 w-8 rounded-lg object-cover"
          />
        ) : (
          <div className="h-8 w-8 rounded-lg bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
            <BuildingStorefrontIcon className="h-4 w-4 text-gray-500 dark:text-gray-400" />
          </div>
        )}
      </div>

      {/* Store Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium text-gray-900 dark:text-white truncate">
            {membership.store.name}
          </span>
          <RoleBadge role={membership.role} size="xs" />
        </div>
        <span className="text-xs text-gray-500 dark:text-gray-400 capitalize">
          {membership.store.type}
        </span>
      </div>

      {/* Selected Check */}
      {isSelected && (
        <CheckIcon className="h-5 w-5 text-orange-500 flex-shrink-0" />
      )}
    </button>
  );
}

export function StoreSwitcher() {
  const { t } = useTranslation();
  const {
    currentStore,
    currentRole,
    memberships,
    showStoreSwitcher,
    switchStore,
    isLoading,
  } = useStoreContext();

  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Close on escape key
  useEffect(() => {
    function handleEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }
  }, [isOpen]);

  // Don't render if switcher shouldn't be shown
  if (!showStoreSwitcher || !currentStore || isLoading) {
    return null;
  }

  const handleSwitchStore = async (storeId: string) => {
    if (storeId !== currentStore.id) {
      await switchStore(storeId);
    }
    setIsOpen(false);
  };

  // Find current membership for display
  const currentMembership = memberships.find(m => m.store_id === currentStore.id);

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors max-w-[200px]"
      >
        {/* Store Logo */}
        {currentStore.logo_url ? (
          <img
            src={currentStore.logo_url}
            alt={currentStore.name}
            className="h-6 w-6 rounded-md object-cover flex-shrink-0"
          />
        ) : (
          <div className="h-6 w-6 rounded-md bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center flex-shrink-0">
            <BuildingStorefrontIcon className="h-4 w-4 text-orange-600 dark:text-orange-400" />
          </div>
        )}

        {/* Store Name */}
        <span className="font-medium text-gray-900 dark:text-white text-sm truncate">
          {currentStore.name}
        </span>

        {/* Dropdown Icon */}
        <ChevronUpDownIcon className="h-4 w-4 text-gray-400 flex-shrink-0" />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute left-0 top-full mt-1 w-72 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-50 overflow-hidden">
          {/* Header */}
          <div className="px-3 py-2 border-b border-gray-200 dark:border-gray-700">
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              {t('settings.staff')}
            </p>
          </div>

          {/* Store List */}
          <div className="max-h-80 overflow-y-auto">
            {memberships.map((membership) => (
              <StoreItem
                key={membership.id}
                membership={membership}
                isSelected={membership.store_id === currentStore.id}
                onClick={() => handleSwitchStore(membership.store_id)}
              />
            ))}
          </div>

          {/* Current Role Display */}
          {currentRole && (
            <div className="px-3 py-2 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  {t('staff.currentRole')}:
                </span>
                <RoleBadge role={currentRole} size="sm" />
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default StoreSwitcher;
