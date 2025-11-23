import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import {
  ChartBarIcon,
  ClockIcon,
  CubeIcon,
  DocumentTextIcon,
  QrCodeIcon,
  ShoppingCartIcon,
  ArrowTrendingUpIcon,
  ArrowPathIcon,
  TrophyIcon,
  ExclamationTriangleIcon,
  BanknotesIcon
} from '@heroicons/react/24/outline';
import { Layout } from '../components/layout/Layout';
import { Card, MetricCard } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { useAuth } from '../contexts/AuthContext';
import { usePOS } from '../contexts/POSContext';
import { useCurrency } from '../hooks/useCurrency';
import { dashboardAPI } from '../api/dashboard';
import { itemsAPI } from '../api/items';
import { DashboardStats, Transaction, ItemData } from '../types';

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

export function DashboardScreen() {
  const { t } = useTranslation();
  const { state } = useAuth();
  const { state: posState } = usePOS();
  const navigate = useNavigate();
  const { formatCurrency } = useCurrency();

  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentTransactions, setRecentTransactions] = useState<Transaction[]>([]);
  const [topSellingItems, setTopSellingItems] = useState<any[]>([]);
  const [lowStockItems, setLowStockItems] = useState<ItemData[]>([]);
  const [activeItems, setActiveItems] = useState<number>(0);
  const [totalInvoices, setTotalInvoices] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDashboardData = async () => {
    if (!state.user?.store?.id) return;

    try {
      setLoading(true);
      setError(null);
      const storeId = state.user.store.id;

      // Use single RPC call to fetch all dashboard data
      const data = await dashboardAPI.getDashboardSummary(storeId);

      if (data) {
        setStats(data.stats);
        setRecentTransactions(data.recentTransactions);
        setTopSellingItems(data.topSellingItems);
        setLowStockItems(data.lowStockItems);
        setActiveItems(data.stats.activeItems);
        setTotalInvoices(data.stats.totalInvoices);
      }
    } catch (err: any) {
      console.error('Error fetching dashboard data:', err);
      // Fallback to individual API calls if RPC fails (e.g. function not created yet)
      if (err.message?.includes('function') && err.message?.includes('does not exist')) {
        console.warn('RPC get_dashboard_summary not found, falling back to individual calls');
        await fetchDashboardDataFallback();
      } else {
        setError(err.message || 'Failed to load dashboard data');
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchDashboardDataFallback = async () => {
    if (!state.user?.store?.id) return;
    const storeId = state.user.store.id;

    try {
      const [
        statsData,
        transactionsData,
        topItemsData,
        lowStockData,
        itemsCount,
        invoicesCount
      ] = await Promise.all([
        dashboardAPI.getStats(storeId),
        dashboardAPI.getRecentTransactions(storeId, 5),
        dashboardAPI.getTopSellingItems(storeId, 5),
        itemsAPI.getItems(storeId, { stock_status: 'low-stock' }, 1, 5),
        itemsAPI.getItemsCount(storeId, { is_active: true }),
        dashboardAPI.getTotalInvoicesCount(storeId)
      ]);

      setStats(statsData);
      setRecentTransactions(transactionsData);
      setTopSellingItems(topItemsData);
      setLowStockItems(lowStockData.data);
      setActiveItems(itemsCount);
      setTotalInvoices(invoicesCount);
    } catch (err: any) {
      console.error('Error in fallback dashboard fetch:', err);
      setError(err.message || 'Failed to load dashboard data');
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, [state.user?.store?.id]);

  const navigateToScreen = (path: string) => {
    navigate(path);
  };

  if (loading && !stats) {
    return (
      <Layout title={t('dashboard.title')}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-32 bg-gray-100 dark:bg-gray-800 rounded-lg animate-pulse" />
            ))}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="h-96 bg-gray-100 dark:bg-gray-800 rounded-lg animate-pulse" />
            <div className="h-96 bg-gray-100 dark:bg-gray-800 rounded-lg animate-pulse" />
          </div>
        </div>
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout title={t('dashboard.title')}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 text-center">
            <p className="text-red-800 dark:text-red-200 mb-2">{error}</p>
            <Button onClick={fetchDashboardData} size="sm" variant="secondary">
              <ArrowPathIcon className="w-4 h-4 mr-2" />
              {t('common.retry')}
            </Button>
          </div>
        </div>
      </Layout>
    );
  }

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

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <MetricCard
            title={t('dashboard.totalSales')}
            value={stats ? formatCurrency(stats.totalSales) : formatCurrency(0)}
            icon={<BanknotesIcon className="h-5 w-5" />}
            subtitle={t('dashboard.today')}
          />
          <MetricCard
            title={t('dashboard.orders')}
            value={stats ? stats?.totalOrders?.toString() : '0'}
            icon={<ShoppingCartIcon className="h-5 w-5" />}
            subtitle={t('dashboard.today')}
          />
          <MetricCard
            title={t('dashboard.averageOrder')}
            value={stats ? formatCurrency(stats.averageOrder) : formatCurrency(0)}
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

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column (Main Content) */}
          <div className="lg:col-span-2 space-y-8">

            {/* Recent Transactions */}
            <Card className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                  <ClockIcon className="h-5 w-5 text-gray-500" />
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
                {recentTransactions.length > 0 ? (
                  recentTransactions.map((transaction) => (
                    <div key={transaction.id} className="flex items-center justify-between p-3 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-lg transition-colors border border-gray-100 dark:border-gray-700">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center text-green-600 dark:text-green-400">
                          <BanknotesIcon className="w-5 h-5" />
                        </div>
                        <div>
                          <p className="font-medium text-gray-900 dark:text-white">
                            <span className="capitalize">{transaction.payment_method}</span> Sale
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            {transaction.items.length} {t('dashboard.items')} • #{transaction.id.slice(0, 8)}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-gray-900 dark:text-white">
                          {formatCurrency(transaction.total)}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {new Date(transaction.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </p>
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

            {/* Top Selling Items */}
            <Card className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                  <TrophyIcon className="h-5 w-5 text-yellow-500" />
                  Top Selling Items (Last 30 Days)
                </h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider border-b border-gray-200 dark:border-gray-700">
                      <th className="pb-3 pl-2">Item Name</th>
                      <th className="pb-3 text-right">Quantity</th>
                      <th className="pb-3 text-right pr-2">Revenue</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                    {topSellingItems.length > 0 ? (
                      topSellingItems.map((item, index) => (
                        <tr key={index} className="group hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                          <td className="py-3 pl-2 font-medium text-gray-900 dark:text-white">
                            {index + 1}. {item.name}
                          </td>
                          <td className="py-3 text-right text-gray-600 dark:text-gray-300">
                            {item.quantity}
                          </td>
                          <td className="py-3 pr-2 text-right font-medium text-gray-900 dark:text-white">
                            {formatCurrency(item.revenue)}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={3} className="py-8 text-center text-gray-500 dark:text-gray-400">
                          No sales data available yet.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>

          {/* Right Column (Sidebar) */}
          <div className="space-y-8">

            {/* Quick Actions */}
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                {t('dashboard.quickActions')}
              </h2>
              <div className="grid grid-cols-2 gap-4">
                {quickActions.map((action) => {
                  const Icon = action.icon;
                  return (
                    <Button
                      key={action.path}
                      variant="secondary"
                      onClick={() => navigateToScreen(action.path)}
                      className="h-24 flex-col space-y-2 text-center hover:scale-105 transition-transform duration-200"
                    >
                      <div
                        className={`w-10 h-10 rounded-xl flex items-center justify-center ${action.color}`}
                      >
                        <Icon className="h-5 w-5" />
                      </div>
                      <span className="text-sm font-medium">
                        {t(action.labelKey)}
                      </span>
                    </Button>
                  );
                })}
              </div>
            </div>

            {/* Low Stock Alerts */}
            <Card className="p-6 border-l-4 border-l-red-500">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <ExclamationTriangleIcon className="h-5 w-5 text-red-500" />
                Low Stock Alerts
              </h3>
              <div className="space-y-3">
                {lowStockItems.length > 0 ? (
                  lowStockItems.map((item) => (
                    <div key={item.id} className="flex items-center justify-between p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white text-sm">{item.name}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">{(item.category as any)?.name || (item.category as any)}</p>
                      </div>
                      <div className="text-right">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">
                          {item.stock} left
                        </span>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-4 text-gray-500 dark:text-gray-400 text-sm">
                    All items are well stocked!
                  </div>
                )}
              </div>
              {lowStockItems.length > 0 && (
                <Button
                  variant="ghost"
                  className="w-full mt-4 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/30"
                  onClick={() => navigateToScreen('/catalog')}
                >
                  Manage Inventory
                </Button>
              )}
            </Card>

            {/* Quick Stats */}
            <Card className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                {t('dashboard.quickStats')}
              </h3>
              <div className="space-y-4">
                <div className="flex justify-between items-center p-2 hover:bg-gray-50 dark:hover:bg-gray-800 rounded transition-colors">
                  <span className="text-gray-600 dark:text-gray-400 text-sm">
                    {t('dashboard.itemsInCart')}
                  </span>
                  <span className="font-bold text-gray-900 dark:text-white bg-orange-100 dark:bg-orange-900/30 px-2 py-1 rounded text-xs text-orange-600 dark:text-orange-400">
                    {posState.cart.length}
                  </span>
                </div>
                <div className="flex justify-between items-center p-2 hover:bg-gray-50 dark:hover:bg-gray-800 rounded transition-colors">
                  <span className="text-gray-600 dark:text-gray-400 text-sm">
                    {t('dashboard.totalInvoices')}
                  </span>
                  <span className="font-semibold text-gray-900 dark:text-white text-sm">
                    {totalInvoices}
                  </span>
                </div>
                <div className="flex justify-between items-center p-2 hover:bg-gray-50 dark:hover:bg-gray-800 rounded transition-colors">
                  <span className="text-gray-600 dark:text-gray-400 text-sm">
                    {t('dashboard.storeType')}
                  </span>
                  <span className="font-semibold text-gray-900 dark:text-white capitalize text-sm">
                    {state.user?.store?.type || 'Not set'}
                  </span>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </Layout>
  );
}