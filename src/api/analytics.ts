import { supabase } from '../lib/supabaseClient';

export interface DashboardStats {
    sales: number;
    orders: number;
    averageOrder: number;
}

export interface RecentTransaction {
    id: string;
    amount: number;
    time: string;
    items: number;
    customer?: string;
}

export const analyticsAPI = {
    /**
     * Get today's sales statistics
     */
    async getTodayStats(storeId: string): Promise<DashboardStats> {
        try {
            const today = new Date();
            today.setHours(0, 0, 0, 0);

            const { data, error } = await supabase
                .from('invoices')
                .select('total, subtotal, tax, discount')
                .eq('store_id', storeId)
                .gte('created_at', today.toISOString())
                .eq('status', 'paid');

            if (error) throw error;

            const orders = data?.length || 0;
            const sales = data?.reduce((sum, inv) => sum + parseFloat(inv.total), 0) || 0;
            const averageOrder = orders > 0 ? sales / orders : 0;

            return {
                sales,
                orders,
                averageOrder
            };
        } catch (error) {
            console.error('Get today stats error:', error);
            return {
                sales: 0,
                orders: 0,
                averageOrder: 0
            };
        }
    },

    /**
     * Get count of active items (stock > 0 or undefined)
     */
    async getActiveItemsCount(storeId: string): Promise<number> {
        try {
            const { count, error } = await supabase
                .from('items')
                .select('*', { count: 'exact', head: true })
                .eq('store_id', storeId)
                .or('stock.gt.0,stock.is.null');

            if (error) throw error;
            return count || 0;
        } catch (error) {
            console.error('Get active items count error:', error);
            return 0;
        }
    },

    /**
     * Get recent transactions
     */
    async getRecentTransactions(storeId: string, limit: number = 5): Promise<RecentTransaction[]> {
        try {
            const { data, error } = await supabase
                .from('invoices')
                .select(`
          invoice_number,
          total,
          created_at,
          customer_name,
          invoice_items (
            quantity
          )
        `)
                .eq('store_id', storeId)
                .eq('status', 'paid')
                .order('created_at', { ascending: false })
                .limit(limit);

            if (error) throw error;

            return (data || []).map(inv => ({
                id: inv.invoice_number,
                amount: parseFloat(inv.total),
                time: new Date(inv.created_at).toLocaleTimeString('en-US', {
                    hour: '2-digit',
                    minute: '2-digit'
                }),
                items: inv.invoice_items?.reduce((sum: number, item: { quantity: number }) => sum + item.quantity, 0) || 0,
                customer: inv.customer_name
            }));
        } catch (error) {
            console.error('Get recent transactions error:', error);
            return [];
        }
    },

    /**
     * Get total invoices count for the store
     */
    async getTotalInvoicesCount(storeId: string): Promise<number> {
        try {
            const { count, error } = await supabase
                .from('invoices')
                .select('*', { count: 'exact', head: true })
                .eq('store_id', storeId);

            if (error) throw error;
            return count || 0;
        } catch (error) {
            console.error('Get total invoices count error:', error);
            return 0;
        }
    }
};
