/**
 * CategorySetupStep Component
 *
 * First step of menu setup wizard - Category creation and management
 */

import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { PlusIcon, SparklesIcon } from '@heroicons/react/24/outline';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { useCategories } from '../../hooks/useCategories';
import { CategoryCard } from './components/CategoryCard';
import { CategoryFormModal } from './components/CategoryFormModal';
import type { Category, CreateCategoryData, UpdateCategoryData } from '../../types/menu';

interface CategorySetupStepProps {
  onNext: () => void;
}

export function CategorySetupStep({ onNext }: CategorySetupStepProps) {
  const { t } = useTranslation();
  const {
    categories,
    loading,
    createCategory,
    updateCategory,
    deleteCategory,
    createDefaultCategories,
  } = useCategories({ autoLoad: true });

  const [showCategoryForm, setShowCategoryForm] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{ isOpen: boolean; category: Category | null }>({
    isOpen: false,
    category: null,
  });

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
    await deleteCategory(deleteConfirm.category.id);
    setDeleteConfirm({ isOpen: false, category: null });
  };

  const handleCreateDefaults = async () => {
    await createDefaultCategories();
  };

  const canProceed = categories.length > 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
          {t('menuSetup.createCategories')}
        </h2>
        <p className="text-gray-600 dark:text-gray-400 mt-2">
          {t('menuSetup.categoriesDescription')}
        </p>
      </div>

      {/* Quick Actions */}
      <Card className="p-6">
        <div className="flex flex-col sm:flex-row gap-4">
          <Button
            onClick={() => setShowCategoryForm(true)}
            className="flex-1"
            disabled={loading}
          >
            <PlusIcon className="w-5 h-5 mr-2" />
            {t('menuSetup.addCategory')}
          </Button>

          {categories.length === 0 && (
            <Button
              variant="secondary"
              onClick={handleCreateDefaults}
              className="flex-1"
              disabled={loading}
            >
              <SparklesIcon className="w-5 h-5 mr-2" />
              {t('menuSetup.useDefaultCategories')}
            </Button>
          )}
        </div>
      </Card>

      {/* Categories List */}
      {categories.length === 0 ? (
        <Card className="p-12 text-center">
          <div className="mx-auto w-24 h-24 bg-orange-100 dark:bg-orange-900 rounded-full flex items-center justify-center mb-4">
            <PlusIcon className="w-12 h-12 text-orange-500 dark:text-orange-400" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            {t('menuSetup.noCategoriesYet')}
          </h3>
          <p className="text-gray-500 dark:text-gray-400 mb-6 max-w-md mx-auto">
            {t('menuSetup.noCategoriesDescription')}
          </p>
        </Card>
      ) : (
        <div className="space-y-3">
          {categories.map((category) => (
            <CategoryCard
              key={category.id}
              category={category}
              onEdit={(cat) => {
                setEditingCategory(cat);
                setShowCategoryForm(true);
              }}
              onDelete={(cat) => setDeleteConfirm({ isOpen: true, category: cat })}
            />
          ))}
        </div>
      )}

      {/* Navigation */}
      <div className="flex justify-between pt-6 border-t border-gray-200 dark:border-gray-700">
        <div></div>
        <Button
          onClick={onNext}
          disabled={!canProceed || loading}
          size="lg"
        >
          {t('menuSetup.continueToReview')}
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
      />

      {/* Delete Confirmation */}
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
    </div>
  );
}
