import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ArrowDownTrayIcon,
  ArrowTrendingUpIcon,
  CubeIcon,
  CurrencyRupeeIcon,
  ShoppingCartIcon,
  ChartBarIcon,
  TableCellsIcon,
  ArrowPathIcon,
} from '@heroicons/react/24/outline';
import { Layout } from '../components/layout/Layout';
import { Button } from '../components/ui/Button';
import { Card, MetricCard } from '../components/ui/Card';
import { DateRangePicker, DateRange } from '../components/ui/DateRangePicker';
import { ChartContainer } from '../components/ui/ChartContainer';
import { DataTable, Column } from '../components/ui/DataTable';
import { analyticsAPI, ReportsSummaryResponse } from '../api/analytics';
import { useAuth } from '../contexts/AuthContext';
import { useCurrency } from '../hooks/useCurrency';
import toast from 'react-hot-toast';

// Define types locally since they're specific to reports
type ReportView = 'chart' | 'statistics';
type ChartType = 'line' | 'bar' | 'pie' | 'doughnut';

interface TopSellingItem {
  name: string;
  sales: number;
  revenue: number;
}

interface SalesData {
  date: string;
  sales: number;
  orders: number;
}

export function ReportsScreen() {
  const { t } = useTranslation();
  const { state } = useAuth();
  const { formatCurrency } = useCurrency();
  const storeId = state.user?.store?.id;

  // State
  const [dateRange, setDateRange] = useState<DateRange>({
    startDate: new Date(new Date().setDate(new Date().getDate() - 30)).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
  });
  const [reportView, setReportView] = useState<ReportView>('chart');
  const [chartType, setChartType] = useState<ChartType>('line');

  // Data State
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<ReportsSummaryResponse | null>(null);

  // Fetch Data
  const fetchReportData = React.useCallback(async () => {
    if (!storeId) return;

    try {
      setLoading(true);
      setError(null);

      const response = await analyticsAPI.getReportsSummary(
        storeId,
        new Date(dateRange.startDate),
        new Date(dateRange.endDate)
      );

      setData(response);
    } catch (err: unknown) {
      console.error('Error fetching report data:', err);
      const errorMessage = err instanceof Error ? err.message : t('reports.fetchError', 'Failed to load report data');
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [storeId, dateRange, t]);

  useEffect(() => {
    fetchReportData();
  }, [fetchReportData]);

  // Derived Data for Charts
  const chartData = {
    labels: data?.salesByDay.map(d => d.date) || [],
    datasets: [
      {
        label: t('reports.dailySales'),
        data: data?.salesByDay.map(d => d.sales) || [],
        backgroundColor: 'rgba(251, 146, 60, 0.5)',
        borderColor: 'rgba(251, 146, 60, 1)',
        borderWidth: 2,
        fill: chartType === 'line',
      },
      {
        label: t('reports.dailyOrders'),
        data: data?.salesByDay.map(d => d.orders) || [],
        backgroundColor: 'rgba(59, 130, 246, 0.5)',
        borderColor: 'rgba(59, 130, 246, 1)',
        borderWidth: 2,
        fill: chartType === 'line',
      },
    ],
  };

  const revenueDistributionData = {
    labels: data?.revenueByCategory.map(c => c.category) || [],
    datasets: [
      {
        data: data?.revenueByCategory.map(c => c.revenue) || [],
        backgroundColor: [
          'rgba(251, 146, 60, 0.8)',
          'rgba(59, 130, 246, 0.8)',
          'rgba(16, 185, 129, 0.8)',
          'rgba(239, 68, 68, 0.8)',
          'rgba(139, 92, 246, 0.8)',
          'rgba(236, 72, 153, 0.8)',
          'rgba(107, 114, 128, 0.8)',
        ],
        borderWidth: 2,
      },
    ],
  };

  const topItemsColumns: Column<TopSellingItem>[] = [
    {
      key: 'name',
      title: t('common.itemName'),
      sortable: true,
    },
    {
      key: 'sales',
      title: t('reports.unitsSold'),
      sortable: true,
      render: (value) => `${value} ${t('common.units')}`,
    },
    {
      key: 'revenue',
      title: t('reports.revenue'),
      sortable: true,
      render: (value) => formatCurrency(value),
    },
  ];

  const salesColumns: Column<SalesData>[] = [
    {
      key: 'date',
      title: t('common.date'),
      sortable: true,
    },
    {
      key: 'sales',
      title: t('reports.sales'),
      sortable: true,
      render: (value) => formatCurrency(value),
    },
    {
      key: 'orders',
      title: t('reports.orders'),
      sortable: true,
    },
  ];

  const exportReport = (format: 'csv' | 'excel') => {
    console.log(`Exporting report as ${format}`);
    toast.success(t('reports.exportStarted', 'Export started...'));
    // TODO: Implement actual export functionality
  };

  if (loading && !data) {
    return (
      <Layout title={t('reports.title')}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="animate-pulse space-y-8">
            <div className="h-20 bg-gray-100 dark:bg-gray-800 rounded-lg" />
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="h-32 bg-gray-100 dark:bg-gray-800 rounded-lg" />
              ))}
            </div>
            <div className="h-96 bg-gray-100 dark:bg-gray-800 rounded-lg" />
          </div>
        </div>
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout title={t('reports.title')}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6 text-center">
            <p className="text-red-800 dark:text-red-200 mb-4">{error}</p>
            <Button onClick={fetchReportData} variant="primary">
              <ArrowPathIcon className="w-4 h-4 mr-2" />
              {t('common.retry')}
            </Button>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout title={t('reports.title')}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Header with Controls */}
        <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              {t('reports.title')}
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              {t('reports.subtitle', 'Analyze your business performance')}
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto">
            <DateRangePicker
              value={dateRange}
              onChange={setDateRange}
              className="flex-1 lg:flex-none"
            />

            <div className="flex gap-2">
              <Button
                variant={reportView === 'chart' ? 'primary' : 'secondary'}
                size="sm"
                onClick={() => setReportView('chart')}
              >
                <ChartBarIcon className="w-4 h-4 mr-2" />
                {t('reports.charts', 'Charts')}
              </Button>
              <Button
                variant={reportView === 'statistics' ? 'primary' : 'secondary'}
                size="sm"
                onClick={() => setReportView('statistics')}
              >
                <TableCellsIcon className="w-4 h-4 mr-2" />
                {t('reports.statistics', 'Statistics')}
              </Button>
            </div>

            <div className="flex gap-2">
              <Button variant="secondary" size="sm" onClick={() => exportReport('csv')}>
                <ArrowDownTrayIcon className="w-4 h-4 mr-2" />
                CSV
              </Button>
              <Button variant="secondary" size="sm" onClick={() => exportReport('excel')}>
                <ArrowDownTrayIcon className="w-4 h-4 mr-2" />
                Excel
              </Button>
            </div>
          </div>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <MetricCard
            title={t('reports.totalSales')}
            value={formatCurrency(data?.stats.totalSales || 0)}
            icon={<CurrencyRupeeIcon className="w-5 h-5" />}
            trend="up"
            trendValue="+0%" // TODO: Calculate growth
          />
          <MetricCard
            title={t('reports.totalOrders')}
            value={(data?.stats.totalOrders || 0).toString()}
            icon={<ShoppingCartIcon className="w-5 h-5" />}
            trend="up"
            trendValue="+0%"
          />
          <MetricCard
            title={t('reports.averageOrder')}
            value={formatCurrency(data?.stats.averageOrder || 0)}
            icon={<ArrowTrendingUpIcon className="w-5 h-5" />}
            trend="up"
            trendValue="+0%"
          />
          <MetricCard
            title={t('reports.itemsSold')}
            value={(data?.stats.itemsSold || 0).toString()}
            icon={<CubeIcon className="w-5 h-5" />}
            trend="up"
            trendValue="+0%"
          />
        </div>

        {/* Chart/Statistics View */}
        {reportView === 'chart' ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            {/* Sales Chart */}
            <Card className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  {t('reports.salesTrend', 'Sales Trend')}
                </h3>
                <div className="flex gap-2">
                  {(['line', 'bar'] as ChartType[]).map((type) => (
                    <Button
                      key={type}
                      variant={chartType === type ? 'primary' : 'ghost'}
                      size="sm"
                      onClick={() => setChartType(type)}
                      className="capitalize"
                    >
                      {type}
                    </Button>
                  ))}
                </div>
              </div>
              <ChartContainer type={chartType} data={chartData} />
            </Card>

            {/* Revenue Distribution */}
            <Card className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  {t('reports.revenueDistribution', 'Revenue Distribution')}
                </h3>
                <div className="flex gap-2">
                  {(['pie', 'doughnut'] as ChartType[]).map((type) => (
                    <Button
                      key={type}
                      variant={chartType === type ? 'primary' : 'ghost'}
                      size="sm"
                      onClick={() => setChartType(type)}
                      className="capitalize"
                    >
                      {type}
                    </Button>
                  ))}
                </div>
              </div>
              <ChartContainer type="doughnut" data={revenueDistributionData} />
            </Card>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            {/* Top Selling Items Table */}
            <DataTable
              data={data?.topSellingItems || []}
              columns={topItemsColumns}
              searchPlaceholder={t('reports.searchItems', 'Search items...')}
              emptyMessage={t('reports.noItemsFound', 'No items found')}
              pageSize={5}
            />

            {/* Daily Sales Table */}
            <DataTable
              data={data?.salesByDay || []}
              columns={salesColumns}
              searchPlaceholder={t('reports.searchDates', 'Search dates...')}
              emptyMessage={t('reports.noSalesData', 'No sales data found')}
              pageSize={7}
            />
          </div>
        )}

        {/* GST Summary */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">
            {t('reports.gstSummary')}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {formatCurrency(data?.stats.totalTax || 0)}
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {t('reports.totalGstCollected')}
              </p>
            </div>
            <div className="text-center p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {formatCurrency((data?.stats.totalTax || 0) / 2)}
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                CGST (50%)
              </p>
            </div>
            <div className="text-center p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {formatCurrency((data?.stats.totalTax || 0) / 2)}
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                SGST (50%)
              </p>
            </div>
          </div>
        </Card>
      </div>
    </Layout>
  );
}