import { supabase } from '../lib/supabaseClient';
import { DashboardStats, Transaction, PaymentMethod, InvoiceStatus } from '../types';

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
                .select(`
                    total,
                    subtotal,
                    tax,
                    discount,
                    invoice_items (
                        quantity
                    )
                `)
                .eq('store_id', storeId)
                .gte('created_at', today.toISOString())
                .eq('status', 'completed');

            if (error) throw error;

            const totalOrders = data?.length || 0;
            const totalSales = data?.reduce((sum, inv) => sum + parseFloat(inv.total), 0) || 0;
            const totalTax = data?.reduce((sum, inv) => sum + parseFloat(inv.tax), 0) || 0;
            const averageOrder = totalOrders > 0 ? totalSales / totalOrders : 0;

            // Calculate total items sold
            const itemsSold = data?.reduce((sum, inv) => {
                const itemsCount = inv.invoice_items?.reduce((itemSum: number, item: any) => itemSum + (item.quantity || 0), 0) || 0;
                return sum + itemsCount;
            }, 0) || 0;

            return {
                totalSales,
                totalOrders,
                averageOrder,
                totalTax,
                itemsSold,
                activeItems: 0, // Placeholder, fetched separately
                totalInvoices: 0 // Placeholder, fetched separately
            };
        } catch (error) {
            console.error('Get today stats error:', error);
            return {
                totalSales: 0,
                totalOrders: 0,
                averageOrder: 0,
                totalTax: 0,
                itemsSold: 0,
                activeItems: 0,
                totalInvoices: 0
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
    async getRecentTransactions(storeId: string, limit: number = 5): Promise<Transaction[]> {
        try {
            const { data, error } = await supabase
                .from('invoices')
                .select(`
                    id,
                    invoice_number,
                    total,
                    payment_method,
                    created_at,
                    status,
                    invoice_items (
                        id,
                        item_name,
                        quantity,
                        price
                    )
                `)
                .eq('store_id', storeId)
                .eq('status', 'completed')
                .order('created_at', { ascending: false })
                .limit(limit);

            if (error) throw error;

            return (data || []).map(inv => ({
                id: inv.id,
                invoice_number: inv.invoice_number || inv.id,
                total: parseFloat(inv.total),
                payment_method: inv.payment_method as PaymentMethod,
                created_at: inv.created_at,
                status: inv.status as InvoiceStatus,
                items: (inv.invoice_items || []).map((item: any) => ({
                    id: item.id,
                    item_name: item.item_name,
                    price: item.price,
                    quantity: item.quantity
                }))
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
    },

    /**
     * Get top selling items (custom range)
     */
    async getTopSellingItems(storeId: string, limit: number = 5, startDate?: Date, endDate?: Date): Promise<{ name: string; quantity: number; revenue: number }[]> {
        try {
            let query = supabase
                .from('invoice_items')
                .select(`
                    item_name,
                    quantity,
                    subtotal,
                    invoices!inner (
                        store_id,
                        status,
                        created_at
                    )
                `)
                .eq('invoices.store_id', storeId)
                .eq('invoices.status', 'completed');

            if (startDate) {
                query = query.gte('invoices.created_at', startDate.toISOString());
            } else {
                // Default to 30 days if no date provided
                const thirtyDaysAgo = new Date();
                thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
                query = query.gte('invoices.created_at', thirtyDaysAgo.toISOString());
            }

            if (endDate) {
                query = query.lte('invoices.created_at', endDate.toISOString());
            }

            const { data, error } = await query;

            if (error) throw error;

            // Aggregate in JS (efficient enough for < 10k items, which is reasonable for "Recent Top Items")
            const itemMap = new Map<string, { name: string; quantity: number; revenue: number }>();

            data?.forEach((item: any) => {
                const current = itemMap.get(item.item_name) || { name: item.item_name, quantity: 0, revenue: 0 };
                current.quantity += item.quantity;
                current.revenue += item.subtotal;
                itemMap.set(item.item_name, current);
            });

            return Array.from(itemMap.values())
                .sort((a, b) => b.quantity - a.quantity)
                .slice(0, limit);

        } catch (error) {
            console.error('Get top selling items error:', error);
            return [];
        }
    },

    /**
     * Get low stock items
     */
    async getLowStockItems(storeId: string, limit: number = 5): Promise<{ id: string; name: string; stock: number; category: string }[]> {
        try {
            const { data, error } = await supabase
                .from('items')
                .select(`
                    id,
                    name,
                    stock,
                    category:categories(name)
                `)
                .eq('store_id', storeId)
                .lt('stock', 10) // Threshold for low stock
                .gte('stock', 0) // Ignore negative stock if any (though shouldn't happen)
                .order('stock', { ascending: true })
                .limit(limit);

            if (error) throw error;

            return (data || []).map((item: any) => ({
                id: item.id,
                name: item.name,
                stock: item.stock,
                category: item.category?.name || 'Uncategorized'
            }));
        } catch (error) {
            console.error('Get low stock items error:', error);
            return [];
        }
    },

    /**
     * Get comprehensive report stats
     */
    async getReportStats(storeId: string, startDate: Date, endDate: Date) {
        try {
            const { data, error } = await supabase
                .from('invoices')
                .select('total, subtotal, tax, discount, created_at')
                .eq('store_id', storeId)
                .eq('status', 'completed')
                .gte('created_at', startDate.toISOString())
                .lte('created_at', endDate.toISOString());

            if (error) throw error;

            const totalSales = data?.reduce((sum, inv) => sum + parseFloat(inv.total), 0) || 0;
            const totalOrders = data?.length || 0;
            const averageOrder = totalOrders > 0 ? totalSales / totalOrders : 0;
            const totalTax = data?.reduce((sum, inv) => sum + parseFloat(inv.tax), 0) || 0;
            const totalDiscount = data?.reduce((sum, inv) => sum + parseFloat(inv.discount), 0) || 0;

            return {
                totalSales,
                totalOrders,
                averageOrder,
                totalTax,
                totalDiscount,
                data: data || [] // Return raw data for chart processing
            };
        } catch (error) {
            console.error('Get report stats error:', error);
            return {
                totalSales: 0,
                totalOrders: 0,
                averageOrder: 0,
                totalTax: 0,
                totalDiscount: 0,
                data: []
            };
        }
    },

    /**
     * Get revenue by category
     */
    async getRevenueByCategory(storeId: string, startDate: Date, endDate: Date): Promise<{ category: string; revenue: number }[]> {
        try {
            // Join invoice_items -> items -> categories
            // Filter by invoice date via invoice_items -> invoices
            const { data, error } = await supabase
                .from('invoice_items')
                .select(`
                    subtotal,
                    items!inner (
                        category:categories(name)
                    ),
                    invoices!inner (
                        store_id,
                        status,
                        created_at
                    )
                `)
                .eq('invoices.store_id', storeId)
                .eq('invoices.status', 'completed')
                .gte('invoices.created_at', startDate.toISOString())
                .lte('invoices.created_at', endDate.toISOString());

            if (error) throw error;

            const categoryMap = new Map<string, number>();

            data?.forEach((item: any) => {
                const categoryName = item.items?.category?.name || 'Uncategorized';
                const currentRevenue = categoryMap.get(categoryName) || 0;
                categoryMap.set(categoryName, currentRevenue + item.subtotal);
            });

            return Array.from(categoryMap.entries())
                .map(([category, revenue]) => ({ category, revenue }))
                .sort((a, b) => b.revenue - a.revenue);

        } catch (error) {
            console.error('Get revenue by category error:', error);
            return [];
        }
    },

    /**
     * Get aggregated reports summary via RPC
     */
    async getReportsSummary(storeId: string, startDate: Date, endDate: Date): Promise<ReportsSummaryResponse> {
        try {
            const { data, error } = await supabase.rpc('get_reports_summary', {
                p_store_id: storeId,
                p_start_date: startDate.toISOString(),
                p_end_date: endDate.toISOString()
            });

            if (error) throw error;
            return data as ReportsSummaryResponse;
        } catch (error) {
            console.error('Get reports summary error:', error);
            throw error;
        }
    }
};

export interface ReportsSummaryResponse {
    stats: {
        totalTax: number;
        itemsSold: number;
        totalSales: number;
        totalOrders: number;
        averageOrder: number;
        totalDiscount: number;
    };
    salesByDay: {
        date: string;
        sales: number;
        orders: number;
    }[];
    topSellingItems: {
        name: string;
        sales: number;
        revenue: number;
    }[];
    revenueByCategory: {
        category: string;
        revenue: number;
    }[];
}
