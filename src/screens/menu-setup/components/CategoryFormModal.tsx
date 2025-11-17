import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { useTranslation } from 'react-i18next';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { ImageUpload } from '../../../components/ui/ImageUpload';
import { imageCache } from '../../../lib/storage';
import type { Category, CreateCategoryData, UpdateCategoryData } from '../../../types/menu';

const categorySchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(50, 'Name too long'),
  description: z.string().max(200, 'Description too long').optional(),
  color: z.string().regex(/^#[0-9A-F]{6}$/i, 'Invalid color code').optional(),
  parent_id: z.string().nullable().optional(),
});

type CategoryFormData = z.infer<typeof categorySchema>;

interface CategoryFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: CreateCategoryData | UpdateCategoryData, imageFile?: File | null) => Promise<void>;
  category?: Category | null;
  title: string;
  availableParentCategories?: Category[];
}

const PREDEFINED_COLORS = [
  '#EF4444', // Red
  '#F59E0B', // Orange
  '#10B981', // Green
  '#3B82F6', // Blue
  '#6366F1', // Indigo
  '#8B5CF6', // Purple
  '#EC4899', // Pink
  '#F59E0B', // Amber
];

export function CategoryFormModal({
  isOpen,
  onClose,
  onSubmit,
  category,
  title,
  availableParentCategories = [],
}: CategoryFormModalProps) {
  const { t } = useTranslation();
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [imageFile, setImageFile] = React.useState<File | null>(null);
  const [cachedImageUrl, setCachedImageUrl] = React.useState<string | null>(null);
  const [imageError, setImageError] = React.useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
    reset,
  } = useForm<CategoryFormData>({
    resolver: zodResolver(categorySchema),
    defaultValues: {
      name: category?.name || '',
      description: category?.description || '',
      color: category?.color || '#FF6B35',
      parent_id: category?.parent_id || null,
    },
  });

  const parentOptions = availableParentCategories.filter(
    (cat) => cat.id !== category?.id
  );

  const selectedColor = watch('color');

  React.useEffect(() => {
    const loadCachedImage = async () => {
      if (category?.id) {
        const cached = await imageCache.get(category.id);
        if (cached) {
          setCachedImageUrl(cached);
        } else if (category.image_url) {
          setCachedImageUrl(category.image_url);
        } else {
          setCachedImageUrl(null);
        }
      } else {
        setCachedImageUrl(null);
      }
    };

    if (category) {
      reset({
        name: category.name,
        description: category.description || '',
        color: category.color,
        parent_id: category.parent_id || null,
      });
      loadCachedImage();
    } else {
      reset({
        name: '',
        description: '',
        color: '#FF6B35',
        parent_id: null,
      });
      setImageFile(null);
      setCachedImageUrl(null);
    }
  }, [category, reset]);

  const onFormSubmit = async (data: CategoryFormData) => {
    setIsSubmitting(true);
    try {
      await onSubmit(data, imageFile);
      reset();
      setImageFile(null);
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
      <div className="bg-white dark:bg-gray-800 rounded-lg w-full max-w-md">
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
          {/* Category Name */}
          <Input
            label={t('menuSetup.categoryName')}
            placeholder={t('menuSetup.enterCategoryName')}
            error={errors.name?.message}
            {...register('name')}
          />

          {/* Parent Category (Subcategory Support) */}
          {parentOptions.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {t('menuSetup.parentCategory')} {t('common.optional')}
              </label>
              <select
                {...register('parent_id')}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
              >
                <option value="">{t('menuSetup.noParentCategory')}</option>
                {parentOptions.map((parent) => (
                  <option key={parent.id} value={parent.id}>
                    {parent.name}
                  </option>
                ))}
              </select>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                {t('menuSetup.subcategoryHint')}
              </p>
            </div>
          )}

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {t('menuSetup.categoryDescription')} {t('common.optional')}
            </label>
            <textarea
              {...register('description')}
              placeholder={t('menuSetup.enterCategoryDescription')}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-orange-500"
            />
            {errors.description && (
              <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                {errors.description.message}
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
                  onClick={() => setValue('color', color)}
                  className={`w-8 h-8 rounded-full border-2 transition-all ${
                    selectedColor === color
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
              {...register('color')}
              error={errors.color?.message}
            />
          </div>

          {/* Image Upload */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {t('catalog.image')} ({t('common.optional')})
            </label>
            <ImageUpload
              value={imageFile || cachedImageUrl}
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
            <Button type="submit" className="flex-1" disabled={isSubmitting || imageError !== null}>
              {isSubmitting
                ? t('common.saving')
                : category
                ? t('common.update')
                : t('common.create')}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
