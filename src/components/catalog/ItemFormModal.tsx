import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useForm } from 'react-hook-form';
import { XMarkIcon, PhotoIcon } from '@heroicons/react/24/outline';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import type { Item } from '../../contexts/POSContext';
import type { Category } from '../../types/menu';

interface ItemFormData {
  name: string;
  price: string;
  category: string;
  categoryId: string;
  sku: string;
  stock: string;
  image: string;
}

interface ItemFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (item: Omit<Item, 'id'> | Item) => Promise<void>;
  editingItem?: Item | null;
  categories: Category[];
}

export function ItemFormModal({ isOpen, onClose, onSave, editingItem, categories }: ItemFormModalProps) {
  const { t } = useTranslation();
  const { register, handleSubmit: handleFormSubmit, formState: { errors, isDirty }, reset, setValue, watch } = useForm<ItemFormData>({
    defaultValues: {
      name: '',
      price: '',
      category: '',
      categoryId: '',
      sku: '',
      stock: '',
      image: '',
    },
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      if (editingItem) {
        reset({
          name: editingItem.name || '',
          price: editingItem.price?.toString() || '',
          category: editingItem.category || '',
          categoryId: (editingItem as any).categoryId || '',
          sku: editingItem.sku || '',
          stock: editingItem.stock?.toString() || '',
          image: editingItem.image || '',
        });
      } else {
        reset({
          name: '',
          price: '',
          category: '',
          categoryId: '',
          sku: '',
          stock: '',
          image: '',
        });
      }
    }
  }, [editingItem, isOpen, reset]);

  const onSubmit = async (data: ItemFormData) => {
    setIsSubmitting(true);
    try {
      const itemData: any = {
        name: data.name.trim(),
        price: parseFloat(data.price),
        category: data.category.trim() || 'Uncategorized',
        sku: data.sku.trim() || undefined,
        stock: data.stock ? parseInt(data.stock, 10) : undefined,
        image: data.image.trim() || undefined,
      };

      if (data.categoryId) {
        itemData.categoryId = data.categoryId;
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
    setValue('categoryId', categoryId, { shouldDirty: true });
    setValue('category', category?.name || '', { shouldDirty: true });
  };

  const imageValue = watch('image');

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

        <form onSubmit={handleFormSubmit(onSubmit)} className="p-6 space-y-4">
          {/* Item Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {t('catalog.itemName')} *
            </label>
            <input
              {...register('name', {
                required: t('catalog.validation.nameRequired'),
              })}
              placeholder={t('catalog.enterItemName')}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
            {errors.name && (
              <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.name.message}</p>
            )}
          </div>

          {/* Price */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {t('catalog.price')} *
            </label>
            <input
              {...register('price', {
                required: t('catalog.validation.priceInvalid'),
                validate: (value) => parseFloat(value) > 0 || t('catalog.validation.priceInvalid'),
              })}
              type="number"
              step="0.01"
              min="0"
              placeholder="0.00"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
            {errors.price && (
              <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.price.message}</p>
            )}
          </div>

          {/* Category */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {t('catalog.category')} *
            </label>
            {categories.length > 0 ? (
              <>
                <input type="hidden" {...register('categoryId', { required: t('catalog.validation.categoryRequired') })} />
                <input type="hidden" {...register('category')} />
                <select
                  value={watch('categoryId')}
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
                {errors.categoryId && (
                  <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.categoryId.message}</p>
                )}
              </>
            ) : (
              <>
                <input
                  {...register('category', { required: t('catalog.validation.categoryRequired') })}
                  placeholder={t('catalog.enterCategory')}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
                {errors.category && (
                  <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.category.message}</p>
                )}
              </>
            )}
          </div>

          {/* SKU */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {t('catalog.sku')}
            </label>
            <input
              {...register('sku')}
              placeholder={t('catalog.enterSKU')}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
          </div>

          {/* Stock */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {t('catalog.stock')}
            </label>
            <input
              {...register('stock')}
              type="number"
              min="0"
              placeholder="0"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
          </div>

          {/* Image URL */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {t('catalog.imageURL')}
            </label>
            <div className="flex gap-2">
              <input
                {...register('image')}
                placeholder={t('catalog.enterImageURL')}
                className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
              {imageValue && (
                <div className="w-12 h-12 rounded-lg overflow-hidden border border-gray-300 dark:border-gray-600 flex-shrink-0">
                  <img
                    src={imageValue}
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
              disabled={isSubmitting || !isDirty}
            >
              {isSubmitting
                ? t('common.saving')
                : editingItem
                ? t('common.update')
                : t('catalog.save')}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
