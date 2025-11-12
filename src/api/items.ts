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
        .order('created_at', { ascending: false });

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
          `name.ilike.%${filter.search}%,description.ilike.%${filter.search}%,sku.ilike.%${filter.search}%`
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

      // Get category name if category_id is provided (category column is NOT NULL)
      let categoryName = item.category || 'Uncategorized';
      if (item.category_id && !item.category) {
        const { data: categoryData } = await supabase
          .from('categories')
          .select('name')
          .eq('id', item.category_id)
          .single();

        if (categoryData) {
          categoryName = categoryData.name;
        }
      }

      const { data, error } = await supabase
        .from('items')
        .insert({
          store_id: storeId,
          name: item.name,
          description: item.description || null,
          price: item.price,
          category: categoryName, // Required field - cannot be null
          category_id: item.category_id || null,
          image_url: item.image_url || null,
          stock: item.stock || 0,
          sku: item.sku || null,
          low_stock_threshold: item.low_stock_threshold || null,
          is_active: item.is_active !== false,
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

      if (updates.name !== undefined) updateData.name = updates.name;
      if (updates.description !== undefined) updateData.description = updates.description;
      if (updates.price !== undefined) updateData.price = updates.price;
      if (updates.category !== undefined) updateData.category = updates.category;
      if (updates.category_id !== undefined) updateData.category_id = updates.category_id;
      if (updates.image_url !== undefined) updateData.image_url = updates.image_url;
      if (updates.stock !== undefined) updateData.stock = updates.stock;
      if (updates.sku !== undefined) updateData.sku = updates.sku;
      if (updates.low_stock_threshold !== undefined)
        updateData.low_stock_threshold = updates.low_stock_threshold;
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

      // Get unique category IDs
      const categoryIds = [...new Set(items.map((item) => item.category_id).filter(Boolean))];

      // Fetch all category names at once
      const categoryMap = new Map<string, string>();
      if (categoryIds.length > 0) {
        const { data: categories } = await supabase
          .from('categories')
          .select('id, name')
          .in('id', categoryIds);

        if (categories) {
          categories.forEach((cat) => categoryMap.set(cat.id, cat.name));
        }
      }

      const itemsToInsert = items.map((item) => {
        let categoryName = item.category || 'Uncategorized';
        if (item.category_id && categoryMap.has(item.category_id)) {
          categoryName = categoryMap.get(item.category_id)!;
        }

        return {
          store_id: storeId,
          name: item.name,
          description: item.description || null,
          price: item.price,
          category: categoryName, // Required field - cannot be null
          category_id: item.category_id || null,
          image_url: item.image_url || null,
          stock: item.stock || 0,
          sku: item.sku || null,
          low_stock_threshold: item.low_stock_threshold || null,
          is_active: item.is_active !== false,
          created_by: user.data.user.id,
        };
      });

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
        .or(`name.ilike.%${query}%,description.ilike.%${query}%,sku.ilike.%${query}%`)
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
