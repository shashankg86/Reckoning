import { supabase } from '../lib/supabaseClient';

export interface ItemData {
  name: string;
  category: string;
  price: number;
  sku?: string;
  stock?: number;
  low_stock_threshold?: number;
  image_url?: string;
  description?: string;
}

export const itemsAPI = {
  async getItems(storeId: string) {
    try {
      const { data, error } = await supabase
        .from('items')
        .select('*')
        .eq('store_id', storeId)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    } catch (error: any) {
      console.error('Get items error:', error);
      throw new Error(error.message || 'Failed to get items');
    }
  },

  async createItem(storeId: string, item: ItemData) {
    try {
      const user = await supabase.auth.getUser();
      if (!user.data.user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('items')
        .insert({
          ...item,
          store_id: storeId,
          created_by: user.data.user.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error: any) {
      console.error('Create item error:', error);
      throw new Error(error.message || 'Failed to create item');
    }
  },

  async updateItem(itemId: string, updates: Partial<ItemData>) {
    try {
      const { data, error } = await supabase
        .from('items')
        .update(updates)
        .eq('id', itemId)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error: any) {
      console.error('Update item error:', error);
      throw new Error(error.message || 'Failed to update item');
    }
  },

  async deleteItem(itemId: string) {
    try {
      const { error } = await supabase.from('items').update({ is_active: false }).eq('id', itemId);

      if (error) throw error;
    } catch (error: any) {
      console.error('Delete item error:', error);
      throw new Error(error.message || 'Failed to delete item');
    }
  },

  async bulkCreateItems(storeId: string, items: ItemData[]) {
    try {
      const user = await supabase.auth.getUser();
      if (!user.data.user) throw new Error('Not authenticated');

      const itemsWithStore = items.map((item) => ({
        ...item,
        store_id: storeId,
        created_by: user.data.user.id,
      }));

      const { data, error } = await supabase.from('items').insert(itemsWithStore).select();

      if (error) throw error;
      return data;
    } catch (error: any) {
      console.error('Bulk create items error:', error);
      throw new Error(error.message || 'Failed to bulk create items');
    }
  },

  async searchItems(storeId: string, query: string) {
    try {
      const { data, error } = await supabase
        .from('items')
        .select('*')
        .eq('store_id', storeId)
        .eq('is_active', true)
        .or(`name.ilike.%${query}%,sku.ilike.%${query}%`)
        .limit(20);

      if (error) throw error;
      return data;
    } catch (error: any) {
      console.error('Search items error:', error);
      throw new Error(error.message || 'Failed to search items');
    }
  },

  async getLowStockItems(storeId: string) {
    try {
      const { data, error } = await supabase.rpc('get_low_stock_items', {
        store_uuid: storeId,
      });

      if (error) {
        const { data: fallbackData, error: fallbackError } = await supabase
          .from('items')
          .select('*')
          .eq('store_id', storeId)
          .eq('is_active', true)
          .filter('stock', 'lte', 'low_stock_threshold');

        if (fallbackError) throw fallbackError;
        return fallbackData;
      }

      return data;
    } catch (error: any) {
      console.error('Get low stock items error:', error);
      throw new Error(error.message || 'Failed to get low stock items');
    }
  },
};
