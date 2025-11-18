import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  XMarkIcon,
  PlusIcon,
  TrashIcon
} from '@heroicons/react/24/outline';
import { Button } from '../ui/Button';
import { ImageUpload } from '../ui/ImageUpload';
import type { Category } from '../../types/menu';

interface CategoryFormData {
  name: string;
  description: string;
  color: string;
  imageFile?: File | null;
}

interface BulkAddCategoriesModalProps {
  isOpen: boolean;
  onClose: () => void;
  onBulkAdd: (categories: Omit<Category, 'id' | 'store_id' | 'created_at'>[], imageFiles: (File | null)[]) => void;
}

const DEFAULT_CATEGORY: CategoryFormData = {
  name: '',
  description: '',
  color: '#FF6B35',
  imageFile: null
};

const PREDEFINED_COLORS = [
  '#EF4444', '#F59E0B', '#10B981', '#3B82F6',
  '#6366F1', '#8B5CF6', '#EC4899', '#14B8A6'
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
    handleChange(index, 'imageFile', file);
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

    // Map to Category format (NO ICON FIELD)
    const categoriesToAdd = validCategories.map(cat => ({
      name: cat.name.trim(),
      description: cat.description.trim() || '',
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
      <div className="bg-white dark:bg-gray-800 rounded-lg w-full max-w-5xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              {t('catalog.bulkAddCategories')}
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              {t('menuSetup.bulkCreateDescription')} ({validCount}/{MAX_CATEGORIES})
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
            {categories.map((category, index) => (
              <div
                key={index}
                className="p-6 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600 space-y-4"
              >
                {/* Header with number and delete */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center justify-center w-8 h-8 bg-orange-500 text-white rounded-full font-semibold text-sm">
                      {index + 1}
                    </div>
                    <h3 className="text-sm font-medium text-gray-900 dark:text-white">
                      {category.name || t('catalog.categoryName')}
                    </h3>
                  </div>
                  {categories.length > 1 && (
                    <button
                      onClick={() => handleRemoveRow(index)}
                      className="p-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
                      title={t('common.remove')}
                    >
                      <TrashIcon className="h-5 w-5" />
                    </button>
                  )}
                </div>

                {/* Form Fields */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Left Column */}
                  <div className="space-y-4">
                    {/* Category Name */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        {t('menuSetup.categoryName')} *
                      </label>
                      <input
                        type="text"
                        value={category.name}
                        onChange={(e) => handleChange(index, 'name', e.target.value)}
                        placeholder={t('menuSetup.enterCategoryName')}
                        className={`w-full px-3 py-2 border rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-orange-500 ${
                          errors[index]?.name
                            ? 'border-red-500 dark:border-red-400'
                            : 'border-gray-300 dark:border-gray-600'
                        }`}
                      />
                      {errors[index]?.name && (
                        <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                          {errors[index].name}
                        </p>
                      )}
                    </div>

                    {/* Description */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        {t('menuSetup.categoryDescription')} ({t('common.optional')})
                      </label>
                      <textarea
                        value={category.description}
                        onChange={(e) => handleChange(index, 'description', e.target.value)}
                        placeholder={t('menuSetup.enterCategoryDescription')}
                        rows={3}
                        className={`w-full px-3 py-2 border rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-orange-500 ${
                          errors[index]?.description
                            ? 'border-red-500 dark:border-red-400'
                            : 'border-gray-300 dark:border-gray-600'
                        }`}
                      />
                      {errors[index]?.description && (
                        <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                          {errors[index].description}
                        </p>
                      )}
                    </div>

                    {/* Color Picker */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        {t('menuSetup.categoryColor')}
                      </label>
                      <div className="flex items-center gap-2">
                        {PREDEFINED_COLORS.map((color) => (
                          <button
                            key={color}
                            type="button"
                            onClick={() => handleChange(index, 'color', color)}
                            className={`w-8 h-8 rounded-full border-2 transition-all ${
                              category.color === color
                                ? 'border-gray-900 dark:border-white scale-110'
                                : 'border-transparent hover:scale-105'
                            }`}
                            style={{ backgroundColor: color }}
                          />
                        ))}
                      </div>
                      <input
                        type="text"
                        value={category.color}
                        onChange={(e) => handleChange(index, 'color', e.target.value)}
                        placeholder="#FF6B35"
                        className="mt-2 w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-orange-500"
                      />
                    </div>
                  </div>

                  {/* Right Column - Image Upload */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      {t('catalog.image')} ({t('common.optional')})
                    </label>
                    <ImageUpload
                      value={category.imageFile}
                      onChange={(file) => handleImageChange(index, file)}
                      placeholder={t('menuSetup.uploadImagePlaceholder')}
                      maxSizeMB={5}
                    />
                    <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                      {t('menuSetup.imageUploadHint')}
                    </p>
                  </div>
                </div>

                {/* Preview Badge */}
                {category.name && (
                  <div className="pt-2 border-t border-gray-200 dark:border-gray-600">
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                      {t('catalog.preview')}:
                    </p>
                    <div
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-white text-sm font-medium"
                      style={{ backgroundColor: category.color }}
                    >
                      {category.name}
                    </div>
                  </div>
                )}
              </div>
            ))}

            {/* Add Another Button */}
            {categories.length < MAX_CATEGORIES && (
              <button
                onClick={handleAddRow}
                className="w-full py-3 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-600 dark:text-gray-400 hover:border-orange-500 hover:text-orange-600 dark:hover:text-orange-400 transition-colors flex items-center justify-center gap-2"
              >
                <PlusIcon className="h-5 w-5" />
                {t('menuSetup.addAnotherCategory')}
              </button>
            )}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between">
          <div className="text-sm text-gray-600 dark:text-gray-400">
            {validCount} {t('menuSetup.categoriesReady')}
          </div>
          <div className="flex gap-3">
            <Button variant="secondary" onClick={handleClose}>
              {t('common.cancel')}
            </Button>
            <Button onClick={handleSubmit} disabled={validCount === 0}>
              {t('menuSetup.createMultipleCategories', {
                count: validCount
              })}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
