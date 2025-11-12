/**
 * ItemFormModal Component
 *
 * Modal for creating/editing items with validation and dynamic metadata support
 */

import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { useTranslation } from 'react-i18next';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import type { Category } from '../../../types/menu';
import type { ItemData } from '../../../api/items';

const itemSchema = z.object({
  name: z.string().min(1, 'Name is required').max(200, 'Name too long'),
  price: z.coerce.number().min(0, 'Price must be positive'),
  category_id: z.string().optional(),
  description: z.string().max(500, 'Description too long').optional(),
  sku: z.string().max(50, 'SKU too long').optional(),
  stock: z.coerce.number().min(0, 'Stock must be positive').optional(),
  tags: z.string().optional(), // Comma-separated
});

type ItemFormData = z.infer<typeof itemSchema>;

interface ItemFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: ItemData) => Promise<void>;
  item?: any | null;
  title: string;
  availableCategories?: Category[];
  defaultCategoryId?: string;
}

export function ItemFormModal({
  isOpen,
  onClose,
  onSubmit,
  item,
  title,
  availableCategories = [],
  defaultCategoryId,
}: ItemFormModalProps) {
  const { t } = useTranslation();
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<ItemFormData>({
    resolver: zodResolver(itemSchema),
    defaultValues: {
      name: item?.name_en || item?.name || '',
      price: item?.price || 0,
      category_id: item?.category_id || defaultCategoryId || '',
      description: item?.description_en || item?.description || '',
      sku: item?.sku || '',
      stock: item?.stock || 0,
      tags: item?.tags?.join(', ') || '',
    },
  });

  React.useEffect(() => {
    if (item) {
      reset({
        name: item.name_en || item.name,
        price: item.price,
        category_id: item.category_id || '',
        description: item.description_en || item.description || '',
        sku: item.sku || '',
        stock: item.stock || 0,
        tags: item.tags?.join(', ') || '',
      });
    } else {
      reset({
        name: '',
        price: 0,
        category_id: defaultCategoryId || '',
        description: '',
        sku: '',
        stock: 0,
        tags: '',
      });
    }
  }, [item, defaultCategoryId, reset]);

  const onFormSubmit = async (data: ItemFormData) => {
    setIsSubmitting(true);
    try {
      // Parse tags from comma-separated string
      const tags = data.tags
        ? data.tags
            .split(',')
            .map((t) => t.trim())
            .filter((t) => t.length > 0)
        : [];

      await onSubmit({
        name: data.name,
        price: data.price,
        category_id: data.category_id || undefined,
        description: data.description,
        sku: data.sku,
        stock: data.stock || 0,
        tags,
      });
      reset();
      onClose();
    } catch (error) {
      console.error('Form submission error:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{title}</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit(onFormSubmit)} className="p-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Item Name */}
            <div className="md:col-span-2">
              <Input
                label={t('catalog.itemName')}
                placeholder={t('catalog.enterItemName')}
                error={errors.name?.message}
                {...register('name')}
              />
            </div>

            {/* Price */}
            <Input
              label={t('catalog.price')}
              type="number"
              step="0.01"
              min="0"
              placeholder="0.00"
              error={errors.price?.message}
              {...register('price')}
            />

            {/* Category */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {t('catalog.category')} ({t('common.optional')})
              </label>
              <select
                {...register('category_id')}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
              >
                <option value="">None</option>
                {availableCategories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>

            {/* SKU */}
            <Input
              label={`SKU (${t('common.optional')})`}
              placeholder="e.g., PROD-001"
              error={errors.sku?.message}
              {...register('sku')}
            />

            {/* Stock */}
            <Input
              label={`Stock (${t('common.optional')})`}
              type="number"
              min="0"
              placeholder="0"
              error={errors.stock?.message}
              {...register('stock')}
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Description ({t('common.optional')})
            </label>
            <textarea
              {...register('description')}
              placeholder="Item description..."
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-orange-500"
            />
            {errors.description && (
              <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                {errors.description.message}
              </p>
            )}
          </div>

          {/* Tags */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Tags ({t('common.optional')})
            </label>
            <Input
              placeholder="e.g., vegan, spicy, popular (comma-separated)"
              error={errors.tags?.message}
              {...register('tags')}
            />
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              Enter tags separated by commas
            </p>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
            <Button
              type="button"
              variant="secondary"
              onClick={onClose}
              className="flex-1"
              disabled={isSubmitting}
            >
              {t('common.cancel')}
            </Button>
            <Button type="submit" className="flex-1" disabled={isSubmitting}>
              {isSubmitting ? t('common.saving') : item ? t('common.update') : t('common.create')}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
