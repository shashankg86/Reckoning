import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import {
  PlusIcon,
  RectangleStackIcon,
  MagnifyingGlassIcon,
  TrashIcon,
  ArrowPathIcon,
} from '@heroicons/react/24/outline';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { Input } from '../../components/ui/Input';
import { useAuth } from '../../contexts/AuthContext';
import { useCategories } from '../../hooks/useCategories';
import { categoriesAPI } from '../../api/categories';
import { ImageUploadService, STORAGE_BUCKETS } from '../../lib/imageUploadService';
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

export function CategorySetupStep({ onNext }: CategorySetupStepProps) {
  const { t } = useTranslation();
  const { state: authState } = useAuth();
  const storeId = (authState.user as any)?.store?.id;

  // Load existing categories from DB
  const { categories: existingCategories, loading: loadingExisting } = useCategories({ autoLoad: true });

  // Local state for all categories (existing + new)
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

  // Sync existing categories from DB to local state (only once on mount)
  useEffect(() => {
    if (existingCategories.length > 0 && localCategories.length === 0) {
      setLocalCategories(
        existingCategories.map((cat) => ({
          ...cat,
          _originalData: cat, // Store original for comparison
        }))
      );
    }
  }, [existingCategories]);

  const handleCreateCategory = (data: CreateCategoryData, imageFile?: File | null) => {
    // Create category in local state only (not DB yet)
    const newCategory: LocalCategory = {
      ...data,
      id: `temp_${Date.now()}_${Math.random()}`, // Temporary ID
      _isNew: true,
      _imageFile: imageFile || null,
      is_active: true,
      store_id: storeId,
      sort_order: localCategories.length,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    setLocalCategories((prev) => [...prev, newCategory]);
    toast.success(t('menuSetup.categoryAddedLocally'));
    setShowCategoryForm(false);
  };

  const handleUpdateCategory = (data: UpdateCategoryData, imageFile?: File | null) => {
    if (!editingCategory) return;

    setLocalCategories((prev) =>
      prev.map((cat) => {
        if (cat.id === editingCategory.id) {
          // If it's a new category, just update it
          if (cat._isNew) {
            return {
              ...cat,
              ...data,
              _imageFile: imageFile !== undefined ? imageFile : cat._imageFile,
              updated_at: new Date().toISOString()
            };
          }
          // If it's an existing category, mark as modified
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
      updated_at: new Date().toISOString(),
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

  // Filter out deleted categories from display
  const activeCategories = localCategories.filter((cat) => !cat._isDeleted);

  const filteredCategories = activeCategories.filter(
    (cat) =>
      cat.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (cat.description?.toLowerCase() || '').includes(searchQuery.toLowerCase())
  );

  // Sync all changes to database and navigate
  const handleContinueToItems = async () => {
    if (activeCategories.length === 0) {
      toast.error(t('menuSetup.pleaseAddCategories'));
      return;
    }

    // Separate categories by operation type
    const toCreate = localCategories.filter((cat) => cat._isNew && !cat._isDeleted);
    const toUpdate = localCategories.filter((cat) => cat._isModified && !cat._isDeleted && !cat._isNew);
    const toDelete = localCategories.filter((cat) => cat._isDeleted && !cat._isNew);

    // If no changes, just navigate
    if (toCreate.length === 0 && toUpdate.length === 0 && toDelete.length === 0) {
      onNext();
      return;
    }

    setIsSaving(true);

    try {
      let operationCount = 0;

      // STEP 1: Upload images for categories with _imageFile (DEFERRED UPLOAD)
      const categoriesToUpload = [...toCreate, ...toUpdate].filter((cat) => cat._imageFile);

      if (categoriesToUpload.length > 0) {
        const uploadToast = toast.loading(`Uploading ${categoriesToUpload.length} image(s)...`);

        try {
          const files = categoriesToUpload.map((cat) => cat._imageFile!);
          const uploadResult = await ImageUploadService.batchUploadImages(
            files,
            STORAGE_BUCKETS.CATEGORIES,
            `store_${storeId}`,
            (completed, total) => {
              toast.loading(`Uploading images: ${completed}/${total}`, { id: uploadToast });
            }
          );

          // Map uploaded URLs back to categories
          uploadResult.successful.forEach((result, index) => {
            const category = categoriesToUpload[index];
            category.image_url = result.url || null;
          });

          toast.success(`Uploaded ${uploadResult.totalUploaded} image(s)`, { id: uploadToast });

          if (uploadResult.totalFailed > 0) {
            toast.error(`Failed to upload ${uploadResult.totalFailed} image(s)`);
          }
        } catch (error) {
          toast.error('Image upload failed', { id: uploadToast });
          console.error('Image upload error:', error);
        }
      }

      // STEP 2: Delete categories
      if (toDelete.length > 0) {
        for (const cat of toDelete) {
          await categoriesAPI.permanentlyDeleteCategory(cat.id);
          operationCount++;
        }
      }

      // STEP 3: Update modified categories (now with image_url)
      if (toUpdate.length > 0) {
        for (const cat of toUpdate) {
          const updateData: UpdateCategoryData = {
            name: cat.name,
            description: cat.description,
            color: cat.color,
            icon: cat.icon,
            image_url: cat.image_url,
            sort_order: cat.sort_order,
            parent_id: cat.parent_id,
            metadata: cat.metadata,
          };
          await categoriesAPI.updateCategory(cat.id, updateData);
          operationCount++;
        }
      }

      // STEP 4: Create new categories (now with image_url)
      if (toCreate.length > 0) {
        const categoriesData: CreateCategoryData[] = toCreate.map((cat) => ({
          name: cat.name,
          description: cat.description,
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

      // Navigate to next step
      onNext();
    } catch (error: any) {
      console.error('Failed to sync categories:', error);
      toast.error(error.message || t('menuSetup.failedToSaveCategories'));
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
          <p className="text-sm text-orange-600 dark:text-orange-400 mt-2">
            💡 {pendingChanges} {t('menuSetup.pendingChanges')}
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
                    <div className="flex-1 relative">
                      <CategoryCard
                        category={categoryWithPreview as Category}
                        onEdit={(cat) => {
                          setEditingCategory(category);
                          setShowCategoryForm(true);
                        }}
                        onDelete={(cat) =>
                          setDeleteConfirm({ isOpen: true, category: category })
                        }
                        isSubcategory={!!category.parent_id}
                        parentName={parentCategory?.name}
                      />
                      {(category._isNew || category._isModified) && (
                        <span className="absolute top-2 right-2 inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-orange-100 dark:bg-orange-900 text-orange-800 dark:text-orange-200">
                          {category._isNew ? t('menuSetup.new') : t('menuSetup.modified')}
                        </span>
                      )}
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
        onSubmit={editingCategory ? handleUpdateCategory : handleCreateCategory}
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
        onSubmit={handleBulkCreate}
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
