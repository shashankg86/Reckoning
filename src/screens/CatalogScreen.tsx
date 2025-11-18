import React, { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { Layout } from '../components/layout/Layout';
import { FilterBar } from '../components/catalog/FilterBar';
import { ActionBar } from '../components/catalog/ActionBar';
import { CategoriesTable } from '../components/catalog/CategoriesTable';
import { ItemsTable } from '../components/catalog/ItemsTable';
import { FullMenuView } from '../components/catalog/FullMenuView';
import { BulkAddCategoriesModal } from '../components/catalog/BulkAddCategoriesModal';
import { BulkAddItemsModal } from '../components/catalog/BulkAddItemsModal';
import { ConfirmDialog } from '../components/catalog/ConfirmDialog';
import { CategoryFormModal } from '../components/catalog/CategoryFormModal';
import { ItemFormModal } from '../components/catalog/ItemFormModal';
import { useCatalogState } from '../hooks/useCatalogState';
import { useCatalogFilters } from '../hooks/useCatalogFilters';
import { useAuth } from '../contexts/AuthContext';
import type { Category, Item } from '../types/menu';

type TabView = 'categories' | 'items' | 'fullMenu';

export function CatalogScreen() {
  const { t } = useTranslation();
  const { state: authState } = useAuth();
  const storeId = (authState.user as any)?.store?.id;

  // State Management
  const {
    categories,
    items,
    itemCounts,
    pendingChanges,
    loading,
    saveAll,
    discardAll,
    addCategory,
    updateCategory,
    deleteCategory,
    addItem,
    updateItem,
    deleteItem,
    loadData
  } = useCatalogState(storeId);

  const {
    filters,
    updateFilter,
    resetFilters,
    filterCategories,
    filterItems,
    getMaxPrice
  } = useCatalogFilters();

  // UI State
  const [currentTab, setCurrentTab] = useState<TabView>('categories');
  const [showBulkAddCategories, setShowBulkAddCategories] = useState(false);
  const [showBulkAddItems, setShowBulkAddItems] = useState(false);
  const [showEditCategory, setShowEditCategory] = useState(false);
  const [showEditItem, setShowEditItem] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [editingItem, setEditingItem] = useState<Item | null>(null);
  const [selectedCategoryForItem, setSelectedCategoryForItem] = useState<string | undefined>();
  const [isSaving, setIsSaving] = useState(false);

  // Confirmation Dialog State
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    type: 'delete' | 'discard';
    target: 'category' | 'item' | 'all';
    id?: string;
    name?: string;
  }>({
    isOpen: false,
    type: 'delete',
    target: 'all'
  });

  // Calculate pending changes count
  const pendingChangesCount = useMemo(() => {
    const { categories: catChanges, items: itemChanges } = pendingChanges;
    return (
      catChanges.toAdd.length +
      catChanges.toUpdate.length +
      catChanges.toDelete.length +
      itemChanges.toAdd.length +
      itemChanges.toUpdate.length +
      itemChanges.toDelete.length
    );
  }, [pendingChanges]);

  // Filter and sort data
  const filteredCategories = useMemo(() => {
    return filterCategories(categories);
  }, [categories, filterCategories]);

  const filteredItems = useMemo(() => {
    return filterItems(items);
  }, [items, filterItems]);

  const maxPrice = useMemo(() => {
    return getMaxPrice(items);
  }, [items, getMaxPrice]);

  // Handlers
  const handleSaveAll = async () => {
    try {
      setIsSaving(true);
      await saveAll();
      toast.success(t('catalog.allChangesSaved'));
    } catch (error) {
      console.error('Save failed:', error);
      toast.error('Failed to save changes');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDiscardAll = () => {
    if (pendingChangesCount > 0) {
      setConfirmDialog({
        isOpen: true,
        type: 'discard',
        target: 'all'
      });
    }
  };

  const handleBulkAddCategories = (categoriesToAdd: any[]) => {
    categoriesToAdd.forEach(cat => addCategory(cat));
    toast.success(`Added ${categoriesToAdd.length} categories to pending changes`);
  };

  const handleBulkAddItems = (itemsToAdd: any[]) => {
    itemsToAdd.forEach(item => addItem(item));
    toast.success(`Added ${itemsToAdd.length} items to pending changes`);
  };

  const handleEditCategory = (category: Category) => {
    setEditingCategory(category);
    setShowEditCategory(true);
  };

  const handleSaveCategory = (categoryData: any) => {
    if (editingCategory) {
      updateCategory({ ...categoryData, id: editingCategory.id });
      toast.success('Category updated (pending save)');
    } else {
      addCategory(categoryData);
      toast.success('Category added (pending save)');
    }
    setShowEditCategory(false);
    setEditingCategory(null);
  };

  const handleDeleteCategory = (categoryId: string) => {
    const category = categories.find(c => c.id === categoryId);
    setConfirmDialog({
      isOpen: true,
      type: 'delete',
      target: 'category',
      id: categoryId,
      name: category?.name
    });
  };

  const handleEditItem = (item: Item) => {
    setEditingItem(item);
    setShowEditItem(true);
  };

  const handleSaveItem = (itemData: any) => {
    if (editingItem) {
      updateItem({ ...itemData, id: editingItem.id });
      toast.success('Item updated (pending save)');
    } else {
      addItem(itemData);
      toast.success('Item added (pending save)');
    }
    setShowEditItem(false);
    setEditingItem(null);
  };

  const handleDeleteItem = (itemId: string) => {
    const item = items.find(i => i.id === itemId);
    setConfirmDialog({
      isOpen: true,
      type: 'delete',
      target: 'item',
      id: itemId,
      name: item?.name
    });
  };

  const handleAddItemToCategory = (categoryId: string) => {
    setSelectedCategoryForItem(categoryId);
    setShowBulkAddItems(true);
  };

  const handleConfirmDialog = async () => {
    if (confirmDialog.type === 'discard' && confirmDialog.target === 'all') {
      discardAll();
      toast.success('All changes discarded');
    } else if (confirmDialog.type === 'delete') {
      if (confirmDialog.target === 'category' && confirmDialog.id) {
        deleteCategory(confirmDialog.id);
        toast.success('Category deleted (pending save)');
      } else if (confirmDialog.target === 'item' && confirmDialog.id) {
        deleteItem(confirmDialog.id);
        toast.success('Item deleted (pending save)');
      }
    }
    setConfirmDialog({ isOpen: false, type: 'delete', target: 'all' });
  };

  const getConfirmDialogContent = () => {
    if (confirmDialog.type === 'discard') {
      return {
        title: t('catalog.discardAll'),
        message: `Are you sure you want to discard ${pendingChangesCount} pending changes? This action cannot be undone.`,
        confirmText: t('catalog.discardAll')
      };
    } else if (confirmDialog.target === 'category') {
      return {
        title: t('catalog.deleteCategory'),
        message: t('catalog.deleteConfirmationMessage', {
          type: t('catalog.category').toLowerCase(),
          name: confirmDialog.name || ''
        }),
        confirmText: t('common.delete')
      };
    } else {
      return {
        title: t('catalog.deleteItem'),
        message: t('catalog.deleteConfirmationMessage', {
          type: t('catalog.item').toLowerCase(),
          name: confirmDialog.name || ''
        }),
        confirmText: t('common.delete')
      };
    }
  };

  const confirmContent = getConfirmDialogContent();

  return (
    <Layout title={t('catalog.title')}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Filter Bar */}
        <FilterBar
          filters={filters}
          categories={categories}
          maxPrice={maxPrice}
          onFilterChange={updateFilter}
          onReset={resetFilters}
        />

        {/* Action Bar */}
        <ActionBar
          hasUnsavedChanges={pendingChangesCount > 0}
          changeCount={pendingChangesCount}
          onSaveAll={handleSaveAll}
          onDiscardAll={handleDiscardAll}
          onBulkAddCategories={() => setShowBulkAddCategories(true)}
          onBulkAddItems={() => {
            setSelectedCategoryForItem(undefined);
            setShowBulkAddItems(true);
          }}
          isSaving={isSaving}
        />

        {/* Tab Navigation */}
        <div className="border-b border-gray-200 dark:border-gray-700">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setCurrentTab('categories')}
              className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                currentTab === 'categories'
                  ? 'border-orange-500 text-orange-600 dark:text-orange-400'
                  : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'
              }`}
            >
              {t('catalog.categories')}
            </button>
            <button
              onClick={() => setCurrentTab('items')}
              className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                currentTab === 'items'
                  ? 'border-orange-500 text-orange-600 dark:text-orange-400'
                  : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'
              }`}
            >
              {t('catalog.allItems')}
            </button>
            <button
              onClick={() => setCurrentTab('fullMenu')}
              className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                currentTab === 'fullMenu'
                  ? 'border-orange-500 text-orange-600 dark:text-orange-400'
                  : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'
              }`}
            >
              {t('catalog.fullMenu')}
            </button>
          </nav>
        </div>

        {/* Tab Content */}
        {loading ? (
          <div className="flex justify-center items-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
          </div>
        ) : (
          <>
            {currentTab === 'categories' && (
              <CategoriesTable
                categories={filteredCategories}
                itemCounts={itemCounts}
                onEdit={handleEditCategory}
                onDelete={handleDeleteCategory}
              />
            )}

            {currentTab === 'items' && (
              <ItemsTable
                items={filteredItems}
                categories={categories}
                onEdit={handleEditItem}
                onDelete={handleDeleteItem}
              />
            )}

            {currentTab === 'fullMenu' && (
              <FullMenuView
                categories={filteredCategories}
                items={items}
                onEditCategory={handleEditCategory}
                onDeleteCategory={handleDeleteCategory}
                onEditItem={handleEditItem}
                onDeleteItem={handleDeleteItem}
                onAddItemToCategory={handleAddItemToCategory}
              />
            )}
          </>
        )}

        {/* Modals */}
        <BulkAddCategoriesModal
          isOpen={showBulkAddCategories}
          onClose={() => setShowBulkAddCategories(false)}
          onBulkAdd={handleBulkAddCategories}
        />

        <BulkAddItemsModal
          isOpen={showBulkAddItems}
          onClose={() => {
            setShowBulkAddItems(false);
            setSelectedCategoryForItem(undefined);
          }}
          categories={categories}
          onBulkAdd={handleBulkAddItems}
          preselectedCategoryId={selectedCategoryForItem}
        />

        <CategoryFormModal
          isOpen={showEditCategory}
          onClose={() => {
            setShowEditCategory(false);
            setEditingCategory(null);
          }}
          onSave={handleSaveCategory}
          editingCategory={editingCategory}
        />

        <ItemFormModal
          isOpen={showEditItem}
          onClose={() => {
            setShowEditItem(false);
            setEditingItem(null);
          }}
          onSave={handleSaveItem}
          editingItem={editingItem}
          categories={categories}
        />

        {/* Confirmation Dialog */}
        <ConfirmDialog
          isOpen={confirmDialog.isOpen}
          onClose={() => setConfirmDialog({ isOpen: false, type: 'delete', target: 'all' })}
          onConfirm={handleConfirmDialog}
          title={confirmContent.title}
          message={confirmContent.message}
          confirmText={confirmContent.confirmText}
          type={confirmDialog.type}
        />
      </div>
    </Layout>
  );
}
