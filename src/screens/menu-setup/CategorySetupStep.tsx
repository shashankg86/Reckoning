import { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import {
  PlusIcon,
  RectangleStackIcon,
  MagnifyingGlassIcon,
  TrashIcon,
  ArrowPathIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { Input } from '../../components/ui/Input';
import { useAuth } from '../../contexts/AuthContext';
import { useCatalogQueries } from '../../hooks/useCatalogQueries';
import { categoriesAPI } from '../../api/categories';
import { storageService, STORAGE_PATHS, imageCache } from '../../lib/storage';
import { CategoryCard } from './components/CategoryCard';
import { CategoryFormModal } from './components/CategoryFormModal';
import { CategoryBulkCreateModal } from './components/CategoryBulkCreateModal';
import type { Category, CreateCategoryData, UpdateCategoryData } from '../../types/menu';

interface CategorySetupStepProps {
  onNext: () => void;
}

// Local category with change tracking
interface LocalCategory extends Omit<Category, 'id'> {
  id: string;
  _isNew?: boolean; // Flag to indicate not yet saved to DB
  _isModified?: boolean; // Flag to indicate edited (for existing DB records)
  _isDeleted?: boolean; // Flag to indicate marked for deletion
  _originalData?: Category; // Keep original data for updates
  _imageFile?: File | null; // Local image file before upload
}

const LOCAL_CATEGORIES_KEY = 'menu_setup_pending_categories';

export function CategorySetupStep({ onNext }: CategorySetupStepProps) {
  const { t } = useTranslation();
  const { state: authState } = useAuth();
  const storeId = authState.user?.store?.id || '';

  const { categoriesQuery } = useCatalogQueries(storeId);
  const existingCategories = useMemo(() => categoriesQuery.data || [], [categoriesQuery.data]);
  const loadingExisting = categoriesQuery.isLoading;

  const [localCategories, setLocalCategories] = useState<LocalCategory[]>([]);
  const [showCategoryForm, setShowCategoryForm] = useState(false);
  const [showBulkCreate, setShowBulkCreate] = useState(false);
  const [editingCategory, setEditingCategory] = useState<LocalCategory | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategories, setSelectedCategories] = useState<Set<string>>(new Set());
  const [deleteConfirm, setDeleteConfirm] = useState<{ isOpen: boolean; category: LocalCategory | null }>({
    isOpen: false,
    category: null,
  });
  const [bulkDeleteConfirm, setBulkDeleteConfirm] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (existingCategories.length > 0) {
      try {
        const stored = localStorage.getItem(LOCAL_CATEGORIES_KEY);
        const pendingCategories = stored ? (JSON.parse(stored) as LocalCategory[]) : [];

        const mergedCategories: LocalCategory[] = existingCategories.map((cat) => ({
          ...cat,
          _originalData: cat,
        }));

        pendingCategories.forEach((pending) => {
          if (pending._isNew) {
            mergedCategories.push(pending);
          } else if (pending._isModified || pending._isDeleted) {
            const index = mergedCategories.findIndex((c) => c.id === pending.id);
            if (index !== -1) {
              mergedCategories[index] = pending;
            }
          }
        });

        setLocalCategories(mergedCategories);
      } catch (error) {
        console.error('Failed to merge categories with localStorage:', error);
        setLocalCategories(
          existingCategories.map((cat: Category) => ({
            ...cat,
            _originalData: cat,
          }))
        );
      }
    }
  }, [existingCategories]);

  useEffect(() => {
    if (localCategories.length > 0) {
      try {
        const pendingChanges = localCategories.filter((cat) => cat._isNew || cat._isModified || cat._isDeleted);
        if (pendingChanges.length > 0) {
          localStorage.setItem(LOCAL_CATEGORIES_KEY, JSON.stringify(pendingChanges));
        } else {
          localStorage.removeItem(LOCAL_CATEGORIES_KEY);
        }
      } catch (error) {
        console.error('Failed to persist pending categories to localStorage:', error);
      }
    }
  }, [localCategories]);

  const handleCreateCategory = async (data: CreateCategoryData, imageFile?: File | null) => {
    const newCategory: LocalCategory = {
      ...data,
      id: `temp_${Date.now()}_${Math.random()}`,
      _isNew: true,
      _imageFile: imageFile || null,
      is_active: true,
      store_id: storeId,
      sort_order: localCategories.length,
      created_at: new Date().toISOString(),
      created_by: authState.user?.uid || '',
      updated_at: new Date().toISOString(),
      image_url: null,
      parent_id: null,
      metadata: {},
      description: data.description || null,
      color: data.color || '#000000',
      icon: data.icon || '',
    };

    if (imageFile) {
      await imageCache.set(newCategory.id, imageFile);
    }

    setLocalCategories((prev) => [...prev, newCategory]);
    toast.success(t('menuSetup.categoryAddedLocally'));
    setShowCategoryForm(false);
  };

  const handleUpdateCategory = async (data: UpdateCategoryData, imageFile?: File | null) => {
    if (!editingCategory) return;

    if (imageFile) {
      await imageCache.set(editingCategory.id, imageFile);
    }

    setLocalCategories((prev) =>
      prev.map((cat) => {
        if (cat.id === editingCategory.id) {
          if (cat._isNew) {
            return {
              ...cat,
              ...data,
              _imageFile: imageFile !== undefined ? imageFile : cat._imageFile,
              updated_at: new Date().toISOString()
            };
          }
          return {
            ...cat,
            ...data,
            _imageFile: imageFile !== undefined ? imageFile : cat._imageFile,
            _isModified: true,
            updated_at: new Date().toISOString(),
          };
        }
        return cat;
      })
    );

    toast.success(t('menuSetup.categoryUpdated'));
    setEditingCategory(null);
    setShowCategoryForm(false);
  };

  const handleDeleteCategory = () => {
    if (!deleteConfirm.category) return;

    setLocalCategories((prev) =>
      prev
        .map((cat) => {
          if (cat.id === deleteConfirm.category!.id) {
            // If it's a new category, just remove it entirely
            if (cat._isNew) {
              return null;
            }
            // If it's an existing category, mark as deleted
            return { ...cat, _isDeleted: true };
          }
          return cat;
        })
        .filter(Boolean) as LocalCategory[]
    );

    toast.success(t('menuSetup.categoryDeleted'));
    setDeleteConfirm({ isOpen: false, category: null });
  };

  const handleBulkCreate = (categories: CreateCategoryData[]) => {
    // Add all categories to local state only
    const newCategories: LocalCategory[] = categories.map((data, index) => ({
      ...data,
      id: `temp_${Date.now()}_${index}`,
      _isNew: true,
      is_active: true,
      store_id: storeId,
      sort_order: localCategories.length + index,
      created_at: new Date().toISOString(),
      created_by: authState.user?.uid || '',
      updated_at: new Date().toISOString(),
      image_url: null,
      parent_id: null,
      metadata: {},
      description: data.description || null,
      color: data.color || '#000000',
      icon: data.icon || '',
    }));

    setLocalCategories((prev) => [...prev, ...newCategories]);
    toast.success(`${t('menuSetup.added')} ${categories.length} ${t('menuSetup.categoriesLocally')}`);
    setShowBulkCreate(false);
  };

  const handleBulkDelete = () => {
    setLocalCategories((prev) =>
      prev
        .map((cat) => {
          if (selectedCategories.has(cat.id)) {
            // If it's a new category, remove it entirely
            if (cat._isNew) {
              return null;
            }
            // If it's an existing category, mark as deleted
            return { ...cat, _isDeleted: true };
          }
          return cat;
        })
        .filter(Boolean) as LocalCategory[]
    );

    toast.success(`${t('menuSetup.deleted')} ${selectedCategories.size} ${t('menuSetup.categories')}`);
    setSelectedCategories(new Set());
    setBulkDeleteConfirm(false);
  };

  const toggleCategorySelection = (categoryId: string) => {
    const newSelection = new Set(selectedCategories);
    if (newSelection.has(categoryId)) {
      newSelection.delete(categoryId);
    } else {
      newSelection.add(categoryId);
    }
    setSelectedCategories(newSelection);
  };

  const toggleSelectAll = () => {
    if (selectedCategories.size === filteredCategories.length) {
      setSelectedCategories(new Set());
    } else {
      setSelectedCategories(new Set(filteredCategories.map((c) => c.id)));
    }
  };

  const activeCategories = localCategories.filter((cat) => !cat._isDeleted);

  const filteredCategories = activeCategories.filter(
    (cat) =>
      cat.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (cat.description?.toLowerCase() || '').includes(searchQuery.toLowerCase())
  );

  const handleContinueToItems = async () => {
    if (activeCategories.length === 0) {
      toast.error(t('menuSetup.pleaseAddCategories'));
      return;
    }

    const toCreate = localCategories.filter((cat) => cat._isNew && !cat._isDeleted);
    const toUpdate = localCategories.filter((cat) => cat._isModified && !cat._isDeleted && !cat._isNew);
    const toDelete = localCategories.filter((cat) => cat._isDeleted && !cat._isNew);

    if (toCreate.length === 0 && toUpdate.length === 0 && toDelete.length === 0) {
      onNext();
      return;
    }

    setIsSaving(true);

    try {
      let operationCount = 0;

      // STEP 1: Upload images
      const categoriesToUpload = [...toCreate, ...toUpdate].filter((cat) => cat._imageFile);

      if (categoriesToUpload.length > 0) {
        const uploadToast = toast.loading(t('menuSetup.uploadingImages', { count: categoriesToUpload.length }));

        try {
          const files = categoriesToUpload.map((cat) => cat._imageFile!);
          const uploadResult = await storageService.batchUploadImages(
            files,
            STORAGE_PATHS.CATEGORIES,
            `store_${storeId}`,
            20,
            (completed, total) => {
              toast.loading(t('menuSetup.uploadingProgress', { completed, total }), { id: uploadToast });
            }
          );

          uploadResult.successful.forEach((result, index) => {
            const category = categoriesToUpload[index];
            category.image_url = result.url || null;
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

      // STEP 2: Delete categories
      if (toDelete.length > 0) {
        const deleteIds = toDelete.map((cat) => cat.id);
        await categoriesAPI.bulkPermanentlyDeleteCategories(deleteIds);
        operationCount += toDelete.length;
      }

      // STEP 3: Update categories
      if (toUpdate.length > 0) {
        const updates = toUpdate.map((cat) => ({
          id: cat.id,
          name: cat.name,
          description: cat.description,
          color: cat.color,
          icon: cat.icon,
          image_url: cat.image_url,
          sort_order: cat.sort_order,
          parent_id: cat.parent_id,
          metadata: cat.metadata,
        }));
        await categoriesAPI.bulkUpdateCategories(updates);
        operationCount += toUpdate.length;
      }

      // STEP 4: Create categories
      if (toCreate.length > 0) {
        const categoriesData: CreateCategoryData[] = toCreate.map((cat) => ({
          name: cat.name,
          description: cat.description || undefined,
          color: cat.color,
          icon: cat.icon,
          image_url: cat.image_url,
          sort_order: cat.sort_order,
          parent_id: cat.parent_id,
          metadata: cat.metadata,
        }));

        await categoriesAPI.bulkCreateCategories(storeId, categoriesData);
        operationCount += toCreate.length;
      }

      toast.success(
        `${t('menuSetup.saved')} ${operationCount} ${operationCount === 1 ? t('menuSetup.change') : t('menuSetup.changes')}`
      );

      localStorage.removeItem(LOCAL_CATEGORIES_KEY);
      onNext();
    } catch (error: unknown) {
      console.error('Failed to sync categories:', error);
      const errorMessage = error instanceof Error ? error.message : t('menuSetup.failedToSaveCategories');
      toast.error(errorMessage);
    } finally {
      setIsSaving(false);
    }
  };

  const canProceed = activeCategories.length > 0;
  const pendingChanges = localCategories.filter(
    (cat) => cat._isNew || cat._isModified || cat._isDeleted
  ).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
          {t('menuSetup.createCategories')}
        </h2>
        <p className="text-gray-600 dark:text-gray-400 mt-2">
          {t('menuSetup.categoriesManualDescription')}
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
        <div className="flex flex-col sm:flex-row gap-4 items-center">
          {/* Search */}
          <div className="flex-1 w-full">
            <div className="relative">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <Input
                type="text"
                placeholder={t('menuSetup.searchCategories')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-2 w-full sm:w-auto">
            <Button
              onClick={() => setShowCategoryForm(true)}
              disabled={loadingExisting || isSaving}
              className="flex-1 sm:flex-none"
            >
              <PlusIcon className="w-5 h-5 mr-2" />
              {t('menuSetup.addSingle')}
            </Button>

            <Button
              variant="secondary"
              onClick={() => setShowBulkCreate(true)}
              disabled={loadingExisting || isSaving}
              className="flex-1 sm:flex-none"
            >
              <RectangleStackIcon className="w-5 h-5 mr-2" />
              {t('menuSetup.addBulk')}
            </Button>
          </div>
        </div>

        {/* Bulk Actions */}
        {selectedCategories.size > 0 && (
          <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600 dark:text-gray-400">
                {selectedCategories.size} {t('menuSetup.selected')}
              </span>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setBulkDeleteConfirm(true)}
                className="text-red-600 hover:text-red-700"
              >
                <TrashIcon className="w-4 h-4 mr-2" />
                {t('menuSetup.deleteSelected')}
              </Button>
            </div>
          </div>
        )}
      </Card>

      {/* Categories List */}
      {filteredCategories.length === 0 ? (
        <Card className="p-12 text-center">
          {searchQuery ? (
            <>
              <MagnifyingGlassIcon className="mx-auto w-16 h-16 text-gray-300 dark:text-gray-600 mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                {t('menuSetup.noMatchingCategories')}
              </h3>
              <p className="text-gray-500 dark:text-gray-400">
                {t('menuSetup.tryDifferentSearch')}
              </p>
            </>
          ) : (
            <>
              <div className="mx-auto w-24 h-24 bg-orange-100 dark:bg-orange-900 rounded-full flex items-center justify-center mb-4">
                <PlusIcon className="w-12 h-12 text-orange-500 dark:text-orange-400" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                {t('menuSetup.noCategoriesYet')}
              </h3>
              <p className="text-gray-500 dark:text-gray-400 mb-6 max-w-md mx-auto">
                {t('menuSetup.startByCreating')}
              </p>
            </>
          )}
        </Card>
      ) : (
        <>
          {/* Select All */}
          {filteredCategories.length > 0 && (
            <div className="flex items-center px-4">
              <input
                type="checkbox"
                checked={
                  selectedCategories.size === filteredCategories.length && filteredCategories.length > 0
                }
                onChange={toggleSelectAll}
                className="h-4 w-4 text-orange-600 focus:ring-orange-500 border-gray-300 rounded"
              />
              <label className="ml-2 text-sm text-gray-600 dark:text-gray-400">
                {t('menuSetup.selectAll')}
              </label>
            </div>
          )}

          {/* Category Cards */}
          <div className="space-y-3">
            {filteredCategories
              .sort((a, b) => a.sort_order - b.sort_order)
              .map((category) => {
                const parentCategory = category.parent_id
                  ? activeCategories.find((c) => c.id === category.parent_id)
                  : null;

                // Create preview URL for local image file
                const categoryWithPreview = category._imageFile
                  ? { ...category, image_url: URL.createObjectURL(category._imageFile) }
                  : category;

                return (
                  <div key={category.id} className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={selectedCategories.has(category.id)}
                      onChange={() => toggleCategorySelection(category.id)}
                      className="h-5 w-5 text-orange-600 focus:ring-orange-500 border-gray-300 rounded"
                    />
                    <div className="flex-1">
                      <CategoryCard
                        category={categoryWithPreview as Category}
                        onEdit={() => {
                          setEditingCategory(category);
                          setShowCategoryForm(true);
                        }}
                        onDelete={() =>
                          setDeleteConfirm({ isOpen: true, category: category })
                        }
                        isSubcategory={!!category.parent_id}
                        parentName={parentCategory?.name}
                        statusBadge={category._isNew ? 'new' : category._isModified ? 'modified' : null}
                      />
                    </div>
                  </div>
                );
              })}
          </div>
        </>
      )}

      {/* Navigation */}
      <div className="flex justify-between pt-6 border-t border-gray-200 dark:border-gray-700">
        <div></div>
        <Button onClick={handleContinueToItems} disabled={!canProceed || isSaving} size="lg">
          {isSaving ? (
            <>
              <ArrowPathIcon className="w-5 h-5 mr-2 animate-spin" />
              {t('menuSetup.saving')}
            </>
          ) : (
            t('menuSetup.continueToItems')
          )}
        </Button>
      </div>

      {/* Category Form Modal */}
      <CategoryFormModal
        isOpen={showCategoryForm}
        onClose={() => {
          setShowCategoryForm(false);
          setEditingCategory(null);
        }}
        onSubmit={async (data, imageFile) => {
          if (editingCategory) {
            await handleUpdateCategory(data as UpdateCategoryData, imageFile);
          } else {
            await handleCreateCategory(data as CreateCategoryData, imageFile);
          }
        }}
        category={editingCategory as Category | null}
        title={
          editingCategory ? t('menuSetup.editCategory') : t('menuSetup.createCategory')
        }
        availableParentCategories={activeCategories as Category[]}
      />

      {/* Bulk Create Modal */}
      <CategoryBulkCreateModal
        isOpen={showBulkCreate}
        onClose={() => setShowBulkCreate(false)}
        onSubmit={async (categories) => {
          handleBulkCreate(categories);
        }}
      />

      {/* Delete Single Confirmation */}
      <ConfirmDialog
        isOpen={deleteConfirm.isOpen}
        onClose={() => setDeleteConfirm({ isOpen: false, category: null })}
        onConfirm={handleDeleteCategory}
        title={t('menuSetup.deleteCategory')}
        message={t('menuSetup.deleteCategoryConfirmation', {
          name: deleteConfirm.category?.name,
        })}
        confirmText={t('common.delete')}
      />

      {/* Bulk Delete Confirmation */}
      <ConfirmDialog
        isOpen={bulkDeleteConfirm}
        onClose={() => setBulkDeleteConfirm(false)}
        onConfirm={handleBulkDelete}
        title={t('menuSetup.deleteMultipleCategories')}
        message={t('menuSetup.deleteMultipleCategoriesConfirmation', {
          count: selectedCategories.size,
        })}
        confirmText={t('common.delete')}
      />
    </div>
  );
}
