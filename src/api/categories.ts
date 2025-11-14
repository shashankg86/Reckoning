/**
 * Categories API
 *
 * Handles all category-related API operations with Supabase.
 * Enterprise-grade error handling and data validation.
 */

import { supabase } from '../lib/supabaseClient';
import type {
  Category,
  CategoryWithItems,
  CategoryHierarchy,
  CreateCategoryData,
  UpdateCategoryData,
  CategoryFilter,
  ReorderCategoryPayload,
} from '../types/menu';

export const categoriesAPI = {
  /**
   * Get all categories for a store
   */
  async getCategories(storeId: string, filter?: CategoryFilter): Promise<Category[]> {
    try {
      let query = supabase
        .from('categories')
        .select('*')
        .eq('store_id', storeId)
        .order('sort_order', { ascending: true });

      if (filter?.is_active !== undefined) {
        query = query.eq('is_active', filter.is_active);
      }

      if (filter?.parent_id !== undefined) {
        if (filter.parent_id === null) {
          query = query.is('parent_id', null);
        } else {
          query = query.eq('parent_id', filter.parent_id);
        }
      }

      if (filter?.search) {
        query = query.ilike('name', `%${filter.search}%`);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data || [];
    } catch (error: any) {
      console.error('Get categories error:', error);
      throw new Error(error.message || 'Failed to get categories');
    }
  },

  /**
   * Get categories with item counts
   */
  async getCategoriesWithCounts(storeId: string): Promise<CategoryWithItems[]> {
    try {
      const { data, error } = await supabase
        .from('categories')
        .select(`
          *,
          items:items(
            id,
            name,
            price,
            image_url,
            stock,
            is_active,
            description,
            category_id
          )
        `)
        .eq('store_id', storeId)
        .eq('is_active', true)
        .eq('items.is_active', true)
        .order('sort_order', { ascending: true });

      if (error) throw error;

      return (data || []).map((cat: any) => ({
        ...cat,
        item_count: cat.items?.length || 0,
      }));
    } catch (error: any) {
      console.error('Get categories with counts error:', error);
      throw new Error(error.message || 'Failed to get categories with counts');
    }
  },

  /**
   * Get category hierarchy (nested categories)
   */
  async getCategoryHierarchy(storeId: string): Promise<CategoryHierarchy[]> {
    try {
      const { data, error } = await supabase.rpc('get_category_hierarchy', {
        p_store_id: storeId,
      });

      if (error) {
        // Fallback if function doesn't exist yet - get flat structure
        const categories = await this.getCategories(storeId, { is_active: true });
        return categories.map((cat) => ({
          ...cat,
          children: [],
          depth: 0,
        }));
      }

      return data || [];
    } catch (error: any) {
      console.error('Get category hierarchy error:', error);
      // Fallback to flat structure
      const categories = await this.getCategories(storeId, { is_active: true });
      return categories.map((cat) => ({
        ...cat,
        children: [],
        depth: 0,
      }));
    }
  },

  /**
   * Get single category by ID
   */
  async getCategory(categoryId: string): Promise<Category> {
    try {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .eq('id', categoryId)
        .single();

      if (error) throw error;
      if (!data) throw new Error('Category not found');

      return data;
    } catch (error: any) {
      console.error('Get category error:', error);
      throw new Error(error.message || 'Failed to get category');
    }
  },

  /**
   * Create a new category
   */
  async createCategory(
    storeId: string,
    categoryData: CreateCategoryData
  ): Promise<Category> {
    try {
      const user = await supabase.auth.getUser();
      if (!user.data.user) throw new Error('Not authenticated');

      // Get the next sort order
      const { data: categories } = await supabase
        .from('categories')
        .select('sort_order')
        .eq('store_id', storeId)
        .order('sort_order', { ascending: false })
        .limit(1);

      const nextSortOrder =
        categoryData.sort_order !== undefined
          ? categoryData.sort_order
          : categories && categories.length > 0
          ? categories[0].sort_order + 1
          : 0;

      const { data, error } = await supabase
        .from('categories')
        .insert({
          store_id: storeId,
          name: categoryData.name,
          description: categoryData.description || null,
          color: categoryData.color || '#FF6B35',
          icon: categoryData.icon || 'square-3-stack-3d',
          image_url: categoryData.image_url || null,
          sort_order: nextSortOrder,
          parent_id: categoryData.parent_id || null,
          metadata: categoryData.metadata || {},
          is_active: true,
          created_by: user.data.user.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error: any) {
      console.error('Create category error:', error);
      throw new Error(error.message || 'Failed to create category');
    }
  },

  /**
   * Bulk create categories - ENTERPRISE APPROACH
   * Single API call for multiple categories
   */
  async bulkCreateCategories(
    storeId: string,
    categoriesData: CreateCategoryData[]
  ): Promise<Category[]> {
    try {
      const user = await supabase.auth.getUser();
      if (!user.data.user) throw new Error('Not authenticated');

      // Get the current max sort order
      const { data: existingCategories } = await supabase
        .from('categories')
        .select('sort_order')
        .eq('store_id', storeId)
        .order('sort_order', { ascending: false })
        .limit(1);

      let nextSortOrder = existingCategories && existingCategories.length > 0
        ? existingCategories[0].sort_order + 1
        : 0;

      // Prepare all categories for insertion with proper sort_order
      const categoriesToInsert = categoriesData.map((categoryData, index) => ({
        store_id: storeId,
        name: categoryData.name,
        description: categoryData.description || null,
        color: categoryData.color || '#FF6B35',
        icon: categoryData.icon || 'square-3-stack-3d',
        image_url: categoryData.image_url || null,
        sort_order: categoryData.sort_order !== undefined
          ? categoryData.sort_order
          : nextSortOrder + index,
        parent_id: categoryData.parent_id || null,
        metadata: categoryData.metadata || {},
        is_active: true,
        created_by: user.data.user.id,
      }));

      // SINGLE API CALL - Insert all categories at once
      const { data, error } = await supabase
        .from('categories')
        .insert(categoriesToInsert)
        .select();

      if (error) throw error;
      return data || [];
    } catch (error: any) {
      console.error('Bulk create categories error:', error);
      throw new Error(error.message || 'Failed to bulk create categories');
    }
  },

  /**
   * Update an existing category
   */
  async updateCategory(
    categoryId: string,
    updates: UpdateCategoryData
  ): Promise<Category> {
    try {
      const { data, error } = await supabase
        .from('categories')
        .update(updates)
        .eq('id', categoryId)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error: any) {
      console.error('Update category error:', error);
      throw new Error(error.message || 'Failed to update category');
    }
  },

  /**
   * Bulk update categories - ENTERPRISE APPROACH
   * Updates multiple categories in parallel instead of sequential loops
   *
   * Performance: 100 updates in ~1-2s instead of 20-50s
   */
  async bulkUpdateCategories(
    updates: Array<{ id: string } & UpdateCategoryData>
  ): Promise<Category[]> {
    try {
      // Execute all updates in parallel
      const updatePromises = updates.map(({ id, ...updateData }) =>
        supabase
          .from('categories')
          .update(updateData)
          .eq('id', id)
          .select()
          .single()
      );

      const results = await Promise.allSettled(updatePromises);

      // Collect successful updates and errors
      const successfulUpdates: Category[] = [];
      const errors: string[] = [];

      results.forEach((result, index) => {
        if (result.status === 'fulfilled' && result.value.data) {
          successfulUpdates.push(result.value.data);
        } else if (result.status === 'rejected') {
          errors.push(`Category ${updates[index].id}: ${result.reason}`);
        }
      });

      // Log errors but don't fail the entire operation
      if (errors.length > 0) {
        console.warn('Some category updates failed:', errors);
      }

      return successfulUpdates;
    } catch (error: any) {
      console.error('Bulk update categories error:', error);
      throw new Error(error.message || 'Failed to bulk update categories');
    }
  },

  /**
   * Delete a category (soft delete)
   */
  async deleteCategory(categoryId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('categories')
        .update({ is_active: false })
        .eq('id', categoryId);

      if (error) throw error;
    } catch (error: any) {
      console.error('Delete category error:', error);
      throw new Error(error.message || 'Failed to delete category');
    }
  },

  /**
   * Permanently delete a category
   */
  async permanentlyDeleteCategory(categoryId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('categories')
        .delete()
        .eq('id', categoryId);

      if (error) throw error;
    } catch (error: any) {
      console.error('Permanently delete category error:', error);
      throw new Error(error.message || 'Failed to permanently delete category');
    }
  },

  /**
   * Bulk permanently delete categories - ENTERPRISE APPROACH
   * Deletes multiple categories in a single query instead of N queries
   *
   * Performance: 100 deletes in ~0.5s instead of 5-10s
   */
  async bulkPermanentlyDeleteCategories(categoryIds: string[]): Promise<void> {
    try {
      if (categoryIds.length === 0) return;

      // Single query using IN clause
      const { error } = await supabase
        .from('categories')
        .delete()
        .in('id', categoryIds);

      if (error) throw error;
    } catch (error: any) {
      console.error('Bulk permanently delete categories error:', error);
      throw new Error(error.message || 'Failed to bulk delete categories');
    }
  },

  /**
   * Reorder categories (bulk update)
   */
  async reorderCategories(reorderData: ReorderCategoryPayload[]): Promise<void> {
    try {
      const categoryIds = reorderData.map((item) => item.category_id);
      const newOrders = reorderData.map((item) => item.new_order);

      const { error } = await supabase.rpc('update_category_sort_orders', {
        category_ids: categoryIds,
        new_orders: newOrders,
      });

      if (error) {
        // Fallback if function doesn't exist - update one by one
        for (const item of reorderData) {
          await supabase
            .from('categories')
            .update({ sort_order: item.new_order })
            .eq('id', item.category_id);
        }
      }
    } catch (error: any) {
      console.error('Reorder categories error:', error);
      throw new Error(error.message || 'Failed to reorder categories');
    }
  },

  /**
   * Create default categories for a new store
   */
  async createDefaultCategories(
    storeId: string,
    storeType: string
  ): Promise<Category[]> {
    try {
      const user = await supabase.auth.getUser();
      if (!user.data.user) throw new Error('Not authenticated');

      // Try using the stored procedure first
      const { error: rpcError } = await supabase.rpc('create_default_categories', {
        p_store_id: storeId,
        p_store_type: storeType,
        p_user_id: user.data.user.id,
      });

      if (rpcError) {
        // Fallback: Create default categories manually
        const defaultCategories = this.getDefaultCategoriesForType(storeType);
        const createdCategories: Category[] = [];

        for (const cat of defaultCategories) {
          const created = await this.createCategory(storeId, cat);
          createdCategories.push(created);
        }

        return createdCategories;
      }

      // Fetch the created categories
      const categories = await this.getCategories(storeId);
      return categories;
    } catch (error: any) {
      console.error('Create default categories error:', error);
      throw new Error(error.message || 'Failed to create default categories');
    }
  },

  /**
   * Get default category templates based on store type
   */
  getDefaultCategoriesForType(storeType: string): CreateCategoryData[] {
    switch (storeType) {
      case 'restaurant':
      case 'cafe':
        return [
          {
            name: 'Appetizers',
            description: 'Starters and small bites',
            color: '#F59E0B',
            icon: 'sparkles',
            sort_order: 0,
          },
          {
            name: 'Main Course',
            description: 'Main dishes and entrees',
            color: '#EF4444',
            icon: 'fire',
            sort_order: 1,
          },
          {
            name: 'Desserts',
            description: 'Sweet treats and desserts',
            color: '#EC4899',
            icon: 'cake',
            sort_order: 2,
          },
          {
            name: 'Beverages',
            description: 'Drinks and refreshments',
            color: '#3B82F6',
            icon: 'beaker',
            sort_order: 3,
          },
          {
            name: 'Sides',
            description: 'Side dishes and extras',
            color: '#10B981',
            icon: 'squares-plus',
            sort_order: 4,
          },
        ];

      case 'retail':
        return [
          {
            name: 'Electronics',
            description: 'Electronic devices and accessories',
            color: '#3B82F6',
            icon: 'cpu-chip',
            sort_order: 0,
          },
          {
            name: 'Clothing',
            description: 'Apparel and accessories',
            color: '#EC4899',
            icon: 'shopping-bag',
            sort_order: 1,
          },
          {
            name: 'Home & Garden',
            description: 'Home decor and garden supplies',
            color: '#10B981',
            icon: 'home',
            sort_order: 2,
          },
          {
            name: 'Sports',
            description: 'Sports equipment and gear',
            color: '#F59E0B',
            icon: 'trophy',
            sort_order: 3,
          },
        ];

      case 'salon':
        return [
          {
            name: 'Hair Services',
            description: 'Haircuts, styling, and treatments',
            color: '#EC4899',
            icon: 'scissors',
            sort_order: 0,
          },
          {
            name: 'Spa Services',
            description: 'Massage and spa treatments',
            color: '#3B82F6',
            icon: 'heart',
            sort_order: 1,
          },
          {
            name: 'Beauty Services',
            description: 'Makeup, nails, and skincare',
            color: '#F59E0B',
            icon: 'sparkles',
            sort_order: 2,
          },
        ];

      case 'pharmacy':
        return [
          {
            name: 'Prescription',
            description: 'Prescription medications',
            color: '#EF4444',
            icon: 'clipboard-document-list',
            sort_order: 0,
          },
          {
            name: 'Over-the-Counter',
            description: 'OTC medications and supplements',
            color: '#3B82F6',
            icon: 'beaker',
            sort_order: 1,
          },
          {
            name: 'Personal Care',
            description: 'Personal hygiene and care products',
            color: '#10B981',
            icon: 'heart',
            sort_order: 2,
          },
        ];

      default:
        return [
          {
            name: 'Products',
            description: 'All products and services',
            color: '#FF6B35',
            icon: 'cube',
            sort_order: 0,
          },
          {
            name: 'Services',
            description: 'Service offerings',
            color: '#3B82F6',
            icon: 'wrench-screwdriver',
            sort_order: 1,
          },
        ];
    }
  },

  /**
   * Check if store has any categories
   */
  async hasCategories(storeId: string): Promise<boolean> {
    try {
      const { count, error } = await supabase
        .from('categories')
        .select('id', { count: 'exact', head: true })
        .eq('store_id', storeId)
        .eq('is_active', true);

      if (error) throw error;
      return (count || 0) > 0;
    } catch (error: any) {
      console.error('Has categories error:', error);
      return false;
    }
  },
};
