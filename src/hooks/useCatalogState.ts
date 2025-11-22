import { useState, useEffect, useCallback } from 'react';
import { categoriesAPI } from '../api/categories';
import { itemsAPI } from '../api/items';
import type { Category, CreateCategoryData, UpdateCategoryData } from '../types/menu';
import type { Item } from '../contexts/POSContext';

const STORAGE_KEY = 'catalog_pending_changes';

interface PendingChanges {
  categories: {
    toAdd: CreateCategoryData[];
    toUpdate: (UpdateCategoryData & { id: string })[];
    toDelete: string[];
  };
  items: {
    toAdd: Partial<Item>[];
    toUpdate: Partial<Item>[];
    toDelete: string[];
  };
}

const initialPendingChanges: PendingChanges = {
  categories: { toAdd: [], toUpdate: [], toDelete: [] },
  items: { toAdd: [], toUpdate: [], toDelete: [] }
};

export function useCatalogState(storeId: string, dbCategories: Category[] = [], dbItems: any[] = []) {
  const [pendingChanges, setPendingChanges] = useState<PendingChanges>(initialPendingChanges);
  const [isSaving, setIsSaving] = useState(false);

  // Load from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setPendingChanges(parsed);
      } catch (e) {
        console.error('Failed to parse saved changes:', e);
      }
    }
  }, []);

  // Save to localStorage on changes
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(pendingChanges));
  }, [pendingChanges]);

  // Auto-save on page unload
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges()) {
        e.preventDefault();
        e.returnValue = '';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [pendingChanges]);

  // Check if there are unsaved changes
  const hasUnsavedChanges = useCallback(() => {
    return (
      pendingChanges.categories.toAdd.length > 0 ||
      pendingChanges.categories.toUpdate.length > 0 ||
      pendingChanges.categories.toDelete.length > 0 ||
      pendingChanges.items.toAdd.length > 0 ||
      pendingChanges.items.toUpdate.length > 0 ||
      pendingChanges.items.toDelete.length > 0
    );
  }, [pendingChanges]);

  // Get merged data (DB + pending changes)
  const getMergedCategories = useCallback((): Category[] => {
    // Start with DB categories
    let merged = [...dbCategories];

    // Remove deleted
    merged = merged.filter(cat => !pendingChanges.categories.toDelete.includes(cat.id));

    // Apply updates
    merged = merged.map(cat => {
      const update = pendingChanges.categories.toUpdate.find(u => u.id === cat.id);
      return update ? { ...cat, ...update } : cat;
    });

    // Add new (with temporary IDs)
    const newCategories = pendingChanges.categories.toAdd.map((cat, index) => ({
      ...cat,
      id: `temp-${index}`,
      store_id: storeId,
      sort_order: merged.length + index,
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      created_by: '',
      parent_id: null,
      metadata: {}
    } as Category));

    return [...merged, ...newCategories];
  }, [dbCategories, pendingChanges.categories, storeId]);

  const getMergedItems = useCallback((): any[] => {
    let merged = [...dbItems];

    // Remove deleted
    merged = merged.filter(item => !pendingChanges.items.toDelete.includes(item.id));

    // Apply updates
    merged = merged.map(item => {
      const update = pendingChanges.items.toUpdate.find(u => u.id === item.id);
      return update ? { ...item, ...update } : item;
    });

    // Add new (with temporary IDs)
    const newItems = pendingChanges.items.toAdd.map((item, index) => ({
      ...item,
      id: `temp-item-${index}`,
      is_active: true,
      created_at: new Date().toISOString()
    }));

    return [...merged, ...newItems];
  }, [dbItems, pendingChanges.items]);

  // Category operations
  const addCategory = useCallback((category: CreateCategoryData) => {
    setPendingChanges(prev => ({
      ...prev,
      categories: {
        ...prev.categories,
        toAdd: [...prev.categories.toAdd, category]
      }
    }));
  }, []);

  const updateCategory = useCallback((category: UpdateCategoryData & { id: string }) => {
    setPendingChanges(prev => {
      // If it's a new category, update in toAdd
      const addIndex = prev.categories.toAdd.findIndex((_, i) => `temp-${i}` === category.id);
      if (addIndex !== -1) {
        const newToAdd = [...prev.categories.toAdd];
        newToAdd[addIndex] = {
          ...newToAdd[addIndex],
          ...category,
          description: category.description ?? undefined
        };
        return {
          ...prev,
          categories: { ...prev.categories, toAdd: newToAdd }
        };
      }

      // Otherwise, add to toUpdate
      const updateIndex = prev.categories.toUpdate.findIndex(u => u.id === category.id);
      const newToUpdate = [...prev.categories.toUpdate];

      if (updateIndex !== -1) {
        newToUpdate[updateIndex] = category;
      } else {
        newToUpdate.push(category);
      }

      return {
        ...prev,
        categories: { ...prev.categories, toUpdate: newToUpdate }
      };
    });
  }, []);

  const deleteCategory = useCallback((categoryId: string) => {
    setPendingChanges(prev => {
      // If it's a new category, remove from toAdd
      if (categoryId.startsWith('temp-')) {
        const index = parseInt(categoryId.replace('temp-', ''));
        const newToAdd = prev.categories.toAdd.filter((_, i) => i !== index);
        return {
          ...prev,
          categories: { ...prev.categories, toAdd: newToAdd }
        };
      }

      // Otherwise, add to toDelete
      return {
        ...prev,
        categories: {
          ...prev.categories,
          toDelete: [...prev.categories.toDelete, categoryId]
        }
      };
    });
  }, []);

  // Item operations
  const addItem = useCallback((item: Partial<Item>) => {
    setPendingChanges(prev => ({
      ...prev,
      items: {
        ...prev.items,
        toAdd: [...prev.items.toAdd, item]
      }
    }));
  }, []);

  const updateItem = useCallback((item: Partial<Item>) => {
    setPendingChanges(prev => {
      // If it's a new item, update in toAdd
      const addIndex = prev.items.toAdd.findIndex((_, i) => `temp-item-${i}` === item.id);
      if (addIndex !== -1) {
        const newToAdd = [...prev.items.toAdd];
        newToAdd[addIndex] = { ...newToAdd[addIndex], ...item };
        return {
          ...prev,
          items: { ...prev.items, toAdd: newToAdd }
        };
      }

      // Otherwise, add to toUpdate
      const updateIndex = prev.items.toUpdate.findIndex(u => u.id === item.id);
      const newToUpdate = [...prev.items.toUpdate];

      if (updateIndex !== -1) {
        newToUpdate[updateIndex] = { ...newToUpdate[updateIndex], ...item };
      } else {
        newToUpdate.push(item);
      }

      return {
        ...prev,
        items: { ...prev.items, toUpdate: newToUpdate }
      };
    });
  }, []);

  const deleteItem = useCallback((itemId: string) => {
    setPendingChanges(prev => {
      // If it's a new item, remove from toAdd
      if (itemId.startsWith('temp-item-')) {
        const index = parseInt(itemId.replace('temp-item-', ''));
        const newToAdd = prev.items.toAdd.filter((_, i) => i !== index);
        return {
          ...prev,
          items: { ...prev.items, toAdd: newToAdd }
        };
      }

      // Otherwise, add to toDelete
      return {
        ...prev,
        items: {
          ...prev.items,
          toDelete: [...prev.items.toDelete, itemId]
        }
      };
    });
  }, []);

  // Bulk operations
  const bulkAddCategories = useCallback((categories: CreateCategoryData[]) => {
    setPendingChanges(prev => ({
      ...prev,
      categories: {
        ...prev.categories,
        toAdd: [...prev.categories.toAdd, ...categories]
      }
    }));
  }, []);

  const bulkAddItems = useCallback((items: Partial<Item>[]) => {
    setPendingChanges(prev => ({
      ...prev,
      items: {
        ...prev.items,
        toAdd: [...prev.items.toAdd, ...items]
      }
    }));
  }, []);

  // Save all changes to database
  const saveAll = useCallback(async () => {
    setIsSaving(true);
    try {
      // Delete categories first
      if (pendingChanges.categories.toDelete.length > 0) {
        await Promise.all(
          pendingChanges.categories.toDelete.map(id => categoriesAPI.deleteCategory(id))
        );
      }

      // Create categories
      if (pendingChanges.categories.toAdd.length > 0) {
        await Promise.all(
          pendingChanges.categories.toAdd.map(cat => categoriesAPI.createCategory(storeId, cat))
        );
      }

      // Update categories
      if (pendingChanges.categories.toUpdate.length > 0) {
        await Promise.all(
          pendingChanges.categories.toUpdate.map(({ id, ...updates }) =>
            categoriesAPI.updateCategory(id, updates)
          )
        );
      }

      // Delete items
      if (pendingChanges.items.toDelete.length > 0) {
        await itemsAPI.bulkDeleteItems(pendingChanges.items.toDelete);
      }

      // Create items
      if (pendingChanges.items.toAdd.length > 0) {
        const itemsToCreate = pendingChanges.items.toAdd.map(item => ({
          name: item.name!,
          price: parseFloat(item.price as any) || 0,
          category: item.category || 'Uncategorized',
          category_id: (item as any).category_id,
          sku: item.sku,
          stock: item.stock || 0,
          image_url: (item as any).image_url,
          description: (item as any).description
        }));
        await itemsAPI.bulkCreateItems(storeId, itemsToCreate);
      }

      // Update items
      if (pendingChanges.items.toUpdate.length > 0) {
        const updates = pendingChanges.items.toUpdate.map(item => ({
          id: item.id!,
          name: item.name,
          price: item.price ? parseFloat(item.price as any) : undefined,
          category: item.category,
          category_id: (item as any).category_id,
          sku: item.sku,
          stock: item.stock,
          image_url: (item as any).image_url,
          description: (item as any).description
        }));
        await itemsAPI.bulkUpdateItems(updates);
      }

      // Clear pending changes
      setPendingChanges(initialPendingChanges);
      localStorage.removeItem(STORAGE_KEY);

      return true;
    } catch (error) {
      console.error('Failed to save changes:', error);
      throw error;
    } finally {
      setIsSaving(false);
    }
  }, [storeId, pendingChanges]);

  // Discard all changes
  const discardAll = useCallback(() => {
    setPendingChanges(initialPendingChanges);
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  // Calculate item counts per category
  const getItemCounts = useCallback((): Record<string, number> => {
    const items = getMergedItems();
    const counts: Record<string, number> = {};

    items.forEach(item => {
      const categoryId = item.category_id;
      if (categoryId) {
        counts[categoryId] = (counts[categoryId] || 0) + 1;
      }
    });

    return counts;
  }, [getMergedItems]);

  return {
    // Data
    categories: getMergedCategories(),
    items: getMergedItems(),
    itemCounts: getItemCounts(),
    loading: isSaving,

    // State
    hasUnsavedChanges: hasUnsavedChanges(),
    pendingChanges,

    // Operations
    addCategory,
    updateCategory,
    deleteCategory,
    addItem,
    updateItem,
    deleteItem,
    bulkAddCategories,
    bulkAddItems,

    // Actions
    saveAll,
    discardAll
  };
}
