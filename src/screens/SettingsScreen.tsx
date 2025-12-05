/**
 * Settings Screen
 *
 * Central hub for all settings with role-based section visibility.
 *
 * Sections:
 * - Profile (all users) - Personal profile settings
 * - Store Settings (owner) - Store profile and configuration
 * - Staff Management (owner/manager) - Team management
 * - Menu Setup (owner/manager) - Link to menu configuration
 * - Tax Configuration (owner) - Tax settings
 * - Danger Zone (owner) - Delete store, transfer ownership
 * - Create Store (staff without own store) - Create their own store
 */

import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  ArrowLeftIcon,
  UserCircleIcon,
  BuildingStorefrontIcon,
  UsersIcon,
  DocumentTextIcon,
  CalculatorIcon,
  ExclamationTriangleIcon,
  PlusCircleIcon,
} from '@heroicons/react/24/outline';
import { usePermissions } from '@/hooks/usePermissions';
import { useStoreContext } from '@/contexts/StoreContext';
import { StoreProfile } from './settings/StoreProfile';
import { StaffSection } from './settings/StaffSection';
import { PERMISSIONS } from '@/types/staff';

type SettingsSectionId =
  | 'profile'
  | 'store'
  | 'staff'
  | 'menu'
  | 'tax'
  | 'danger'
  | 'create-store';

interface SettingsSection {
  id: SettingsSectionId;
  labelKey: string;
  icon: React.ComponentType<{ className?: string }>;
  component: React.ComponentType;
  // Permission checks - if undefined, section is visible to all
  requiredPermission?: string;
  // Custom visibility check
  isVisible?: () => boolean;
}

// Placeholder components for sections not yet implemented
function ProfileSection() {
  const { t } = useTranslation();
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
          {t('settings.profile')}
        </h2>
        <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
          {t('settings.profileSubtitle')}
        </p>
      </div>
      <div className="text-gray-500 dark:text-gray-400">
        {t('common.comingSoon')}
      </div>
    </div>
  );
}

function MenuSetupSection() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
          {t('settings.menuSetup')}
        </h2>
        <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
          {t('settings.menuSetupSubtitle')}
        </p>
      </div>
      <button
        onClick={() => navigate('/onboarding/menu-setup')}
        className="inline-flex items-center gap-2 px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg transition-colors"
      >
        <DocumentTextIcon className="h-5 w-5" />
        {t('settings.goToMenuSetup')}
      </button>
    </div>
  );
}

function TaxConfigSection() {
  const { t } = useTranslation();
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
          {t('settings.taxConfig')}
        </h2>
        <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
          {t('settings.taxConfigSubtitle')}
        </p>
      </div>
      <div className="text-gray-500 dark:text-gray-400">
        {t('common.comingSoon')}
      </div>
    </div>
  );
}

function DangerZoneSection() {
  const { t } = useTranslation();
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-red-600 dark:text-red-400">
          {t('settings.dangerZone')}
        </h2>
        <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
          {t('settings.dangerZoneSubtitle')}
        </p>
      </div>
      <div className="border border-red-200 dark:border-red-800 rounded-lg p-4 bg-red-50 dark:bg-red-900/20">
        <p className="text-sm text-red-600 dark:text-red-400">
          {t('common.comingSoon')}
        </p>
      </div>
    </div>
  );
}

function CreateStoreSection() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
          {t('settings.createYourStore')}
        </h2>
        <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
          {t('settings.createStoreSubtitle')}
        </p>
      </div>
      <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-6 bg-gray-50 dark:bg-gray-800">
        <p className="text-gray-700 dark:text-gray-300 mb-4">
          {t('settings.createStoreDescription')}
        </p>
        <button
          onClick={() => navigate('/onboarding')}
          className="inline-flex items-center gap-2 px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg transition-colors"
        >
          <PlusCircleIcon className="h-5 w-5" />
          {t('settings.createNewStore')}
        </button>
      </div>
    </div>
  );
}

