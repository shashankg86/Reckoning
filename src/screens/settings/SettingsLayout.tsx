import React, { useState } from 'react';
import { Outlet, NavLink, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
    UserCircleIcon,
    UsersIcon,
    TableCellsIcon,
    BookOpenIcon,
    Bars3Icon,
    XMarkIcon
} from '@heroicons/react/24/outline';
import { TopBar } from '../../components/layout/TopBar';
import { usePermissions } from '../../hooks/usePermissions';

export function SettingsLayout() {
    const { t } = useTranslation();
    const location = useLocation();
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const { isAdmin, canManageStaff, canManageTables, canManageMenu } = usePermissions();

    const navigation = [
        {
            name: t('settings.profile'),
            href: '/settings/profile',
            icon: UserCircleIcon,
            show: true // Profile is visible to all, but read-only for some
        },
        {
            name: t('settings.staff'),
            href: '/settings/staff',
            icon: UsersIcon,
            show: canManageStaff || isAdmin // Only show if can manage staff (or view if we allow view-only)
        },
        {
            name: t('settings.tables'),
            href: '/settings/tables',
            icon: TableCellsIcon,
            show: canManageTables
        },
        {
            name: t('settings.menu'),
            href: '/settings/menu',
            icon: BookOpenIcon,
            show: canManageMenu
        },
    ];

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
            <TopBar title={t('navigation.settings')} />

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div className="lg:grid lg:grid-cols-12 lg:gap-x-5">
                    {/* Mobile menu button */}
                    <div className="lg:hidden mb-4">
                        <button
                            type="button"
                            className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500"
                            onClick={() => setSidebarOpen(!sidebarOpen)}
                        >
                            {sidebarOpen ? (
                                <XMarkIcon className="-ml-1 mr-2 h-5 w-5 text-gray-500" />
                            ) : (
                                <Bars3Icon className="-ml-1 mr-2 h-5 w-5 text-gray-500" />
                            )}
                            {t('settings.menu')}
                        </button>
                    </div>

                    {/* Sidebar */}
                    <aside className={`lg:col-span-3 ${sidebarOpen ? 'block' : 'hidden lg:block'}`}>
                        <nav className="space-y-1">
                            {navigation.filter(item => item.show).map((item) => {
                                const isActive = location.pathname === item.href;
                                return (
                                    <NavLink
                                        key={item.name}
                                        to={item.href}
                                        className={({ isActive }) =>
                                            `group flex items-center px-3 py-2 text-sm font-medium rounded-md ${isActive
                                                ? 'bg-orange-50 text-orange-600 dark:bg-gray-800 dark:text-orange-400'
                                                : 'text-gray-900 hover:bg-gray-50 hover:text-gray-900 dark:text-gray-300 dark:hover:bg-gray-800 dark:hover:text-white'
                                            }`
                                        }
                                        onClick={() => setSidebarOpen(false)}
                                    >
                                        <item.icon
                                            className={`flex-shrink-0 -ml-1 mr-3 h-6 w-6 ${isActive
                                                ? 'text-orange-500 dark:text-orange-400'
                                                : 'text-gray-400 group-hover:text-gray-500 dark:text-gray-400 dark:group-hover:text-gray-300'
                                                }`}
                                            aria-hidden="true"
                                        />
                                        <span className="truncate">{item.name}</span>
                                    </NavLink>
                                );
                            })}
                        </nav>
                    </aside>

                    {/* Main Content */}
                    <main className="lg:col-span-9 mt-6 lg:mt-0">
                        <Outlet />
                    </main>
                </div>
            </div>
        </div>
    );
}
