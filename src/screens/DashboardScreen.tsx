import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { usePOS } from '../contexts/POSContext';
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

export function DashboardScreen() {
  const { t } = useTranslation();
  const { state } = useAuth();
  const { state: posState } = usePOS();
  const navigate = useNavigate();

  const navigateToScreen = (path: string) => {
    navigate(path);
  };

  // Calculate real metrics from POS data
  const { todaysSales, todaysOrders, activeItems, averageOrderValue, recentTransactions, totalInvoices } = useMemo(() => {
    // Calculate today's sales and orders from invoices
    const sales = posState.invoices.reduce((sum, inv) => sum + inv.total, 0);
    const orders = posState.invoices.length;

    // Calculate average order value
    const avgOrder = orders > 0 ? sales / orders : 0;

    // Get active items count (items with stock > 0 or undefined stock)
    const items = posState.items.filter(item => item.stock === undefined || item.stock > 0).length;

    // Get recent 3 transactions
    const recent = posState.invoices.slice(0, 3).map(inv => ({
      id: inv.id,
      amount: inv.total,
      time: new Date(inv.date).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
      items: inv.items.reduce((sum, item) => sum + item.quantity, 0)
    }));

    // Total invoices count (for now, same as today's since we only fetch today's)
    const total = posState.invoices.length;

    return {
      todaysSales: sales,
      todaysOrders: orders,
      activeItems: items,
      averageOrderValue: avgOrder,
      recentTransactions: recent,
      totalInvoices: total
    };
  }, [posState.invoices, posState.items]);

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

        {/* Metrics Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <MetricCard
            title={t('dashboard.todaysSales')}
            value={`₹${todaysSales.toLocaleString('en-IN')}`}
            icon={<CurrencyRupeeIcon className="h-5 w-5" />}
            subtitle={`${todaysOrders} ${t('dashboard.orders').toLowerCase()}`}
          />
          <MetricCard
            title={t('dashboard.orders')}
            value={todaysOrders.toString()}
            icon={<ShoppingCartIcon className="h-5 w-5" />}
            subtitle={t('dashboard.today')}
          />
          <MetricCard
            title={t('dashboard.averageOrder')}
            value={`₹${Math.round(averageOrderValue).toLocaleString('en-IN')}`}
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
              {recentTransactions.length > 0 ? (
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
                  {totalInvoices}
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