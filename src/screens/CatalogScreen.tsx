import {
  CubeIcon,
  MagnifyingGlassIcon,
  PencilIcon,
  PlusIcon,
  TrashIcon,
  Squares2X2Icon,
  ListBulletIcon,
  FolderIcon,
  FolderPlusIcon,
} from '@heroicons/react/24/outline';
import { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Layout } from '../components/layout/Layout';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { FAB } from '../components/ui/FAB';
import { Input } from '../components/ui/Input';
import { ItemFormModal } from '../components/catalog/ItemFormModal';
import { CategoryFormModal } from '../components/catalog/CategoryFormModal';
import { usePOS } from '../contexts/POSContext';
import { useAuth } from '../contexts/AuthContext';
import { categoriesAPI } from '../api/categories';
import type { Item } from '../contexts/POSContext';
import type { Category, CategoryWithItems, CreateCategoryData, UpdateCategoryData } from '../types/menu';
import toast from 'react-hot-toast';

type ViewMode = 'categories' | 'items';

export function CatalogScreen() {
  const { t } = useTranslation();
  const { state: posState, handleDeleteItem, handleAddItem, handleUpdateItem, loadItems } = usePOS();
  const { state: authState } = useAuth();
  const storeId = (authState.user as any)?.store?.id;

  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<ViewMode>('categories');
  const [showAddItemModal, setShowAddItemModal] = useState(false);
  const [showAddCategoryModal, setShowAddCategoryModal] = useState(false);
  const [editingItem, setEditingItem] = useState<Item | null>(null);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{
    isOpen: boolean;
    type: 'item' | 'category' | null;
    id: string | null;
    name: string | null;
  }>({
    isOpen: false,
    type: null,
    id: null,
    name: null,
  });
  const [categoriesWithItems, setCategoriesWithItems] = useState<CategoryWithItems[]>([]);
  const [loading, setLoading] = useState(false);

  // Load categories with items
  useEffect(() => {
    if (storeId) {
      loadCategoriesWithItems();
    }
  }, [storeId]);

  const loadCategoriesWithItems = async () => {
    try {
      setLoading(true);
      const cats = await categoriesAPI.getCategoriesWithCounts(storeId);
      setCategoriesWithItems(cats);
    } catch (error) {
      console.error('Failed to load categories:', error);
      toast.error('Failed to load menu');
    } finally {
      setLoading(false);
    }
  };

  // Refresh data after changes
  const refreshData = async () => {
    await Promise.all([loadCategoriesWithItems(), loadItems()]);
  };

  // Search across categories and items
  const { filteredCategories, filteredItems, searchResults } = useMemo(() => {
    const searchLower = searchTerm.toLowerCase();

    if (!searchLower) {
      return {
        filteredCategories: categoriesWithItems,
        filteredItems: posState.items,
        searchResults: { categories: 0, items: 0 }
      };
    }

    const filteredCats = categoriesWithItems.filter(cat =>
      cat.name.toLowerCase().includes(searchLower) ||
      cat.description?.toLowerCase().includes(searchLower)
    );

    const filteredItms = posState.items.filter(item =>
      item.name.toLowerCase().includes(searchLower) ||
      item.category.toLowerCase().includes(searchLower) ||
      (item.sku && item.sku.toLowerCase().includes(searchLower))
    );

    return {
      filteredCategories: filteredCats,
      filteredItems: filteredItms,
      searchResults: {
        categories: filteredCats.length,
        items: filteredItms.length
      }
    };
  }, [searchTerm, categoriesWithItems, posState.items]);

  // Category handlers
  const handleSaveCategory = async (categoryData: CreateCategoryData | (UpdateCategoryData & { id: string })) => {
    try {
      if ((categoryData as any).id) {
        // Update existing
        const { id, ...updates } = categoryData as any;
        await categoriesAPI.updateCategory(id, updates);
        toast.success(t('catalog.categoryUpdated'));
      } else {
        // Create new
        await categoriesAPI.createCategory(storeId, categoryData as CreateCategoryData);
        toast.success(t('catalog.categoryAdded'));
      }
      await refreshData();
      setShowAddCategoryModal(false);
      setEditingCategory(null);
    } catch (error) {
      console.error('Error saving category:', error);
      toast.error(t('catalog.categoryError'));
    }
  };

  const handleDeleteCategory = (category: Category) => {
    setDeleteConfirm({
      isOpen: true,
      type: 'category',
      id: category.id,
      name: category.name
    });
  };

  const handleEditCategory = (category: Category) => {
    setEditingCategory(category);
    setShowAddCategoryModal(true);
  };

  // Item handlers
  const handleSaveItem = async (itemData: Omit<Item, 'id'> | Item) => {
    if ((itemData as Item).id) {
      await handleUpdateItem(itemData as Item);
    } else {
      await handleAddItem(itemData as Omit<Item, 'id'>);
    }
    await refreshData();
    setShowAddItemModal(false);
    setEditingItem(null);
  };

  const handleDeleteItemClick = (item: Item) => {
    setDeleteConfirm({
      isOpen: true,
      type: 'item',
      id: item.id,
      name: item.name
    });
  };

  const handleEditItem = (item: Item) => {
    setEditingItem(item);
    setShowAddItemModal(true);
  };

  const confirmDelete = async () => {
    if (!deleteConfirm.id) return;

    try {
      if (deleteConfirm.type === 'item') {
        await handleDeleteItem(deleteConfirm.id);
        await refreshData();
      } else if (deleteConfirm.type === 'category') {
        await categoriesAPI.deleteCategory(deleteConfirm.id);
        toast.success(t('catalog.categoryDeleted'));
        await refreshData();
      }
    } catch (error) {
      console.error('Delete error:', error);
      toast.error(`Failed to delete ${deleteConfirm.type}`);
    } finally {
      setDeleteConfirm({ isOpen: false, type: null, id: null, name: null });
    }
  };

  const EmptyState = () => (
    <div className="text-center py-12">
      <div className="mx-auto w-24 h-24 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mb-4">
        {viewMode === 'categories' ? (
          <FolderIcon className="w-12 h-12 text-gray-400" />
        ) : (
          <CubeIcon className="w-12 h-12 text-gray-400" />
        )}
      </div>
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
        {viewMode === 'categories' ? t('catalog.noCategoriesYet') : t('catalog.noItemsYet')}
      </h3>
      <p className="text-gray-500 dark:text-gray-400 mb-6 max-w-md mx-auto">
        {viewMode === 'categories'
          ? t('catalog.startWithCategories')
          : t('catalog.startBuilding')}
      </p>
      <div className="flex gap-3 justify-center">
        <Button onClick={() => setShowAddCategoryModal(true)}>
          <FolderPlusIcon className="w-4 h-4 mr-2" />
          {t('catalog.addCategory')}
        </Button>
        <Button variant="secondary" onClick={() => setShowAddItemModal(true)}>
          <PlusIcon className="w-4 h-4 mr-2" />
          {t('catalog.addItem')}
        </Button>
      </div>
    </div>
  );

  return (
    <Layout title={t('catalog.title')}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Header with Search and View Toggle */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="flex-1 relative">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
            <Input
              placeholder={t('catalog.searchCatalog')}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <div className="flex gap-2">
            <Button
              variant={viewMode === 'categories' ? 'primary' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('categories')}
            >
              <Squares2X2Icon className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">{t('catalog.categories')}</span>
            </Button>
            <Button
              variant={viewMode === 'items' ? 'primary' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('items')}
            >
              <ListBulletIcon className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">{t('catalog.allItems')}</span>
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setShowAddCategoryModal(true)}
            >
              <FolderPlusIcon className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">{t('catalog.category')}</span>
            </Button>
            <Button
              size="sm"
              onClick={() => setShowAddItemModal(true)}
            >
              <PlusIcon className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">{t('catalog.item')}</span>
            </Button>
          </div>
        </div>

        {/* Search Results Summary */}
        {searchTerm && (
          <div className="mb-4 text-sm text-gray-600 dark:text-gray-400">
            {t('catalog.searchResults')}: {searchResults.categories} {t('catalog.categories').toLowerCase()}, {searchResults.items} {t('catalog.items').toLowerCase()}
          </div>
        )}

        {/* Content */}
        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
          </div>
        ) : viewMode === 'categories' ? (
          // Category View
          filteredCategories.length === 0 && !searchTerm ? (
            <EmptyState />
          ) : filteredCategories.length === 0 ? (
            <div className="text-center py-12">
              <FolderIcon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                {t('catalog.noResultsFound')}
              </h3>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredCategories.map((category) => (
                <Card key={category.id} className="overflow-hidden">
                  {/* Category Header */}
                  <div
                    className="p-4 flex items-center justify-between"
                    style={{ backgroundColor: `${category.color}15` }}
                  >
                    <div className="flex items-center gap-3 flex-1">
                      <div
                        className="w-12 h-12 rounded-lg flex items-center justify-center text-2xl flex-shrink-0"
                        style={{ backgroundColor: category.color }}
                      >
                        {category.icon}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-gray-900 dark:text-white truncate">
                          {category.name}
                        </h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          {category.item_count} {t('catalog.items').toLowerCase()}
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEditCategory(category)}
                        className="p-2"
                      >
                        <PencilIcon className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteCategory(category)}
                        className="p-2 text-red-600 hover:text-red-700 dark:text-red-400"
                      >
                        <TrashIcon className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  {/* Category Items */}
                  <div className="p-4 space-y-2">
                    {category.items && category.items.length > 0 ? (
                      category.items.slice(0, 3).map((item) => (
                        <div
                          key={item.id}
                          className="flex items-center justify-between p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                        >
                          <div className="flex items-center gap-2 flex-1 min-w-0">
                            {item.image_url ? (
                              <img
                                src={item.image_url}
                                alt={item.name}
                                className="w-8 h-8 rounded object-cover flex-shrink-0"
                              />
                            ) : (
                              <div className="w-8 h-8 rounded bg-gray-200 dark:bg-gray-700 flex-shrink-0" />
                            )}
                            <span className="text-sm text-gray-700 dark:text-gray-300 truncate">
                              {item.name}
                            </span>
                          </div>
                          <span className="text-sm font-medium text-orange-500 dark:text-orange-400 ml-2">
                            {t('common.currency')}{item.price}
                          </span>
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">
                        {t('catalog.noItemsInCategory')}
                      </p>
                    )}
                    {category.items && category.items.length > 3 && (
                      <button
                        onClick={() => setViewMode('items')}
                        className="w-full text-sm text-orange-500 hover:text-orange-600 dark:text-orange-400 py-2"
                      >
                        +{category.items.length - 3} {t('catalog.more')}
                      </button>
                    )}
                  </div>
                </Card>
              ))}
            </div>
          )
        ) : (
          // All Items View
          filteredItems.length === 0 && !searchTerm ? (
            <EmptyState />
          ) : filteredItems.length === 0 ? (
            <div className="text-center py-12">
              <CubeIcon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                {t('catalog.noResultsFound')}
              </h3>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {filteredItems.map((item) => {
                const category = categoriesWithItems.find(c => c.id === (item as any).categoryId);
                return (
                  <Card key={item.id} hover className="overflow-hidden">
                    <div className="aspect-square bg-gray-100 dark:bg-gray-700 flex items-center justify-center relative">
                      {item.image ? (
                        <img
                          src={item.image}
                          alt={item.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <CubeIcon className="h-12 w-12 text-gray-400" />
                      )}
                      {item.stock !== undefined && (
                        <div className="absolute top-2 right-2">
                          {item.stock === 0 ? (
                            <span className="bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400 text-xs font-medium px-2 py-1 rounded-full">
                              {t('catalog.stockStatus.outOfStock')}
                            </span>
                          ) : item.stock <= 5 ? (
                            <span className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400 text-xs font-medium px-2 py-1 rounded-full">
                              {t('catalog.stockStatus.lowStock')}
                            </span>
                          ) : null}
                        </div>
                      )}
                    </div>
                    <div className="p-4">
                      <h3 className="font-semibold text-gray-900 dark:text-white mb-1">
                        {item.name}
                      </h3>
                      <div className="flex items-center gap-2 mb-2">
                        {category && (
                          <>
                            <div
                              className="w-3 h-3 rounded-full"
                              style={{ backgroundColor: category.color }}
                            />
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                              {item.category}
                            </p>
                          </>
                        )}
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-lg font-bold text-orange-500 dark:text-orange-400">
                          {t('common.currency')}{item.price}
                        </span>
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEditItem(item)}
                            className="p-2"
                          >
                            <PencilIcon className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteItemClick(item)}
                            className="p-2 text-red-600 hover:text-red-700 dark:text-red-400"
                          >
                            <TrashIcon className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          )
        )}

        {/* Floating Action Button */}
        <FAB
          onClick={() => viewMode === 'categories' ? setShowAddCategoryModal(true) : setShowAddItemModal(true)}
          icon={viewMode === 'categories' ? <FolderPlusIcon className="h-6 w-6" /> : <PlusIcon className="h-6 w-6" />}
        />

        {/* Modals */}
        <CategoryFormModal
          isOpen={showAddCategoryModal || editingCategory !== null}
          onClose={() => {
            setShowAddCategoryModal(false);
            setEditingCategory(null);
          }}
          onSave={handleSaveCategory}
          editingCategory={editingCategory}
        />

        <ItemFormModal
          isOpen={showAddItemModal || editingItem !== null}
          onClose={() => {
            setShowAddItemModal(false);
            setEditingItem(null);
          }}
          onSave={handleSaveItem}
          editingItem={editingItem}
          categories={categoriesWithItems}
        />

        {/* Delete Confirmation */}
        <ConfirmDialog
          isOpen={deleteConfirm.isOpen}
          onClose={() => setDeleteConfirm({ isOpen: false, type: null, id: null, name: null })}
          onConfirm={confirmDelete}
          title={t('catalog.confirmDelete')}
          message={t('catalog.deleteConfirmationMessage', {
            type: deleteConfirm.type === 'category' ? t('catalog.category').toLowerCase() : t('catalog.item').toLowerCase(),
            name: deleteConfirm.name || ''
          })}
          confirmText={t('catalog.delete')}
        />
      </div>
    </Layout>
  );
}
