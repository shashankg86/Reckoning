/**
 * CategorySetupStep Component
 *
 * Simplified manual category creation - Single + Bulk
 * Then proceeds to items setup
 */

import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import {
  PlusIcon,
  RectangleStackIcon,
  MagnifyingGlassIcon,
  TrashIcon,
} from '@heroicons/react/24/outline';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { Input } from '../../components/ui/Input';
import { useAuth } from '../../contexts/AuthContext';
import { useCategories } from '../../hooks/useCategories';
import { categoriesAPI } from '../../api/categories';
import { CategoryCard } from './components/CategoryCard';
import { CategoryFormModal } from './components/CategoryFormModal';
import { CategoryBulkCreateModal } from './components/CategoryBulkCreateModal';
import type { Category, CreateCategoryData, UpdateCategoryData } from '../../types/menu';

interface CategorySetupStepProps {
  onNext: () => void;
}

export function CategorySetupStep({ onNext }: CategorySetupStepProps) {
  const { t } = useTranslation();
  const { state: authState } = useAuth();
  const {
    categories,
    loading,
    createCategory,
    updateCategory,
    loadCategories,
  } = useCategories({ autoLoad: true });

  const [showCategoryForm, setShowCategoryForm] = useState(false);
  const [showBulkCreate, setShowBulkCreate] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategories, setSelectedCategories] = useState<Set<string>>(new Set());
  const [deleteConfirm, setDeleteConfirm] = useState<{ isOpen: boolean; category: Category | null }>({
    isOpen: false,
    category: null,
  });
  const [bulkDeleteConfirm, setBulkDeleteConfirm] = useState(false);

  const handleCreateCategory = async (data: CreateCategoryData) => {
    await createCategory(data);
  };

  const handleUpdateCategory = async (data: UpdateCategoryData) => {
    if (!editingCategory) return;
    await updateCategory(editingCategory.id, data);
    setEditingCategory(null);
  };

  const handleDeleteCategory = async () => {
    if (!deleteConfirm.category) return;
    // Permanently delete during setup (not soft delete)
    await categoriesAPI.permanentlyDeleteCategory(deleteConfirm.category.id);
    setDeleteConfirm({ isOpen: false, category: null });
    // Reload categories list
    await loadCategories(true);
  };

  const handleBulkCreate = async (categories: CreateCategoryData[]) => {
    // ENTERPRISE APPROACH: Single API call for all categories
    const storeId = (authState.user as any)?.store?.id;
    if (!storeId) {
      toast.error('No store selected');
      return;
    }

    try {
      await categoriesAPI.bulkCreateCategories(storeId, categories);
      toast.success(`Created ${categories.length} categories`);
      // Reload categories list
      await loadCategories(true);
    } catch (error: any) {
      console.error('Bulk create error:', error);
      toast.error(error.message || 'Failed to create categories');
    }
  };

  const handleBulkDelete = async () => {
    // Permanently delete during setup (not soft delete)
    for (const categoryId of selectedCategories) {
      await categoriesAPI.permanentlyDeleteCategory(categoryId);
    }
    setSelectedCategories(new Set());
    setBulkDeleteConfirm(false);
    // Reload categories list
    await loadCategories(true);
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
      setSelectedCategories(new Set(filteredCategories.map(c => c.id)));
    }
  };

  const filteredCategories = categories.filter(cat =>
    cat.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (cat.description?.toLowerCase() || '').includes(searchQuery.toLowerCase())
  );

  const canProceed = categories.length > 0;

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
              disabled={loading}
              className="flex-1 sm:flex-none"
            >
              <PlusIcon className="w-5 h-5 mr-2" />
              {t('menuSetup.addSingle')}
            </Button>

            <Button
              variant="secondary"
              onClick={() => setShowBulkCreate(true)}
              disabled={loading}
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
                checked={selectedCategories.size === filteredCategories.length && filteredCategories.length > 0}
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
                  ? categories.find((c) => c.id === category.parent_id)
                  : null;

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
                        category={category}
                        onEdit={(cat) => {
                          setEditingCategory(cat);
                          setShowCategoryForm(true);
                        }}
                        onDelete={(cat) => setDeleteConfirm({ isOpen: true, category: cat })}
                        isSubcategory={!!category.parent_id}
                        parentName={parentCategory?.name}
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
        <Button
          onClick={onNext}
          disabled={!canProceed || loading}
          size="lg"
        >
          {t('menuSetup.continueToItems')}
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
        category={editingCategory}
        title={
          editingCategory
            ? t('menuSetup.editCategory')
            : t('menuSetup.createCategory')
        }
        availableParentCategories={categories}
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
