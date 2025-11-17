import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { XMarkIcon, PhotoIcon } from '@heroicons/react/24/outline';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import type { Item } from '../../contexts/POSContext';
import type { Category } from '../../types/menu';

interface ItemFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (item: Omit<Item, 'id'> | Item) => Promise<void>;
  editingItem?: Item | null;
  categories: Category[];
}

export function ItemFormModal({ isOpen, onClose, onSave, editingItem, categories }: ItemFormModalProps) {
  const { t } = useTranslation();
  const [formData, setFormData] = useState({
    name: '',
    price: '',
    category: '',
    categoryId: '',
    sku: '',
    stock: '',
    image: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (editingItem) {
      setFormData({
        name: editingItem.name || '',
        price: editingItem.price?.toString() || '',
        category: editingItem.category || '',
        categoryId: (editingItem as any).categoryId || '',
        sku: editingItem.sku || '',
        stock: editingItem.stock?.toString() || '',
        image: editingItem.image || '',
      });
    } else {
      setFormData({
        name: '',
        price: '',
        category: '',
        categoryId: '',
        sku: '',
        stock: '',
        image: '',
      });
    }
    setErrors({});
  }, [editingItem, isOpen]);

  const validate = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = t('catalog.validation.nameRequired');
    }

    if (!formData.price || parseFloat(formData.price) <= 0) {
      newErrors.price = t('catalog.validation.priceInvalid');
    }

    if (!formData.category.trim() && !formData.categoryId) {
      newErrors.category = t('catalog.validation.categoryRequired');
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
      const itemData: any = {
        name: formData.name.trim(),
        price: parseFloat(formData.price),
        category: formData.category.trim() || 'Uncategorized',
        sku: formData.sku.trim() || undefined,
        stock: formData.stock ? parseInt(formData.stock, 10) : undefined,
        image: formData.image.trim() || undefined,
      };

      if (formData.categoryId) {
        itemData.categoryId = formData.categoryId;
      }

      if (editingItem) {
        itemData.id = editingItem.id;
      }

      await onSave(itemData);
      onClose();
    } catch (error) {
      console.error('Error saving item:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCategoryChange = (categoryId: string) => {
    const category = categories.find((c) => c.id === categoryId);
    setFormData({
      ...formData,
      categoryId,
      category: category?.name || '',
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            {editingItem ? t('catalog.editItem') : t('catalog.addItem')}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300"
          >
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Item Name */}
          <div>
            <Input
              label={t('catalog.itemName')}
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder={t('catalog.enterItemName')}
              error={errors.name}
              required
            />
          </div>

          {/* Price */}
          <div>
            <Input
              label={t('catalog.price')}
              type="number"
              step="0.01"
              min="0"
              value={formData.price}
              onChange={(e) => setFormData({ ...formData, price: e.target.value })}
              placeholder="0.00"
              error={errors.price}
              required
            />
          </div>

          {/* Category */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {t('catalog.category')} *
            </label>
            {categories.length > 0 ? (
              <select
                value={formData.categoryId}
                onChange={(e) => handleCategoryChange(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                <option value="">{t('catalog.selectCategory')}</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            ) : (
              <Input
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                placeholder={t('catalog.enterCategory')}
                error={errors.category}
              />
            )}
            {errors.category && (
              <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.category}</p>
            )}
          </div>

          {/* SKU */}
          <div>
            <Input
              label={t('catalog.sku')}
              value={formData.sku}
              onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
              placeholder={t('catalog.enterSKU')}
            />
          </div>

          {/* Stock */}
          <div>
            <Input
              label={t('catalog.stock')}
              type="number"
              min="0"
              value={formData.stock}
              onChange={(e) => setFormData({ ...formData, stock: e.target.value })}
              placeholder="0"
            />
          </div>

          {/* Image URL */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {t('catalog.imageURL')}
            </label>
            <div className="flex gap-2">
              <Input
                value={formData.image}
                onChange={(e) => setFormData({ ...formData, image: e.target.value })}
                placeholder={t('catalog.enterImageURL')}
                className="flex-1"
              />
              {formData.image && (
                <div className="w-12 h-12 rounded-lg overflow-hidden border border-gray-300 dark:border-gray-600 flex-shrink-0">
                  <img
                    src={formData.image}
                    alt="Preview"
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = '';
                      (e.target as HTMLImageElement).style.display = 'none';
                    }}
                  />
                </div>
              )}
            </div>
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              {t('catalog.imageURLHint')}
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
