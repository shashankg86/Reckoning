import { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../../contexts/AuthContext';
import { usePermissions } from '../../hooks/usePermissions';
import { Button } from '../../components/ui/Button';
import { FilterBar } from '../../components/catalog/FilterBar';
import { SearchBar } from '../../components/catalog/SearchBar';
import { ActionBar } from '../../components/catalog/ActionBar';
import { CategoriesTable } from '../../components/catalog/CategoriesTable';
import { ItemsTable } from '../../components/catalog/ItemsTable';
import { FullMenuView } from '../../components/catalog/FullMenuView';
import { BulkAddCategoriesModal } from '../../components/catalog/BulkAddCategoriesModal';
import { BulkAddItemsModal } from '../../components/catalog/BulkAddItemsModal';
import { ConfirmDialog } from '../../components/catalog/ConfirmDialog';
import { CategoryFormModal } from '../../components/catalog/CategoryFormModal';
import { ItemFormModal } from '../../components/catalog/ItemFormModal';
import { useCatalogState } from '../../hooks/useCatalogState';
import { useCatalogFilters } from '../../hooks/useCatalogFilters';
import { useCatalogQueries, catalogKeys } from '../../hooks/useCatalogQueries';
import { storageService, STORAGE_PATHS } from '../../lib/storage';
import type { Category, Item } from '../../types/menu';
import type { ItemFilter } from '../../api/items';

type MenuTab = 'global' | 'categories' | 'items' | 'fullMenu';

export function MenuSettings() {
    const { t } = useTranslation();
    const { state, updateStoreSettings } = useAuth();
    const { canManageMenu } = usePermissions();
    const storeId = state.user?.store?.id;
    const queryClient = useQueryClient();

    // Tab State
    const [currentTab, setCurrentTab] = useState<MenuTab>('global');
    const [page, setPage] = useState(1);
    const limit = 20;

    // Global Settings State
    const [globalFormData, setGlobalFormData] = useState({
        tax_rate: state.user?.store?.tax_rate || 0,
        currency: state.user?.store?.currency || 'USD',
        print_header: state.user?.store?.settings?.print_header || '',
        print_footer: state.user?.store?.settings?.print_footer || '',
    });
    const [isSavingGlobal, setIsSavingGlobal] = useState(false);

    // Filters
    const {
        filters,
        updateFilter,
        resetFilters,
        filterCategories,
        getMaxPrice
    } = useCatalogFilters();

    // Map UI filters to API filters
    const apiFilters: ItemFilter = useMemo(() => ({
        search: filters.search,
        min_price: filters.priceRange.min,
        max_price: filters.priceRange.max,
        category_id: filters.categories.length > 0 ? filters.categories[0] : undefined,
        stock_status: filters.stockFilter === 'all' ? undefined : filters.stockFilter,
        is_active: true
    }), [filters]);

    // Data Fetching (React Query)
    const { categoriesQuery, useItems } = useCatalogQueries(storeId || '');

    const itemsQuery = useItems(
        apiFilters,
        page,
        limit,
        filters.sortBy,
        filters.sortOrder
    );

    const dbCategories = categoriesQuery.data || [];
    const dbItems = itemsQuery.data?.data || [];
    const totalItems = itemsQuery.data?.count || 0;
    const totalPages = Math.ceil(totalItems / limit);

    // State Management (Local + Pending Changes)
    const {
        categories,
        items,
        itemCounts,
        pendingChanges,
        loading: stateLoading,
        saveAll,
        discardAll,
        addCategory,
        updateCategory,
        deleteCategory,
        addItem,
        updateItem,
        deleteItem,
    } = useCatalogState(storeId || '', dbCategories, dbItems);

    const loading = categoriesQuery.isLoading || itemsQuery.isLoading || stateLoading;

    // UI State for Modals
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
        type: 'delete' | 'discard' | 'bulkDelete';
        target: 'category' | 'item' | 'all' | 'categories' | 'items';
        id?: string;
        name?: string;
        ids?: string[];
        count?: number;
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

    // Filter categories locally
    const filteredCategories = useMemo(() => {
        return filterCategories(categories);
    }, [categories, filterCategories]);

    const maxPrice = useMemo(() => {
        return getMaxPrice(items);
    }, [items, getMaxPrice]);

    if (!canManageMenu) {
        return <div className="p-4">Access Denied</div>;
    }

    // Reset filters when switching tabs
    const handleTabChange = (tab: MenuTab) => {
        setCurrentTab(tab);
        resetFilters();
        setPage(1);
    };

    // Global Settings Handlers
    const handleGlobalChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setGlobalFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleGlobalSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSavingGlobal(true);
        try {
            await updateStoreSettings({
                tax_rate: Number(globalFormData.tax_rate),
                currency: globalFormData.currency,
                settings: {
                    ...state.user?.store?.settings,
                    print_header: globalFormData.print_header,
                    print_footer: globalFormData.print_footer,
                }
            }, { showToast: true });
        } catch (error) {
            console.error(error);
            toast.error('Failed to update settings');
        } finally {
            setIsSavingGlobal(false);
        }
    };

    // Menu Management Handlers
    const handleSaveAll = async () => {
        try {
            setIsSaving(true);
            await saveAll();
            await queryClient.invalidateQueries({ queryKey: catalogKeys.all });
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

    const handleBulkAddCategories = async (categoriesToAdd: any[], imageFiles: (File | null)[]) => {
        try {
            const filesToUpload = imageFiles.filter(f => f !== null) as File[];
            let uploadedUrls: (string | null)[] = Array(imageFiles.length).fill(null);

            if (filesToUpload.length > 0) {
                const uploadToast = toast.loading(t('menuSetup.uploadingImages', { count: filesToUpload.length }));

                try {
                    const uploadResult = await storageService.batchUploadImages(
                        filesToUpload,
                        STORAGE_PATHS.CATEGORIES,
                        `store_${storeId}`,
                        20,
                        (completed, total) => {
                            toast.loading(t('menuSetup.uploadingProgress', { completed, total }), { id: uploadToast });
                        }
                    );

                    let uploadedIndex = 0;
                    uploadedUrls = imageFiles.map(file => {
                        if (file !== null) {
                            const result = uploadResult.successful[uploadedIndex];
                            uploadedIndex++;
                            return result?.url || null;
                        }
                        return null;
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

            categoriesToAdd.forEach((cat, index) => {
                addCategory({
                    ...cat,
                    image_url: uploadedUrls[index] || cat.image_url
                });
            });

            toast.success(`${t('common.added')} ${categoriesToAdd.length} ${t('catalog.categories')}`);
            setShowBulkAddCategories(false);
        } catch (error) {
            console.error('Bulk add categories error:', error);
            toast.error(t('common.error'));
        }
    };

    const handleBulkAddItems = async (itemsToAdd: any[], imageFiles: (File | null)[]) => {
        try {
            const filesToUpload = imageFiles.filter(f => f !== null) as File[];
            let uploadedUrls: (string | null)[] = Array(imageFiles.length).fill(null);

            if (filesToUpload.length > 0) {
                const uploadToast = toast.loading(t('menuSetup.uploadingImages', { count: filesToUpload.length }));

                try {
                    const uploadResult = await storageService.batchUploadImages(
                        filesToUpload,
                        STORAGE_PATHS.ITEMS,
                        `store_${storeId}`,
                        20,
                        (completed, total) => {
                            toast.loading(t('menuSetup.uploadingProgress', { completed, total }), { id: uploadToast });
                        }
                    );

                    let uploadedIndex = 0;
                    uploadedUrls = imageFiles.map(file => {
                        if (file !== null) {
                            const result = uploadResult.successful[uploadedIndex];
                            uploadedIndex++;
                            return result?.url || null;
                        }
                        return null;
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

            itemsToAdd.forEach((item, index) => {
                addItem({
                    ...item,
                    image_url: uploadedUrls[index] || item.image_url
                });
            });

            toast.success(`${t('common.added')} ${itemsToAdd.length} ${t('catalog.items')}`);
            setShowBulkAddItems(false);
        } catch (error) {
            console.error('Bulk add items error:', error);
            toast.error(t('common.error'));
        }
    };

    const handleEditCategory = (category: Category) => {
        setEditingCategory(category);
        setShowEditCategory(true);
    };

    const handleSaveCategory = async (categoryData: any, imageFile?: File | null) => {
        try {
            let imageUrl = categoryData.image_url || null;

            if (imageFile) {
                const uploadToast = toast.loading(t('menuSetup.uploadingImages', { count: 1 }));

                try {
                    const uploadResult = await storageService.batchUploadImages(
                        [imageFile],
                        STORAGE_PATHS.CATEGORIES,
                        `store_${storeId}`,
                        1
                    );

                    if (uploadResult.successful.length > 0) {
                        imageUrl = uploadResult.successful[0].url;
                        toast.success(t('menuSetup.uploadedImages', { count: 1 }), { id: uploadToast });
                    } else {
                        toast.error(t('menuSetup.imageUploadFailed'), { id: uploadToast });
                    }
                } catch (error) {
                    toast.error(t('menuSetup.imageUploadFailed'), { id: uploadToast });
                    console.error('Image upload error:', error);
                }
            }

            const categoryToSave = {
                ...categoryData,
                image_url: imageUrl
            };

            if (editingCategory) {
                updateCategory({ ...categoryToSave, id: editingCategory.id });
                toast.success(t('catalog.categoryUpdated'));
            } else {
                addCategory(categoryToSave);
                toast.success(t('catalog.categoryAdded'));
            }

            setShowEditCategory(false);
            setEditingCategory(null);
        } catch (error) {
            console.error('Save category error:', error);
            toast.error(t('common.error'));
        }
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

    const handleBulkDeleteCategories = (categoryIds: string[]) => {
        setConfirmDialog({
            isOpen: true,
            type: 'bulkDelete',
            target: 'categories',
            ids: categoryIds,
            count: categoryIds.length
        });
    };

    const handleEditItem = (item: Item) => {
        setEditingItem(item);
        setShowEditItem(true);
    };

    const handleSaveItem = async (itemData: any, imageFile?: File | null) => {
        try {
            let imageUrl = itemData.image_url || null;

            if (imageFile) {
                const uploadToast = toast.loading(t('menuSetup.uploadingImages', { count: 1 }));

                try {
                    const uploadResult = await storageService.batchUploadImages(
                        [imageFile],
                        STORAGE_PATHS.ITEMS,
                        `store_${storeId}`,
                        1
                    );

                    if (uploadResult.successful.length > 0) {
                        imageUrl = uploadResult.successful[0].url;
                        toast.success(t('menuSetup.uploadedImages', { count: 1 }), { id: uploadToast });
                    } else {
                        toast.error(t('menuSetup.imageUploadFailed'), { id: uploadToast });
                    }
                } catch (error) {
                    toast.error(t('menuSetup.imageUploadFailed'), { id: uploadToast });
                    console.error('Image upload error:', error);
                }
            }

            const itemToSave = {
                ...itemData,
                image_url: imageUrl
            };

            if (editingItem) {
                updateItem({ ...itemToSave, id: editingItem.id });
                toast.success('Item updated (pending save)');
            } else {
                addItem(itemToSave);
                toast.success('Item added (pending save)');
            }

            setShowEditItem(false);
            setEditingItem(null);
        } catch (error) {
            console.error('Save item error:', error);
            toast.error(t('common.error'));
        }
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

    const handleBulkDeleteItems = (itemIds: string[]) => {
        setConfirmDialog({
            isOpen: true,
            type: 'bulkDelete',
            target: 'items',
            ids: itemIds,
            count: itemIds.length
        });
    };

    const handleAddItemToCategory = (categoryId: string) => {
        setSelectedCategoryForItem(categoryId);
        setShowBulkAddItems(true);
    };

    const handleConfirmDialog = async () => {
        if (confirmDialog.type === 'discard' && confirmDialog.target === 'all') {
            discardAll();
            toast.success(t('catalog.allChangesDiscarded'));
        } else if (confirmDialog.type === 'delete') {
            if (confirmDialog.target === 'category' && confirmDialog.id) {
                deleteCategory(confirmDialog.id);
                toast.success(t('catalog.categoryDeleted'));
            } else if (confirmDialog.target === 'item' && confirmDialog.id) {
                deleteItem(confirmDialog.id);
                toast.success(t('catalog.itemDeleted'));
            }
        } else if (confirmDialog.type === 'bulkDelete') {
            if (confirmDialog.target === 'categories' && confirmDialog.ids) {
                confirmDialog.ids.forEach(id => deleteCategory(id));
                toast.success(t('catalog.categoriesDeleted', { count: confirmDialog.ids.length }));
            } else if (confirmDialog.target === 'items' && confirmDialog.ids) {
                confirmDialog.ids.forEach(id => deleteItem(id));
                toast.success(t('catalog.itemsDeleted', { count: confirmDialog.ids.length }));
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
        } else if (confirmDialog.type === 'bulkDelete') {
            if (confirmDialog.target === 'categories') {
                return {
                    title: t('catalog.deleteCategories'),
                    message: t('catalog.bulkDeleteConfirmation', {
                        count: confirmDialog.count || 0,
                        type: t('catalog.categories').toLowerCase()
                    }),
                    confirmText: t('catalog.deleteSelected')
                };
            } else {
                return {
                    title: t('catalog.deleteItems'),
                    message: t('catalog.bulkDeleteConfirmation', {
                        count: confirmDialog.count || 0,
                        type: t('catalog.items').toLowerCase()
                    }),
                    confirmText: t('catalog.deleteSelected')
                };
            }
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
        <div className="max-w-7xl">
            <div className="mb-6">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{t('settings.menu')}</h2>
                <p className="text-gray-500 dark:text-gray-400">Configure global settings and manage your menu.</p>
            </div>

            {/* Tab Navigation */}
            <div className="border-b border-gray-200 dark:border-gray-700 mb-6">
                <nav className="-mb-px flex space-x-8">
                    <button
                        onClick={() => handleTabChange('global')}
                        className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${currentTab === 'global'
                            ? 'border-orange-500 text-orange-600 dark:text-orange-400'
                            : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'
                            }`}
                    >
                        Global Settings
                    </button>
                    <button
                        onClick={() => handleTabChange('categories')}
                        className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${currentTab === 'categories'
                            ? 'border-orange-500 text-orange-600 dark:text-orange-400'
                            : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'
                            }`}
                    >
                        {t('catalog.categories')}
                    </button>
                    <button
                        onClick={() => handleTabChange('items')}
                        className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${currentTab === 'items'
                            ? 'border-orange-500 text-orange-600 dark:text-orange-400'
                            : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'
                            }`}
                    >
                        {t('catalog.allItems')}
                    </button>
                    <button
                        onClick={() => handleTabChange('fullMenu')}
                        className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${currentTab === 'fullMenu'
                            ? 'border-orange-500 text-orange-600 dark:text-orange-400'
                            : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'
                            }`}
                    >
                        {t('catalog.fullMenu')}
                    </button>
                </nav>
            </div>

            {/* Tab Content */}
            {currentTab === 'global' && (
                <div className="space-y-6">
                    <form onSubmit={handleGlobalSubmit} className="space-y-6">
                        {/* Regional & Tax Settings */}
                        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Regional & Tax Settings</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                        Currency
                                    </label>
                                    <select
                                        name="currency"
                                        value={globalFormData.currency}
                                        onChange={handleGlobalChange}
                                        className="block w-full px-3 py-2 rounded-md border-gray-300 shadow-sm focus:border-orange-500 focus:ring-orange-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white sm:text-sm"
                                    >
                                        <option value="USD">USD - US Dollar</option>
                                        <option value="EUR">EUR - Euro</option>
                                        <option value="GBP">GBP - British Pound</option>
                                        <option value="INR">INR - Indian Rupee</option>
                                        <option value="JPY">JPY - Japanese Yen</option>
                                        <option value="CNY">CNY - Chinese Yuan</option>
                                        <option value="AED">AED - UAE Dirham</option>
                                    </select>
                                    <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">Currency for all transactions and pricing</p>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                        Default Tax Rate (%)
                                    </label>
                                    <input
                                        type="number"
                                        name="tax_rate"
                                        value={globalFormData.tax_rate}
                                        onChange={handleGlobalChange}
                                        min="0"
                                        max="100"
                                        step="0.01"
                                        className="block w-full px-3 py-2 rounded-md border-gray-300 shadow-sm focus:border-orange-500 focus:ring-orange-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white sm:text-sm"
                                        placeholder="0.00"
                                    />
                                    <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">Applied to all items unless overridden</p>
                                </div>
                            </div>
                        </div>

                        {/* Receipt Settings */}
                        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Receipt Configuration</h3>
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                        Receipt Header
                                    </label>
                                    <textarea
                                        name="print_header"
                                        value={globalFormData.print_header}
                                        onChange={handleGlobalChange}
                                        rows={3}
                                        className="block w-full px-3 py-2 rounded-md border-gray-300 shadow-sm focus:border-orange-500 focus:ring-orange-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white sm:text-sm"
                                        placeholder="Welcome to [Store Name]&#10;123 Main Street, City&#10;Phone: +1 234 567 8900"
                                    />
                                    <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">Appears at the top of printed receipts</p>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                        Receipt Footer
                                    </label>
                                    <textarea
                                        name="print_footer"
                                        value={globalFormData.print_footer}
                                        onChange={handleGlobalChange}
                                        rows={3}
                                        className="block w-full px-3 py-2 rounded-md border-gray-300 shadow-sm focus:border-orange-500 focus:ring-orange-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white sm:text-sm"
                                        placeholder="Thank you for your business!&#10;Visit us again soon.&#10;Follow us @yourstore"
                                    />
                                    <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">Appears at the bottom of printed receipts</p>
                                </div>
                            </div>
                        </div>

                        {/* Order Settings */}
                        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Order Configuration</h3>
                            <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                            Auto-print receipts
                                        </label>
                                        <p className="text-xs text-gray-500 dark:text-gray-400">Automatically print receipt after order completion</p>
                                    </div>
                                    <label className="relative inline-flex items-center cursor-pointer">
                                        <input type="checkbox" className="sr-only peer" defaultChecked />
                                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-orange-300 dark:peer-focus:ring-orange-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-orange-500"></div>
                                    </label>
                                </div>

                                <div className="flex items-center justify-between">
                                    <div>
                                        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                            Require order confirmation
                                        </label>
                                        <p className="text-xs text-gray-500 dark:text-gray-400">Show confirmation dialog before finalizing orders</p>
                                    </div>
                                    <label className="relative inline-flex items-center cursor-pointer">
                                        <input type="checkbox" className="sr-only peer" />
                                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-orange-300 dark:peer-focus:ring-orange-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-orange-500"></div>
                                    </label>
                                </div>

                                <div className="flex items-center justify-between">
                                    <div>
                                        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                            Enable tips
                                        </label>
                                        <p className="text-xs text-gray-500 dark:text-gray-400">Allow customers to add tips to their orders</p>
                                    </div>
                                    <label className="relative inline-flex items-center cursor-pointer">
                                        <input type="checkbox" className="sr-only peer" defaultChecked />
                                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-orange-300 dark:peer-focus:ring-orange-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-orange-500"></div>
                                    </label>
                                </div>

                                <div className="flex items-center justify-between">
                                    <div>
                                        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                            Low stock alerts
                                        </label>
                                        <p className="text-xs text-gray-500 dark:text-gray-400">Notify when items are running low</p>
                                    </div>
                                    <label className="relative inline-flex items-center cursor-pointer">
                                        <input type="checkbox" className="sr-only peer" defaultChecked />
                                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-orange-300 dark:peer-focus:ring-orange-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-orange-500"></div>
                                    </label>
                                </div>
                            </div>
                        </div>

                        {/* Payment Methods */}
                        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Accepted Payment Methods</h3>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                <div className="flex items-center">
                                    <input
                                        id="payment-cash"
                                        type="checkbox"
                                        defaultChecked
                                        className="w-4 h-4 text-orange-600 bg-gray-100 border-gray-300 rounded focus:ring-orange-500 dark:focus:ring-orange-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
                                    />
                                    <label htmlFor="payment-cash" className="ml-2 text-sm font-medium text-gray-900 dark:text-gray-300">
                                        Cash
                                    </label>
                                </div>
                                <div className="flex items-center">
                                    <input
                                        id="payment-card"
                                        type="checkbox"
                                        defaultChecked
                                        className="w-4 h-4 text-orange-600 bg-gray-100 border-gray-300 rounded focus:ring-orange-500 dark:focus:ring-orange-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
                                    />
                                    <label htmlFor="payment-card" className="ml-2 text-sm font-medium text-gray-900 dark:text-gray-300">
                                        Card
                                    </label>
                                </div>
                                <div className="flex items-center">
                                    <input
                                        id="payment-upi"
                                        type="checkbox"
                                        defaultChecked
                                        className="w-4 h-4 text-orange-600 bg-gray-100 border-gray-300 rounded focus:ring-orange-500 dark:focus:ring-orange-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
                                    />
                                    <label htmlFor="payment-upi" className="ml-2 text-sm font-medium text-gray-900 dark:text-gray-300">
                                        UPI
                                    </label>
                                </div>
                                <div className="flex items-center">
                                    <input
                                        id="payment-wallet"
                                        type="checkbox"
                                        className="w-4 h-4 text-orange-600 bg-gray-100 border-gray-300 rounded focus:ring-orange-500 dark:focus:ring-orange-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
                                    />
                                    <label htmlFor="payment-wallet" className="ml-2 text-sm font-medium text-gray-900 dark:text-gray-300">
                                        Wallet
                                    </label>
                                </div>
                            </div>
                        </div>

                        {/* Business Hours */}
                        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Business Hours</h3>
                            <div className="space-y-3">
                                {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map((day) => (
                                    <div key={day} className="grid grid-cols-12 gap-4 items-center">
                                        <div className="col-span-3">
                                            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{day}</span>
                                        </div>
                                        <div className="col-span-3">
                                            <input
                                                type="time"
                                                defaultValue="09:00"
                                                className="block w-full px-3 py-2 rounded-md border-gray-300 shadow-sm focus:border-orange-500 focus:ring-orange-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white text-sm"
                                            />
                                        </div>
                                        <div className="col-span-1 text-center">
                                            <span className="text-sm text-gray-500 dark:text-gray-400">to</span>
                                        </div>
                                        <div className="col-span-3">
                                            <input
                                                type="time"
                                                defaultValue="21:00"
                                                className="block w-full px-3 py-2 rounded-md border-gray-300 shadow-sm focus:border-orange-500 focus:ring-orange-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white text-sm"
                                            />
                                        </div>
                                        <div className="col-span-2">
                                            <label className="flex items-center">
                                                <input
                                                    type="checkbox"
                                                    className="w-4 h-4 text-orange-600 bg-gray-100 border-gray-300 rounded focus:ring-orange-500 dark:focus:ring-orange-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
                                                />
                                                <span className="ml-2 text-xs text-gray-600 dark:text-gray-400">Closed</span>
                                            </label>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Save Button */}
                        <div className="flex justify-end bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
                            <Button type="submit" isLoading={isSavingGlobal} size="lg">
                                Save All Settings
                            </Button>
                        </div>
                    </form>
                </div>
            )}

            {currentTab !== 'global' && (
                <div className="space-y-6">
                    {/* Search Bar for Categories Tab */}
                    {currentTab === 'categories' && (
                        <SearchBar
                            value={filters.search}
                            onChange={(value) => updateFilter('search', value)}
                            placeholder={t('catalog.searchCategories')}
                        />
                    )}

                    {/* Full Filter Bar for Items Tab */}
                    {currentTab === 'items' && (
                        <FilterBar
                            filters={filters}
                            categories={categories}
                            maxPrice={maxPrice}
                            onFilterChange={updateFilter}
                            onReset={resetFilters}
                        />
                    )}

                    {/* Search Bar for Full Menu Tab */}
                    {currentTab === 'fullMenu' && (
                        <SearchBar
                            value={filters.search}
                            onChange={(value) => updateFilter('search', value)}
                            placeholder={t('catalog.searchMenu')}
                        />
                    )}

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

                    {/* Tab Content */}
                    {loading && !items.length ? (
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
                                    onBulkDelete={handleBulkDeleteCategories}
                                />
                            )}

                            {currentTab === 'items' && (
                                <>
                                    <ItemsTable
                                        items={items}
                                        categories={categories}
                                        onEdit={handleEditItem}
                                        onDelete={handleDeleteItem}
                                        onBulkDelete={handleBulkDeleteItems}
                                    />

                                    {/* Pagination Controls */}
                                    {totalPages > 1 && (
                                        <div className="flex justify-center items-center space-x-4 mt-6">
                                            <button
                                                onClick={() => setPage(p => Math.max(1, p - 1))}
                                                disabled={page === 1}
                                                className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed dark:bg-gray-800 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
                                            >
                                                {t('common.previous')}
                                            </button>
                                            <span className="text-sm text-gray-700 dark:text-gray-300">
                                                Page {page} of {totalPages}
                                            </span>
                                            <button
                                                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                                                disabled={page === totalPages}
                                                className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed dark:bg-gray-800 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
                                            >
                                                {t('common.next')}
                                            </button>
                                        </div>
                                    )}
                                </>
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
            )}
        </div>
    );
}
