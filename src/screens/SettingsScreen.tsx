import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowLeftIcon, UserCircleIcon, CreditCardIcon, BellIcon, ShieldCheckIcon } from '@heroicons/react/24/outline';
import { StoreProfile } from './settings/StoreProfile';

type SettingsSection = 'profile' | 'account' | 'billing' | 'notifications' | 'security';

export function SettingsScreen() {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const [activeSection, setActiveSection] = useState<SettingsSection>('profile');

    const sections = [
        {
            id: 'profile' as SettingsSection,
            labelKey: 'settings.storeProfile',
            icon: UserCircleIcon,
            component: StoreProfile,
        },
        {
            id: 'account' as SettingsSection,
            labelKey: 'settings.account',
            icon: UserCircleIcon,
            component: () => <div className="text-gray-500 dark:text-gray-400">Coming soon...</div>,
        },
        {
            id: 'billing' as SettingsSection,
            labelKey: 'settings.billing',
            icon: CreditCardIcon,
            component: () => <div className="text-gray-500 dark:text-gray-400">Coming soon...</div>,
        },
        {
            id: 'notifications' as SettingsSection,
            labelKey: 'settings.notifications',
            icon: BellIcon,
            component: () => <div className="text-gray-500 dark:text-gray-400">Coming soon...</div>,
        },
        {
            id: 'security' as SettingsSection,
            labelKey: 'settings.security',
            icon: ShieldCheckIcon,
            component: () => <div className="text-gray-500 dark:text-gray-400">Coming soon...</div>,
        },
    ];

    const ActiveComponent = sections.find(s => s.id === activeSection)?.component || StoreProfile;

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Back Navigation */}
                <button
                    onClick={() => navigate('/dashboard')}
                    className="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-orange-600 dark:hover:text-orange-400 mb-6 transition-colors"
                >
                    <ArrowLeftIcon className="h-5 w-5" />
                    <span className="font-medium">{t('common.back')} to Dashboard</span>
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
                            {sections.map((section) => {
                                const Icon = section.icon;
                                const isActive = activeSection === section.id;

                                return (
                                    <button
                                        key={section.id}
                                        onClick={() => setActiveSection(section.id)}
                                        className={`
                        w-full flex items-center gap-3 px-4 py-3 text-left transition-colors
                        ${isActive
                                                ? 'bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400 border-l-4 border-orange-500'
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
