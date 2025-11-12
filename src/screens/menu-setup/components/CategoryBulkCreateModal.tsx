/**
 * CategoryBulkCreateModal Component
 *
 * Modal for creating multiple categories at once
 */

import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { PlusIcon, TrashIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import type { CreateCategoryData } from '../../../types/menu';

interface CategoryRow extends CreateCategoryData {
  tempId: string;
}

interface CategoryBulkCreateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (categories: CreateCategoryData[]) => Promise<void>;
}

const DEFAULT_COLORS = [
  '#EF4444', '#F59E0B', '#10B981', '#3B82F6',
  '#6366F1', '#8B5CF6', '#EC4899', '#14B8A6'
];

export function CategoryBulkCreateModal({
  isOpen,
  onClose,
  onSubmit,
}: CategoryBulkCreateModalProps) {
  const { t } = useTranslation();
  const [categories, setCategories] = useState<CategoryRow[]>([
    { tempId: '1', name: '', description: '', color: DEFAULT_COLORS[0], sort_order: 0 },
    { tempId: '2', name: '', description: '', color: DEFAULT_COLORS[1], sort_order: 1 },
    { tempId: '3', name: '', description: '', color: DEFAULT_COLORS[2], sort_order: 2 },
  ]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const addRow = () => {
    const newId = Date.now().toString();
    const colorIndex = categories.length % DEFAULT_COLORS.length;
    setCategories([
      ...categories,
      {
        tempId: newId,
        name: '',
        description: '',
        color: DEFAULT_COLORS[colorIndex],
        sort_order: categories.length,
      },
    ]);
  };

  const removeRow = (tempId: string) => {
    if (categories.length <= 1) return;
    setCategories(categories.filter((cat) => cat.tempId !== tempId));
  };

  const updateRow = (tempId: string, field: keyof CreateCategoryData, value: any) => {
    setCategories(
      categories.map((cat) =>
        cat.tempId === tempId ? { ...cat, [field]: value } : cat
      )
    );
  };

  const handleSubmit = async () => {
    const validCategories = categories.filter((cat) => cat.name.trim().length > 0);

    if (validCategories.length === 0) {
      return;
    }

    setIsSubmitting(true);
    try {
      // Remove tempId before submitting
      const categoriesToSubmit = validCategories.map(({ tempId, ...cat }) => cat);
      await onSubmit(categoriesToSubmit);
      onClose();
    } catch (error) {
      console.error('Bulk create error:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  const validCount = categories.filter((cat) => cat.name.trim().length > 0).length;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 overflow-y-auto">
      <div className="bg-white dark:bg-gray-800 rounded-lg w-full max-w-4xl my-8">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              {t('menuSetup.bulkCreateCategories')}
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              {t('menuSetup.bulkCreateDescription')}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        {/* Table */}
        <div className="p-6 max-h-96 overflow-y-auto">
          <div className="space-y-3">
            {categories.map((category, index) => (
              <div
                key={category.tempId}
                className="flex items-start gap-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg"
              >
                {/* Order number */}
                <div className="flex-shrink-0 w-8 h-10 flex items-center justify-center bg-gray-200 dark:bg-gray-600 rounded text-sm font-medium text-gray-700 dark:text-gray-300">
                  {index + 1}
                </div>

                {/* Color picker */}
                <div className="flex-shrink-0">
                  <input
                    type="color"
                    value={category.color}
                    onChange={(e) => updateRow(category.tempId, 'color', e.target.value)}
                    className="w-10 h-10 rounded cursor-pointer border-2 border-gray-300 dark:border-gray-600"
                  />
                </div>

                {/* Name input */}
                <div className="flex-1 min-w-0">
                  <input
                    type="text"
                    value={category.name}
                    onChange={(e) => updateRow(category.tempId, 'name', e.target.value)}
                    placeholder={t('menuSetup.categoryName')}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                </div>

                {/* Description input */}
                <div className="flex-1 min-w-0">
                  <input
                    type="text"
                    value={category.description}
                    onChange={(e) => updateRow(category.tempId, 'description', e.target.value)}
                    placeholder={t('menuSetup.categoryDescription')}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                </div>

                {/* Delete button */}
                <button
                  onClick={() => removeRow(category.tempId)}
                  disabled={categories.length <= 1}
                  className="flex-shrink-0 p-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  <TrashIcon className="h-5 w-5" />
                </button>
              </div>
            ))}
          </div>

          {/* Add row button */}
          <button
            onClick={addRow}
            className="mt-3 w-full py-2 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg text-gray-600 dark:text-gray-400 hover:border-orange-500 hover:text-orange-500 dark:hover:border-orange-400 dark:hover:text-orange-400 transition-colors flex items-center justify-center gap-2"
          >
            <PlusIcon className="h-5 w-5" />
            {t('menuSetup.addAnotherCategory')}
          </button>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-gray-200 dark:border-gray-700">
          <div className="text-sm text-gray-600 dark:text-gray-400">
            {validCount} {t('menuSetup.categoriesReady')}
          </div>

          <div className="flex gap-3">
            <Button
              variant="secondary"
              onClick={onClose}
              disabled={isSubmitting}
            >
              {t('common.cancel')}
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={isSubmitting || validCount === 0}
            >
              {isSubmitting
                ? t('common.creating')
                : t('menuSetup.createCategories', { count: validCount })}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
