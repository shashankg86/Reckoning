import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  XMarkIcon,
  PlusIcon,
  TrashIcon,
  PhotoIcon
} from '@heroicons/react/24/outline';
import { Button } from '../ui/Button';
import type { Item, Category } from '../../types/menu';

interface ItemFormData {
  name: string;
  category_id: string;
  sku: string;
  price: string;
  stock: string;
  description: string;
  imageFile?: File | null;
  imagePreview?: string | null;
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
  imageFile: null,
  imagePreview: null
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
    const updated = [...items];
    updated[index] = {
      ...updated[index],
      imageFile: file,
      imagePreview: file ? URL.createObjectURL(file) : null
    };
    setItems(updated);
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
      <div className="bg-white dark:bg-gray-800 rounded-lg w-full max-w-7xl max-h-[90vh] flex flex-col">
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
            {/* Table */}
            <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 dark:bg-gray-700">
                    <tr>
                      <th className="px-3 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider w-12">
                        #
                      </th>
                      <th className="px-3 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider min-w-[180px]">
                        {t('catalog.itemName')} *
                      </th>
                      <th className="px-3 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider min-w-[150px]">
                        {t('catalog.category')} *
                      </th>
                      <th className="px-3 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider min-w-[200px]">
                        {t('catalog.description')} *
                      </th>
                      <th className="px-3 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider w-28">
                        {t('catalog.sku')}
                      </th>
                      <th className="px-3 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider w-24">
                        {t('catalog.price')} *
                      </th>
                      <th className="px-3 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider w-24">
                        {t('catalog.stock')}
                      </th>
                      <th className="px-3 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider w-32">
                        {t('catalog.image')}
                      </th>
                      <th className="px-3 py-3 text-center text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider w-20">
                        {t('common.actions')}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                    {items.map((item, index) => {
                      const selectedCategory = categories.find(cat => cat.id === item.category_id);

                      return (
                        <tr key={index} className="bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700/50">
                          {/* Index */}
                          <td className="px-3 py-3 text-sm text-gray-500 dark:text-gray-400">
                            {index + 1}
                          </td>

                          {/* Name Input */}
                          <td className="px-3 py-3">
                            <input
                              type="text"
                              value={item.name}
                              onChange={(e) => handleChange(index, 'name', e.target.value)}
                              placeholder={t('catalog.enterItemName')}
                              className={`w-full px-2 py-1.5 text-sm border rounded bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-orange-500 focus:border-transparent ${
                                errors[index]?.name
                                  ? 'border-red-500 dark:border-red-400'
                                  : 'border-gray-300 dark:border-gray-600'
                              }`}
                            />
                            {errors[index]?.name && (
                              <p className="mt-1 text-xs text-red-600 dark:text-red-400">
                                {errors[index].name}
                              </p>
                            )}
                          </td>

                          {/* Category Select */}
                          <td className="px-3 py-3">
                            <select
                              value={item.category_id}
                              onChange={(e) => handleChange(index, 'category_id', e.target.value)}
                              className={`w-full px-2 py-1.5 text-sm border rounded bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-orange-500 ${
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
                              <p className="mt-1 text-xs text-red-600 dark:text-red-400">
                                {errors[index].category_id}
                              </p>
                            )}
                            {selectedCategory && !errors[index]?.category_id && (
                              <div className="mt-1">
                                <span
                                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium text-white"
                                  style={{ backgroundColor: selectedCategory.color }}
                                >
                                  <span>{selectedCategory.icon}</span>
                                </span>
                              </div>
                            )}
                          </td>

                          {/* Description Input */}
                          <td className="px-3 py-3">
                            <textarea
                              value={item.description}
                              onChange={(e) => handleChange(index, 'description', e.target.value)}
                              placeholder={t('catalog.enterDescription')}
                              rows={2}
                              className={`w-full px-2 py-1.5 text-sm border rounded bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-orange-500 focus:border-transparent resize-none ${
                                errors[index]?.description
                                  ? 'border-red-500 dark:border-red-400'
                                  : 'border-gray-300 dark:border-gray-600'
                              }`}
                            />
                            {errors[index]?.description && (
                              <p className="mt-1 text-xs text-red-600 dark:text-red-400">
                                {errors[index].description}
                              </p>
                            )}
                          </td>

                          {/* SKU Input */}
                          <td className="px-3 py-3">
                            <input
                              type="text"
                              value={item.sku}
                              onChange={(e) => handleChange(index, 'sku', e.target.value)}
                              placeholder={t('catalog.enterSKU')}
                              className="w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                            />
                          </td>

                          {/* Price Input */}
                          <td className="px-3 py-3">
                            <input
                              type="number"
                              step="0.01"
                              min="0"
                              value={item.price}
                              onChange={(e) => handleChange(index, 'price', e.target.value)}
                              placeholder="0.00"
                              className={`w-full px-2 py-1.5 text-sm border rounded bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-orange-500 focus:border-transparent ${
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
                          </td>

                          {/* Stock Input */}
                          <td className="px-3 py-3">
                            <input
                              type="number"
                              min="0"
                              value={item.stock}
                              onChange={(e) => handleChange(index, 'stock', e.target.value)}
                              placeholder="0"
                              className="w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                            />
                          </td>

                          {/* Image Upload */}
                          <td className="px-3 py-3">
                            <div className="flex flex-col gap-2">
                              <div className="relative">
                                <input
                                  type="file"
                                  accept="image/*"
                                  onChange={(e) => {
                                    const file = e.target.files?.[0] || null;
                                    if (file && file.size > 5 * 1024 * 1024) {
                                      alert(t('menuSetup.imageTooLarge'));
                                      return;
                                    }
                                    handleImageChange(index, file);
                                  }}
                                  className="hidden"
                                  id={`item-image-upload-${index}`}
                                />
                                <label
                                  htmlFor={`item-image-upload-${index}`}
                                  className="cursor-pointer inline-flex items-center gap-1 px-2 py-1.5 text-xs border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                                >
                                  <PhotoIcon className="h-4 w-4" />
                                  {item.imageFile ? t('common.change') : t('common.upload')}
                                </label>
                                {item.imageFile && (
                                  <button
                                    onClick={() => handleImageChange(index, null)}
                                    className="ml-1 text-xs text-red-600 dark:text-red-400 hover:underline"
                                  >
                                    {t('common.remove')}
                                  </button>
                                )}
                              </div>
                              {item.imagePreview && (
                                <img
                                  src={item.imagePreview}
                                  alt="Preview"
                                  className="w-16 h-16 object-cover rounded border border-gray-300 dark:border-gray-600"
                                />
                              )}
                            </div>
                          </td>

                          {/* Actions */}
                          <td className="px-3 py-3 text-center">
                            {items.length > 1 && (
                              <button
                                onClick={() => handleRemoveRow(index)}
                                className="p-1.5 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
                                title={t('common.remove')}
                              >
                                <TrashIcon className="h-4 w-4" />
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Add Row Button */}
            {items.length < MAX_ITEMS && (
              <button
                onClick={handleAddRow}
                className="w-full py-2 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-600 dark:text-gray-400 hover:border-orange-500 hover:text-orange-600 dark:hover:text-orange-400 transition-colors flex items-center justify-center gap-2"
              >
                <PlusIcon className="h-4 w-4" />
                {t('catalog.addAnotherItem')}
              </button>
            )}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex gap-3">
          <Button variant="secondary" onClick={handleClose} className="flex-1">
            {t('common.cancel')}
          </Button>
          <Button onClick={handleSubmit} className="flex-1" disabled={validCount === 0}>
            {t('catalog.addItemsCount', {
              count: validCount
            })}
          </Button>
        </div>
      </div>
    </div>
  );
}
