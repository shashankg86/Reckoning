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
import { Layout } from '../components/layout/Layout';
import { Button } from '../components/ui/Button';
import { Card, MetricCard } from '../components/ui/Card';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { usePOS } from '../contexts/POSContext';
import { useDashboardAnalytics } from '../hooks/useDashboardAnalytics';

export function DashboardScreen() {
  const { t } = useTranslation();
  const { state } = useAuth();
  const { state: posState } = usePOS();
  const navigate = useNavigate();
  const storeId = state.user?.store?.id;

  // Fetch dashboard analytics
  const {
    stats,
    activeItems,
    recentTransactions,
    totalInvoices,
    loading,
    error
  } = useDashboardAnalytics(storeId);

  const navigateToScreen = (path: string) => {
    navigate(path);
  };

  const quickActions = [
    {
      path: '/invoice',
      icon: DocumentTextIcon,
      labelKey: 'dashboard.actions.createInvoice',
      color: 'bg-blue-100 text-blue-600',
    },
    {
      path: '/catalog',
      icon: CubeIcon,
      labelKey: 'dashboard.actions.addItem',
      color: 'bg-green-100 text-green-600',
    },
    {
      path: '/ocr',
      icon: QrCodeIcon,
      labelKey: 'dashboard.actions.ocrImport',
      color: 'bg-purple-100 text-purple-600',
    },
    {
      path: '/reports',
      icon: ChartBarIcon,
      labelKey: 'dashboard.actions.viewReports',
      color: 'bg-orange-100 text-orange-600',
    },
  ];

  return (
    <Layout title={t('dashboard.title')}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Welcome Section */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            {t('dashboard.goodMorning')}, {state.user?.store?.name || state.user?.name}
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            {t('dashboard.todaysActivity')}
          </p>
        </div>

        {/* Error State */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <p className="text-red-800 dark:text-red-200">{error}</p>
          </div>
        )}

        {/* Loading State */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="bg-white dark:bg-gray-800 rounded-lg p-6 animate-pulse">
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2 mb-4"></div>
                <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-2"></div>
                <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/3"></div>
              </div>
            ))}
          </div>
        ) : (
          <>
            {/* Metrics Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <MetricCard
                title={t('dashboard.todaysSales')}
                value={`₹${stats.sales.toLocaleString('en-IN')}`}
                icon={<CurrencyRupeeIcon className="h-5 w-5" />}
                subtitle={`${stats.orders} ${t('dashboard.orders').toLowerCase()}`}
              />
              <MetricCard
                title={t('dashboard.orders')}
                value={stats.orders.toString()}
                icon={<ShoppingCartIcon className="h-5 w-5" />}
                subtitle={t('dashboard.today')}
              />
              <MetricCard
                title={t('dashboard.averageOrder')}
                value={`₹${Math.round(stats.averageOrder).toLocaleString('en-IN')}`}
                icon={<ArrowTrendingUpIcon className="h-5 w-5" />}
                subtitle={t('dashboard.perTransaction')}
              />
              <MetricCard
                title={t('dashboard.activeItems')}
                value={activeItems.toString()}
                icon={<CubeIcon className="h-5 w-5" />}
                subtitle={t('dashboard.inCatalog')}
              />
            </div>
          </>
        )}

        {/* Quick Actions */}
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            {t('dashboard.quickActions')}
          </h2>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {quickActions.map((action) => {
              const Icon = action.icon;
              return (
                <Button
                  key={action.path}
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
                    {t(action.labelKey)}
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
                {t('dashboard.recentTransactions')}
              </h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigateToScreen('/reports')}
              >
                {t('dashboard.viewAll')}
              </Button>
            </div>
            <div className="space-y-3">
              {loading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg animate-pulse">
                      <div className="h-4 bg-gray-200 dark:bg-gray-600 rounded w-1/3 mb-2"></div>
                      <div className="h-3 bg-gray-200 dark:bg-gray-600 rounded w-1/4"></div>
                    </div>
                  ))}
                </div>
              ) : recentTransactions.length > 0 ? (
                recentTransactions.map((transaction) => (
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
                          ₹{transaction.amount.toLocaleString('en-IN')}
                        </p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          {transaction.items} {t('dashboard.items')}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center text-sm text-gray-500 dark:text-gray-400">
                      <ClockIcon className="h-4 w-4 mr-1" />
                      {transaction.time}
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                  {t('dashboard.noTransactionsToday')}
                </div>
              )}
            </div>
          </Card>

          <Card className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              {t('dashboard.quickStats')}
            </h3>
            <div className="space-y-4">
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">
                  {t('dashboard.itemsInCart')}
                </span>
                <span className="font-semibold text-gray-900 dark:text-white">
                  {posState.cart.length}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">
                  {t('dashboard.totalInvoices')}
                </span>
                <span className="font-semibold text-gray-900 dark:text-white">
                  {loading ? '...' : totalInvoices}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">
                  {t('dashboard.storeType')}
                </span>
                <span className="font-semibold text-gray-900 dark:text-white capitalize">
                  {state.user?.store?.type || 'Not set'}
                </span>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </Layout>
  );
}