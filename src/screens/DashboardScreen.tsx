import {
  ArrowTrendingUpIcon,
  ChartBarIcon,
  ClockIcon,
  CubeIcon,
  CurrencyRupeeIcon,
  DocumentTextIcon,
  QrCodeIcon,
  ShoppingCartIcon
} from '@heroicons/react/24/outline';
import { Layout } from '../components/Layout';
import { Button } from '../components/ui/Button';
import { Card, MetricCard } from '../components/ui/Card';
import { useNavigate } from 'react-router-dom';
import { usePOS } from '../context/POSContext';

export function DashboardScreen() {
  const { state, dispatch } = usePOS();
  const navigate = useNavigate();

  const t = (en: string, hi: string) =>
    state.store?.language === 'hi' ? hi : en;

  const navigateToScreen = (path: string) => {
    navigate(path);
  };

  // Sample data - in real app this would come from state/API
  const todaysSales = 12450;
  const todaysOrders = 23;
  const weeklyGrowth = 8.5;
  const recentTransactions = [
    { id: '1', amount: 450, time: '10:30 AM', items: 3 },
    { id: '2', amount: 1200, time: '10:15 AM', items: 7 },
    { id: '3', amount: 350, time: '10:00 AM', items: 2 },
  ];

  const quickActions = [
    {
      path: '/invoice',
      icon: DocumentTextIcon,
      labelEn: 'Create Invoice',
      labelHi: 'बिल बनाएं',
      color: 'bg-blue-100 text-blue-600',
    },
    {
      path: '/catalog',
      icon: CubeIcon,
      labelEn: 'Add Item',
      labelHi: 'आइटम जोड़ें',
      color: 'bg-green-100 text-green-600',
    },
    {
      path: '/ocr',
      icon: QrCodeIcon,
      labelEn: 'OCR Import',
      labelHi: 'OCR आयात',
      color: 'bg-purple-100 text-purple-600',
    },
    {
      path: '/reports',
      icon: ChartBarIcon,
      labelEn: 'View Reports',
      labelHi: 'रिपोर्ट देखें',
      color: 'bg-orange-100 text-orange-600',
    },
  ];

  return (
    <Layout title={t('Dashboard', 'डैशबोर्ड')}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Welcome Section */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            {t('Good morning,', 'सुप्रभात,')} {state.store?.name}
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            {t(
              "Here's what's happening with your store today",
              'आज आपकी दुकान में क्या हो रहा है'
            )}
          </p>
        </div>

        {/* Metrics Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <MetricCard
            title={t("Today's Sales", 'आज की बिक्री')}
            value={`₹${todaysSales.toLocaleString('en-IN')}`}
            icon={<CurrencyRupeeIcon className="h-5 w-5" />}
            trend="up"
            trendValue={t('+12.5% from yesterday', 'कल से +12.5%')}
          />
          <MetricCard
            title={t('Orders', 'ऑर्डर')}
            value={todaysOrders.toString()}
            icon={<ShoppingCartIcon className="h-5 w-5" />}
            trend="up"
            trendValue={t('+3 from yesterday', 'कल से +3')}
          />
          <MetricCard
            title={t('Weekly Growth', 'साप्ताहिक वृद्धि')}
            value={`+${weeklyGrowth}%`}
            icon={<ArrowTrendingUpIcon className="h-5 w-5" />}
            trend="up"
            trendValue={t('Great progress!', 'शानदार प्रगति!')}
          />
          <MetricCard
            title={t('Active Items', 'सक्रिय आइटम')}
            value={state.items.length.toString()}
            icon={<CubeIcon className="h-5 w-5" />}
            subtitle={t('in catalog', 'कैटलॉग में')}
          />
        </div>

        {/* Quick Actions */}
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            {t('Quick Actions', 'त्वरित कार्य')}
          </h2>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {quickActions.map((action) => {
              const Icon = action.icon;
              return (
                <Button
                  key={action.id}
                  variant="secondary"
                  onClick={() => navigateToScreen(action.path)}
                  className="h-20 flex-col space-y-2 text-center"
                >
                  <div
                    className={`w-8 h-8 rounded-lg flex items-center justify-center ${action.color}`}
                  >
                    <Icon className="h-4 w-4" />
                  </div>
                  <span className="text-sm">
                    {state.store?.language === 'hi'
                      ? action.labelHi
                      : action.labelEn}
                  </span>
                </Button>
              );
            })}
          </div>
        </div>

        {/* Recent Transactions */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                {t('Recent Transactions', 'हाल के लेन-देन')}
              </h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigateToScreen('/reports')}
              >
                {t('View All', 'सभी देखें')}
              </Button>
            </div>
            <div className="space-y-3">
              {recentTransactions.map((transaction) => (
                <div
                  key={transaction.id}
                  className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg"
                >
                  <div className="flex items-center">
                    <div className="w-10 h-10 bg-orange-100 dark:bg-orange-900 rounded-lg flex items-center justify-center">
                      <CurrencyRupeeIcon className="h-4 w-4 text-orange-500 dark:text-orange-400" />
                    </div>
                    <div className="ml-3">
                      <p className="font-medium text-gray-900 dark:text-white">
                        ₹{transaction.amount}
                      </p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {transaction.items} {t('items', 'आइटम')}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center text-sm text-gray-500 dark:text-gray-400">
                    <ClockIcon className="h-4 w-4 mr-1" />
                    {transaction.time}
                  </div>
                </div>
              ))}
            </div>
          </Card>

          <Card className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              {t('Quick Stats', 'त्वरित आंकड़े')}
            </h3>
            <div className="space-y-4">
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">
                  {t('Items in Cart', 'कार्ट में आइटम')}
                </span>
                <span className="font-semibold text-gray-900 dark:text-white">
                  {state.cart.length}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">
                  {t('Total Invoices', 'कुल बिल')}
                </span>
                <span className="font-semibold text-gray-900 dark:text-white">
                  {state.invoices.length}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">
                  {t('Store Type', 'दुकान का प्रकार')}
                </span>
                <span className="font-semibold text-gray-900 dark:text-white capitalize">
                  {state.store?.type}
                </span>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </Layout>
  );
}
