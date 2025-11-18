import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  XMarkIcon,
  PlusIcon,
  TrashIcon,
  PhotoIcon
} from '@heroicons/react/24/outline';
import { Button } from '../ui/Button';
import { ImageUpload } from '../ui/ImageUpload';
import type { Category } from '../../types/menu';

interface CategoryFormData {
  name: string;
  description: string;
  icon: string;
  color: string;
  imageFile?: File | null;
  imagePreview?: string | null;
}

interface BulkAddCategoriesModalProps {
  isOpen: boolean;
  onClose: () => void;
  onBulkAdd: (categories: Omit<Category, 'id' | 'store_id' | 'created_at'>[], imageFiles: (File | null)[]) => void;
}

const DEFAULT_CATEGORY: CategoryFormData = {
  name: '',
  description: '',
  icon: '📦',
  color: '#FF6B35',
  imageFile: null,
  imagePreview: null
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
  const [errors, setErrors] = useState<{ [key: number]: { name?: string; description?: string } }>({});

  const handleAddRow = () => {
    if (categories.length < MAX_CATEGORIES) {
      setCategories([...categories, { ...DEFAULT_CATEGORY }]);
    }
  };

  const handleRemoveRow = (index: number) => {
    if (categories.length > 1) {
      setCategories(categories.filter((_, i) => i !== index));
      const newErrors = { ...errors };
      delete newErrors[index];
      setErrors(newErrors);
    }
  };

  const handleChange = (index: number, field: keyof CategoryFormData, value: any) => {
    const updated = [...categories];
    updated[index] = { ...updated[index], [field]: value };
    setCategories(updated);

    // Clear error for this field
    if (errors[index]) {
      const newErrors = { ...errors };
      delete newErrors[index]?.[field as 'name' | 'description'];
      setErrors(newErrors);
    }
  };

  const handleImageChange = (index: number, file: File | null) => {
    const updated = [...categories];
    updated[index] = {
      ...updated[index],
      imageFile: file,
      imagePreview: file ? URL.createObjectURL(file) : null
    };
    setCategories(updated);
  };

  const validateCategories = (): boolean => {
    const newErrors: { [key: number]: { name?: string; description?: string } } = {};
    let hasErrors = false;

    categories.forEach((cat, index) => {
      if (cat.name.trim()) {
        // Only validate if name is provided
        if (cat.name.trim().length < 2) {
          newErrors[index] = { ...newErrors[index], name: t('menuSetup.nameTooShort') };
          hasErrors = true;
        }
        if (cat.name.trim().length > 50) {
          newErrors[index] = { ...newErrors[index], name: t('menuSetup.nameTooLong') };
          hasErrors = true;
        }
        if (cat.description && cat.description.length > 200) {
          newErrors[index] = { ...newErrors[index], description: t('menuSetup.descriptionTooLong') };
          hasErrors = true;
        }
      }
    });

    setErrors(newErrors);
    return !hasErrors;
  };

  const handleSubmit = () => {
    // Validate
    if (!validateCategories()) {
      return;
    }

    const validCategories = categories.filter(cat => cat.name.trim() !== '');

    if (validCategories.length === 0) {
      alert(t('menuSetup.pleaseAddCategories'));
      return;
    }

    // Map to Category format
    const categoriesToAdd = validCategories.map(cat => ({
      name: cat.name.trim(),
      description: cat.description.trim() || '',
      icon: cat.icon,
      color: cat.color,
      image_url: null // Will be set after upload
    }));

    // Extract image files
    const imageFiles = validCategories.map(cat => cat.imageFile || null);

    onBulkAdd(categoriesToAdd, imageFiles);
    handleClose();
  };

  const handleClose = () => {
    setCategories([{ ...DEFAULT_CATEGORY }]);
    setErrors({});
    onClose();
  };

  if (!isOpen) return null;

  const validCount = categories.filter(c => c.name.trim()).length;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg w-full max-w-6xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              {t('catalog.bulkAddCategories')}
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              {t('catalog.quickAddCategories')} ({validCount}/{MAX_CATEGORIES})
            </p>
          </div>
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
            {/* Table */}
            <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 dark:bg-gray-700">
                    <tr>
                      <th className="px-3 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider w-12">
                        #
                      </th>
                      <th className="px-3 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider min-w-[180px]">
                        {t('menuSetup.categoryName')} *
                      </th>
                      <th className="px-3 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider min-w-[200px]">
                        {t('catalog.description')}
                      </th>
                      <th className="px-3 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider w-24">
                        {t('catalog.icon')}
                      </th>
                      <th className="px-3 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider w-32">
                        {t('catalog.color')}
                      </th>
                      <th className="px-3 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider w-32">
                        {t('catalog.image')}
                      </th>
                      <th className="px-3 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider w-28">
                        {t('catalog.preview')}
                      </th>
                      <th className="px-3 py-3 text-center text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider w-20">
                        {t('common.actions')}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                    {categories.map((category, index) => (
                      <tr key={index} className="bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700/50">
                        {/* Index */}
                        <td className="px-3 py-3 text-sm text-gray-500 dark:text-gray-400">
                          {index + 1}
                        </td>

                        {/* Name Input */}
                        <td className="px-3 py-3">
                          <input
                            type="text"
                            value={category.name}
                            onChange={(e) => handleChange(index, 'name', e.target.value)}
                            placeholder={t('menuSetup.enterCategoryName')}
                            className={`w-full px-2 py-1.5 text-sm border rounded bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-orange-500 focus:border-transparent ${
                              errors[index]?.name
                                ? 'border-red-500 dark:border-red-400'
                                : 'border-gray-300 dark:border-gray-600'
                            }`}
                          />
                          {errors[index]?.name && (
                            <p className="mt-1 text-xs text-red-600 dark:text-red-400">
                              {errors[index].name}
                            </p>
                          )}
                        </td>

                        {/* Description Input */}
                        <td className="px-3 py-3">
                          <textarea
                            value={category.description}
                            onChange={(e) => handleChange(index, 'description', e.target.value)}
                            placeholder={t('catalog.enterDescription')}
                            rows={2}
                            className={`w-full px-2 py-1.5 text-sm border rounded bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-orange-500 focus:border-transparent resize-none ${
                              errors[index]?.description
                                ? 'border-red-500 dark:border-red-400'
                                : 'border-gray-300 dark:border-gray-600'
                            }`}
                          />
                          {errors[index]?.description && (
                            <p className="mt-1 text-xs text-red-600 dark:text-red-400">
                              {errors[index].description}
                            </p>
                          )}
                        </td>

                        {/* Icon Select */}
                        <td className="px-3 py-3">
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
                        <td className="px-3 py-3">
                          <div className="flex gap-1">
                            {COLOR_OPTIONS.slice(0, 3).map((color) => (
                              <button
                                key={color}
                                onClick={() => handleChange(index, 'color', color)}
                                className={`w-6 h-6 rounded border-2 transition-all ${
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
                              className="flex-1 px-1 py-1 text-xs border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-orange-500"
                            >
                              {COLOR_OPTIONS.map((color) => (
                                <option key={color} value={color}>
                                  {color}
                                </option>
                              ))}
                            </select>
                          </div>
                        </td>

                        {/* Image Upload */}
                        <td className="px-3 py-3">
                          <div className="relative">
                            <input
                              type="file"
                              accept="image/*"
                              onChange={(e) => {
                                const file = e.target.files?.[0] || null;
                                if (file && file.size > 5 * 1024 * 1024) {
                                  alert(t('menuSetup.imageTooLarge'));
                                  return;
                                }
                                handleImageChange(index, file);
                              }}
                              className="hidden"
                              id={`image-upload-${index}`}
                            />
                            <label
                              htmlFor={`image-upload-${index}`}
                              className="cursor-pointer inline-flex items-center gap-1 px-2 py-1.5 text-xs border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                            >
                              <PhotoIcon className="h-4 w-4" />
                              {category.imageFile ? t('common.change') : t('common.upload')}
                            </label>
                            {category.imageFile && (
                              <button
                                onClick={() => handleImageChange(index, null)}
                                className="ml-1 text-xs text-red-600 dark:text-red-400 hover:underline"
                              >
                                {t('common.remove')}
                              </button>
                            )}
                          </div>
                        </td>

                        {/* Preview */}
                        <td className="px-3 py-3">
                          <div className="flex flex-col gap-1">
                            <div
                              className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-white text-xs font-medium"
                              style={{ backgroundColor: category.color }}
                            >
                              <span>{category.icon}</span>
                              <span className="max-w-[60px] truncate">
                                {category.name || t('catalog.categoryName')}
                              </span>
                            </div>
                            {category.imagePreview && (
                              <img
                                src={category.imagePreview}
                                alt="Preview"
                                className="w-16 h-16 object-cover rounded border border-gray-300 dark:border-gray-600"
                              />
                            )}
                          </div>
                        </td>

                        {/* Actions */}
                        <td className="px-3 py-3 text-center">
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
          <Button onClick={handleSubmit} className="flex-1" disabled={validCount === 0}>
            {t('menuSetup.createMultipleCategories', {
              count: validCount
            })}
          </Button>
        </div>
      </div>
    </div>
  );
}
