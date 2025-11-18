import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  XMarkIcon,
  PlusIcon,
  TrashIcon
} from '@heroicons/react/24/outline';
import { Button } from '../ui/Button';
import type { Category } from '../../types/menu';

interface CategoryFormData {
  name: string;
  icon: string;
  color: string;
}

interface BulkAddCategoriesModalProps {
  isOpen: boolean;
  onClose: () => void;
  onBulkAdd: (categories: Omit<Category, 'id' | 'store_id' | 'created_at'>[]) => void;
}

const DEFAULT_CATEGORY: CategoryFormData = {
  name: '',
  icon: '📦',
  color: '#FF6B35'
};

const ICON_OPTIONS = [
  '🍕', '🍔', '🍟', '🌮', '🍜', '🍱', '🍰', '☕', '🍺', '🥤',
  '📦', '🛒', '💊', '💄', '👕', '📱', '💻', '🎮', '📚', '🎨'
];

const COLOR_OPTIONS = [
  '#FF6B35', '#F7931E', '#FDC830', '#37B679', '#00D9FF',
  '#3454D1', '#6C5CE7', '#A55EEA', '#E84393', '#FF7675'
];

const MAX_CATEGORIES = 10;

export function BulkAddCategoriesModal({
  isOpen,
  onClose,
  onBulkAdd
}: BulkAddCategoriesModalProps) {
  const { t } = useTranslation();
  const [categories, setCategories] = useState<CategoryFormData[]>([{ ...DEFAULT_CATEGORY }]);

  const handleAddRow = () => {
    if (categories.length < MAX_CATEGORIES) {
      setCategories([...categories, { ...DEFAULT_CATEGORY }]);
    }
  };

  const handleRemoveRow = (index: number) => {
    if (categories.length > 1) {
      setCategories(categories.filter((_, i) => i !== index));
    }
  };

  const handleChange = (index: number, field: keyof CategoryFormData, value: any) => {
    const updated = [...categories];
    updated[index] = { ...updated[index], [field]: value };
    setCategories(updated);
  };

  const handleSubmit = () => {
    // Validate
    const validCategories = categories.filter(cat => cat.name.trim() !== '');

    if (validCategories.length === 0) {
      alert(t('menuSetup.pleaseAddCategories'));
      return;
    }

    // Map to Category format
    const categoriesToAdd = validCategories.map(cat => ({
      name: cat.name.trim(),
      description: '',
      icon: cat.icon,
      color: cat.color
    }));

    onBulkAdd(categoriesToAdd);
    handleClose();
  };

  const handleClose = () => {
    setCategories([{ ...DEFAULT_CATEGORY }]);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg w-full max-w-3xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            {t('catalog.bulkAddCategories')}
          </h2>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300"
          >
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="space-y-4">
            {/* Instructions */}
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {t('catalog.quickAddCategories')} ({categories.length}/{MAX_CATEGORIES})
            </p>

            {/* Table */}
            <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-700">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                      #
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                      {t('menuSetup.categoryName')} *
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                      {t('catalog.icon')}
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                      {t('catalog.color')}
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                      {t('catalog.preview')}
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider w-20">
                      {t('common.actions')}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {categories.map((category, index) => (
                    <tr key={index} className="bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700/50">
                      {/* Index */}
                      <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">
                        {index + 1}
                      </td>

                      {/* Name Input */}
                      <td className="px-4 py-3">
                        <input
                          type="text"
                          value={category.name}
                          onChange={(e) => handleChange(index, 'name', e.target.value)}
                          placeholder={t('menuSetup.enterCategoryName')}
                          className="w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                        />
                      </td>

                      {/* Icon Select */}
                      <td className="px-4 py-3">
                        <select
                          value={category.icon}
                          onChange={(e) => handleChange(index, 'icon', e.target.value)}
                          className="w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-orange-500"
                        >
                          {ICON_OPTIONS.map((icon) => (
                            <option key={icon} value={icon}>
                              {icon}
                            </option>
                          ))}
                        </select>
                      </td>

                      {/* Color Select */}
                      <td className="px-4 py-3">
                        <div className="flex gap-1.5">
                          {COLOR_OPTIONS.slice(0, 5).map((color) => (
                            <button
                              key={color}
                              onClick={() => handleChange(index, 'color', color)}
                              className={`w-7 h-7 rounded border-2 transition-all ${
                                category.color === color
                                  ? 'border-gray-900 dark:border-white scale-110'
                                  : 'border-transparent hover:scale-105'
                              }`}
                              style={{ backgroundColor: color }}
                              title={color}
                            />
                          ))}
                          <select
                            value={category.color}
                            onChange={(e) => handleChange(index, 'color', e.target.value)}
                            className="w-12 px-1 py-1 text-xs border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-orange-500"
                          >
                            {COLOR_OPTIONS.map((color) => (
                              <option key={color} value={color}>
                                {color}
                              </option>
                            ))}
                          </select>
                        </div>
                      </td>

                      {/* Preview */}
                      <td className="px-4 py-3">
                        <div
                          className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-white text-sm font-medium"
                          style={{ backgroundColor: category.color }}
                        >
                          <span>{category.icon}</span>
                          <span className="max-w-[100px] truncate">
                            {category.name || t('catalog.categoryName')}
                          </span>
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3 text-center">
                        {categories.length > 1 && (
                          <button
                            onClick={() => handleRemoveRow(index)}
                            className="p-1.5 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
                            title={t('common.remove')}
                          >
                            <TrashIcon className="h-4 w-4" />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Add Row Button */}
            {categories.length < MAX_CATEGORIES && (
              <button
                onClick={handleAddRow}
                className="w-full py-2 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-600 dark:text-gray-400 hover:border-orange-500 hover:text-orange-600 dark:hover:text-orange-400 transition-colors flex items-center justify-center gap-2"
              >
                <PlusIcon className="h-4 w-4" />
                {t('menuSetup.addAnotherCategory')}
              </button>
            )}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex gap-3">
          <Button variant="secondary" onClick={handleClose} className="flex-1">
            {t('common.cancel')}
          </Button>
          <Button onClick={handleSubmit} className="flex-1">
            {t('menuSetup.createMultipleCategories', {
              count: categories.filter(c => c.name.trim()).length
            })}
          </Button>
        </div>
      </div>
    </div>
  );
}
