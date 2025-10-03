import {
  BuildingStorefrontIcon,
  ChartBarIcon,
  CubeIcon,
  DocumentTextIcon,
  HomeIcon,
  QrCodeIcon
} from '@heroicons/react/24/outline';
import { usePOS } from '../context/POSContext';

const navItems = [
  { id: 'dashboard', icon: HomeIcon, labelEn: 'Dashboard', labelHi: 'डैशबोर्ड' },
  { id: 'catalog', icon: CubeIcon, labelEn: 'Catalog', labelHi: 'सूची' },
  { id: 'invoice', icon: DocumentTextIcon, labelEn: 'Invoice', labelHi: 'बिल' },
  { id: 'ocr', icon: QrCodeIcon, labelEn: 'OCR Import', labelHi: 'OCR आयात' },
  { id: 'reports', icon: ChartBarIcon, labelEn: 'Reports', labelHi: 'रिपोर्ट' },
];

export function Navigation() {
  const { state, dispatch } = usePOS();
  const currentScreen = state.currentScreen;

  const t = (en: string, hi: string) => (state.store?.language === 'hi' ? hi : en);

  const handleNavigate = (screenId: string) => {
    dispatch({ type: 'SET_CURRENT_SCREEN', payload: screenId });
  };

  return (
    <>
      {/* Desktop Sidebar */}
      <div className="hidden lg:flex lg:flex-col lg:w-64 lg:fixed lg:inset-y-0 lg:bg-white lg:dark:bg-gray-800 lg:border-r lg:border-gray-200 lg:dark:border-gray-700">
        <div className="flex items-center h-16 px-4 border-b border-gray-200 dark:border-gray-700">
          <BuildingStorefrontIcon className="h-8 w-8 text-orange-500" />
          <span className="ml-2 text-lg font-semibold text-gray-900 dark:text-white">
            {t('Universal POS', 'यूनिवर्सल पीओएस')}
          </span>
        </div>
        <nav className="flex-1 px-2 py-4 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentScreen === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleNavigate(item.id)}
                className={`w-full flex items-center px-2 py-2 text-sm font-medium rounded-md transition-colors ${isActive
                    ? 'bg-orange-100 text-orange-900 dark:bg-orange-900 dark:text-orange-100'
                    : 'text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-white'
                  }`}
              >
                <Icon className="mr-3 h-5 w-5 flex-shrink-0" />
                {state.store?.language === 'hi' ? item.labelHi : item.labelEn}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Mobile Bottom Navigation */}
      <div className="lg:hidden fixed bottom-0 inset-x-0 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 z-50">
        <div className="grid grid-cols-5 h-16">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentScreen === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleNavigate(item.id)}
                className={`flex flex-col items-center justify-center space-y-1 transition-colors ${isActive
                    ? 'text-orange-500 dark:text-orange-400'
                    : 'text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300'
                  }`}
              >
                <Icon className="h-5 w-5" />
                <span className="text-xs">
                  {state.store?.language === 'hi' ? item.labelHi : item.labelEn}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </>
  );
}
