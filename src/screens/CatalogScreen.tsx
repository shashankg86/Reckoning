import React, { useState } from 'react';
import { usePOS } from '../context/POSContext';
import { Layout } from '../components/Layout';
import { Card } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { FAB } from '../components/ui/FAB';
import { Search, Grid2x2 as Grid, List, Plus, Package, CreditCard as Edit, Trash2, Camera } from 'lucide-react';

export function CatalogScreen() {
  const { state, dispatch } = usePOS();
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);

  const t = (en: string, hi: string) => state.store?.language === 'hi' ? hi : en;

  const filteredItems = state.items.filter(item =>
    item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleAddItem = (itemData: any) => {
    const newItem = {
      id: Date.now().toString(),
      ...itemData,
    };
    dispatch({ type: 'ADD_ITEM', payload: newItem });
    setShowAddModal(false);
  };

  const handleEditItem = (itemData: any) => {
    dispatch({ type: 'UPDATE_ITEM', payload: { ...editingItem, ...itemData } });
    setEditingItem(null);
  };

  const handleDeleteItem = (itemId: string) => {
    dispatch({ type: 'DELETE_ITEM', payload: itemId });
  };

  const EmptyState = () => (
    <div className="text-center py-12">
      <div className="mx-auto w-24 h-24 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mb-4">
        <Package className="w-12 h-12 text-gray-400" />
      </div>
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
        {t('No items yet', 'अभी तक कोई आइटम नहीं')}
      </h3>
      <p className="text-gray-500 dark:text-gray-400 mb-6 max-w-md mx-auto">
        {t('Start building your catalog by adding items or importing from photos', 'आइटम जोड़कर या फोटो से आयात करके अपनी कैटलॉग बनाना शुरू करें')}
      </p>
      <div className="flex flex-col sm:flex-row gap-3 justify-center">
        <Button onClick={() => setShowAddModal(true)}>
          <Plus className="w-4 h-4 mr-2" />
          {t('Add Item', 'आइटम जोड़ें')}
        </Button>
        <Button
          variant="secondary"
          onClick={() => dispatch({ type: 'SET_CURRENT_SCREEN', payload: 'ocr' })}
        >
          <Camera className="w-4 h-4 mr-2" />
          {t('Import from Photo', 'फोटो से आयात करें')}
        </Button>
      </div>
    </div>
  );

  return (
    <Layout title={t('Item Catalog', 'आइटम कैटलॉग')}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Search and Filter Bar */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
            <Input
              placeholder={t('Search items...', 'आइटम खोजें...')}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <div className="flex gap-2">
            <Button
              variant={viewMode === 'grid' ? 'primary' : 'secondary'}
              size="sm"
              onClick={() => setViewMode('grid')}
              className="px-3"
            >
              <Grid className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === 'list' ? 'primary' : 'secondary'}
              size="sm"
              onClick={() => setViewMode('list')}
              className="px-3"
            >
              <List className="h-4 w-4" />
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
                {filteredItems.length} {t('items', 'आइटम')}
              </h2>
            </div>

            {viewMode === 'grid' ? (
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
                        <Package className="h-12 w-12 text-gray-400" />
                      )}
                      {/* Stock indicators */}
                      {item.stock !== undefined && (
                        <div className="absolute top-2 right-2">
                          {item.stock === 0 ? (
                            <span className="bg-red-100 text-red-800 text-xs font-medium px-2 py-1 rounded-full">
                              Out of Stock
                            </span>
                          ) : item.stock <= 5 ? (
                            <span className="bg-yellow-100 text-yellow-800 text-xs font-medium px-2 py-1 rounded-full">
                              Low Stock
                            </span>
                          ) : (
                            <span className="bg-green-100 text-green-800 text-xs font-medium px-2 py-1 rounded-full">
                              In Stock
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
                          ₹{item.price}
                        </span>
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setEditingItem(item)}
                            className="p-2"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteItem(item.id)}
                            className="p-2 text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="h-4 w-4" />
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
                          <Package className="h-8 w-8 text-gray-400" />
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
                          ₹{item.price}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setEditingItem(item)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteItem(item.id)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="h-4 w-4" />
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
        <FAB onClick={() => setShowAddModal(true)} />

        {/* Add/Edit Item Modal would go here - simplified for this demo */}
        {(showAddModal || editingItem) && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                {editingItem 
                  ? t('Edit Item', 'आइटम संपादित करें')
                  : t('Add Item', 'आइटम जोड़ें')
                }
              </h2>
              <div className="space-y-4">
                <Input label={t('Item Name', 'आइटम का नाम')} placeholder={t('Enter item name', 'आइटम का नाम दर्ज करें')} />
                <Input label={t('Price', 'कीमत')} type="number" placeholder="0" />
                <Input label={t('Category', 'श्रेणी')} placeholder={t('Enter category', 'श्रेणी दर्ज करें')} />
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
                  {t('Cancel', 'रद्द करें')}
                </Button>
                <Button 
                  onClick={() => {
                    // Handle save logic here
                    setShowAddModal(false);
                    setEditingItem(null);
                  }}
                  className="flex-1"
                >
                  {t('Save', 'सेव करें')}
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}