/**
 * ItemsSetupStep Component
 *
 * Second step in menu setup wizard - add items to categories
 * Features: search, multi-select, bulk operations, category filtering
 */

import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  PlusIcon,
  MagnifyingGlassIcon,
  RectangleStackIcon,
  TrashIcon,
  PencilIcon,
} from '@heroicons/react/24/outline';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { useItems } from '../../hooks/useItems';
import { useCategories } from '../../hooks/useCategories';
import { ItemFormModal } from './components/ItemFormModal';
import { ItemBulkCreateModal } from './components/ItemBulkCreateModal';
import type { ItemData } from '../../api/items';

interface ItemsSetupStepProps {
  onComplete: () => void;
}

export function ItemsSetupStep({ onComplete }: ItemsSetupStepProps) {
  const { t } = useTranslation();

  const { items, loading, createItem, updateItem, deleteItem, bulkCreateItems, loadItems } =
    useItems({ autoLoad: true });

  const { categories } = useCategories({ autoLoad: true, filter: { is_active: true } });

  const [showItemForm, setShowItemForm] = useState(false);
  const [showBulkCreate, setShowBulkCreate] = useState(false);
  const [editingItem, setEditingItem] = useState<any | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>('');
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [deleteConfirm, setDeleteConfirm] = useState<{ isOpen: boolean; item?: any }>({
    isOpen: false,
  });
  const [bulkDeleteConfirm, setBulkDeleteConfirm] = useState(false);

  // Reload items when switching category filter
  useEffect(() => {
    loadItems();
  }, [selectedCategoryFilter]);

  // Filter items by search and category
  const filteredItems = items.filter((item) => {
    const matchesSearch =
      !searchQuery ||
      (item.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.description || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.sku || '').toLowerCase().includes(searchQuery.toLowerCase());

    const matchesCategory =
      !selectedCategoryFilter || item.category_id === selectedCategoryFilter;

    return matchesSearch && matchesCategory;
  });

  // Group items by category for better display
  const itemsByCategory = filteredItems.reduce((acc, item) => {
    const catId = item.category_id || 'uncategorized';
    if (!acc[catId]) {
      acc[catId] = [];
    }
    acc[catId].push(item);
    return acc;
  }, {} as Record<string, any[]>);

  const toggleItemSelection = (itemId: string) => {
    const newSelection = new Set(selectedItems);
    if (newSelection.has(itemId)) {
      newSelection.delete(itemId);
    } else {
      newSelection.add(itemId);
    }
    setSelectedItems(newSelection);
  };

  const toggleSelectAll = () => {
    if (selectedItems.size === filteredItems.length) {
      setSelectedItems(new Set());
    } else {
      setSelectedItems(new Set(filteredItems.map((item) => item.id)));
    }
  };

  const handleCreateItem = async (itemData: ItemData) => {
    const newItem = await createItem(itemData);
    if (newItem) {
      setShowItemForm(false);
      setEditingItem(null);
    }
  };

  const handleUpdateItem = async (itemData: ItemData) => {
    if (!editingItem) return;
    const updated = await updateItem(editingItem.id, itemData);
    if (updated) {
      setShowItemForm(false);
      setEditingItem(null);
    }
  };

  const handleDeleteItem = async (item: any) => {
    await deleteItem(item.id);
    setDeleteConfirm({ isOpen: false });
  };

  const handleBulkDelete = async () => {
    for (const itemId of selectedItems) {
      await deleteItem(itemId);
    }
    setSelectedItems(new Set());
    setBulkDeleteConfirm(false);
  };

  const handleBulkCreate = async (itemsData: ItemData[]) => {
    const newItems = await bulkCreateItems(itemsData);
    if (newItems) {
      setShowBulkCreate(false);
    }
  };

  const getCategoryName = (categoryId: string | null | undefined) => {
    if (!categoryId) return 'Uncategorized';
    const category = categories.find((c) => c.id === categoryId);
    return category?.name || 'Unknown Category';
  };

  const getCategoryColor = (categoryId: string | null | undefined) => {
    if (!categoryId) return '#6B7280';
    const category = categories.find((c) => c.id === categoryId);
    return category?.color || '#6B7280';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Add Menu Items</h2>
        <p className="mt-2 text-gray-600 dark:text-gray-400">
          Add items to your categories. You can always add more items later from the Catalog
          screen.
        </p>
      </div>

      {/* Action Bar */}
      <Card className="p-4">
        <div className="flex flex-col gap-4">
          {/* Search and Filter Row */}
          <div className="flex flex-col sm:flex-row gap-4">
            {/* Search */}
            <div className="flex-1">
              <div className="relative">
                <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <Input
                  type="text"
                  placeholder="Search items..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            {/* Category Filter */}
            <div className="sm:w-64">
              <select
                value={selectedCategoryFilter}
                onChange={(e) => setSelectedCategoryFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
              >
                <option value="">All Categories</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Actions Row */}
          <div className="flex flex-wrap items-center gap-3">
            {selectedItems.size > 0 && (
              <>
                <label className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                  <input
                    type="checkbox"
                    checked={selectedItems.size === filteredItems.length && filteredItems.length > 0}
                    onChange={toggleSelectAll}
                    className="h-4 w-4 text-orange-600 focus:ring-orange-500 border-gray-300 rounded"
                  />
                  Select All
                </label>
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  {selectedItems.size} selected
                </span>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setBulkDeleteConfirm(true)}
                  className="text-red-600 hover:text-red-700"
                >
                  <TrashIcon className="w-4 h-4 mr-1" />
                  Delete Selected
                </Button>
                <div className="flex-1" />
              </>
            )}
            <div className={selectedItems.size > 0 ? '' : 'ml-auto flex gap-2'}>
              <Button
                onClick={() => {
                  setEditingItem(null);
                  setShowItemForm(true);
                }}
                disabled={loading}
              >
                <PlusIcon className="w-5 h-5 mr-2" />
                Add Single
              </Button>

              <Button
                variant="secondary"
                onClick={() => setShowBulkCreate(true)}
                disabled={loading}
              >
                <RectangleStackIcon className="w-5 h-5 mr-2" />
                Add Bulk
              </Button>
            </div>
          </div>
        </div>
      </Card>

      {/* Items List */}
      {loading && items.length === 0 ? (
        <Card className="p-12">
          <div className="text-center text-gray-500 dark:text-gray-400">
            {t('common.loading')}
          </div>
        </Card>
      ) : filteredItems.length === 0 ? (
        <Card className="p-12">
          <div className="text-center">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              {searchQuery ? 'No Matching Items' : 'No Items Yet'}
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              {searchQuery
                ? 'Try a different search term'
                : 'Start by adding your first item using the buttons above.'}
            </p>
          </div>
        </Card>
      ) : (
        <div className="space-y-6">
          {Object.entries(itemsByCategory).map(([categoryId, categoryItems]) => {
            const categoryName = getCategoryName(categoryId === 'uncategorized' ? null : categoryId);
            const categoryColor = getCategoryColor(categoryId === 'uncategorized' ? null : categoryId);

            return (
              <div key={categoryId}>
                {/* Category Header */}
                <div className="flex items-center gap-2 mb-3">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: categoryColor }}
                  />
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    {categoryName}
                  </h3>
                  <span className="text-sm text-gray-500 dark:text-gray-400">
                    ({categoryItems.length} {categoryItems.length === 1 ? 'item' : 'items'})
                  </span>
                </div>

                {/* Items in Category */}
                <div className="space-y-2">
                  {categoryItems.map((item) => (
                    <div key={item.id} className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={selectedItems.has(item.id)}
                        onChange={() => toggleItemSelection(item.id)}
                        className="h-5 w-5 text-orange-600 focus:ring-orange-500 border-gray-300 rounded"
                      />
                      <Card className="flex-1 p-4 flex items-center justify-between hover:shadow-md transition-shadow">
                        <div className="flex-1">
                          <h4 className="font-semibold text-gray-900 dark:text-white">
                            {item.name}
                          </h4>
                          {item.description ? (
                            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                              {item.description}
                            </p>
                          ) : null}
                          <div className="flex items-center gap-3 mt-2 text-sm text-gray-500 dark:text-gray-400">
                            <span className="font-semibold text-orange-600 dark:text-orange-400">
                              {t('common.currency')}
                              {item.price.toFixed(2)}
                            </span>
                            {item.sku && <span>SKU: {item.sku}</span>}
                            {item.stock !== undefined && <span>Stock: {item.stock}</span>}
                          </div>
                          {item.tags && item.tags.length > 0 && (
                            <div className="flex gap-1 mt-2">
                              {item.tags.map((tag: string, idx: number) => (
                                <span
                                  key={idx}
                                  className="text-xs px-2 py-1 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300"
                                >
                                  {tag}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => {
                              setEditingItem(item);
                              setShowItemForm(true);
                            }}
                            className="p-2 text-gray-600 dark:text-gray-400 hover:text-orange-600 dark:hover:text-orange-400"
                          >
                            <PencilIcon className="h-5 w-5" />
                          </button>
                          <button
                            onClick={() => setDeleteConfirm({ isOpen: true, item })}
                            className="p-2 text-gray-600 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400"
                          >
                            <TrashIcon className="h-5 w-5" />
                          </button>
                        </div>
                      </Card>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Continue Button */}
      <div className="flex justify-end pt-4">
        <Button onClick={onComplete} size="lg">
          Continue to Review
        </Button>
      </div>

      {/* Modals */}
      <ItemFormModal
        isOpen={showItemForm}
        onClose={() => {
          setShowItemForm(false);
          setEditingItem(null);
        }}
        onSubmit={editingItem ? handleUpdateItem : handleCreateItem}
        item={editingItem}
        title={editingItem ? 'Edit Item' : 'Add Item'}
        availableCategories={categories}
        defaultCategoryId={selectedCategoryFilter}
      />

      <ItemBulkCreateModal
        isOpen={showBulkCreate}
        onClose={() => setShowBulkCreate(false)}
        onSubmit={handleBulkCreate}
        availableCategories={categories}
        defaultCategoryId={selectedCategoryFilter}
      />

      {/* Delete Confirmation Dialog */}
      {deleteConfirm.isOpen && deleteConfirm.item && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <Card className="w-full max-w-md p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              Delete Item
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              Are you sure you want to delete "{deleteConfirm.item.name}"?
              This action cannot be undone.
            </p>
            <div className="flex gap-3">
              <Button
                variant="secondary"
                onClick={() => setDeleteConfirm({ isOpen: false })}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                onClick={() => handleDeleteItem(deleteConfirm.item)}
                className="flex-1 bg-red-600 hover:bg-red-700"
              >
                Delete
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* Bulk Delete Confirmation Dialog */}
      {bulkDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <Card className="w-full max-w-md p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              Delete Multiple Items
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              Are you sure you want to delete {selectedItems.size} items? This action cannot be
              undone.
            </p>
            <div className="flex gap-3">
              <Button
                variant="secondary"
                onClick={() => setBulkDeleteConfirm(false)}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                onClick={handleBulkDelete}
                className="flex-1 bg-red-600 hover:bg-red-700"
              >
                Delete
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
