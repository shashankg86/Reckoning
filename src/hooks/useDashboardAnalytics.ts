import { useState, useEffect } from 'react';
import { analyticsAPI, DashboardStats, RecentTransaction } from '../api/analytics';

interface DashboardAnalytics {
    stats: DashboardStats;
    activeItems: number;
    recentTransactions: RecentTransaction[];
    totalInvoices: number;
    loading: boolean;
    error: string | null;
    refresh: () => void;
}

export function useDashboardAnalytics(storeId: string | undefined): DashboardAnalytics {
    const [stats, setStats] = useState<DashboardStats>({ sales: 0, orders: 0, averageOrder: 0 });
    const [activeItems, setActiveItems] = useState(0);
    const [recentTransactions, setRecentTransactions] = useState<RecentTransaction[]>([]);
    const [totalInvoices, setTotalInvoices] = useState(0);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const loadDashboardData = async () => {
        if (!storeId) {
            setLoading(false);
            return;
        }

        try {
            setLoading(true);
            setError(null);

            // Fetch all dashboard data in parallel
            const [statsData, itemsCount, transactions, invoiceCount] = await Promise.all([
                analyticsAPI.getTodayStats(storeId),
                analyticsAPI.getActiveItemsCount(storeId),
                analyticsAPI.getRecentTransactions(storeId, 3),
                analyticsAPI.getTotalInvoicesCount(storeId)
            ]);

            setStats(statsData);
            setActiveItems(itemsCount);
            setRecentTransactions(transactions);
            setTotalInvoices(invoiceCount);
        } catch (err) {
            console.error('Dashboard analytics error:', err);
            setError(err instanceof Error ? err.message : 'Failed to load dashboard data');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadDashboardData();
    }, [storeId]);

    return {
        stats,
        activeItems,
        recentTransactions,
        totalInvoices,
        loading,
        error,
        refresh: loadDashboardData
    };
}
