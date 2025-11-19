import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  PencilIcon,
  TrashIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  CubeIcon
} from '@heroicons/react/24/outline';
import { Button } from '../ui/Button';
import type { Item } from '../../types/menu';
import type { Category } from '../../types/menu';
import { usePagination } from '../../hooks/usePagination';

interface ItemsTableProps {
  items: Item[];
  categories: Category[];
  onEdit: (item: Item) => void;
  onDelete: (itemId: string) => void;
  onBulkDelete: (itemIds: string[]) => void;
  pageSize?: number;
}

export function ItemsTable({
  items,
  categories,
  onEdit,
  onDelete,
  onBulkDelete,
  pageSize = 10
}: ItemsTableProps) {
  const { t } = useTranslation();
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const {
    currentPage,
    totalPages,
    paginatedItems,
    goToPage,
    nextPage,
    prevPage,
    hasNext,
    hasPrev,
    startIndex,
    endIndex,
    totalItems
  } = usePagination(items, pageSize);

  // Clear selection when page changes
  useEffect(() => {
    setSelectedIds(new Set());
  }, [currentPage]);

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      const allIds = new Set(paginatedItems.map(item => item.id));
      setSelectedIds(allIds);
    } else {
      setSelectedIds(new Set());
    }
  };

  const handleSelectOne = (itemId: string, checked: boolean) => {
    const newSelected = new Set(selectedIds);
    if (checked) {
      newSelected.add(itemId);
    } else {
      newSelected.delete(itemId);
    }
    setSelectedIds(newSelected);
  };

  const handleBulkDelete = () => {
    if (selectedIds.size > 0) {
      onBulkDelete(Array.from(selectedIds));
      setSelectedIds(new Set());
    }
  };

  const allSelected = paginatedItems.length > 0 && paginatedItems.every(item => selectedIds.has(item.id));
  const someSelected = paginatedItems.some(item => selectedIds.has(item.id)) && !allSelected;

  // Helper to get category by ID
  const getCategoryById = (categoryId: string) => {
    return categories.find(cat => cat.id === categoryId);
  };

  // Helper to get stock status
  const getStockStatus = (stock?: number) => {
    const stockValue = stock || 0;
    if (stockValue === 0) return 'outOfStock';
    if (stockValue <= 5) return 'lowStock';
    return 'inStock';
  };

  // Helper to get stock badge color
  const getStockBadgeClass = (status: string) => {
    switch (status) {
      case 'inStock':
        return 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300';
      case 'lowStock':
        return 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300';
      case 'outOfStock':
        return 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300';
      default:
        return 'bg-gray-100 dark:bg-gray-900/30 text-gray-800 dark:text-gray-300';
    }
  };

  return (
    <div className="space-y-4">
      {/* Bulk Actions Bar */}
      {selectedIds.size > 0 && (
        <div className="flex items-center justify-between p-4 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg">
          <span className="text-sm font-medium text-orange-900 dark:text-orange-100">
            {selectedIds.size} {t('catalog.itemsSelected')}
          </span>
          <button
            onClick={handleBulkDelete}
            className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
          >
            <TrashIcon className="h-4 w-4" />
            {t('catalog.deleteSelected')}
          </button>
        </div>
      )}

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-gray-50 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600">
              <th className="px-4 py-3 w-12">
                <input
                  type="checkbox"
                  checked={allSelected}
                  ref={input => {
                    if (input) input.indeterminate = someSelected;
                  }}
                  onChange={(e) => handleSelectAll(e.target.checked)}
                  className="w-4 h-4 text-orange-600 bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 rounded focus:ring-orange-500 focus:ring-2"
                />
              </th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-700 dark:text-gray-200">
                {t('common.image')}
              </th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-700 dark:text-gray-200">
                {t('common.itemName')}
              </th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-700 dark:text-gray-200">
                {t('catalog.category')}
              </th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-700 dark:text-gray-200">
                {t('catalog.sku')}
              </th>
              <th className="px-4 py-3 text-right text-sm font-medium text-gray-700 dark:text-gray-200">
                {t('catalog.price')}
              </th>
              <th className="px-4 py-3 text-center text-sm font-medium text-gray-700 dark:text-gray-200">
                {t('catalog.stock')}
              </th>
              <th className="px-4 py-3 text-right text-sm font-medium text-gray-700 dark:text-gray-200">
                {t('common.actions')}
              </th>
            </tr>
          </thead>
          <tbody>
            {paginatedItems.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-gray-500 dark:text-gray-400">
                  {t('catalog.noItemsFound')}
                </td>
              </tr>
            ) : (
              paginatedItems.map((item) => {
                const category = getCategoryById(item.category_id);
                const stockStatus = getStockStatus(item.stock);

                return (
                  <tr
                    key={item.id}
                    className={`border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors ${
                      selectedIds.has(item.id) ? 'bg-orange-50/50 dark:bg-orange-900/10' : ''
                    }`}
                  >
                    {/* Checkbox */}
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        checked={selectedIds.has(item.id)}
                        onChange={(e) => handleSelectOne(item.id, e.target.checked)}
                        className="w-4 h-4 text-orange-600 bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 rounded focus:ring-orange-500 focus:ring-2"
                      />
                    </td>

                    {/* Image */}
                    <td className="px-4 py-3">
                      {item.image ? (
                        <div className="w-12 h-12 rounded-lg overflow-hidden">
                          <img
                            src={item.image}
                            alt={item.name}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      ) : (
                        <div
                          className="w-12 h-12 rounded-lg flex items-center justify-center"
                          style={{ backgroundColor: category?.color || '#6B7280' }}
                        >
                          <CubeIcon className="h-6 w-6 text-white" />
                        </div>
                      )}
                    </td>

                    {/* Name */}
                    <td className="px-4 py-3">
                      <div className="flex flex-col">
                        <span className="font-medium text-gray-900 dark:text-white">
                          {item.name}
                        </span>
                        {item.description && (
                          <span className="text-xs text-gray-500 dark:text-gray-400 line-clamp-1">
                            {item.description}
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Category */}
                    <td className="px-4 py-3">
                      {category ? (
                        <span
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium text-white"
                          style={{ backgroundColor: category.color }}
                        >
                          <span>{category.icon}</span>
                          <span>{category.name}</span>
                        </span>
                      ) : (
                        <span className="text-sm text-gray-500 dark:text-gray-400">-</span>
                      )}
                    </td>

                    {/* SKU */}
                    <td className="px-4 py-3">
                      <span className="text-sm text-gray-600 dark:text-gray-300">
                        {item.sku || '-'}
                      </span>
                    </td>

                    {/* Price */}
                    <td className="px-4 py-3 text-right">
                      <span className="font-medium text-gray-900 dark:text-white">
                        {t('common.currency')}
                        {parseFloat(item.price).toFixed(2)}
                      </span>
                    </td>

                    {/* Stock */}
                    <td className="px-4 py-3 text-center">
                      <div className="flex flex-col items-center gap-1">
                        <span
                          className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium ${getStockBadgeClass(
                            stockStatus
                          )}`}
                        >
                          {t(`catalog.stockStatus.${stockStatus}`)}
                        </span>
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          {item.stock || 0} {t('common.units')}
                        </span>
                      </div>
                    </td>

                    {/* Actions */}
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => onEdit(item)}
                          className="p-2 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                          title={t('common.edit')}
                        >
                          <PencilIcon className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => onDelete(item.id)}
                          className="p-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                          title={t('common.delete')}
                        >
                          <TrashIcon className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between px-4 py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg">
          {/* Results info */}
          <div className="text-sm text-gray-700 dark:text-gray-300">
            {t('common.showing')} <span className="font-medium">{startIndex}</span> {t('common.to')}{' '}
            <span className="font-medium">{endIndex}</span> {t('common.of')}{' '}
            <span className="font-medium">{totalItems}</span> {t('common.results')}
          </div>

          {/* Pagination controls */}
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={prevPage}
              disabled={!hasPrev}
              className="flex items-center gap-1"
            >
              <ChevronLeftIcon className="h-4 w-4" />
              <span className="hidden sm:inline">{t('common.previous')}</span>
            </Button>

            {/* Page numbers */}
            <div className="flex items-center gap-1">
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => {
                // Show first page, last page, current page, and pages around current
                const showPage =
                  page === 1 ||
                  page === totalPages ||
                  (page >= currentPage - 1 && page <= currentPage + 1);

                if (!showPage) {
                  // Show ellipsis
                  if (page === 2 || page === totalPages - 1) {
                    return (
                      <span
                        key={page}
                        className="px-2 text-gray-500 dark:text-gray-400"
                      >
                        ...
                      </span>
                    );
                  }
                  return null;
                }

                return (
                  <button
                    key={page}
                    onClick={() => goToPage(page)}
                    className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                      page === currentPage
                        ? 'bg-orange-500 text-white'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                    }`}
                  >
                    {page}
                  </button>
                );
              })}
            </div>

            <Button
              variant="secondary"
              size="sm"
              onClick={nextPage}
              disabled={!hasNext}
              className="flex items-center gap-1"
            >
              <span className="hidden sm:inline">{t('common.next')}</span>
              <ChevronRightIcon className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
