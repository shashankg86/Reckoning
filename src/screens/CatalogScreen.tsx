import {
  CameraIcon,
  CubeIcon,
  ListBulletIcon,
  MagnifyingGlassIcon,
  PencilIcon,
  PlusIcon,
  Squares2X2Icon,
  TrashIcon
} from '@heroicons/react/24/outline';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Layout } from '../components/layout/Layout';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { DataTable, Column } from '../components/ui/DataTable';
import { FAB } from '../components/ui/FAB';
import { Input } from '../components/ui/Input';
import { usePOS } from '../contexts/POSContext';
import type { Item } from '../contexts/POSContext';

export function CatalogScreen() {
  const { t } = useTranslation();
  const { state, dispatch } = usePOS();
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list' | 'table'>('grid');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{ isOpen: boolean; itemId: string | null }>({
    isOpen: false,
    itemId: null
  });

  const filteredItems = state.items.filter(item =>
    item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.category.toLowerCase().includes(searchTerm.toLowerCase())
  );


  const handleDeleteItem = (itemId: string) => {
    setDeleteConfirm({ isOpen: true, itemId });
  };

  const confirmDelete = () => {
    if (deleteConfirm.itemId) {
      dispatch({ type: 'DELETE_ITEM', payload: deleteConfirm.itemId });
    }
    setDeleteConfirm({ isOpen: false, itemId: null });
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
      render: (value, item) => (
        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
          (value || 0) === 0 ? 'bg-red-100 text-red-800' :
          (value || 0) <= 5 ? 'bg-yellow-100 text-yellow-800' :
          'bg-green-100 text-green-800'
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
            onClick={() => setEditingItem(item)}
          >
            <PencilIcon className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleDeleteItem(item.id)}
            className="text-red-600 hover:text-red-700"
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
      <div className="flex flex-col sm:flex-row gap-3 justify-center">
        <Button onClick={() => setShowAddModal(true)}>
          <PlusIcon className="w-4 h-4 mr-2" />
          {t('catalog.addItem')}
        </Button>
        <Button
          variant="secondary"
          onClick={() => dispatch({ type: 'SET_CURRENT_SCREEN', payload: 'ocr' })}
        >
          <CameraIcon className="w-4 h-4 mr-2" />
          {t('catalog.importFromPhoto')}
        </Button>
      </div>
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

        {/* Items Display */}
        {filteredItems.length === 0 ? (
          <EmptyState />
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
                {filteredItems.map((item) => (
                  <Card key={item.id} hover className="overflow-hidden">
                    <div className="aspect-square bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
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
                            <span className="bg-red-100 text-red-800 text-xs font-medium px-2 py-1 rounded-full">
                              {t('catalog.stockStatus.outOfStock')}
                            </span>
                          ) : item.stock <= 5 ? (
                            <span className="bg-yellow-100 text-yellow-800 text-xs font-medium px-2 py-1 rounded-full">
                              {t('catalog.stockStatus.lowStock')}
                            </span>
                          ) : (
                            <span className="bg-green-100 text-green-800 text-xs font-medium px-2 py-1 rounded-full">
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
                      <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">
                        {item.category}
                      </p>
                      <div className="flex items-center justify-between">
                        <span className="text-lg font-bold text-orange-500 dark:text-orange-400">
                          {t('common.currency')}{item.price}
                        </span>
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setEditingItem(item)}
                            className="p-2"
                          >
                            <PencilIcon className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteItem(item.id)}
                            className="p-2 text-red-600 hover:text-red-700"
                          >
                            <TrashIcon className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="space-y-4">
                {filteredItems.map((item) => (
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
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          {item.category}
                        </p>
                        <p className="text-lg font-bold text-orange-500 dark:text-orange-400">
                          {t('common.currency')}{item.price}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setEditingItem(item)}
                        >
                          <PencilIcon className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteItem(item.id)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <TrashIcon className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </>
        )}

        {/* Floating Action Button */}
        <FAB onClick={() => setShowAddModal(true)} icon={<PlusIcon className="h-6 w-6" />} />

        {/* Add/Edit Item Modal would go here - simplified for this demo */}
        {(showAddModal || editingItem) && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                {editingItem
                  ? t('catalog.editItem')
                  : t('catalog.addItem')
                }
              </h2>
              <div className="space-y-4">
                <Input label={t('catalog.itemName')} placeholder={t('catalog.enterItemName')} />
                <Input label={t('catalog.price')} type="number" placeholder="0" />
                <Input label={t('catalog.category')} placeholder={t('catalog.enterCategory')} />
              </div>
              <div className="flex gap-3 mt-6">
                <Button
                  variant="secondary"
                  onClick={() => {
                    setShowAddModal(false);
                    setEditingItem(null);
                  }}
                  className="flex-1"
                >
                  {t('common.cancel')}
                </Button>
                <Button
                  onClick={() => {
                    // Handle save logic here
                    setShowAddModal(false);
                    setEditingItem(null);
                  }}
                  className="flex-1"
                >
                  {t('catalog.save')}
                </Button>
              </div>
            </div>
          </div>
        )}

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