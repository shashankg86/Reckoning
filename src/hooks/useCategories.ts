/**
 * useCategories Hook
 *
 * Custom React hook for managing categories with optimistic updates and caching.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import toast from 'react-hot-toast';
import { categoriesAPI } from '../api/categories';
import { useAuth } from '../contexts/AuthContext';
import type {
  Category,
  CategoryWithItems,
  CreateCategoryData,
  UpdateCategoryData,
  CategoryFilter,
  ReorderCategoryPayload,
} from '../types/menu';

interface UseCategoriesOptions {
  filter?: CategoryFilter;
  withCounts?: boolean;
  autoLoad?: boolean;
}

export function useCategories(options: UseCategoriesOptions = {}) {
  const { state: authState } = useAuth();
  const storeId = (authState.user as any)?.store?.id;

  const [categories, setCategories] = useState<Category[]>([]);
  const [categoriesWithCounts, setCategoriesWithCounts] = useState<CategoryWithItems[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Cache management
  const lastLoadRef = useRef<number>(0);
  const CACHE_MS = 30000; // 30 seconds

  /**
   * Load categories from API
   */
  const loadCategories = useCallback(async (force = false) => {
    if (!storeId) return;

    const now = Date.now();
    if (!force && now - lastLoadRef.current < CACHE_MS) {
      return; // Use cache
    }

    try {
      setLoading(true);
      setError(null);

      if (options.withCounts) {
        const data = await categoriesAPI.getCategoriesWithCounts(storeId);
        setCategoriesWithCounts(data);
        setCategories(data);
      } else {
        const data = await categoriesAPI.getCategories(storeId, options.filter);
        setCategories(data);
      }

      lastLoadRef.current = now;
    } catch (err: any) {
      console.error('Load categories error:', err);
      setError(err.message || 'Failed to load categories');
      toast.error('Failed to load categories');
    } finally {
      setLoading(false);
    }
  }, [storeId, options.filter, options.withCounts]);

  /**
   * Create a new category
   */
  const createCategory = useCallback(
    async (categoryData: CreateCategoryData): Promise<Category | null> => {
      if (!storeId) {
        toast.error('No store selected');
        return null;
      }

      try {
        setLoading(true);
        const newCategory = await categoriesAPI.createCategory(storeId, categoryData);

        // Optimistic update
        setCategories((prev) => [...prev, newCategory].sort((a, b) => a.sort_order - b.sort_order));

        toast.success(`Category "${newCategory.name}" created`);
        return newCategory;
      } catch (err: any) {
        console.error('Create category error:', err);
        toast.error(err.message || 'Failed to create category');
        return null;
      } finally {
        setLoading(false);
      }
    },
    [storeId]
  );

  /**
   * Update an existing category
   */
  const updateCategory = useCallback(
    async (categoryId: string, updates: UpdateCategoryData): Promise<Category | null> => {
      try {
        setLoading(true);
        const updatedCategory = await categoriesAPI.updateCategory(categoryId, updates);

        // Optimistic update
        setCategories((prev) =>
          prev.map((cat) => (cat.id === categoryId ? updatedCategory : cat))
        );

        toast.success('Category updated');
        return updatedCategory;
      } catch (err: any) {
        console.error('Update category error:', err);
        toast.error(err.message || 'Failed to update category');
        return null;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  /**
   * Delete a category
   */
  const deleteCategory = useCallback(async (categoryId: string): Promise<boolean> => {
    try {
      setLoading(true);
      await categoriesAPI.deleteCategory(categoryId);

      // Optimistic update
      setCategories((prev) => prev.filter((cat) => cat.id !== categoryId));

      toast.success('Category deleted');
      return true;
    } catch (err: any) {
      console.error('Delete category error:', err);
      toast.error(err.message || 'Failed to delete category');
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Reorder categories
   */
  const reorderCategories = useCallback(
    async (reorderData: ReorderCategoryPayload[]): Promise<boolean> => {
      try {
        // Optimistic update
        const reorderedCategories = [...categories];
        reorderData.forEach((item) => {
          const cat = reorderedCategories.find((c) => c.id === item.category_id);
          if (cat) {
            cat.sort_order = item.new_order;
          }
        });
        reorderedCategories.sort((a, b) => a.sort_order - b.sort_order);
        setCategories(reorderedCategories);

        await categoriesAPI.reorderCategories(reorderData);
        return true;
      } catch (err: any) {
        console.error('Reorder categories error:', err);
        toast.error(err.message || 'Failed to reorder categories');
        // Reload to revert
        await loadCategories(true);
        return false;
      }
    },
    [categories, loadCategories]
  );

  /**
   * Create default categories for store
   */
  const createDefaultCategories = useCallback(async (): Promise<boolean> => {
    if (!storeId || !authState.user?.store?.type) {
      toast.error('Store information missing');
      return false;
    }

    try {
      setLoading(true);
      const defaultCategories = await categoriesAPI.createDefaultCategories(
        storeId,
        authState.user.store.type
      );

      setCategories(defaultCategories);
      toast.success(`Created ${defaultCategories.length} default categories`);
      return true;
    } catch (err: any) {
      console.error('Create default categories error:', err);
      toast.error(err.message || 'Failed to create default categories');
      return false;
    } finally {
      setLoading(false);
    }
  }, [storeId, authState.user?.store?.type]);

  /**
   * Check if store has categories
   */
  const checkHasCategories = useCallback(async (): Promise<boolean> => {
    if (!storeId) return false;

    try {
      return await categoriesAPI.hasCategories(storeId);
    } catch (err: any) {
      console.error('Check has categories error:', err);
      return false;
    }
  }, [storeId]);

  /**
   * Auto-load categories on mount if autoLoad is true
   */
  useEffect(() => {
    if (options.autoLoad !== false && storeId) {
      loadCategories();
    }
  }, [loadCategories, storeId, options.autoLoad]);

  return {
    categories,
    categoriesWithCounts,
    loading,
    error,
    loadCategories,
    createCategory,
    updateCategory,
    deleteCategory,
    reorderCategories,
    createDefaultCategories,
    checkHasCategories,
  };
}
