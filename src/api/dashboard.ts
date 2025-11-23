import { supabase } from '../lib/supabaseClient';
import { analyticsAPI } from './analytics';
import { DashboardSummary } from '../types';

export const dashboardAPI = {
    getStats: analyticsAPI.getTodayStats,
    getRecentTransactions: analyticsAPI.getRecentTransactions,
    getTopSellingItems: analyticsAPI.getTopSellingItems,
    getTotalInvoicesCount: analyticsAPI.getTotalInvoicesCount,

    getDashboardSummary: async (storeId: string): Promise<DashboardSummary> => {
        const { data, error } = await supabase
            .rpc('get_dashboard_summary', { p_store_id: storeId });

        if (error) {
            console.error('Error fetching dashboard summary:', error);
            throw error;
        }

        return data as DashboardSummary;
    }
};
