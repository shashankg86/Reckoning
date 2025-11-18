import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
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
  const [items, setItems] = useState<ItemFormData[]>([
    { ...DEFAULT_ITEM, category_id: preselectedCategoryId || '' }
  ]);
  const [errors, setErrors] = useState<{ [key: number]: { name?: string; price?: string; category_id?: string; description?: string } }>({});

  const handleAddRow = () => {
    if (items.length < MAX_ITEMS) {
      setItems([...items, { ...DEFAULT_ITEM, category_id: preselectedCategoryId || '' }]);
    }
  };

  const handleRemoveRow = (index: number) => {
    if (items.length > 1) {
      setItems(items.filter((_, i) => i !== index));
      const newErrors = { ...errors };
      delete newErrors[index];
      setErrors(newErrors);
    }
  };

  const handleChange = (index: number, field: keyof ItemFormData, value: any) => {
    const updated = [...items];
    updated[index] = { ...updated[index], [field]: value };
    setItems(updated);

    // Clear error for this field
    if (errors[index]) {
      const newErrors = { ...errors };
      delete newErrors[index]?.[field as 'name' | 'price' | 'category_id' | 'description'];
      setErrors(newErrors);
    }
  };

  const handleImageChange = (index: number, file: File | null) => {
    handleChange(index, 'imageFile', file);
  };

  const validateItems = (): boolean => {
    const newErrors: { [key: number]: { name?: string; price?: string; category_id?: string; description?: string } } = {};
    let hasErrors = false;

    items.forEach((item, index) => {
      if (item.name.trim()) {
        // Only validate if name is provided
        if (item.name.trim().length < 1) {
          newErrors[index] = { ...newErrors[index], name: t('catalog.validation.nameRequired') };
          hasErrors = true;
        }
        if (item.name.trim().length > 200) {
          newErrors[index] = { ...newErrors[index], name: t('menuSetup.nameTooLong') };
          hasErrors = true;
        }
        if (!item.category_id || item.category_id === '') {
          newErrors[index] = { ...newErrors[index], category_id: t('catalog.validation.categoryRequired') };
          hasErrors = true;
        }
        if (!item.price || parseFloat(item.price) <= 0) {
          newErrors[index] = { ...newErrors[index], price: t('catalog.validation.priceInvalid') };
          hasErrors = true;
        }
        if (!item.description || item.description.trim().length === 0) {
          newErrors[index] = { ...newErrors[index], description: t('menuSetup.descriptionRequired') };
          hasErrors = true;
        }
        if (item.description && item.description.length > 500) {
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
    if (!validateItems()) {
      return;
    }

    const validItems = items.filter(
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
    handleClose();
  };

  const handleClose = () => {
    setItems([{ ...DEFAULT_ITEM, category_id: preselectedCategoryId || '' }]);
    setErrors({});
    onClose();
  };

  if (!isOpen) return null;

  const validCount = items.filter(i => i.name.trim() && i.category_id && i.price && parseFloat(i.price) > 0 && i.description.trim()).length;

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
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300"
          >
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="space-y-4">
            {items.map((item, index) => {
              const selectedCategory = categories.find(cat => cat.id === item.category_id);

              return (
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
                        {item.name || t('catalog.itemName')}
                      </h3>
                      {selectedCategory && (
                        <span
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium text-white"
                          style={{ backgroundColor: selectedCategory.color }}
                        >
                          {selectedCategory.icon} {selectedCategory.name}
                        </span>
                      )}
                    </div>
                    {items.length > 1 && (
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
                      {/* Item Name */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          {t('catalog.itemName')} *
                        </label>
                        <input
                          type="text"
                          value={item.name}
                          onChange={(e) => handleChange(index, 'name', e.target.value)}
                          placeholder={t('catalog.enterItemName')}
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

                      {/* Category */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          {t('catalog.category')} *
                        </label>
                        <select
                          value={item.category_id}
                          onChange={(e) => handleChange(index, 'category_id', e.target.value)}
                          className={`w-full px-3 py-2 border rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500 ${
                            errors[index]?.category_id
                              ? 'border-red-500 dark:border-red-400'
                              : 'border-gray-300 dark:border-gray-600'
                          }`}
                        >
                          <option value="">{t('menuSetup.selectCategory')}</option>
                          {categories.map((category) => (
                            <option key={category.id} value={category.id}>
                              {category.icon} {category.name}
                            </option>
                          ))}
                        </select>
                        {errors[index]?.category_id && (
                          <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                            {errors[index].category_id}
                          </p>
                        )}
                      </div>

                      {/* Description */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          {t('catalog.description')} *
                        </label>
                        <textarea
                          value={item.description}
                          onChange={(e) => handleChange(index, 'description', e.target.value)}
                          placeholder={t('catalog.enterDescription')}
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

                      {/* Price, SKU, Stock */}
                      <div className="grid grid-cols-3 gap-3">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            {t('catalog.price')} *
                          </label>
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            value={item.price}
                            onChange={(e) => handleChange(index, 'price', e.target.value)}
                            placeholder="0.00"
                            className={`w-full px-3 py-2 border rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500 ${
                              errors[index]?.price
                                ? 'border-red-500 dark:border-red-400'
                                : 'border-gray-300 dark:border-gray-600'
                            }`}
                          />
                          {errors[index]?.price && (
                            <p className="mt-1 text-xs text-red-600 dark:text-red-400">
                              {errors[index].price}
                            </p>
                          )}
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            {t('catalog.stock')}
                          </label>
                          <input
                            type="number"
                            min="0"
                            value={item.stock}
                            onChange={(e) => handleChange(index, 'stock', e.target.value)}
                            placeholder="0"
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            {t('catalog.sku')}
                          </label>
                          <input
                            type="text"
                            value={item.sku}
                            onChange={(e) => handleChange(index, 'sku', e.target.value)}
                            placeholder={t('catalog.enterSKU')}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Right Column - Image Upload */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        {t('catalog.image')} ({t('common.optional')})
                      </label>
                      <ImageUpload
                        value={item.imageFile}
                        onChange={(file) => handleImageChange(index, file)}
                        placeholder={t('menuSetup.uploadImagePlaceholder')}
                        maxSizeMB={5}
                      />
                      <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                        {t('menuSetup.imageUploadHint')}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}

            {/* Add Another Button */}
            {items.length < MAX_ITEMS && (
              <button
                onClick={handleAddRow}
                className="w-full py-3 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-600 dark:text-gray-400 hover:border-orange-500 hover:text-orange-600 dark:hover:text-orange-400 transition-colors flex items-center justify-center gap-2"
              >
                <PlusIcon className="h-5 w-5" />
                {t('catalog.addAnotherItem')}
              </button>
            )}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between">
          <div className="text-sm text-gray-600 dark:text-gray-400">
            {validCount} {validCount === 1 ? t('catalog.item') : t('catalog.items')} {t('menuSetup.categoriesReady').toLowerCase()}
          </div>
          <div className="flex gap-3">
            <Button variant="secondary" onClick={handleClose}>
              {t('common.cancel')}
            </Button>
            <Button onClick={handleSubmit} disabled={validCount === 0}>
              {t('catalog.addItemsCount', {
                count: validCount
              })}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
