import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import {
  PlusIcon,
  MagnifyingGlassIcon,
  RectangleStackIcon,
  TrashIcon,
  PencilIcon,
  ArrowPathIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { CachedImage } from '../../components/ui/CachedImage';
import { useAuth } from '../../contexts/AuthContext';
import { useItems } from '../../hooks/useItems';
import { useCategories } from '../../hooks/useCategories';
import { itemsAPI } from '../../api/items';
import { storageService, STORAGE_PATHS, imageCache } from '../../lib/storage';
import { ItemFormModal } from './components/ItemFormModal';
import { ItemBulkCreateModal } from './components/ItemBulkCreateModal';
import type { ItemData } from '../../api/items';
import type { Category } from '../../types/menu';

interface ItemsSetupStepProps {
  onBack: () => void;
  onComplete: () => void;
}

// Local item with change tracking
interface LocalItem extends ItemData {
  id: string;
  _isNew?: boolean;
  _isModified?: boolean;
  _isDeleted?: boolean;
  _originalData?: any;
  _imageFile?: File | null;
}

export function ItemsSetupStep({ onBack, onComplete }: ItemsSetupStepProps) {
  const { t } = useTranslation();
  const { state: authState } = useAuth();
  const storeId = (authState.user as any)?.store?.id;

  // Load existing items and categories ONCE (optimized)
  const { items: existingItems, loading: loadingItems } = useItems({ autoLoad: true });
  const { categories, loading: loadingCategories } = useCategories({
    autoLoad: true,
    filter: { is_active: true }
  });

  // Local state for all items
  const [localItems, setLocalItems] = useState<LocalItem[]>([]);
  const [showItemForm, setShowItemForm] = useState(false);
  const [showBulkCreate, setShowBulkCreate] = useState(false);
  const [editingItem, setEditingItem] = useState<LocalItem | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>('');
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [deleteConfirm, setDeleteConfirm] = useState<{ isOpen: boolean; item?: LocalItem }>({
    isOpen: false,
  });
  const [bulkDeleteConfirm, setBulkDeleteConfirm] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Sync existing items from DB to local state (only once)
  useEffect(() => {
    if (existingItems.length > 0 && localItems.length === 0) {
      setLocalItems(
        existingItems.map((item) => ({
          ...item,
          _originalData: item,
        }))
      );
    }
  }, [existingItems]);

  const handleCreateItem = async (itemData: ItemData, imageFile?: File | null) => {
    const newItem: LocalItem = {
      ...itemData,
      id: `temp_${Date.now()}_${Math.random()}`,
      _isNew: true,
      _imageFile: imageFile || null,
    };

    if (imageFile) {
      await imageCache.set(newItem.id, imageFile);
    }

    setLocalItems((prev) => [...prev, newItem]);
    toast.success(t('menuSetup.itemAddedLocally'));
    setShowItemForm(false);
  };

  const handleUpdateItem = async (itemData: ItemData, imageFile?: File | null) => {
    if (!editingItem) return;

    if (imageFile) {
      await imageCache.set(editingItem.id, imageFile);
    }

    setLocalItems((prev) =>
      prev.map((item) => {
        if (item.id === editingItem.id) {
          if (item._isNew) {
            return {
              ...item,
              ...itemData,
              _imageFile: imageFile !== undefined ? imageFile : item._imageFile,
            };
          }
          return {
            ...item,
            ...itemData,
            _imageFile: imageFile !== undefined ? imageFile : item._imageFile,
            _isModified: true,
          };
        }
        return item;
      })
    );

    toast.success(t('menuSetup.itemUpdated'));
    setEditingItem(null);
    setShowItemForm(false);
  };

  const handleDeleteItem = () => {
    if (!deleteConfirm.item) return;

    setLocalItems((prev) =>
      prev
        .map((item) => {
          if (item.id === deleteConfirm.item!.id) {
            if (item._isNew) {
              return null;
            }
            return { ...item, _isDeleted: true };
          }
          return item;
        })
        .filter(Boolean) as LocalItem[]
    );

    toast.success(t('menuSetup.itemDeleted'));
    setDeleteConfirm({ isOpen: false });
  };

  const handleBulkCreate = async (itemsData: ItemData[]) => {
    const newItems: LocalItem[] = itemsData.map((data, index) => ({
      ...data,
      id: `temp_${Date.now()}_${index}`,
      _isNew: true,
    }));

    setLocalItems((prev) => [...prev, ...newItems]);
    toast.success(`${t('menuSetup.added')} ${itemsData.length} ${t('menuSetup.itemsLocally')}`);
    setShowBulkCreate(false);
  };

  const handleBulkDelete = () => {
    setLocalItems((prev) =>
      prev
        .map((item) => {
          if (selectedItems.has(item.id)) {
            if (item._isNew) {
              return null;
            }
            return { ...item, _isDeleted: true };
          }
          return item;
        })
        .filter(Boolean) as LocalItem[]
    );

    toast.success(`${t('menuSetup.deleted')} ${selectedItems.size} ${t('menuSetup.items')}`);
    setSelectedItems(new Set());
    setBulkDeleteConfirm(false);
  };

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

  // Filter out deleted items
  const activeItems = localItems.filter((item) => !item._isDeleted);

  // LOCAL FILTERING - No API calls!
  const filteredItems = activeItems.filter((item) => {
    const matchesSearch =
      !searchQuery ||
      (item.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.description || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.sku || '').toLowerCase().includes(searchQuery.toLowerCase());

    const matchesCategory =
      !selectedCategoryFilter || item.category_id === selectedCategoryFilter;

    return matchesSearch && matchesCategory;
  });

  // Group items by category
  const itemsByCategory = filteredItems.reduce((acc, item) => {
    const catId = item.category_id || 'uncategorized';
    if (!acc[catId]) {
      acc[catId] = [];
    }
    acc[catId].push(item);
    return acc;
  }, {} as Record<string, LocalItem[]>);

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

  // Sync all changes to database and navigate
  const handleContinueToReview = async () => {
    const toCreate = localItems.filter((item) => item._isNew && !item._isDeleted);
    const toUpdate = localItems.filter((item) => item._isModified && !item._isDeleted && !item._isNew);
    const toDelete = localItems.filter((item) => item._isDeleted && !item._isNew);

    // If no changes, just navigate
    if (toCreate.length === 0 && toUpdate.length === 0 && toDelete.length === 0) {
      onComplete();
      return;
    }

    setIsSaving(true);

    try {
      let operationCount = 0;

      // STEP 1: Upload images for items with _imageFile (DEFERRED UPLOAD)
      const itemsToUpload = [...toCreate, ...toUpdate].filter((item) => item._imageFile);

      if (itemsToUpload.length > 0) {
        const uploadToast = toast.loading(t('menuSetup.uploadingImages', { count: itemsToUpload.length }));

        try {
          const files = itemsToUpload.map((item) => item._imageFile!);
          const uploadResult = await storageService.batchUploadImages(
            files,
            STORAGE_PATHS.ITEMS,
            `store_${storeId}`,
            20, // concurrent limit (2x faster than before)
            (completed, total) => {
              toast.loading(t('menuSetup.uploadingProgress', { completed, total }), { id: uploadToast });
            }
          );

          // Map uploaded URLs back to items
          uploadResult.successful.forEach((result, index) => {
            const item = itemsToUpload[index];
            item.image_url = result.url || undefined;
          });

          toast.success(t('menuSetup.uploadedImages', { count: uploadResult.totalUploaded }), { id: uploadToast });

          if (uploadResult.totalFailed > 0) {
            toast.error(t('menuSetup.failedToUploadImages', { count: uploadResult.totalFailed }));
          }
        } catch (error) {
          toast.error(t('menuSetup.imageUploadFailed'), { id: uploadToast });
          console.error('Image upload error:', error);
        }
      }

      // STEP 2: Bulk delete items (OPTIMIZED: Single query instead of N queries)
      if (toDelete.length > 0) {
        const deleteIds = toDelete.map((item) => item.id);
        await itemsAPI.bulkDeleteItems(deleteIds);
        operationCount += toDelete.length;
      }

      // STEP 3: Bulk update items (OPTIMIZED: Parallel instead of sequential)
      if (toUpdate.length > 0) {
        const updates = toUpdate.map((item) => ({
          id: item.id,
          name: item.name,
          price: item.price,
          category_id: item.category_id,
          description: item.description,
          sku: item.sku,
          stock: item.stock,
          image_url: item.image_url,
          is_active: item.is_active,
        }));
        await itemsAPI.bulkUpdateItems(updates);
        operationCount += toUpdate.length;
      }

      // STEP 4: Create new items (now with image_url - BATCH)
      if (toCreate.length > 0) {
        const itemsData: ItemData[] = toCreate.map((item) => ({
          name: item.name,
          price: item.price,
          category_id: item.category_id,
          description: item.description,
          sku: item.sku,
          stock: item.stock,
          image_url: item.image_url,
          is_active: item.is_active,
        }));

        await itemsAPI.bulkCreateItems(storeId, itemsData);
        operationCount += toCreate.length;
      }

      toast.success(
        `${t('menuSetup.saved')} ${operationCount} ${operationCount === 1 ? t('menuSetup.change') : t('menuSetup.changes')}`
      );

      // Navigate to next step
      onComplete();
    } catch (error: any) {
      console.error('Failed to sync items:', error);
      toast.error(error.message || t('menuSetup.failedToSaveItems'));
    } finally {
      setIsSaving(false);
    }
  };

  const pendingChanges = localItems.filter(
    (item) => item._isNew || item._isModified || item._isDeleted
  ).length;

  const loading = loadingItems || loadingCategories;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Add Menu Items</h2>
        <p className="text-gray-600 dark:text-gray-400 mt-2">
          Add items to your categories. Changes will be saved when you continue to review.
        </p>
        {pendingChanges > 0 && (
          <p className="text-sm text-orange-600 dark:text-orange-400 mt-2 flex items-center gap-1">
            <ExclamationTriangleIcon className="h-4 w-4" />
            {pendingChanges} {t('menuSetup.pendingChanges')}
          </p>
        )}
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
                disabled={loading || isSaving}
              >
                <PlusIcon className="w-5 h-5 mr-2" />
                Add Single
              </Button>

              <Button
                variant="secondary"
                onClick={() => setShowBulkCreate(true)}
                disabled={loading || isSaving}
              >
                <RectangleStackIcon className="w-5 h-5 mr-2" />
                Add Bulk
              </Button>
            </div>
          </div>
        </div>
      </Card>

      {/* Items List */}
      {loading && activeItems.length === 0 ? (
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
                  {categoryItems.map((item) => {
                    return (
                      <div key={item.id} className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          checked={selectedItems.has(item.id)}
                          onChange={() => toggleItemSelection(item.id)}
                          className="h-5 w-5 text-orange-600 focus:ring-orange-500 border-gray-300 rounded"
                        />
                        <Card className="flex-1 p-4 flex items-center gap-3 hover:shadow-md transition-shadow relative">
                          {item.image_url || item.id ? (
                            <CachedImage
                              cacheId={item.id}
                              fallbackUrl={item.image_url}
                              alt={item.name}
                              className="w-16 h-16 rounded-lg object-cover flex-shrink-0"
                            />
                          ) : (
                            <div className="w-16 h-16 rounded-lg bg-gray-200 dark:bg-gray-600 flex items-center justify-center flex-shrink-0">
                              <svg
                                className="w-8 h-8 text-gray-400 dark:text-gray-500"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                                />
                              </svg>
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <h4 className="font-semibold text-gray-900 dark:text-white">
                              {item.name}
                            </h4>
                            {/* CATEGORY BADGE */}
                            <span
                              className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium"
                              style={{
                                backgroundColor: `${categoryColor}20`,
                                color: categoryColor,
                              }}
                            >
                              {categoryName}
                            </span>
                            {/* STATUS BADGE */}
                            {(item._isNew || item._isModified) && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-orange-100 dark:bg-orange-900 text-orange-800 dark:text-orange-200">
                                {item._isNew ? t('menuSetup.new') : t('menuSetup.modified')}
                              </span>
                            )}
                          </div>
                          {item.description && (
                            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                              {item.description}
                            </p>
                          )}
                          <div className="flex items-center gap-3 mt-2 text-sm text-gray-500 dark:text-gray-400">
                            <span className="font-semibold text-orange-600 dark:text-orange-400">
                              {t('common.currency')}
                              {item.price.toFixed(2)}
                            </span>
                            {item.sku && <span>{t('menuSetup.sku')}: {item.sku}</span>}
                            {item.stock !== undefined && <span>{t('menuSetup.stock')}: {item.stock}</span>}
                          </div>
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
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Navigation */}
      <div className="flex justify-between pt-4">
        <Button variant="secondary" onClick={onBack} size="lg" disabled={isSaving}>
          {t('common.back')}
        </Button>
        <Button onClick={handleContinueToReview} size="lg" disabled={isSaving}>
          {isSaving ? (
            <>
              <ArrowPathIcon className="w-5 h-5 mr-2 animate-spin" />
              {t('menuSetup.saving')}
            </>
          ) : (
            'Continue to Review'
          )}
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
                onClick={handleDeleteItem}
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
              Are you sure you want to delete {selectedItems.size} items?
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
