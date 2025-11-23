import { useState, useEffect } from 'react';
import { analyticsAPI } from '../api/analytics';

interface SalesData {
    date: string;
    sales: number;
    orders: number;
}

interface TopSellingItem {
    name: string;
    sales: number;
    revenue: number;
}

interface CategoryRevenue {
    category: string;
    revenue: number;
}

interface ReportStats {
    totalSales: number;
    totalOrders: number;
    averageOrder: number;
    totalTax: number;
    totalDiscount: number;
    itemsSold: number;
}

export function useReports(storeId: string | undefined, startDate: Date, endDate: Date) {
    const [stats, setStats] = useState<ReportStats>({
        totalSales: 0,
        totalOrders: 0,
        averageOrder: 0,
        totalTax: 0,
        totalDiscount: 0,
        itemsSold: 0
    });
    const [salesByDay, setSalesByDay] = useState<SalesData[]>([]);
    const [topSellingItems, setTopSellingItems] = useState<TopSellingItem[]>([]);
    const [revenueByCategory, setRevenueByCategory] = useState<CategoryRevenue[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const loadReports = async () => {
            if (!storeId) {
                setLoading(false);
                return;
            }

            try {
                setLoading(true);
                setError(null);

                // Fetch all data in a single RPC call
                const data = await analyticsAPI.getReportsSummary(storeId, startDate, endDate);

                setStats({
                    totalSales: data.stats.totalSales,
                    totalOrders: data.stats.totalOrders,
                    averageOrder: data.stats.averageOrder,
                    totalTax: data.stats.totalTax,
                    totalDiscount: data.stats.totalDiscount,
                    itemsSold: data.stats.itemsSold
                });

                setSalesByDay(data.salesByDay);
                setTopSellingItems(data.topSellingItems);
                setRevenueByCategory(data.revenueByCategory);

            } catch (err) {
                console.error('Reports error:', err);
                setError(err instanceof Error ? err.message : 'Failed to load reports');
            } finally {
                setLoading(false);
            }
        };

        loadReports();
    }, [storeId, startDate, endDate]);

    return {
        stats,
        salesByDay,
        topSellingItems,
        revenueByCategory,
        loading,
        error
    };
}
