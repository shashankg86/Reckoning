import { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ChevronDownIcon,
  ChevronRightIcon,
  PencilIcon,
  TrashIcon,
  CubeIcon,
  PlusIcon
} from '@heroicons/react/24/outline';
import { Button } from '../ui/Button';
import { CachedImage } from '../ui/CachedImage';
import type { Category, Item } from '../../types/menu';
import { usePagination } from '../../hooks/usePagination';

interface FullMenuViewProps {
  categories: Category[];
  items: Item[];
  onEditCategory: (category: Category) => void;
  onDeleteCategory: (categoryId: string) => void;
  onEditItem: (item: Item) => void;
  onDeleteItem: (itemId: string) => void;
  onAddItemToCategory: (categoryId: string) => void;
  pageSize?: number;
}

export function FullMenuView({
  categories,
  items,
  onEditCategory,
  onDeleteCategory,
  onEditItem,
  onDeleteItem,
  onAddItemToCategory,
  pageSize = 10
}: FullMenuViewProps) {
  const { t } = useTranslation();
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());

  const {
    currentPage,
    totalPages,
    paginatedItems: paginatedCategories,
    goToPage,
    nextPage,
    prevPage,
    hasNext,
    hasPrev,
    startIndex,
    endIndex,
    totalItems
  } = usePagination(categories, pageSize);

  // Group items by category
  const itemsByCategory = useMemo(() => {
    const grouped: Record<string, Item[]> = {};
    items.forEach(item => {
      if (!grouped[item.category_id]) {
        grouped[item.category_id] = [];
      }
      grouped[item.category_id].push(item);
    });
    return grouped;
  }, [items]);

  const toggleCategory = (categoryId: string) => {
    setExpandedCategories(prev => {
      const newSet = new Set(prev);
      if (newSet.has(categoryId)) {
        newSet.delete(categoryId);
      } else {
        newSet.add(categoryId);
      }
      return newSet;
    });
  };

  const expandAll = () => {
    setExpandedCategories(new Set(paginatedCategories.map(cat => cat.id)));
  };

  const collapseAll = () => {
    setExpandedCategories(new Set());
  };

  const getStockStatus = (stock?: number) => {
    const stockValue = stock || 0;
    if (stockValue === 0) return 'outOfStock';
    if (stockValue <= 5) return 'lowStock';
    return 'inStock';
  };

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
      {/* Expand/Collapse Controls */}
      <div className="flex items-center gap-2">
        <Button variant="secondary" size="sm" onClick={expandAll}>
          {t('menuSetup.expandAll')}
        </Button>
        <Button variant="secondary" size="sm" onClick={collapseAll}>
          {t('menuSetup.collapseAll')}
        </Button>
      </div>

      {/* Accordion Table */}
      <div className="space-y-2">
        {paginatedCategories.length === 0 ? (
          <div className="p-8 text-center bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg">
            <p className="text-gray-500 dark:text-gray-400">{t('catalog.noCategories')}</p>
          </div>
        ) : (
          paginatedCategories.map((category) => {
            const categoryItems = itemsByCategory[category.id] || [];
            const isExpanded = expandedCategories.has(category.id);

            return (
              <div
                key={category.id}
                className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden"
              >
                {/* Category Header Row */}
                <div className="flex items-center justify-between p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                  {/* Left: Category Info */}
                  <div className="flex items-center gap-4 flex-1">
                    {/* Expand/Collapse Button */}
                    <button
                      onClick={() => toggleCategory(category.id)}
                      className="p-1 hover:bg-gray-200 dark:hover:bg-gray-600 rounded transition-colors"
                    >
                      {isExpanded ? (
                        <ChevronDownIcon className="h-5 w-5 text-gray-600 dark:text-gray-300" />
                      ) : (
                        <ChevronRightIcon className="h-5 w-5 text-gray-600 dark:text-gray-300" />
                      )}
                    </button>

                    {/* Category Icon/Image */}
                    <div className="w-10 h-10 rounded-lg flex-shrink-0 overflow-hidden">
                      {category.image_url ? (
                        <CachedImage
                          cacheId={category.id}
                          fallbackUrl={category.image_url}
                          alt={category.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div
                          className="w-full h-full flex items-center justify-center text-white"
                          style={{ backgroundColor: category.color }}
                        >
                          <span className="text-xl">{category.icon}</span>
                        </div>
                      )}
                    </div>

                    {/* Category Name & Description */}
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-gray-900 dark:text-white">
                        {category.name}
                      </h3>
                      {category.description && (
                        <p className="text-sm text-gray-600 dark:text-gray-400 truncate">
                          {category.description}
                        </p>
                      )}
                    </div>

                    {/* Item Count Badge */}
                    <span className="px-3 py-1 rounded-full text-sm font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300">
                      {categoryItems.length} {t('catalog.items')}
                    </span>
                  </div>

                  {/* Right: Actions */}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => onAddItemToCategory(category.id)}
                      className="p-2 text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-lg transition-colors"
                      title={t('catalog.addItem')}
                    >
                      <PlusIcon className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => onEditCategory(category)}
                      className="p-2 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                      title={t('common.edit')}
                    >
                      <PencilIcon className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => onDeleteCategory(category.id)}
                      className="p-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                      title={t('common.delete')}
                    >
                      <TrashIcon className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                {/* Expanded Items Table */}
                {isExpanded && (
                  <div className="border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/20">
                    {categoryItems.length === 0 ? (
                      <div className="p-6 text-center">
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          {t('menuSetup.noItemsInCategory')}
                        </p>
                        <Button
                          size="sm"
                          onClick={() => onAddItemToCategory(category.id)}
                          className="mt-3"
                        >
                          <PlusIcon className="h-4 w-4 mr-1" />
                          {t('catalog.addItem')}
                        </Button>
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full">
                          <thead>
                            <tr className="bg-gray-100 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
                              <th className="px-4 py-2 text-left text-xs font-medium text-gray-600 dark:text-gray-300">
                                {t('common.image')}
                              </th>
                              <th className="px-4 py-2 text-left text-xs font-medium text-gray-600 dark:text-gray-300">
                                {t('common.itemName')}
                              </th>
                              <th className="px-4 py-2 text-left text-xs font-medium text-gray-600 dark:text-gray-300">
                                {t('catalog.sku')}
                              </th>
                              <th className="px-4 py-2 text-right text-xs font-medium text-gray-600 dark:text-gray-300">
                                {t('catalog.price')}
                              </th>
                              <th className="px-4 py-2 text-center text-xs font-medium text-gray-600 dark:text-gray-300">
                                {t('catalog.stock')}
                              </th>
                              <th className="px-4 py-2 text-right text-xs font-medium text-gray-600 dark:text-gray-300">
                                {t('common.actions')}
                              </th>
                            </tr>
                          </thead>
                          <tbody>
                            {categoryItems.map((item) => {
                              const stockStatus = getStockStatus(item.stock);

                              return (
                                <tr
                                  key={item.id}
                                  className="border-b border-gray-200 dark:border-gray-700 hover:bg-white dark:hover:bg-gray-800 transition-colors"
                                >
                                  {/* Image */}
                                  <td className="px-4 py-3">
                                    <div className="w-10 h-10 rounded-lg overflow-hidden">
                                      {item.image_url ? (
                                        <CachedImage
                                          cacheId={item.id}
                                          fallbackUrl={item.image_url}
                                          alt={item.name}
                                          className="w-full h-full object-cover"
                                        />
                                      ) : (
                                        <div
                                          className="w-full h-full flex items-center justify-center"
                                          style={{ backgroundColor: category.color }}
                                        >
                                          <CubeIcon className="h-5 w-5 text-white" />
                                        </div>
                                      )}
                                    </div>
                                  </td>

                                  {/* Name */}
                                  <td className="px-4 py-3">
                                    <div className="flex flex-col">
                                      <span className="text-sm font-medium text-gray-900 dark:text-white">
                                        {item.name}
                                      </span>
                                      {item.description && (
                                        <span className="text-xs text-gray-500 dark:text-gray-400 line-clamp-1">
                                          {item.description}
                                        </span>
                                      )}
                                    </div>
                                  </td>

                                  {/* SKU */}
                                  <td className="px-4 py-3">
                                    <span className="text-sm text-gray-600 dark:text-gray-300">
                                      {item.sku || '-'}
                                    </span>
                                  </td>

                                  {/* Price */}
                                  <td className="px-4 py-3 text-right">
                                    <span className="text-sm font-medium text-gray-900 dark:text-white">
                                      {t('common.currency')}
                                      {parseFloat(item.price).toFixed(2)}
                                    </span>
                                  </td>

                                  {/* Stock */}
                                  <td className="px-4 py-3 text-center">
                                    <div className="flex flex-col items-center gap-1">
                                      <span
                                        className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${getStockBadgeClass(
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
                                        onClick={() => onEditItem(item)}
                                        className="p-1.5 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded transition-colors"
                                        title={t('common.edit')}
                                      >
                                        <PencilIcon className="h-3.5 w-3.5" />
                                      </button>
                                      <button
                                        onClick={() => onDeleteItem(item.id)}
                                        className="p-1.5 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
                                        title={t('common.delete')}
                                      >
                                        <TrashIcon className="h-3.5 w-3.5" />
                                      </button>
                                    </div>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between px-4 py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg">
          <div className="text-sm text-gray-700 dark:text-gray-300">
            {t('catalog.showing')} <span className="font-medium">{startIndex}</span> {t('common.to')}{' '}
            <span className="font-medium">{endIndex}</span> {t('common.of')}{' '}
            <span className="font-medium">{totalItems}</span> {t('catalog.categories')}
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={prevPage}
              disabled={!hasPrev}
            >
              {t('catalog.previous')}
            </Button>

            {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => {
              const showPage =
                page === 1 ||
                page === totalPages ||
                (page >= currentPage - 1 && page <= currentPage + 1);

              if (!showPage) {
                if (page === 2 || page === totalPages - 1) {
                  return (
                    <span key={page} className="px-2 text-gray-500 dark:text-gray-400">
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
                  className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${page === currentPage
                    ? 'bg-orange-500 text-white'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                    }`}
                >
                  {page}
                </button>
              );
            })}

            <Button
              variant="secondary"
              size="sm"
              onClick={nextPage}
              disabled={!hasNext}
            >
              {t('catalog.next')}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
