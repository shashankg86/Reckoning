import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import type { Category, CreateCategoryData, UpdateCategoryData } from '../../types/menu';

interface CategoryFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (category: CreateCategoryData | (UpdateCategoryData & { id: string })) => Promise<void>;
  editingCategory?: Category | null;
}

const CATEGORY_COLORS = [
  '#EF4444', '#F59E0B', '#10B981', '#3B82F6', '#6366F1',
  '#8B5CF6', '#EC4899', '#F97316', '#14B8A6', '#06B6D4'
];

const CATEGORY_ICONS = [
  '🍕', '☕', '🍔', '🥗', '🍰', '🥤', '🍜', '🍱', '🍛', '🥘',
  '🍝', '🍣', '🍪', '🧁', '🍦', '🥪', '🌮', '🍩', '🥐', '🍞'
];

export function CategoryFormModal({ isOpen, onClose, onSave, editingCategory }: CategoryFormModalProps) {
  const { t } = useTranslation();
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    color: CATEGORY_COLORS[0],
    icon: CATEGORY_ICONS[0],
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (editingCategory) {
      setFormData({
        name: editingCategory.name || '',
        description: editingCategory.description || '',
        color: editingCategory.color || CATEGORY_COLORS[0],
        icon: editingCategory.icon || CATEGORY_ICONS[0],
      });
    } else {
      setFormData({
        name: '',
        description: '',
        color: CATEGORY_COLORS[0],
        icon: CATEGORY_ICONS[0],
      });
    }
    setErrors({});
  }, [editingCategory, isOpen]);

  const validate = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = t('menuSetup.validation.categoryNameRequired');
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) {
      return;
    }

    setIsSubmitting(true);
    try {
      const categoryData: any = {
        name: formData.name.trim(),
        description: formData.description.trim() || null,
        color: formData.color,
        icon: formData.icon,
      };

      if (editingCategory) {
        categoryData.id = editingCategory.id;
      }

      await onSave(categoryData);
      onClose();
    } catch (error) {
      console.error('Error saving category:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            {editingCategory ? t('catalog.editCategory') : t('catalog.addCategory')}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300"
          >
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Category Name */}
          <div>
            <Input
              label={t('catalog.categoryName')}
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder={t('catalog.enterCategoryName')}
              error={errors.name}
              required
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {t('catalog.description')}
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder={t('catalog.enterDescription')}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white resize-none"
            />
          </div>

          {/* Icon Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {t('catalog.icon')}
            </label>
            <div className="grid grid-cols-10 gap-2">
              {CATEGORY_ICONS.map((icon) => (
                <button
                  key={icon}
                  type="button"
                  onClick={() => setFormData({ ...formData, icon })}
                  className={`aspect-square flex items-center justify-center text-2xl rounded-lg border-2 transition-all ${
                    formData.icon === icon
                      ? 'border-orange-500 bg-orange-50 dark:bg-orange-900/20'
                      : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                  }`}
                >
                  {icon}
                </button>
              ))}
            </div>
          </div>

          {/* Color Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {t('catalog.color')}
            </label>
            <div className="grid grid-cols-10 gap-2">
              {CATEGORY_COLORS.map((color) => (
                <button
                  key={color}
                  type="button"
                  onClick={() => setFormData({ ...formData, color })}
                  className={`aspect-square rounded-lg border-2 transition-all ${
                    formData.color === color
                      ? 'border-gray-900 dark:border-white scale-110'
                      : 'border-transparent hover:scale-105'
                  }`}
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
          </div>

          {/* Preview */}
          <div className="bg-gray-50 dark:bg-gray-900 p-4 rounded-lg">
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
              {t('catalog.preview')}
            </p>
            <div className="flex items-center gap-3">
              <div
                className="w-12 h-12 rounded-lg flex items-center justify-center text-2xl"
                style={{ backgroundColor: formData.color }}
              >
                {formData.icon}
              </div>
              <div>
                <p className="font-medium text-gray-900 dark:text-white">
                  {formData.name || t('catalog.categoryName')}
                </p>
                {formData.description && (
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {formData.description}
                  </p>
                )}
              </div>
            </div>
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
              disabled={isSubmitting}
            >
              {isSubmitting ? t('common.saving') : t('catalog.save')}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