export function SettingsScreen() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { hasPermission, isOwner, isStaff } = usePermissions();
  const { memberships } = useStoreContext();
  const [activeSection, setActiveSection] = useState<SettingsSectionId>('profile');

  // Check if user owns any store
  const ownsAnyStore = useMemo(
    () => memberships.some((m) => m.role === 'owner'),
    [memberships]
  );

  // Define all sections with their visibility rules
  const allSections: SettingsSection[] = useMemo(
    () => [
      {
        id: 'profile',
        labelKey: 'settings.profile',
        icon: UserCircleIcon,
        component: ProfileSection,
        // Always visible
      },
      {
        id: 'store',
        labelKey: 'settings.storeProfile',
        icon: BuildingStorefrontIcon,
        component: StoreProfile,
        isVisible: () => isOwner,
      },
      {
        id: 'staff',
        labelKey: 'settings.staff',
        icon: UsersIcon,
        component: StaffSection,
        requiredPermission: PERMISSIONS.STAFF_VIEW,
      },
      {
        id: 'menu',
        labelKey: 'settings.menuSetup',
        icon: DocumentTextIcon,
        component: MenuSetupSection,
        requiredPermission: PERMISSIONS.MENU_SETUP,
      },
      {
        id: 'tax',
        labelKey: 'settings.taxConfig',
        icon: CalculatorIcon,
        component: TaxConfigSection,
        requiredPermission: PERMISSIONS.TAX_CONFIG,
      },
      {
        id: 'danger',
        labelKey: 'settings.dangerZone',
        icon: ExclamationTriangleIcon,
        component: DangerZoneSection,
        isVisible: () => isOwner,
      },
      {
        id: 'create-store',
        labelKey: 'settings.createStore',
        icon: PlusCircleIcon,
        component: CreateStoreSection,
        isVisible: () => isStaff && !ownsAnyStore,
      },
    ],
    [isOwner, isStaff, ownsAnyStore]
  );

  // Filter sections based on permissions
  const visibleSections = useMemo(() => {
    return allSections.filter((section) => {
      // Check custom visibility function first
      if (section.isVisible !== undefined) {
        return section.isVisible();
      }
      // Check permission
      if (section.requiredPermission) {
        return hasPermission(section.requiredPermission as any);
      }
      // No restrictions, always visible
      return true;
    });
  }, [allSections, hasPermission]);

  // Ensure active section is valid (in case permissions changed)
  const validActiveSection = useMemo(() => {
    const isActive = visibleSections.some((s) => s.id === activeSection);
    if (!isActive && visibleSections.length > 0) {
      return visibleSections[0].id;
    }
    return activeSection;
  }, [activeSection, visibleSections]);

  // Get the active component
  const ActiveComponent = useMemo(() => {
    const section = visibleSections.find((s) => s.id === validActiveSection);
    return section?.component || ProfileSection;
  }, [visibleSections, validActiveSection]);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Back Navigation */}
        <button
          onClick={() => navigate('/dashboard')}
          className="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-orange-600 dark:hover:text-orange-400 mb-6 transition-colors"
        >
          <ArrowLeftIcon className="h-5 w-5" />
          <span className="font-medium">{t('common.back')}</span>
        </button>

        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            {t('settings.title')}
          </h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            {t('settings.subtitle')}
          </p>
        </div>

        {/* Settings Layout */}
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Left Navigation */}
          <div className="lg:w-64 flex-shrink-0">
            <nav className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
              {visibleSections.map((section) => {
                const Icon = section.icon;
                const isActive = validActiveSection === section.id;
                const isDanger = section.id === 'danger';

                return (
                  <button
                    key={section.id}
                    onClick={() => setActiveSection(section.id)}
                    className={`
                      w-full flex items-center gap-3 px-4 py-3 text-left transition-colors
                      ${
                        isActive
                          ? isDanger
                            ? 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 border-l-4 border-red-500'
                            : 'bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400 border-l-4 border-orange-500'
                          : isDanger
                            ? 'text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 border-l-4 border-transparent'
                            : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50 border-l-4 border-transparent'
                      }
                    `}
                  >
                    <Icon className="h-5 w-5 flex-shrink-0" />
                    <span className="font-medium">{t(section.labelKey)}</span>
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Right Content Area */}
          <div className="flex-1">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
              <ActiveComponent />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
