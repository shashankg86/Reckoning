import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { ImageUpload } from '../ui/ImageUpload';
import type { Category, CreateCategoryData, UpdateCategoryData } from '../../types/menu';

interface CategoryFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (category: CreateCategoryData | (UpdateCategoryData & { id: string }), imageFile?: File | null) => Promise<void>;
  editingCategory?: Category | null;
}

const PREDEFINED_COLORS = [
  '#EF4444', // Red
  '#F59E0B', // Orange
  '#10B981', // Green
  '#3B82F6', // Blue
  '#6366F1', // Indigo
  '#8B5CF6', // Purple
  '#EC4899', // Pink
  '#14B8A6', // Teal
];

export function CategoryFormModal({ isOpen, onClose, onSave, editingCategory }: CategoryFormModalProps) {
  const { t } = useTranslation();
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    color: '#FF6B35',
  });
  const [originalData, setOriginalData] = useState({
    name: '',
    description: '',
    color: '#FF6B35',
  });
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imageError, setImageError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (editingCategory) {
      const initialData = {
        name: editingCategory.name || '',
        description: editingCategory.description || '',
        color: editingCategory.color || '#FF6B35',
      };
      setFormData(initialData);
      setOriginalData(initialData);
      setImageFile(null);
    } else {
      setFormData({
        name: '',
        description: '',
        color: '#FF6B35',
      });
      setOriginalData({
        name: '',
        description: '',
        color: '#FF6B35',
      });
      setImageFile(null);
    }
    setErrors({});
    setImageError(null);
  }, [editingCategory, isOpen]);

  const validate = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = t('catalog.validation.nameRequired');
    } else if (formData.name.trim().length < 2) {
      newErrors.name = t('menuSetup.nameTooShort');
    } else if (formData.name.trim().length > 50) {
      newErrors.name = t('menuSetup.nameTooLong');
    }

    if (formData.description && formData.description.length > 200) {
      newErrors.description = t('menuSetup.descriptionTooLong');
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate() || imageError) {
      return;
    }

    setIsSubmitting(true);
    try {
      const categoryData: any = {
        name: formData.name.trim(),
        description: formData.description.trim() || '',
        color: formData.color,
        // NO icon field
      };

      if (editingCategory) {
        categoryData.id = editingCategory.id;
      }

      await onSave(categoryData, imageFile);
      onClose();
    } catch (error) {
      console.error('Error saving category:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Check if form has changed
  const hasFormChanged = editingCategory
    ? formData.name.trim() !== originalData.name.trim() ||
      formData.description.trim() !== originalData.description.trim() ||
      formData.color !== originalData.color ||
      imageFile !== null
    : formData.name.trim() !== '' ||
      formData.description.trim() !== '' ||
      formData.color !== '#FF6B35' ||
      imageFile !== null;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg w-full max-w-md">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            {editingCategory ? t('catalog.editCategory') : t('catalog.addCategory')}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Category Name */}
          <Input
            label={t('menuSetup.categoryName')}
            placeholder={t('menuSetup.enterCategoryName')}
            error={errors.name}
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          />

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {t('menuSetup.categoryDescription')} ({t('common.optional')})
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder={t('menuSetup.enterCategoryDescription')}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-orange-500"
            />
            {errors.description && (
              <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                {errors.description}
              </p>
            )}
          </div>

          {/* Color Picker */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {t('menuSetup.categoryColor')}
            </label>
            <div className="grid grid-cols-8 gap-2 mb-3">
              {PREDEFINED_COLORS.map((color) => (
                <button
                  key={color}
                  type="button"
                  onClick={() => setFormData({ ...formData, color })}
                  className={`w-8 h-8 rounded-full border-2 transition-all ${
                    formData.color === color
                      ? 'border-gray-900 dark:border-white scale-110'
                      : 'border-transparent'
                  }`}
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
            <Input
              type="text"
              placeholder="#FF6B35"
              value={formData.color}
              onChange={(e) => setFormData({ ...formData, color: e.target.value })}
            />
          </div>

          {/* Image Upload */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {t('catalog.image')} ({t('common.optional')})
            </label>
            <ImageUpload
              value={imageFile || editingCategory?.image_url}
              onChange={setImageFile}
              onError={setImageError}
              placeholder={t('menuSetup.uploadImagePlaceholder')}
              maxSizeMB={5}
            />
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              {t('menuSetup.imageUploadHint')}
            </p>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4">
            <Button
              type="button"
              variant="secondary"
              onClick={onClose}
              className="flex-1"
              disabled={isSubmitting}
            >
              {t('common.cancel')}
            </Button>
            <Button
              type="submit"
              className="flex-1"
              disabled={isSubmitting || imageError !== null || !hasFormChanged}
            >
              {isSubmitting
                ? t('common.saving')
                : editingCategory
                ? t('common.update')
                : t('common.create')}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
