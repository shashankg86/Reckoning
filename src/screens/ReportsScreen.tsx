import {
  ArrowDownTrayIcon,
  ArrowTrendingUpIcon,
  CubeIcon,
  CurrencyRupeeIcon,
  ShoppingCartIcon
} from '@heroicons/react/24/outline';
import { useState } from 'react';
import { Layout } from '../components/Layout';
import { Button } from '../components/ui/Button';
import { Card, MetricCard } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { usePOS } from '../context/POSContext';

export function ReportsScreen() {
  const { state } = usePOS();
  const [dateRange, setDateRange] = useState('today');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const t = (en: string, hi: string) => state.store?.language === 'hi' ? hi : en;

  const dateRangeOptions = [
    { value: 'today', label: t('Today', 'आज') },
    { value: 'yesterday', label: t('Yesterday', 'कल') },
    { value: 'thisWeek', label: t('This Week', 'इस सप्ताह') },
    { value: 'lastWeek', label: t('Last Week', 'पिछला सप्ताह') },
    { value: 'thisMonth', label: t('This Month', 'इस महीने') },
    { value: 'lastMonth', label: t('Last Month', 'पिछला महीना') },
    { value: 'custom', label: t('Custom Range', 'कस्टम रेंज') },
  ];

  // Mock data - in real app this would be calculated from actual invoices
  const reportData = {
    totalSales: 145620,
    totalOrders: 234,
    averageOrder: 622,
    topSellingItems: [
      { name: 'Chicken Biryani', sales: 45, revenue: 11250 },
      { name: 'Paneer Tikka', sales: 32, revenue: 5760 },
      { name: 'Dal Makhani', sales: 28, revenue: 3360 },
      { name: 'Butter Naan', sales: 56, revenue: 2520 },
      { name: 'Lassi', sales: 41, revenue: 2460 },
    ],
    salesByDay: [
      { day: 'Mon', sales: 18500 },
      { day: 'Tue', sales: 22300 },
      { day: 'Wed', sales: 19800 },
      { day: 'Thu', sales: 25100 },
      { day: 'Fri', sales: 28400 },
      { day: 'Sat', sales: 31200 },
      { day: 'Sun', sales: 20320 },
    ],
    growth: {
      sales: 12.5,
      orders: 8.3,
      customers: 15.2,
    }
  };

  const exportReport = (format: 'csv' | 'excel') => {
    // Mock export functionality
    console.log(`Exporting report as ${format}`);
  };

  return (
    <Layout title={t('Reports', 'रिपोर्ट')}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Date Range Selector */}
        <Card className="p-6 mb-6">
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-end">
            <div className="flex-1">
              <Select
                label={t('Date Range', 'दिनांक सीमा')}
                value={dateRange}
                onChange={(e) => setDateRange(e.target.value)}
                options={dateRangeOptions}
              />
            </div>

            {dateRange === 'custom' && (
              <>
                <Input
                  label={t('Start Date', 'प्रारंभ दिनांक')}
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
                <Input
                  label={t('End Date', 'समाप्ति दिनांक')}
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </>
            )}

            <div className="flex gap-2">
              <Button variant="secondary" onClick={() => exportReport('csv')}>
                <ArrowDownTrayIcon className="w-4 h-4 mr-2" />
                CSV
              </Button>
              <Button variant="secondary" onClick={() => exportReport('excel')}>
                <ArrowDownTrayIcon className="w-4 h-4 mr-2" />
                Excel
              </Button>
            </div>
          </div>
        </Card>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <MetricCard
            title={t('Total Sales', 'कुल बिक्री')}
            value={`₹${reportData.totalSales.toLocaleString('en-IN')}`}
            icon={<CurrencyRupeeIcon className="w-5 h-5" />}
            trend="up"
            trendValue={`+${reportData.growth.sales}%`}
          />
          <MetricCard
            title={t('Total Orders', 'कुल ऑर्डर')}
            value={reportData.totalOrders.toString()}
            icon={<ShoppingCartIcon className="w-5 h-5" />}
            trend="up"
            trendValue={`+${reportData.growth.orders}%`}
          />
          <MetricCard
            title={t('Average Order', 'औसत ऑर्डर')}
            value={`₹${reportData.averageOrder}`}
            icon={<ArrowTrendingUpIcon className="w-5 h-5" />}
            trend="up"
            trendValue="+5.2%"
          />
          <MetricCard
            title={t('Items Sold', 'बेचे गए आइटम')}
            value="542"
            icon={<CubeIcon className="w-5 h-5" />}
            trend="up"
            trendValue="+18.1%"
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Sales Chart */}
          <Card className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                {t('Daily Sales', 'दैनिक बिक्री')}
              </h3>
              <div className="text-sm text-gray-500 dark:text-gray-400">
                {t('This Week', 'इस सप्ताह')}
              </div>
            </div>

            {/* Simple Bar Chart */}
            <div className="space-y-3">
              {reportData.salesByDay.map((day) => (
                <div key={day.day} className="flex items-center">
                  <div className="w-12 text-sm text-gray-600 dark:text-gray-400">
                    {day.day}
                  </div>
                  <div className="flex-1 mx-3">
                    <div className="bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                      <div
                        className="bg-teal-600 h-2 rounded-full transition-all duration-500"
                        style={{
                          width: `${(day.sales / Math.max(...reportData.salesByDay.map(d => d.sales))) * 100}%`
                        }}
                      />
                    </div>
                  </div>
                  <div className="w-20 text-sm font-medium text-gray-900 dark:text-white text-right">
                    ₹{day.sales.toLocaleString('en-IN')}
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {/* Top Selling Items */}
          <Card className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">
              {t('Top Selling Items', 'सबसे ज्यादा बिकने वाले आइटम')}
            </h3>
            <div className="space-y-4">
              {reportData.topSellingItems.map((item, index) => (
                <div key={item.name} className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-white text-sm font-bold ${index === 0 ? 'bg-yellow-500' :
                      index === 1 ? 'bg-gray-400' :
                        index === 2 ? 'bg-orange-600' :
                          'bg-gray-300'
                      }`}>
                      {index + 1}
                    </div>
                    <div className="ml-3">
                      <p className="font-medium text-gray-900 dark:text-white">
                        {item.name}
                      </p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {item.sales} {t('sold', 'बेचा गया')}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-teal-600 dark:text-teal-400">
                      ₹{item.revenue.toLocaleString('en-IN')}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>

        {/* GST Summary */}
        <Card className="p-6 mt-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            {t('GST Summary', 'जीएसटी सारांश')}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                ₹26,212
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {t('Total GST Collected', 'कुल जीएसटी संग्रहीत')}
              </p>
            </div>
            <div className="text-center p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                ₹18,420
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {t('CGST (9%)', 'CGST (9%)')}
              </p>
            </div>
            <div className="text-center p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                ₹7,792
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {t('SGST (9%)', 'SGST (9%)')}
              </p>
            </div>
          </div>
        </Card>
      </div>
    </Layout>
  );
}
