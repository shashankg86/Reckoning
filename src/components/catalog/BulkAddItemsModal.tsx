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
import type { Item, Category } from '../../types/menu';

interface ItemFormData {
  name: string;
  category_id: string;
  sku: string;
  price: string;
  stock: string;
  description: string;
  imageFile?: File | null;
}

interface BulkItemsFormData {
  items: ItemFormData[];
}

interface BulkAddItemsModalProps {
  isOpen: boolean;
  onClose: () => void;
  categories: Category[];
  onBulkAdd: (items: Partial<Item>[], imageFiles: (File | null)[]) => void;
  preselectedCategoryId?: string;
}

const DEFAULT_ITEM: ItemFormData = {
  name: '',
  category_id: '',
  sku: '',
  price: '',
  stock: '0',
  description: '',
  imageFile: null
};

const MAX_ITEMS = 10;

export function BulkAddItemsModal({
  isOpen,
  onClose,
  categories,
  onBulkAdd,
  preselectedCategoryId
}: BulkAddItemsModalProps) {
  const { t } = useTranslation();
  const { control, register, handleSubmit, formState: { errors }, setValue, watch, reset } = useForm<BulkItemsFormData>({
    defaultValues: {
      items: [{ ...DEFAULT_ITEM, category_id: preselectedCategoryId || '' }],
    },
  });
  const { fields, append, remove } = useFieldArray({
    control,
    name: 'items',
  });
  const [imageErrors, setImageErrors] = useState<{ [key: number]: string | null }>({});

  useEffect(() => {
    if (!isOpen) {
      reset({ items: [{ ...DEFAULT_ITEM, category_id: preselectedCategoryId || '' }] });
      setImageErrors({});
    }
  }, [isOpen, preselectedCategoryId, reset]);

  const handleAddRow = () => {
    if (fields.length < MAX_ITEMS) {
      append({ ...DEFAULT_ITEM, category_id: preselectedCategoryId || '' });
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
    setValue(`items.${index}.imageFile`, file, { shouldValidate: true });
  };

  const handleImageError = (index: number, error: string | null) => {
    setImageErrors(prev => ({
      ...prev,
      [index]: error
    }));
  };

  const onSubmit = (data: BulkItemsFormData) => {
    // Check for image errors
    const hasImageErrors = Object.values(imageErrors).some(error => error !== null);
    if (hasImageErrors) {
      toast.error(t('menuSetup.pleaseFixImageErrors'));
      return;
    }

    const validItems = data.items.filter(
      item =>
        item.name.trim() !== '' &&
        item.category_id !== '' &&
        item.price.trim() !== '' &&
        parseFloat(item.price) > 0 &&
        item.description.trim() !== ''
    );

    if (validItems.length === 0) {
      alert(t('catalog.validation.nameRequired'));
      return;
    }

    // Map to Item format
    const itemsToAdd = validItems.map(item => ({
      name: item.name.trim(),
      description: item.description.trim(),
      category_id: item.category_id,
      sku: item.sku.trim(),
      price: item.price,
      stock: parseInt(item.stock) || 0,
      image_url: null // Will be set after upload
    }));

    // Extract image files
    const imageFiles = validItems.map(item => item.imageFile || null);

    onBulkAdd(itemsToAdd, imageFiles);
    onClose();
  };

  if (!isOpen) return null;

  const watchedItems = watch('items');
  const validCount = watchedItems.filter(i => i.name?.trim() && i.category_id && i.price && parseFloat(i.price) > 0 && i.description?.trim()).length;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg w-full max-w-5xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              {t('catalog.bulkAddItems')}
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              {t('catalog.quickAddItems')} ({validCount}/{MAX_ITEMS})
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
                      {watch(`items.${index}.name`) || t('catalog.itemName')}
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
                    {/* Item Name */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        {t('catalog.itemName')} *
                      </label>
                      <input
                        {...register(`items.${index}.name`, {
                          required: t('catalog.validation.nameRequired'),
                          maxLength: { value: 200, message: t('menuSetup.nameTooLong') },
                        })}
                        type="text"
                        placeholder={t('catalog.enterItemName')}
                        className={`w-full px-3 py-2 border rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-orange-500 ${errors.items?.[index]?.name
                            ? 'border-red-500 dark:border-red-400'
                            : 'border-gray-300 dark:border-gray-600'
                          }`}
                      />
                      {errors.items?.[index]?.name && (
                        <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                          {errors.items[index]?.name?.message}
                        </p>
                      )}
                    </div>

                    {/* Category */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        {t('catalog.category')} *
                      </label>
                      <select
                        {...register(`items.${index}.category_id`, {
                          required: t('catalog.validation.categoryRequired'),
                        })}
                        className={`w-full px-3 py-2 border rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500 ${errors.items?.[index]?.category_id
                            ? 'border-red-500 dark:border-red-400'
                            : 'border-gray-300 dark:border-gray-600'
                          }`}
                      >
                        <option value="">{t('catalog.selectCategory')}</option>
                        {categories.map((category) => (
                          <option key={category.id} value={category.id}>
                            {category.name}
                          </option>
                        ))}
                      </select>
                      {errors.items?.[index]?.category_id && (
                        <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                          {errors.items[index]?.category_id?.message}
                        </p>
                      )}
                    </div>

                    {/* Price & Stock */}
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          {t('catalog.price')} *
                        </label>
                        <input
                          {...register(`items.${index}.price`, {
                            required: t('catalog.validation.priceInvalid'),
                            validate: (value) => parseFloat(value) > 0 || t('catalog.validation.priceInvalid'),
                          })}
                          type="number"
                          step="0.01"
                          min="0"
                          placeholder="0.00"
                          className={`w-full px-3 py-2 border rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-orange-500 ${errors.items?.[index]?.price
                              ? 'border-red-500 dark:border-red-400'
                              : 'border-gray-300 dark:border-gray-600'
                            }`}
                        />
                        {errors.items?.[index]?.price && (
                          <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                            {errors.items[index]?.price?.message}
                          </p>
                        )}
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          {t('catalog.stock')}
                        </label>
                        <input
                          {...register(`items.${index}.stock`)}
                          type="number"
                          min="0"
                          placeholder="0"
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-orange-500"
                        />
                      </div>
                    </div>

                    {/* SKU */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        {t('catalog.sku')} ({t('common.optional')})
                      </label>
                      <input
                        {...register(`items.${index}.sku`)}
                        type="text"
                        placeholder={t('catalog.enterSKU')}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-orange-500"
                      />
                    </div>
                  </div>

                  {/* Right Column */}
                  <div className="space-y-4">
                    {/* Description */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        {t('menuSetup.description')} *
                      </label>
                      <textarea
                        {...register(`items.${index}.description`, {
                          required: t('menuSetup.descriptionRequired'),
                          maxLength: { value: 500, message: t('menuSetup.descriptionTooLong') },
                        })}
                        placeholder={t('menuSetup.itemDescriptionPlaceholder')}
                        rows={4}
                        className={`w-full px-3 py-2 border rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-orange-500 ${errors.items?.[index]?.description
                            ? 'border-red-500 dark:border-red-400'
                            : 'border-gray-300 dark:border-gray-600'
                          }`}
                      />
                      {errors.items?.[index]?.description && (
                        <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                          {errors.items[index]?.description?.message}
                        </p>
                      )}
                    </div>

                    {/* Image Upload */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        {t('catalog.image')} ({t('common.optional')})
                      </label>
                      <ImageUpload
                        value={watch(`items.${index}.imageFile`)}
                        onChange={(file) => handleImageChange(index, file)}
                        onError={(error) => handleImageError(index, error)}
                        placeholder={t('menuSetup.uploadItemImagePlaceholder')}
                        maxSizeMB={5}
                      />
                      <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                        {t('menuSetup.itemImageUploadHint')}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            ))}

            {/* Add Another Button */}
            {fields.length < MAX_ITEMS && (
              <button
                type="button"
                onClick={handleAddRow}
                className="w-full py-3 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-600 dark:text-gray-400 hover:border-orange-500 hover:text-orange-600 dark:hover:text-orange-400 transition-colors flex items-center justify-center gap-2"
              >
                <PlusIcon className="h-5 w-5" />
                {t('menuSetup.addAnotherItem')}
              </button>
            )}
          </div>

          {/* Footer Actions */}
          <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between">
            <div className="text-sm text-gray-600 dark:text-gray-400">
              {validCount} {t('menuSetup.items')}
            </div>
            <div className="flex gap-3">
              <Button type="button" variant="secondary" onClick={onClose}>
                {t('common.cancel')}
              </Button>
              <Button type="submit" disabled={validCount === 0}>
                {t('catalog.addItemsCount', { count: validCount })}
              </Button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
