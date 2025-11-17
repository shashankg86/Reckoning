import {
  CubeIcon,
  ListBulletIcon,
  MagnifyingGlassIcon,
  PencilIcon,
  PlusIcon,
  Squares2X2Icon,
  TrashIcon,
  FunnelIcon,
} from '@heroicons/react/24/outline';
import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Layout } from '../components/layout/Layout';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { DataTable, Column } from '../components/ui/DataTable';
import { FAB } from '../components/ui/FAB';
import { Input } from '../components/ui/Input';
import { ItemFormModal } from '../components/catalog/ItemFormModal';
import { usePOS } from '../contexts/POSContext';
import { useAuth } from '../contexts/AuthContext';
import { categoriesAPI } from '../api/categories';
import type { Item } from '../contexts/POSContext';
import type { Category } from '../types/menu';

export function CatalogScreen() {
  const { t } = useTranslation();
  const { state: posState, handleDeleteItem, handleAddItem, handleUpdateItem, loadItems } = usePOS();
  const { state: authState } = useAuth();
  const storeId = (authState.user as any)?.store?.id;

  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list' | 'table'>('grid');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingItem, setEditingItem] = useState<Item | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{ isOpen: boolean; itemId: string | null }>({
    isOpen: false,
    itemId: null
  });
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [showCategoryFilter, setShowCategoryFilter] = useState(false);

  // Load categories
  useEffect(() => {
    if (storeId) {
      loadCategories();
    }
  }, [storeId]);

  const loadCategories = async () => {
    try {
      const cats = await categoriesAPI.getCategories(storeId, { is_active: true });
      setCategories(cats);
    } catch (error) {
      console.error('Failed to load categories:', error);
    }
  };

  // Filter items by search and category
  const filteredItems = posState.items.filter(item => {
    const matchesSearch =
      item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.sku && item.sku.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesCategory = !selectedCategory || (item as any).categoryId === selectedCategory;

    return matchesSearch && matchesCategory;
  });

  const handleDelete = (itemId: string) => {
    setDeleteConfirm({ isOpen: true, itemId });
  };

  const confirmDelete = async () => {
    if (deleteConfirm.itemId) {
      await handleDeleteItem(deleteConfirm.itemId);
      await loadItems();
    }
    setDeleteConfirm({ isOpen: false, itemId: null });
  };

  const handleSaveItem = async (itemData: Omit<Item, 'id'> | Item) => {
    if ((itemData as Item).id) {
      // Edit existing item
      await handleUpdateItem(itemData as Item);
    } else {
      // Add new item
      await handleAddItem(itemData as Omit<Item, 'id'>);
    }
    await loadItems();
    setShowAddModal(false);
    setEditingItem(null);
  };

  const handleEditClick = (item: Item) => {
    setEditingItem(item);
  };

  const handleCloseModal = () => {
    setShowAddModal(false);
    setEditingItem(null);
  };

  const itemColumns: Column<Item>[] = [
    {
      key: 'image',
      title: t('common.image'),
      render: (_, item) => (
        <div className="w-12 h-12 bg-gray-100 dark:bg-gray-800 rounded-lg flex items-center justify-center overflow-hidden">
          {item.image ? (
            <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
          ) : (
            <CubeIcon className="w-6 h-6 text-gray-400" />
          )}
        </div>
      ),
    },
    {
      key: 'name',
      title: t('catalog.itemName'),
      sortable: true,
    },
    {
      key: 'category',
      title: t('catalog.category'),
      sortable: true,
      render: (value, item) => {
        const category = categories.find(c => c.id === (item as any).categoryId);
        return (
          <div className="flex items-center gap-2">
            {category && (
              <div
                className="w-3 h-3 rounded-full flex-shrink-0"
                style={{ backgroundColor: category.color }}
              />
            )}
            <span>{value}</span>
          </div>
        );
      },
    },
    {
      key: 'price',
      title: t('catalog.price'),
      sortable: true,
      render: (value) => `${t('common.currency')}${value}`,
    },
    {
      key: 'stock',
      title: t('catalog.stock'),
      sortable: true,
      render: (value) => (
        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
          (value || 0) === 0 ? 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400' :
          (value || 0) <= 5 ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400' :
          'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
        }`}>
          {value || 0} {t('common.units')}
        </span>
      ),
    },
    {
      key: 'actions',
      title: t('common.actions'),
      render: (_, item) => (
        <div className="flex gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleEditClick(item)}
          >
            <PencilIcon className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleDelete(item.id)}
            className="text-red-600 hover:text-red-700 dark:text-red-400"
          >
            <TrashIcon className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ];

  const EmptyState = () => (
    <div className="text-center py-12">
      <div className="mx-auto w-24 h-24 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mb-4">
        <CubeIcon className="w-12 h-12 text-gray-400" />
      </div>
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
        {t('catalog.noItemsYet')}
      </h3>
      <p className="text-gray-500 dark:text-gray-400 mb-6 max-w-md mx-auto">
        {t('catalog.startBuilding')}
      </p>
      <Button onClick={() => setShowAddModal(true)}>
        <PlusIcon className="w-4 h-4 mr-2" />
        {t('catalog.addItem')}
      </Button>
    </div>
  );

  return (
    <Layout title={t('catalog.title')}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Search and Filter Bar */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="flex-1 relative">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
            <Input
              placeholder={t('catalog.searchItems')}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <div className="flex gap-2">
            <Button
              variant={showCategoryFilter ? 'primary' : 'ghost'}
              size="sm"
              onClick={() => setShowCategoryFilter(!showCategoryFilter)}
            >
              <FunnelIcon className="h-4 w-4 mr-1" />
              {t('catalog.filter')}
            </Button>
            <Button
              variant={viewMode === 'grid' ? 'primary' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('grid')}
            >
              <Squares2X2Icon className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === 'list' ? 'primary' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('list')}
            >
              <ListBulletIcon className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === 'table' ? 'primary' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('table')}
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M3 14h18m-9-4v8m-7 0V4a1 1 0 011-1h16a1 1 0 011 1v16a1 1 0 01-1 1H4a1 1 0 01-1-1V10z" />
              </svg>
            </Button>
          </div>
        </div>

        {/* Category Filter Pills */}
        {showCategoryFilter && categories.length > 0 && (
          <div className="mb-6 flex flex-wrap gap-2">
            <button
              onClick={() => setSelectedCategory(null)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                selectedCategory === null
                  ? 'bg-orange-500 text-white'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
              }`}
            >
              {t('catalog.allCategories')}
            </button>
            {categories.map((category) => (
              <button
                key={category.id}
                onClick={() => setSelectedCategory(category.id)}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-colors flex items-center gap-2 ${
                  selectedCategory === category.id
                    ? 'text-white'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                }`}
                style={
                  selectedCategory === category.id
                    ? { backgroundColor: category.color }
                    : {}
                }
              >
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: category.color }}
                />
                {category.name}
              </button>
            ))}
          </div>
        )}

        {/* Items Display */}
        {filteredItems.length === 0 && !searchTerm && !selectedCategory ? (
          <EmptyState />
        ) : filteredItems.length === 0 ? (
          <div className="text-center py-12">
            <CubeIcon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              {t('catalog.noItemsFound')}
            </h3>
            <p className="text-gray-500 dark:text-gray-400">
              {t('catalog.tryDifferentSearch')}
            </p>
          </div>
        ) : (
          <>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                {filteredItems.length} {t('dashboard.items')}
              </h2>
            </div>

            {viewMode === 'table' ? (
              <DataTable
                data={filteredItems}
                columns={itemColumns}
                searchable={false}
                emptyMessage={t('catalog.noItemsFound')}
                emptyIcon={<CubeIcon className="w-16 h-16" />}
                pageSize={10}
              />
            ) : viewMode === 'grid' ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {filteredItems.map((item) => {
                  const category = categories.find(c => c.id === (item as any).categoryId);
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
                        {/* Stock indicators */}
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
                            ) : (
                              <span className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 text-xs font-medium px-2 py-1 rounded-full">
                                {t('catalog.stockStatus.inStock')}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                      <div className="p-4">
                        <h3 className="font-semibold text-gray-900 dark:text-white mb-1">
                          {item.name}
                        </h3>
                        <div className="flex items-center gap-2 mb-2">
                          {category && (
                            <div
                              className="w-3 h-3 rounded-full"
                              style={{ backgroundColor: category.color }}
                            />
                          )}
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            {item.category}
                          </p>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-lg font-bold text-orange-500 dark:text-orange-400">
                            {t('common.currency')}{item.price}
                          </span>
                          <div className="flex gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEditClick(item)}
                              className="p-2"
                            >
                              <PencilIcon className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDelete(item.id)}
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
            ) : (
              <div className="space-y-4">
                {filteredItems.map((item) => {
                  const category = categories.find(c => c.id === (item as any).categoryId);
                  return (
                    <Card key={item.id} className="p-4">
                      <div className="flex items-center">
                        <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-lg flex items-center justify-center flex-shrink-0">
                          {item.image ? (
                            <img
                              src={item.image}
                              alt={item.name}
                              className="w-full h-full object-cover rounded-lg"
                            />
                          ) : (
                            <CubeIcon className="h-8 w-8 text-gray-400" />
                          )}
                        </div>
                        <div className="ml-4 flex-1">
                          <h3 className="font-semibold text-gray-900 dark:text-white">
                            {item.name}
                          </h3>
                          <div className="flex items-center gap-2">
                            {category && (
                              <div
                                className="w-3 h-3 rounded-full"
                                style={{ backgroundColor: category.color }}
                              />
                            )}
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                              {item.category}
                            </p>
                          </div>
                          <p className="text-lg font-bold text-orange-500 dark:text-orange-400">
                            {t('common.currency')}{item.price}
                          </p>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEditClick(item)}
                          >
                            <PencilIcon className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(item.id)}
                            className="text-red-600 hover:text-red-700 dark:text-red-400"
                          >
                            <TrashIcon className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </Card>
                  );
                })}
              </div>
            )}
          </>
        )}

        {/* Floating Action Button */}
        <FAB onClick={() => setShowAddModal(true)} icon={<PlusIcon className="h-6 w-6" />} />

        {/* Add/Edit Item Modal */}
        <ItemFormModal
          isOpen={showAddModal || editingItem !== null}
          onClose={handleCloseModal}
          onSave={handleSaveItem}
          editingItem={editingItem}
          categories={categories}
        />

        {/* Delete Confirmation */}
        <ConfirmDialog
          isOpen={deleteConfirm.isOpen}
          onClose={() => setDeleteConfirm({ isOpen: false, itemId: null })}
          onConfirm={confirmDelete}
          title={t('catalog.confirmDelete')}
          message={t('catalog.deleteConfirmation')}
          confirmText={t('catalog.delete')}
        />
      </div>
    </Layout>
  );
}
