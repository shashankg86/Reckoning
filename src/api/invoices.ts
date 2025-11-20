import { supabase } from '../lib/supabaseClient';

export interface InvoiceItemData {
  id: string;
  name: string;
  quantity: number;
  price: number;
}

export interface InvoiceData {
  customer_name?: string;
  customer_phone?: string;
  customer_email?: string;
  customer_id?: string;
  items: InvoiceItemData[];
  subtotal: number;
  discount: number;
  discount_type: 'flat' | 'percentage';
  tax: number;
  tax_rate: number;
  total: number;
  payment_method: string;
  notes?: string;
}

export const invoicesAPI = {
  async createInvoice(storeId: string, invoiceData: InvoiceData) {
    try {
      const user = await supabase.auth.getUser();
      if (!user.data.user) throw new Error('Not authenticated');

      const { data: invNum, error: invNumError } = await supabase.rpc('generate_invoice_number', {
        store_uuid: storeId,
      });

      if (invNumError) throw invNumError;

      const { data: invoice, error: invoiceError } = await supabase
        .from('invoices')
        .insert({
          store_id: storeId,
          invoice_number: invNum,
          customer_id: invoiceData.customer_id,
          customer_name: invoiceData.customer_name,
          customer_phone: invoiceData.customer_phone,
          customer_email: invoiceData.customer_email,
          subtotal: invoiceData.subtotal,
          discount: invoiceData.discount,
          discount_type: invoiceData.discount_type,
          tax: invoiceData.tax,
          tax_rate: invoiceData.tax_rate,
          total: invoiceData.total,
          payment_method: invoiceData.payment_method,
          payment_status: 'paid',
          status: 'completed',
          notes: invoiceData.notes,
          created_by: user.data.user.id,
        })
        .select()
        .single();

      if (invoiceError) throw invoiceError;

      const invoiceItems = invoiceData.items.map((item) => ({
        invoice_id: invoice.id,
        item_id: item.id,
        item_name: item.name,
        quantity: item.quantity,
        price: item.price,
        subtotal: item.price * item.quantity,
      }));

      const { error: itemsError } = await supabase.from('invoice_items').insert(invoiceItems);

      if (itemsError) throw itemsError;

      for (const item of invoiceData.items) {
        const { error: stockError } = await supabase.rpc('update_item_stock', {
          item_uuid: item.id,
          quantity_change: -item.quantity,
        });

        if (stockError) {
          console.error('Stock update error:', stockError);
        }
      }

      return invoice;
    } catch (error: any) {
      console.error('Create invoice error:', error);
      throw new Error(error.message || 'Failed to create invoice');
    }
  },

  async getInvoices(storeId: string, options?: { startDate?: Date; endDate?: Date; limit?: number }) {
    try {
      let query = supabase
        .from('invoices')
        .select(
          `
          *,
          invoice_items(*)
        `
        )
        .eq('store_id', storeId)
        .order('created_at', { ascending: false });

      if (options?.startDate) {
        query = query.gte('created_at', options.startDate.toISOString());
      }

      if (options?.endDate) {
        query = query.lte('created_at', options.endDate.toISOString());
      }

      if (options?.limit) {
        query = query.limit(options.limit);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data;
    } catch (error: any) {
      console.error('Get invoices error:', error);
      throw new Error(error.message || 'Failed to get invoices');
    }
  },

  async getTodayInvoices(storeId: string) {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const { data, error } = await supabase
        .from('invoices')
        .select(
          `
          *,
          invoice_items(*)
        `
        )
        .eq('store_id', storeId)
        .gte('created_at', today.toISOString())
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    } catch (error: any) {
      console.error('Get today invoices error:', error);
      throw new Error(error.message || 'Failed to get today invoices');
    }
  },

  async getInvoice(invoiceId: string) {
    try {
      const { data, error } = await supabase
        .from('invoices')
        .select(
          `
          *,
          invoice_items(*)
        `
        )
        .eq('id', invoiceId)
        .single();

      if (error) throw error;
      return data;
    } catch (error: any) {
      console.error('Get invoice error:', error);
      throw new Error(error.message || 'Failed to get invoice');
    }
  },

  async cancelInvoice(invoiceId: string) {
    try {
      const { data, error } = await supabase
        .from('invoices')
        .update({ status: 'cancelled' })
        .eq('id', invoiceId)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error: any) {
      console.error('Cancel invoice error:', error);
      throw new Error(error.message || 'Failed to cancel invoice');
    }
  },
};
