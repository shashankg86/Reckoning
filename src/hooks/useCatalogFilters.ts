import { useState, useMemo, useCallback } from 'react';
import type { Category } from '../types/menu';

export interface CatalogFilters {
  search: string;
  priceRange: {
    min: number;
    max: number;
  };
  categories: string[];
  stockFilter: 'all' | 'in-stock' | 'low-stock' | 'out-of-stock';
  sortBy: 'name' | 'price' | 'stock' | 'created_at';
  sortOrder: 'asc' | 'desc';
}

const initialFilters: CatalogFilters = {
  search: '',
  priceRange: { min: 0, max: 100000 },
  categories: [],
  stockFilter: 'all',
  sortBy: 'name',
  sortOrder: 'asc'
};

export function useCatalogFilters() {
  const [filters, setFilters] = useState<CatalogFilters>(initialFilters);

  const updateFilter = useCallback(<K extends keyof CatalogFilters>(
    key: K,
    value: CatalogFilters[K]
  ) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  }, []);

  const resetFilters = useCallback(() => {
    setFilters(initialFilters);
  }, []);

  const filterCategories = useCallback((categories: Category[]) => {
    let filtered = [...categories];

    // Search filter
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      filtered = filtered.filter(cat =>
        cat.name.toLowerCase().includes(searchLower) ||
        cat.description?.toLowerCase().includes(searchLower)
      );
    }

    // Sort
    filtered.sort((a, b) => {
      let comparison = 0;

      switch (filters.sortBy) {
        case 'name':
          comparison = a.name.localeCompare(b.name);
          break;
        case 'created_at':
          comparison = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
          break;
        default:
          comparison = 0;
      }

      return filters.sortOrder === 'asc' ? comparison : -comparison;
    });

    return filtered;
  }, [filters]);

  const filterItems = useCallback((items: any[]) => {
    let filtered = [...items];

    // Search filter
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      filtered = filtered.filter(item =>
        item.name.toLowerCase().includes(searchLower) ||
        item.sku?.toLowerCase().includes(searchLower) ||
        item.category?.toLowerCase().includes(searchLower) ||
        item.description?.toLowerCase().includes(searchLower)
      );
    }

    // Price range filter
    filtered = filtered.filter(item => {
      const price = parseFloat(item.price);
      return price >= filters.priceRange.min && price <= filters.priceRange.max;
    });

    // Category filter
    if (filters.categories.length > 0) {
      filtered = filtered.filter(item =>
        filters.categories.includes(item.category_id)
      );
    }

    // Stock filter
    if (filters.stockFilter !== 'all') {
      filtered = filtered.filter(item => {
        const stock = item.stock || 0;
        switch (filters.stockFilter) {
          case 'in-stock':
            return stock > 5;
          case 'low-stock':
            return stock > 0 && stock <= 5;
          case 'out-of-stock':
            return stock === 0;
          default:
            return true;
        }
      });
    }

    // Sort
    filtered.sort((a, b) => {
      let comparison = 0;

      switch (filters.sortBy) {
        case 'name':
          comparison = a.name.localeCompare(b.name);
          break;
        case 'price':
          comparison = parseFloat(a.price) - parseFloat(b.price);
          break;
        case 'stock':
          comparison = (a.stock || 0) - (b.stock || 0);
          break;
        case 'created_at':
          comparison = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
          break;
        default:
          comparison = 0;
      }

      return filters.sortOrder === 'asc' ? comparison : -comparison;
    });

    return filtered;
  }, [filters]);

  // Get max price from items for price range slider
  const getMaxPrice = useCallback((items: any[]): number => {
    if (items.length === 0) return 10000;
    return Math.max(...items.map(item => parseFloat(item.price) || 0), 1000);
  }, []);

  return {
    filters,
    updateFilter,
    resetFilters,
    filterCategories,
    filterItems,
    getMaxPrice
  };
}
