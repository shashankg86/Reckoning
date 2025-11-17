import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  XMarkIcon,
  PlusIcon,
  TrashIcon,
  PhotoIcon
} from '@heroicons/react/24/outline';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';
import type { Category } from '../../types/menu';
import { processImage } from '../../lib/storage/imageProcessor';
import { uploadImage } from '../../lib/api/items';

interface CategoryFormData {
  name: string;
  description: string;
  icon: string;
  color: string;
  image?: File | null;
  imageUrl?: string;
  imageUploading?: boolean;
}

interface BulkAddCategoriesModalProps {
  isOpen: boolean;
  onClose: () => void;
  onBulkAdd: (categories: Omit<Category, 'id' | 'store_id' | 'created_at'>[]) => void;
}

const DEFAULT_CATEGORY: CategoryFormData = {
  name: '',
  description: '',
  icon: '📦',
  color: '#FF6B35',
  image: null,
  imageUrl: '',
  imageUploading: false
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

  const handleImageUpload = async (index: number, file: File) => {
    try {
      // Set uploading state
      handleChange(index, 'imageUploading', true);

      // Process and optimize image
      const processedBlob = await processImage(file);
      const processedFile = new File([processedBlob], file.name, {
        type: 'image/webp'
      });

      // Upload to storage
      const imageUrl = await uploadImage(processedFile);

      // Update state with image URL
      handleChange(index, 'imageUrl', imageUrl);
      handleChange(index, 'image', null);
      handleChange(index, 'imageUploading', false);
    } catch (error) {
      console.error('Image upload failed:', error);
      handleChange(index, 'imageUploading', false);
      alert(t('menuSetup.imageUploadFailed'));
    }
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
      description: cat.description.trim(),
      icon: cat.icon,
      color: cat.color,
      image: cat.imageUrl || undefined
    }));

    onBulkAdd(categoriesToAdd);
    handleClose();
  };

  const handleClose = () => {
    setCategories([{ ...DEFAULT_CATEGORY }]);
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title={t('catalog.bulkAddCategories')}>
      <div className="space-y-4">
        {/* Instructions */}
        <p className="text-sm text-gray-600 dark:text-gray-400">
          {t('menuSetup.bulkCreateDescription')} (max {MAX_CATEGORIES})
        </p>

        {/* Category Forms */}
        <div className="space-y-4 max-h-[60vh] overflow-y-auto">
          {categories.map((category, index) => (
            <div
              key={index}
              className="p-4 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg space-y-3"
            >
              {/* Header with Remove Button */}
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  {t('catalog.category')} #{index + 1}
                </span>
                {categories.length > 1 && (
                  <button
                    onClick={() => handleRemoveRow(index)}
                    className="p-1 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
                  >
                    <TrashIcon className="h-4 w-4" />
                  </button>
                )}
              </div>

              {/* Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t('menuSetup.categoryName')} *
                </label>
                <input
                  type="text"
                  value={category.name}
                  onChange={(e) => handleChange(index, 'name', e.target.value)}
                  placeholder={t('menuSetup.enterCategoryName')}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t('catalog.description')}
                </label>
                <input
                  type="text"
                  value={category.description}
                  onChange={(e) => handleChange(index, 'description', e.target.value)}
                  placeholder={t('catalog.enterDescription')}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                />
              </div>

              {/* Icon Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t('catalog.icon')}
                </label>
                <div className="flex flex-wrap gap-2">
                  {ICON_OPTIONS.map((icon) => (
                    <button
                      key={icon}
                      onClick={() => handleChange(index, 'icon', icon)}
                      className={`w-10 h-10 rounded-lg flex items-center justify-center text-xl transition-all ${
                        category.icon === icon
                          ? 'bg-orange-500 ring-2 ring-orange-500 ring-offset-2 dark:ring-offset-gray-900'
                          : 'bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600'
                      }`}
                    >
                      {icon}
                    </button>
                  ))}
                </div>
              </div>

              {/* Color Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t('catalog.color')}
                </label>
                <div className="flex flex-wrap gap-2">
                  {COLOR_OPTIONS.map((color) => (
                    <button
                      key={color}
                      onClick={() => handleChange(index, 'color', color)}
                      className={`w-10 h-10 rounded-lg transition-all ${
                        category.color === color
                          ? 'ring-2 ring-orange-500 ring-offset-2 dark:ring-offset-gray-900'
                          : 'hover:scale-110'
                      }`}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </div>

              {/* Image Upload */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t('menuSetup.uploadImagePlaceholder')}
                </label>
                <div className="flex items-center gap-3">
                  {category.imageUrl ? (
                    <div className="flex items-center gap-3">
                      <img
                        src={category.imageUrl}
                        alt={category.name}
                        className="w-16 h-16 rounded-lg object-cover"
                      />
                      <button
                        onClick={() => {
                          handleChange(index, 'imageUrl', '');
                          handleChange(index, 'image', null);
                        }}
                        className="text-sm text-red-600 dark:text-red-400 hover:underline"
                      >
                        {t('common.remove')}
                      </button>
                    </div>
                  ) : (
                    <label className="flex items-center gap-2 px-4 py-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 rounded-lg cursor-pointer transition-colors">
                      <PhotoIcon className="h-5 w-5 text-gray-600 dark:text-gray-300" />
                      <span className="text-sm text-gray-700 dark:text-gray-300">
                        {category.imageUploading ? t('common.importing') : t('onboarding.uploadLogo')}
                      </span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleImageUpload(index, file);
                        }}
                        disabled={category.imageUploading}
                        className="hidden"
                      />
                    </label>
                  )}
                </div>
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  {t('menuSetup.imageUploadHint')}
                </p>
              </div>

              {/* Preview */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t('catalog.preview')}
                </label>
                <div
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-white"
                  style={{ backgroundColor: category.color }}
                >
                  <span className="text-xl">{category.icon}</span>
                  <span className="font-medium">{category.name || t('catalog.categoryName')}</span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Add Row Button */}
        {categories.length < MAX_CATEGORIES && (
          <Button
            variant="secondary"
            onClick={handleAddRow}
            className="w-full flex items-center justify-center gap-2"
          >
            <PlusIcon className="h-4 w-4" />
            {t('menuSetup.addAnotherCategory')}
          </Button>
        )}

        {/* Action Buttons */}
        <div className="flex gap-3">
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
    </Modal>
  );
}
