import React from 'react';
import { useTranslation } from 'react-i18next';
import {
  PencilIcon,
  TrashIcon,
  ChevronLeftIcon,
  ChevronRightIcon
} from '@heroicons/react/24/outline';
import { Button } from '../ui/Button';
import type { Category } from '../../types/menu';
import { usePagination } from '../../hooks/usePagination';

interface CategoriesTableProps {
  categories: Category[];
  itemCounts: Record<string, number>;
  onEdit: (category: Category) => void;
  onDelete: (categoryId: string) => void;
  pageSize?: number;
}

export function CategoriesTable({
  categories,
  itemCounts,
  onEdit,
  onDelete,
  pageSize = 10
}: CategoriesTableProps) {
  const { t } = useTranslation();

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
  } = usePagination(categories, pageSize);

  return (
    <div className="space-y-4">
      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-gray-50 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600">
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-700 dark:text-gray-200">
                {t('catalog.icon')}
              </th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-700 dark:text-gray-200">
                {t('common.name')}
              </th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-700 dark:text-gray-200">
                {t('common.description')}
              </th>
              <th className="px-4 py-3 text-center text-sm font-medium text-gray-700 dark:text-gray-200">
                {t('catalog.itemCount')}
              </th>
              <th className="px-4 py-3 text-right text-sm font-medium text-gray-700 dark:text-gray-200">
                {t('common.actions')}
              </th>
            </tr>
          </thead>
          <tbody>
            {paginatedItems.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-gray-500 dark:text-gray-400">
                  {t('catalog.noCategories')}
                </td>
              </tr>
            ) : (
              paginatedItems.map((category) => (
                <tr
                  key={category.id}
                  className="border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                >
                  {/* Icon */}
                  <td className="px-4 py-3">
                    <div
                      className="w-10 h-10 rounded-lg flex items-center justify-center text-white"
                      style={{ backgroundColor: category.color }}
                    >
                      <span className="text-xl">{category.icon}</span>
                    </div>
                  </td>

                  {/* Name */}
                  <td className="px-4 py-3">
                    <div className="flex flex-col">
                      <span className="font-medium text-gray-900 dark:text-white">
                        {category.name}
                      </span>
                    </div>
                  </td>

                  {/* Description */}
                  <td className="px-4 py-3">
                    <span className="text-sm text-gray-600 dark:text-gray-300">
                      {category.description || '-'}
                    </span>
                  </td>

                  {/* Item Count */}
                  <td className="px-4 py-3 text-center">
                    <span className="inline-flex items-center justify-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300">
                      {itemCounts[category.id] || 0} {t('catalog.items')}
                    </span>
                  </td>

                  {/* Actions */}
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => onEdit(category)}
                        className="p-2 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                        title={t('common.edit')}
                      >
                        <PencilIcon className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => onDelete(category.id)}
                        className="p-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                        title={t('common.delete')}
                      >
                        <TrashIcon className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between px-4 py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg">
          {/* Results info */}
          <div className="text-sm text-gray-700 dark:text-gray-300">
            {t('catalog.showing')} <span className="font-medium">{startIndex}</span> {t('catalog.to')}{' '}
            <span className="font-medium">{endIndex}</span> {t('catalog.of')}{' '}
            <span className="font-medium">{totalItems}</span> {t('catalog.results')}
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
              <span className="hidden sm:inline">{t('catalog.previous')}</span>
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
              <span className="hidden sm:inline">{t('catalog.next')}</span>
              <ChevronRightIcon className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
