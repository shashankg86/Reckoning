import { supabase } from '../lib/supabaseClient';

export interface ItemData {
  name: string;
  category?: string; // Legacy support
  category_id?: string; // New: FK to categories table
  price: number;
  sku?: string;
  stock?: number;
  low_stock_threshold?: number;
  image_url?: string;
  description?: string;
  tags?: string[]; // Item tags (vegan, spicy, etc.)
  metadata?: Record<string, any>; // Dynamic custom fields
  is_active?: boolean;
}

export interface ItemFilter {
  search?: string;
  category_id?: string;
  is_active?: boolean;
  min_price?: number;
  max_price?: number;
  tags?: string[];
}

export const itemsAPI = {
  async getItems(storeId: string, filter?: ItemFilter) {
    try {
      let query = supabase
        .from('items')
        .select(`
          *,
          category:categories(id, name, color)
        `)
        .eq('store_id', storeId)
        .order('display_order', { ascending: true });

      if (filter?.is_active !== undefined) {
        query = query.eq('is_active', filter.is_active);
      } else {
        query = query.eq('is_active', true); // Default: only active items
      }

      if (filter?.category_id) {
        query = query.eq('category_id', filter.category_id);
      }

      if (filter?.search) {
        query = query.or(
          `name_en.ilike.%${filter.search}%,description_en.ilike.%${filter.search}%,sku.ilike.%${filter.search}%`
        );
      }

      if (filter?.min_price !== undefined) {
        query = query.gte('price', filter.min_price);
      }

      if (filter?.max_price !== undefined) {
        query = query.lte('price', filter.max_price);
      }

      if (filter?.tags && filter.tags.length > 0) {
        query = query.contains('tags', filter.tags);
      }

      const { data, error } = await query;

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

      // Get the next display order
      const { data: items } = await supabase
        .from('items')
        .select('display_order')
        .eq('store_id', storeId)
        .order('display_order', { ascending: false })
        .limit(1);

      const nextDisplayOrder =
        items && items.length > 0 ? (items[0].display_order || 0) + 1 : 0;

      const { data, error } = await supabase
        .from('items')
        .insert({
          store_id: storeId,
          name_en: item.name,
          description_en: item.description || null,
          price: item.price,
          category: item.category || null, // Legacy support
          category_id: item.category_id || null,
          image_url: item.image_url || null,
          stock: item.stock || 0,
          sku: item.sku || null,
          low_stock_threshold: item.low_stock_threshold || null,
          tags: item.tags || [],
          metadata: item.metadata || {},
          is_active: item.is_active !== false,
          display_order: nextDisplayOrder,
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
      const updateData: any = {};

      if (updates.name !== undefined) updateData.name_en = updates.name;
      if (updates.description !== undefined) updateData.description_en = updates.description;
      if (updates.price !== undefined) updateData.price = updates.price;
      if (updates.category !== undefined) updateData.category = updates.category; // Legacy
      if (updates.category_id !== undefined) updateData.category_id = updates.category_id;
      if (updates.image_url !== undefined) updateData.image_url = updates.image_url;
      if (updates.stock !== undefined) updateData.stock = updates.stock;
      if (updates.sku !== undefined) updateData.sku = updates.sku;
      if (updates.low_stock_threshold !== undefined)
        updateData.low_stock_threshold = updates.low_stock_threshold;
      if (updates.tags !== undefined) updateData.tags = updates.tags;
      if (updates.metadata !== undefined) updateData.metadata = updates.metadata;
      if (updates.is_active !== undefined) updateData.is_active = updates.is_active;

      const { data, error } = await supabase
        .from('items')
        .update(updateData)
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

      // Get the next display order
      const { data: existingItems } = await supabase
        .from('items')
        .select('display_order')
        .eq('store_id', storeId)
        .order('display_order', { ascending: false })
        .limit(1);

      let nextDisplayOrder =
        existingItems && existingItems.length > 0 ? (existingItems[0].display_order || 0) + 1 : 0;

      const itemsToInsert = items.map((item, index) => ({
        store_id: storeId,
        name_en: item.name,
        description_en: item.description || null,
        price: item.price,
        category: item.category || null, // Legacy support
        category_id: item.category_id || null,
        image_url: item.image_url || null,
        stock: item.stock || 0,
        sku: item.sku || null,
        low_stock_threshold: item.low_stock_threshold || null,
        tags: item.tags || [],
        metadata: item.metadata || {},
        is_active: item.is_active !== false,
        display_order: nextDisplayOrder + index,
        created_by: user.data.user.id,
      }));

      const { data, error } = await supabase.from('items').insert(itemsToInsert).select();

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
        .select(`
          *,
          category:categories(id, name, color)
        `)
        .eq('store_id', storeId)
        .eq('is_active', true)
        .or(`name_en.ilike.%${query}%,description_en.ilike.%${query}%,sku.ilike.%${query}%`)
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

  /**
   * Get items count for a store or category
   */
  async getItemsCount(storeId: string, filter?: ItemFilter): Promise<number> {
    try {
      let query = supabase
        .from('items')
        .select('id', { count: 'exact', head: true })
        .eq('store_id', storeId);

      if (filter?.is_active !== undefined) {
        query = query.eq('is_active', filter.is_active);
      }

      if (filter?.category_id) {
        query = query.eq('category_id', filter.category_id);
      }

      const { count, error } = await query;

      if (error) throw error;
      return count || 0;
    } catch (error: any) {
      console.error('Get items count error:', error);
      return 0;
    }
  },

  /**
   * Check if category has any items
   */
  async categoryHasItems(categoryId: string): Promise<boolean> {
    try {
      const { count, error } = await supabase
        .from('items')
        .select('id', { count: 'exact', head: true })
        .eq('category_id', categoryId)
        .eq('is_active', true);

      if (error) throw error;
      return (count || 0) > 0;
    } catch (error: any) {
      console.error('Category has items error:', error);
      return false;
    }
  },
};
