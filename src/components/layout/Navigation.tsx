/**
 * Navigation Component
 *
 * Provides both desktop sidebar and mobile bottom navigation.
 * Navigation items are filtered based on user permissions:
 *
 * - Dashboard: DASHBOARD_VIEW (owner, manager)
 * - Catalog: CATALOG_VIEW (all roles)
 * - Billing: BILLING_CREATE (owner, manager, cashier)
 * - OCR: OCR_IMPORT (owner, manager)
 * - Reports: REPORTS_VIEW (owner, manager)
 */

import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  HomeIcon,
  RectangleStackIcon,
  DocumentTextIcon,
  CameraIcon,
  ChartBarIcon,
  BuildingStorefrontIcon,
} from '@heroicons/react/24/outline';
import {
  HomeIcon as HomeIconSolid,
  RectangleStackIcon as RectangleStackIconSolid,
  DocumentTextIcon as DocumentTextIconSolid,
  CameraIcon as CameraIconSolid,
  ChartBarIcon as ChartBarIconSolid,
} from '@heroicons/react/24/solid';
import { usePermissions } from '@/hooks/usePermissions';
import { PERMISSIONS, type Permission } from '@/types/staff';

interface NavItem {
  path: string;
  icon: React.ComponentType<{ className?: string }>;
  iconSolid: React.ComponentType<{ className?: string }>;
  labelKey: string;
  // Permission required to see this nav item (undefined = always visible)
  permission?: Permission;
  // Alternative: show for specific roles only
  ownerOnly?: boolean;
  managerOrAbove?: boolean;
}

const allNavItems: NavItem[] = [
  {
    path: '/dashboard',
    icon: HomeIcon,
    iconSolid: HomeIconSolid,
    labelKey: 'navigation.dashboard',
    permission: PERMISSIONS.DASHBOARD_VIEW,
  },
  {
    path: '/catalog',
    icon: RectangleStackIcon,
    iconSolid: RectangleStackIconSolid,
    labelKey: 'navigation.catalog',
    permission: PERMISSIONS.CATALOG_VIEW,
  },
  {
    path: '/invoice',
    icon: DocumentTextIcon,
    iconSolid: DocumentTextIconSolid,
    labelKey: 'navigation.invoice',
    permission: PERMISSIONS.BILLING_CREATE,
  },
  {
    path: '/ocr',
    icon: CameraIcon,
    iconSolid: CameraIconSolid,
    labelKey: 'navigation.ocr',
    permission: PERMISSIONS.OCR_IMPORT,
  },
  {
    path: '/reports',
    icon: ChartBarIcon,
    iconSolid: ChartBarIconSolid,
    labelKey: 'navigation.reports',
    permission: PERMISSIONS.REPORTS_VIEW,
  },
];

// For roles without dashboard access, show tables/orders as default
const staffDefaultItems: NavItem[] = [
  {
    path: '/catalog',
    icon: RectangleStackIcon,
    iconSolid: RectangleStackIconSolid,
    labelKey: 'navigation.catalog',
    permission: PERMISSIONS.CATALOG_VIEW,
  },
  {
    path: '/invoice',
    icon: DocumentTextIcon,
    iconSolid: DocumentTextIconSolid,
    labelKey: 'navigation.invoice',
    permission: PERMISSIONS.BILLING_VIEW,
  },
];

export function Navigation() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const { hasPermission, isOwner, isManager, role } = usePermissions();

  // Filter nav items based on permissions
  const visibleNavItems = useMemo(() => {
    return allNavItems.filter((item) => {
      // If no permission required, always show
      if (!item.permission) return true;

      // Owner-only items
      if (item.ownerOnly) return isOwner;

      // Manager or above items
      if (item.managerOrAbove) return isOwner || isManager;

      // Check specific permission
      return hasPermission(item.permission);
    });
  }, [hasPermission, isOwner, isManager]);

  // If no items visible (shouldn't happen), show minimal nav
  const navItems = visibleNavItems.length > 0 ? visibleNavItems : staffDefaultItems;

  const handleNavigate = (path: string) => {
    console.log('Navigating to:', path);
    navigate(path);
  };

  return (
    <>
      {/* Desktop Sidebar */}
      <div className="hidden lg:flex lg:flex-col lg:w-64 lg:fixed lg:inset-y-0 lg:bg-white lg:dark:bg-gray-800 lg:border-r lg:border-gray-200 lg:dark:border-gray-700">
        {/* Logo/Brand */}
        <div className="flex items-center h-16 px-4 border-b border-gray-200 dark:border-gray-700">
          <BuildingStorefrontIcon className="h-8 w-8 text-orange-500" />
          <span className="ml-2 text-lg font-semibold text-gray-900 dark:text-white">
            {t('app.name')}
          </span>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 px-2 py-4 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = location.pathname === item.path ? item.iconSolid : item.icon;
            const isActive = location.pathname === item.path;
            return (
              <button
                key={item.path}
                onClick={() => handleNavigate(item.path)}
                className={`w-full flex items-center px-3 py-2.5 text-sm font-medium rounded-lg transition-colors ${
                  isActive
                    ? 'bg-orange-100 text-orange-900 dark:bg-orange-900/30 dark:text-orange-100'
                    : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-white'
                }`}
              >
                <Icon className="mr-3 h-5 w-5 flex-shrink-0" />
                {t(item.labelKey)}
              </button>
            );
          })}
        </nav>

        {/* Role indicator at bottom of sidebar */}
        {role && (
          <div className="px-4 py-3 border-t border-gray-200 dark:border-gray-700">
            <div className="text-xs text-gray-500 dark:text-gray-400">
              {t('staff.currentRole')}:
              <span className="ml-1 font-medium text-gray-700 dark:text-gray-300">
                {t(`roles.${role}`)}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Mobile Bottom Navigation */}
      <div className="lg:hidden fixed bottom-0 inset-x-0 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 z-50 safe-area-inset-bottom">
        <div
          className="grid h-16"
          style={{ gridTemplateColumns: `repeat(${Math.min(navItems.length, 5)}, 1fr)` }}
        >
          {navItems.slice(0, 5).map((item) => {
            const Icon = location.pathname === item.path ? item.iconSolid : item.icon;
            const isActive = location.pathname === item.path;
            return (
              <button
                key={item.path}
                onClick={() => handleNavigate(item.path)}
                className={`flex flex-col items-center justify-center space-y-1 transition-colors ${
                  isActive
                    ? 'text-orange-500 dark:text-orange-400'
                    : 'text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300'
                }`}
              >
                <Icon className="h-5 w-5" />
                <span className="text-xs font-medium truncate px-1">
                  {t(item.labelKey)}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </>
  );
}
