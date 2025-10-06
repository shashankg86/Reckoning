import React from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useLocation } from 'react-router-dom';
import { 
  HomeIcon, 
  RectangleStackIcon, 
  DocumentTextIcon, 
  CameraIcon, 
  ChartBarIcon,
  BuildingStorefrontIcon
} from '@heroicons/react/24/outline';
import {
  HomeIcon as HomeIconSolid,
  RectangleStackIcon as RectangleStackIconSolid,
  DocumentTextIcon as DocumentTextIconSolid,
  CameraIcon as CameraIconSolid,
  ChartBarIcon as ChartBarIconSolid
} from '@heroicons/react/24/solid';

const navItems = [
  { 
    path: '/dashboard', 
    icon: HomeIcon, 
    iconSolid: HomeIconSolid,
    labelKey: 'navigation.dashboard' 
  },
  { 
    path: '/catalog', 
    icon: RectangleStackIcon, 
    iconSolid: RectangleStackIconSolid,
    labelKey: 'navigation.catalog' 
  },
  { 
    path: '/invoice', 
    icon: DocumentTextIcon, 
    iconSolid: DocumentTextIconSolid,
    labelKey: 'navigation.invoice' 
  },
  { 
    path: '/ocr', 
    icon: CameraIcon, 
    iconSolid: CameraIconSolid,
    labelKey: 'navigation.ocr' 
  },
  { 
    path: '/reports', 
    icon: ChartBarIcon, 
    iconSolid: ChartBarIconSolid,
    labelKey: 'navigation.reports' 
  },
];

export function Navigation() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();

  const handleNavigate = (path: string) => {
    console.log('Navigating to:', path); // Debug log
    navigate(path);
  };

  return (
    <>
      {/* Desktop Sidebar */}
      <div className="hidden lg:flex lg:flex-col lg:w-64 lg:fixed lg:inset-y-0 lg:bg-white lg:dark:bg-gray-800 lg:border-r lg:border-gray-200 lg:dark:border-gray-700">
        <div className="flex items-center h-16 px-4 border-b border-gray-200 dark:border-gray-700">
          <BuildingStorefrontIcon className="h-8 w-8 text-orange-500" />
          <span className="ml-2 text-lg font-semibold text-gray-900 dark:text-white">
            {t('app.name')}
          </span>
        </div>
        <nav className="flex-1 px-2 py-4 space-y-1">
          {navItems.map((item) => {
            const Icon = location.pathname === item.path ? item.iconSolid : item.icon;
            const isActive = location.pathname === item.path;
            return (
              <button
                key={item.path}
                onClick={() => handleNavigate(item.path)}
                className={`w-full flex items-center px-2 py-2 text-sm font-medium rounded-md transition-colors ${
                  isActive
                    ? 'bg-orange-100 text-orange-900 dark:bg-orange-900 dark:text-orange-100'
                    : 'text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-white'
                }`}
              >
                <Icon className="mr-3 h-5 w-5 flex-shrink-0" />
                {t(item.labelKey)}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Mobile Bottom Navigation */}
      <div className="lg:hidden fixed bottom-0 inset-x-0 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 z-50">
        <div className="grid grid-cols-5 h-16">
          {navItems.map((item) => {
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
                <span className="text-xs">
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