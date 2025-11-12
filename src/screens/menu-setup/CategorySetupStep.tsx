/**
 * CategorySetupStep Component
 *
 * First step of menu setup wizard - Category creation and management
 * Supports multiple setup methods: template, OCR, Excel, bulk create, manual
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
import { CategorySetupMethodSelector } from './components/CategorySetupMethodSelector';
import { CategoryBulkCreateModal } from './components/CategoryBulkCreateModal';
import { CategoryExcelImportModal } from './components/CategoryExcelImportModal';
import type { Category, CreateCategoryData, UpdateCategoryData } from '../../types/menu';
import type { CategorySetupMethod } from './components/CategorySetupMethodSelector';

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

  const [showMethodSelector, setShowMethodSelector] = useState(false);
  const [showCategoryForm, setShowCategoryForm] = useState(false);
  const [showBulkCreate, setShowBulkCreate] = useState(false);
  const [showExcelImport, setShowExcelImport] = useState(false);
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

  const handleMethodSelect = (method: CategorySetupMethod) => {
    setShowMethodSelector(false);

    switch (method) {
      case 'template':
        handleCreateDefaults();
        break;
      case 'bulk-create':
        setShowBulkCreate(true);
        break;
      case 'excel-import':
        setShowExcelImport(true);
        break;
      case 'ocr-import':
        // TODO: Implement OCR category import
        alert('OCR category import coming soon!');
        break;
      case 'manual':
        setShowCategoryForm(true);
        break;
    }
  };

  const handleBulkCreate = async (categories: CreateCategoryData[]) => {
    // Create categories sequentially to maintain sort order
    for (const category of categories) {
      await createCategory(category);
    }
  };

  const handleExcelImport = async (categories: CreateCategoryData[]) => {
    // Create categories sequentially to maintain sort order
    for (const category of categories) {
      await createCategory(category);
    }
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

      {/* Setup Method Selector - Show only when no categories exist */}
      {categories.length === 0 ? (
        <CategorySetupMethodSelector onMethodSelect={handleMethodSelect} />
      ) : (
        <>
          {/* Quick Actions - Show after categories are created */}
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

              <Button
                variant="secondary"
                onClick={() => setShowMethodSelector(true)}
                className="flex-1"
                disabled={loading}
              >
                <SparklesIcon className="w-5 h-5 mr-2" />
                {t('menuSetup.useSmartSetup')}
              </Button>
            </div>
          </Card>

          {/* Categories List */}
        </>
      )}

      {categories.length > 0 && (
        <div className="space-y-3">
          {categories
            .sort((a, b) => a.sort_order - b.sort_order)
            .map((category) => {
              const parentCategory = category.parent_id
                ? categories.find((c) => c.id === category.parent_id)
                : null;

              return (
                <CategoryCard
                  key={category.id}
                  category={category}
                  onEdit={(cat) => {
                    setEditingCategory(cat);
                    setShowCategoryForm(true);
                  }}
                  onDelete={(cat) => setDeleteConfirm({ isOpen: true, category: cat })}
                  isSubcategory={!!category.parent_id}
                  parentName={parentCategory?.name}
                />
              );
            })}
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

      {/* Method Selector Modal - For adding more categories */}
      {showMethodSelector && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <CategorySetupMethodSelector onMethodSelect={handleMethodSelect} />
              <div className="mt-4 flex justify-end">
                <Button
                  variant="secondary"
                  onClick={() => setShowMethodSelector(false)}
                >
                  {t('common.cancel')}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

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

      {/* Excel Import Modal */}
      <CategoryExcelImportModal
        isOpen={showExcelImport}
        onClose={() => setShowExcelImport(false)}
        onSubmit={handleExcelImport}
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
