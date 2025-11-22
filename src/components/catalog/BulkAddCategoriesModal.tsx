import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useForm, useFieldArray } from 'react-hook-form';
import toast from 'react-hot-toast';
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

interface BulkCategoriesFormData {
  categories: CategoryFormData[];
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
  const { control, register, handleSubmit, formState: { errors }, setValue, watch, reset } = useForm<BulkCategoriesFormData>({
    defaultValues: {
      categories: [{ ...DEFAULT_CATEGORY }],
    },
  });
  const { fields, append, remove } = useFieldArray({
    control,
    name: 'categories',
  });
  const [imageErrors, setImageErrors] = useState<{ [key: number]: string | null }>({});

  useEffect(() => {
    if (!isOpen) {
      reset({ categories: [{ ...DEFAULT_CATEGORY }] });
      setImageErrors({});
    }
  }, [isOpen, reset]);

  const handleAddRow = () => {
    if (fields.length < MAX_CATEGORIES) {
      append({ ...DEFAULT_CATEGORY });
    }
  };

  const handleRemoveRow = (index: number) => {
    if (fields.length > 1) {
      remove(index);
      const newImageErrors = { ...imageErrors };
      delete newImageErrors[index];
      setImageErrors(newImageErrors);
    }
  };

  const handleImageChange = (index: number, file: File | null) => {
    setValue(`categories.${index}.imageFile`, file, { shouldValidate: true });
  };

  const handleImageError = (index: number, error: string | null) => {
    setImageErrors(prev => ({
      ...prev,
      [index]: error
    }));
  };

  const onSubmit = (data: BulkCategoriesFormData) => {
    // Check for image errors
    const hasImageErrors = Object.values(imageErrors).some(error => error !== null);
    if (hasImageErrors) {
      toast.error(t('menuSetup.pleaseFixImageErrors'));
      return;
    }

    const validCategories = data.categories.filter(cat => cat.name.trim() !== '');

    if (validCategories.length === 0) {
      alert(t('menuSetup.pleaseAddCategories'));
      return;
    }

    // Map to Category format (NO ICON FIELD)
    const categoriesToAdd = validCategories.map(cat => ({
      name: cat.name.trim(),
      description: cat.description.trim() || '',
      color: cat.color,
      image_url: null, // Will be set after upload
      icon: '',
      sort_order: 0,
      parent_id: null,
      metadata: {},
      is_active: true,
      updated_at: new Date().toISOString(),
      created_by: ''
    }));

    // Extract image files
    const imageFiles = validCategories.map(cat => cat.imageFile || null);

    onBulkAdd(categoriesToAdd, imageFiles);
    onClose();
  };

  if (!isOpen) return null;

  const watchedCategories = watch('categories');
  const validCount = watchedCategories.filter(c => c.name?.trim()).length;

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
            onClick={onClose}
            className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300"
          >
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit(onSubmit)} className="flex-1 overflow-y-auto p-6">
          <div className="space-y-4">
            {fields.map((field, index) => (
              <div
                key={field.id}
                className="p-6 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600 space-y-4"
              >
                {/* Header with number and delete */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center justify-center w-8 h-8 bg-orange-500 text-white rounded-full font-semibold text-sm">
                      {index + 1}
                    </div>
                    <h3 className="text-sm font-medium text-gray-900 dark:text-white">
                      {watch(`categories.${index}.name`) || t('catalog.categoryName')}
                    </h3>
                  </div>
                  {fields.length > 1 && (
                    <button
                      type="button"
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
                        {...register(`categories.${index}.name`, {
                          minLength: { value: 2, message: t('menuSetup.nameTooShort') },
                          maxLength: { value: 50, message: t('menuSetup.nameTooLong') },
                        })}
                        type="text"
                        placeholder={t('menuSetup.enterCategoryName')}
                        className={`w-full px-3 py-2 border rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-orange-500 ${errors.categories?.[index]?.name
                          ? 'border-red-500 dark:border-red-400'
                          : 'border-gray-300 dark:border-gray-600'
                          }`}
                      />
                      {errors.categories?.[index]?.name && (
                        <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                          {errors.categories[index]?.name?.message}
                        </p>
                      )}
                    </div>

                    {/* Description */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        {t('menuSetup.categoryDescription')} ({t('common.optional')})
                      </label>
                      <textarea
                        {...register(`categories.${index}.description`, {
                          maxLength: { value: 200, message: t('menuSetup.descriptionTooLong') },
                        })}
                        placeholder={t('menuSetup.enterCategoryDescription')}
                        rows={3}
                        className={`w-full px-3 py-2 border rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-orange-500 ${errors.categories?.[index]?.description
                          ? 'border-red-500 dark:border-red-400'
                          : 'border-gray-300 dark:border-gray-600'
                          }`}
                      />
                      {errors.categories?.[index]?.description && (
                        <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                          {errors.categories[index]?.description?.message}
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
                            onClick={() => setValue(`categories.${index}.color`, color)}
                            className={`w-8 h-8 rounded-full border-2 transition-all ${watch(`categories.${index}.color`) === color
                              ? 'border-gray-900 dark:border-white scale-110'
                              : 'border-transparent hover:scale-105'
                              }`}
                            style={{ backgroundColor: color }}
                          />
                        ))}
                      </div>
                      <input
                        {...register(`categories.${index}.color`)}
                        type="text"
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
                      value={watch(`categories.${index}.imageFile`)}
                      onChange={(file) => handleImageChange(index, file)}
                      onError={(error) => handleImageError(index, error)}
                      placeholder={t('menuSetup.uploadImagePlaceholder')}
                      maxSizeMB={5}
                    />
                    <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                      {t('menuSetup.imageUploadHint')}
                    </p>
                  </div>
                </div>

                {/* Preview Badge */}
                {watch(`categories.${index}.name`) && (
                  <div className="pt-2 border-t border-gray-200 dark:border-gray-600">
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                      {t('catalog.preview')}:
                    </p>
                    <div
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-white text-sm font-medium"
                      style={{ backgroundColor: watch(`categories.${index}.color`) }}
                    >
                      {watch(`categories.${index}.name`)}
                    </div>
                  </div>
                )}
              </div>
            ))}

            {/* Add Another Button */}
            {fields.length < MAX_CATEGORIES && (
              <button
                type="button"
                onClick={handleAddRow}
                className="w-full py-3 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-600 dark:text-gray-400 hover:border-orange-500 hover:text-orange-600 dark:hover:text-orange-400 transition-colors flex items-center justify-center gap-2"
              >
                <PlusIcon className="h-5 w-5" />
                {t('menuSetup.addAnotherCategory')}
              </button>
            )}
          </div>

          {/* Footer Actions */}
          <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between">
            <div className="text-sm text-gray-600 dark:text-gray-400">
              {validCount} {t('menuSetup.categoriesReady')}
            </div>
            <div className="flex gap-3">
              <Button type="button" variant="secondary" onClick={onClose}>
                {t('common.cancel')}
              </Button>
              <Button type="submit" disabled={validCount === 0}>
                {t('menuSetup.createMultipleCategories', {
                  count: validCount
                })}
              </Button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
