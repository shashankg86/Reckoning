import React from 'react';
import { useTranslation } from 'react-i18next';
import { MagnifyingGlassIcon, FunnelIcon, XMarkIcon, CheckIcon } from '@heroicons/react/24/outline';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import type { Category } from '../../types/menu';
import type { CatalogFilters } from '../../hooks/useCatalogFilters';

interface FilterBarProps {
  filters: CatalogFilters;
  categories: Category[];
  maxPrice: number;
  onFilterChange: <K extends keyof CatalogFilters>(key: K, value: CatalogFilters[K]) => void;
  onReset: () => void;
}

export function FilterBar({ filters, categories, maxPrice, onFilterChange, onReset }: FilterBarProps) {
  const { t } = useTranslation();
  const [showAdvanced, setShowAdvanced] = React.useState(false);

  const hasActiveFilters =
    filters.search !== '' ||
    filters.priceRange.min !== 0 ||
    filters.priceRange.max !== maxPrice ||
    filters.categories.length > 0 ||
    filters.stockFilter !== 'all';

  return (
    <div className="space-y-4">
      {/* Search and Toggle */}
      <div className="flex gap-3">
        <div className="flex-1 relative">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
          <Input
            type="text"
            placeholder={t('catalog.searchCatalog')}
            value={filters.search}
            onChange={(e) => onFilterChange('search', e.target.value)}
            className="pl-10"
          />
        </div>

        <button
          onClick={() => setShowAdvanced(!showAdvanced)}
          className={`px-4 py-2 rounded-lg border flex items-center gap-2 transition-colors ${
            showAdvanced
              ? 'bg-orange-50 dark:bg-orange-900/20 border-orange-500 text-orange-600 dark:text-orange-400'
              : 'bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
          }`}
        >
          <FunnelIcon className="h-5 w-5" />
          <span className="hidden sm:inline">{t('catalog.filters')}</span>
          {hasActiveFilters && (
            <span className="w-2 h-2 bg-orange-500 rounded-full" />
          )}
        </button>

        {hasActiveFilters && (
          <button
            onClick={onReset}
            className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-2"
          >
            <XMarkIcon className="h-5 w-5" />
            <span className="hidden sm:inline">{t('catalog.clearFilters')}</span>
          </button>
        )}
      </div>

      {/* Advanced Filters */}
      {showAdvanced && (
        <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4 border border-gray-200 dark:border-gray-700 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Price Range */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {t('catalog.priceRange')}
              </label>
              <div className="space-y-2">
                <div className="flex gap-2">
                  <Input
                    type="number"
                    placeholder={t('catalog.min')}
                    value={filters.priceRange.min}
                    onChange={(e) => onFilterChange('priceRange', {
                      ...filters.priceRange,
                      min: parseFloat(e.target.value) || 0
                    })}
                    className="w-full"
                  />
                  <Input
                    type="number"
                    placeholder={t('catalog.max')}
                    value={filters.priceRange.max}
                    onChange={(e) => onFilterChange('priceRange', {
                      ...filters.priceRange,
                      max: parseFloat(e.target.value) || maxPrice
                    })}
                    className="w-full"
                  />
                </div>
                <input
                  type="range"
                  min="0"
                  max={maxPrice}
                  value={filters.priceRange.max}
                  onChange={(e) => onFilterChange('priceRange', {
                    ...filters.priceRange,
                    max: parseFloat(e.target.value)
                  })}
                  className="w-full accent-orange-500"
                />
              </div>
            </div>

            {/* Category Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {t('catalog.categories')}
              </label>
              <div className="space-y-2 max-h-32 overflow-y-auto border border-gray-300 dark:border-gray-600 rounded-lg p-2 bg-white dark:bg-gray-800">
                {categories.map(cat => (
                  <label
                    key={cat.id}
                    className="flex items-center gap-2 p-2 hover:bg-gray-50 dark:hover:bg-gray-700 rounded cursor-pointer transition-colors"
                  >
                    <input
                      type="checkbox"
                      checked={filters.categories.includes(cat.id)}
                      onChange={(e) => {
                        const newCategories = e.target.checked
                          ? [...filters.categories, cat.id]
                          : filters.categories.filter(id => id !== cat.id);
                        onFilterChange('categories', newCategories);
                      }}
                      className="w-4 h-4 text-orange-600 bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 rounded focus:ring-orange-500 focus:ring-2"
                    />
                    <div
                      className="w-3 h-3 rounded-full flex-shrink-0"
                      style={{ backgroundColor: cat.color }}
                    />
                    <span className="text-sm text-gray-900 dark:text-white flex-1">
                      {cat.name}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            {/* Stock Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {t('catalog.stockStatus.label')}
              </label>
              <select
                value={filters.stockFilter}
                onChange={(e) => onFilterChange('stockFilter', e.target.value as any)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-orange-500"
              >
                <option value="all">{t('catalog.allStock')}</option>
                <option value="in-stock">{t('catalog.stockStatus.inStock')}</option>
                <option value="low-stock">{t('catalog.stockStatus.lowStock')}</option>
                <option value="out-of-stock">{t('catalog.stockStatus.outOfStock')}</option>
              </select>
            </div>

            {/* Sort */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {t('catalog.sortBy')}
              </label>
              <div className="space-y-2">
                <select
                  value={filters.sortBy}
                  onChange={(e) => onFilterChange('sortBy', e.target.value as any)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-orange-500"
                >
                  <option value="name">{t('catalog.name')}</option>
                  <option value="price">{t('catalog.price')}</option>
                  <option value="stock">{t('catalog.stock')}</option>
                  <option value="created_at">{t('catalog.dateAdded')}</option>
                </select>
                <select
                  value={filters.sortOrder}
                  onChange={(e) => onFilterChange('sortOrder', e.target.value as any)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-orange-500"
                >
                  <option value="asc">{t('catalog.ascending')}</option>
                  <option value="desc">{t('catalog.descending')}</option>
                </select>
              </div>
            </div>
          </div>

          {/* Apply Filters Button */}
          <div className="flex justify-end pt-2">
            <Button
              onClick={() => setShowAdvanced(false)}
              className="flex items-center gap-2"
            >
              <CheckIcon className="h-4 w-4" />
              {t('catalog.applyFilters')}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
