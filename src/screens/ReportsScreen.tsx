import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ArrowDownTrayIcon,
  ArrowTrendingUpIcon,
  CubeIcon,
  CurrencyRupeeIcon,
  ShoppingCartIcon,
  ChartBarIcon,
  TableCellsIcon,
} from '@heroicons/react/24/outline';
import { Layout } from '../components/layout/Layout';
import { Button } from '../components/ui/Button';
import { Card, MetricCard } from '../components/ui/Card';
import { DateRangePicker, DateRange } from '../components/ui/DateRangePicker';
import { ChartContainer } from '../components/ui/ChartContainer';
import { DataTable, Column } from '../components/ui/DataTable';
import type { ReportView, ChartType, TopSellingItem, SalesData } from '../types';

export function ReportsScreen() {
  const { t } = useTranslation();
  const [dateRange, setDateRange] = useState<DateRange>({
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
    preset: 'today'
  });
  const [reportView, setReportView] = useState<ReportView>('chart');
  const [chartType, setChartType] = useState<ChartType>('bar');

  // Mock data - in real app this would come from API
  const reportData = {
    totalSales: 145620,
    totalOrders: 234,
    averageOrder: 622,
    itemsSold: 542,
    topSellingItems: [
      { name: 'Chicken Biryani', sales: 45, revenue: 11250 },
      { name: 'Paneer Tikka', sales: 32, revenue: 5760 },
      { name: 'Dal Makhani', sales: 28, revenue: 3360 },
      { name: 'Butter Naan', sales: 56, revenue: 2520 },
      { name: 'Lassi', sales: 41, revenue: 2460 },
    ] as TopSellingItem[],
    salesByDay: [
      { date: 'Mon', sales: 18500, orders: 32 },
      { date: 'Tue', sales: 22300, orders: 38 },
      { date: 'Wed', sales: 19800, orders: 35 },
      { date: 'Thu', sales: 25100, orders: 42 },
      { date: 'Fri', sales: 28400, orders: 48 },
      { date: 'Sat', sales: 31200, orders: 52 },
      { date: 'Sun', sales: 20320, orders: 36 },
    ] as SalesData[],
    growth: {
      sales: 12.5,
      orders: 8.3,
      customers: 15.2,
    }
  };

  const chartData = {
    labels: reportData.salesByDay.map(d => d.date),
    datasets: [
      {
        label: t('reports.dailySales'),
        data: reportData.salesByDay.map(d => d.sales),
        backgroundColor: 'rgba(251, 146, 60, 0.5)',
        borderColor: 'rgba(251, 146, 60, 1)',
        borderWidth: 2,
        fill: chartType === 'line',
      },
      {
        label: t('reports.dailyOrders'),
        data: reportData.salesByDay.map(d => d.orders),
        backgroundColor: 'rgba(59, 130, 246, 0.5)',
        borderColor: 'rgba(59, 130, 246, 1)',
        borderWidth: 2,
        fill: chartType === 'line',
      },
    ],
  };

  const pieChartData = {
    labels: reportData.topSellingItems.map(item => item.name),
    datasets: [
      {
        data: reportData.topSellingItems.map(item => item.revenue),
        backgroundColor: [
          'rgba(251, 146, 60, 0.8)',
          'rgba(59, 130, 246, 0.8)',
          'rgba(16, 185, 129, 0.8)',
          'rgba(239, 68, 68, 0.8)',
          'rgba(139, 92, 246, 0.8)',
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
      render: (value) => `₹${value.toLocaleString('en-IN')}`,
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
      render: (value) => `₹${value.toLocaleString('en-IN')}`,
    },
    {
      key: 'orders',
      title: t('reports.orders'),
      sortable: true,
    },
  ];

  const exportReport = (format: 'csv' | 'excel') => {
    console.log(`Exporting report as ${format}`);
    // TODO: Implement actual export functionality
  };

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
              {t('reports.subtitle')}
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
                {t('reports.charts')}
              </Button>
              <Button
                variant={reportView === 'statistics' ? 'primary' : 'secondary'}
                size="sm"
                onClick={() => setReportView('statistics')}
              >
                <TableCellsIcon className="w-4 h-4 mr-2" />
                {t('reports.statistics')}
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
            value={`₹${reportData.totalSales.toLocaleString('en-IN')}`}
            icon={<CurrencyRupeeIcon className="w-5 h-5" />}
            trend="up"
            trendValue={`+${reportData.growth.sales}%`}
          />
          <MetricCard
            title={t('reports.totalOrders')}
            value={reportData.totalOrders.toString()}
            icon={<ShoppingCartIcon className="w-5 h-5" />}
            trend="up"
            trendValue={`+${reportData.growth.orders}%`}
          />
          <MetricCard
            title={t('reports.averageOrder')}
            value={`₹${reportData.averageOrder}`}
            icon={<ArrowTrendingUpIcon className="w-5 h-5" />}
            trend="up"
            trendValue="+5.2%"
          />
          <MetricCard
            title={t('reports.itemsSold')}
            value={reportData.itemsSold.toString()}
            icon={<CubeIcon className="w-5 h-5" />}
            trend="up"
            trendValue="+18.1%"
          />
        </div>

        {/* Chart/Statistics View */}
        {reportView === 'chart' ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            {/* Sales Chart */}
            <Card className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  {t('reports.salesTrend')}
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
                  {t('reports.revenueDistribution')}
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
              <ChartContainer type="doughnut" data={pieChartData} />
            </Card>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            {/* Top Selling Items Table */}
            <DataTable
              data={reportData.topSellingItems}
              columns={topItemsColumns}
              searchPlaceholder={t('reports.searchItems')}
              emptyMessage={t('reports.noItemsFound')}
              pageSize={5}
            />

            {/* Daily Sales Table */}
            <DataTable
              data={reportData.salesByDay}
              columns={salesColumns}
              searchPlaceholder={t('reports.searchDates')}
              emptyMessage={t('reports.noSalesData')}
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
                ₹26,212
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {t('reports.totalGstCollected')}
              </p>
            </div>
            <div className="text-center p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                ₹13,106
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                CGST (9%)
              </p>
            </div>
            <div className="text-center p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                ₹13,106
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                SGST (9%)
              </p>
            </div>
          </div>
        </Card>
      </div>
    </Layout>
  );
}