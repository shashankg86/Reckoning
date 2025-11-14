/**
 * useItems Hook
 *
 * Custom React hook for managing items with optimistic updates and caching.
 * Supports dynamic metadata fields for custom store-specific attributes.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import toast from 'react-hot-toast';
import { itemsAPI, type ItemData, type ItemFilter } from '../api/items';
import { useAuth } from '../contexts/AuthContext';
import type { Item } from '../types/index';

interface UseItemsOptions {
  filter?: ItemFilter;
  autoLoad?: boolean;
}

export function useItems(options: UseItemsOptions = {}) {
  const { state: authState } = useAuth();
  const storeId = (authState.user as any)?.store?.id;

  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Cache management
  const lastLoadRef = useRef<number>(0);
  const CACHE_MS = 30000; // 30 seconds

  /**
   * Load items from API
   */
  const loadItems = useCallback(
    async (force = false) => {
      if (!storeId) return;

      const now = Date.now();
      if (!force && now - lastLoadRef.current < CACHE_MS) {
        return; // Use cache
      }

      try {
        setLoading(true);
        setError(null);

        const data = await itemsAPI.getItems(storeId, options.filter);
        setItems(data);

        lastLoadRef.current = now;
      } catch (err: any) {
        console.error('Load items error:', err);
        setError(err.message || 'Failed to load items');
        toast.error('Failed to load items');
      } finally {
        setLoading(false);
      }
    },
    [storeId, options.filter]
  );

  /**
   * Create a new item
   */
  const createItem = useCallback(
    async (itemData: ItemData): Promise<any | null> => {
      if (!storeId) {
        toast.error('No store selected');
        return null;
      }

      try {
        setLoading(true);
        const newItem = await itemsAPI.createItem(storeId, itemData);

        // Optimistic update
        setItems((prev) => [...prev, newItem]);

        toast.success(`Item "${itemData.name}" created`);
        return newItem;
      } catch (err: any) {
        console.error('Create item error:', err);
        toast.error(err.message || 'Failed to create item');
        return null;
      } finally {
        setLoading(false);
      }
    },
    [storeId]
  );

  /**
   * Update an existing item
   */
  const updateItem = useCallback(
    async (itemId: string, updates: Partial<ItemData>): Promise<any | null> => {
      try {
        setLoading(true);
        const updatedItem = await itemsAPI.updateItem(itemId, updates);

        // Optimistic update
        setItems((prev) => prev.map((item) => (item.id === itemId ? updatedItem : item)));

        toast.success('Item updated');
        return updatedItem;
      } catch (err: any) {
        console.error('Update item error:', err);
        toast.error(err.message || 'Failed to update item');
        return null;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  /**
   * Delete an item (soft delete)
   */
  const deleteItem = useCallback(async (itemId: string): Promise<boolean> => {
    try {
      setLoading(true);
      await itemsAPI.deleteItem(itemId);

      // Optimistic update
      setItems((prev) => prev.filter((item) => item.id !== itemId));

      toast.success('Item deleted');
      return true;
    } catch (err: any) {
      console.error('Delete item error:', err);
      toast.error(err.message || 'Failed to delete item');
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Bulk create items
   */
  const bulkCreateItems = useCallback(
    async (itemsData: ItemData[]): Promise<any[] | null> => {
      if (!storeId) {
        toast.error('No store selected');
        return null;
      }

      try {
        setLoading(true);
        const newItems = await itemsAPI.bulkCreateItems(storeId, itemsData);

        // Optimistic update
        setItems((prev) => [...prev, ...newItems]);

        toast.success(`Created ${newItems.length} items`);
        return newItems;
      } catch (err: any) {
        console.error('Bulk create items error:', err);
        toast.error(err.message || 'Failed to bulk create items');
        return null;
      } finally {
        setLoading(false);
      }
    },
    [storeId]
  );

  /**
   * Search items
   */
  const searchItems = useCallback(
    async (query: string): Promise<any[]> => {
      if (!storeId) return [];

      try {
        const data = await itemsAPI.searchItems(storeId, query);
        return data;
      } catch (err: any) {
        console.error('Search items error:', err);
        toast.error(err.message || 'Failed to search items');
        return [];
      }
    },
    [storeId]
  );

  /**
   * Get items count
   */
  const getItemsCount = useCallback(
    async (filter?: ItemFilter): Promise<number> => {
      if (!storeId) return 0;

      try {
        return await itemsAPI.getItemsCount(storeId, filter);
      } catch (err: any) {
        console.error('Get items count error:', err);
        return 0;
      }
    },
    [storeId]
  );

  /**
   * Auto-load items on mount if autoLoad is true
   */
  useEffect(() => {
    if (options.autoLoad !== false && storeId) {
      loadItems();
    }
  }, [loadItems, storeId, options.autoLoad]);

  return {
    items,
    loading,
    error,
    loadItems,
    createItem,
    updateItem,
    deleteItem,
    bulkCreateItems,
    searchItems,
    getItemsCount,
  };
}
