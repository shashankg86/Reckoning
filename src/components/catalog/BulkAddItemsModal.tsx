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
import { storageService } from '../../lib/storage';

interface ItemFormData {
  name: string;
  description: string;
  category_id: string;
  sku: string;
  price: string;
  stock: string;
  image?: File | null;
  imageUrl?: string;
  imageUploading?: boolean;
}

interface BulkAddItemsModalProps {
  isOpen: boolean;
  onClose: () => void;
  categories: Category[];
  onBulkAdd: (items: Partial<Item>[]) => void;
  preselectedCategoryId?: string;
}

const DEFAULT_ITEM: ItemFormData = {
  name: '',
  description: '',
  category_id: '',
  sku: '',
  price: '',
  stock: '0',
  image: null,
  imageUrl: '',
  imageUploading: false
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

  const handleAddRow = () => {
    if (items.length < MAX_ITEMS) {
      setItems([...items, { ...DEFAULT_ITEM, category_id: preselectedCategoryId || '' }]);
    }
  };

  const handleRemoveRow = (index: number) => {
    if (items.length > 1) {
      setItems(items.filter((_, i) => i !== index));
    }
  };

  const handleChange = (index: number, field: keyof ItemFormData, value: any) => {
    const updated = [...items];
    updated[index] = { ...updated[index], [field]: value };
    setItems(updated);
  };

  const handleImageUpload = async (index: number, file: File) => {
    try {
      // Set uploading state
      handleChange(index, 'imageUploading', true);

      // Upload to storage (storageService handles processing internally)
      const result = await storageService.uploadImage(file, 'items', 'catalog');
      if (!result.success) {
        throw new Error(result.error || 'Upload failed');
      }
      const imageUrl = result.url!;

      // Update state with image URL
      handleChange(index, 'imageUrl', imageUrl);
      handleChange(index, 'image', null);
      handleChange(index, 'imageUploading', false);
    } catch (error) {
      console.error('Image upload failed:', error);
      handleChange(index, 'imageUploading', false);
      alert(t('menuSetup.imageUploadFailed'));
    }
  };

  const handleSubmit = () => {
    // Validate
    const validItems = items.filter(
      item =>
        item.name.trim() !== '' &&
        item.category_id !== '' &&
        item.price.trim() !== '' &&
        parseFloat(item.price) > 0
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
      image: item.imageUrl || undefined
    }));

    onBulkAdd(itemsToAdd);
    handleClose();
  };

  const handleClose = () => {
    setItems([{ ...DEFAULT_ITEM, category_id: preselectedCategoryId || '' }]);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            {t('catalog.bulkAddItems')}
          </h2>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300"
          >
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>

        <div className="p-6 space-y-4">
        {/* Instructions */}
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Add multiple items at once (max {MAX_ITEMS})
        </p>

        {/* Item Forms */}
        <div className="space-y-4 max-h-[60vh] overflow-y-auto">
          {items.map((item, index) => {
            const selectedCategory = categories.find(cat => cat.id === item.category_id);

            return (
              <div
                key={index}
                className="p-4 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg space-y-3"
              >
                {/* Header with Remove Button */}
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    {t('catalog.item')} #{index + 1}
                  </span>
                  {items.length > 1 && (
                    <button
                      onClick={() => handleRemoveRow(index)}
                      className="p-1 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
                    >
                      <TrashIcon className="h-4 w-4" />
                    </button>
                  )}
                </div>

                {/* Name */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {t('catalog.itemName')} *
                  </label>
                  <input
                    type="text"
                    value={item.name}
                    onChange={(e) => handleChange(index, 'name', e.target.value)}
                    placeholder={t('catalog.enterItemName')}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  />
                </div>

                {/* Description */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {t('catalog.description')}
                  </label>
                  <textarea
                    value={item.description}
                    onChange={(e) => handleChange(index, 'description', e.target.value)}
                    placeholder={t('menuSetup.itemDescriptionPlaceholder')}
                    rows={2}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  />
                </div>

                {/* Category */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {t('catalog.category')} *
                  </label>
                  <select
                    value={item.category_id}
                    onChange={(e) => handleChange(index, 'category_id', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  >
                    <option value="">{t('menuSetup.selectCategory')}</option>
                    {categories.map((category) => (
                      <option key={category.id} value={category.id}>
                        {category.icon} {category.name}
                      </option>
                    ))}
                  </select>
                  {selectedCategory && (
                    <div className="mt-2">
                      <span
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium text-white"
                        style={{ backgroundColor: selectedCategory.color }}
                      >
                        <span>{selectedCategory.icon}</span>
                        <span>{selectedCategory.name}</span>
                      </span>
                    </div>
                  )}
                </div>

                {/* SKU and Price */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      {t('catalog.sku')}
                    </label>
                    <input
                      type="text"
                      value={item.sku}
                      onChange={(e) => handleChange(index, 'sku', e.target.value)}
                      placeholder={t('catalog.enterSKU')}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      {t('catalog.price')} *
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={item.price}
                      onChange={(e) => handleChange(index, 'price', e.target.value)}
                      placeholder="0.00"
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    />
                  </div>
                </div>

                {/* Stock */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {t('catalog.stock')}
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={item.stock}
                    onChange={(e) => handleChange(index, 'stock', e.target.value)}
                    placeholder="0"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  />
                </div>

                {/* Image Upload */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {t('menuSetup.uploadItemImagePlaceholder')}
                  </label>
                  <div className="flex items-center gap-3">
                    {item.imageUrl ? (
                      <div className="flex items-center gap-3">
                        <img
                          src={item.imageUrl}
                          alt={item.name}
                          className="w-16 h-16 rounded-lg object-cover"
                        />
                        <button
                          onClick={() => {
                            handleChange(index, 'imageUrl', '');
                            handleChange(index, 'image', null);
                          }}
                          className="text-sm text-red-600 dark:text-red-400 hover:underline"
                        >
                          {t('common.remove')}
                        </button>
                      </div>
                    ) : (
                      <label className="flex items-center gap-2 px-4 py-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 rounded-lg cursor-pointer transition-colors">
                        <PhotoIcon className="h-5 w-5 text-gray-600 dark:text-gray-300" />
                        <span className="text-sm text-gray-700 dark:text-gray-300">
                          {item.imageUploading ? t('common.importing') : t('onboarding.uploadLogo')}
                        </span>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) handleImageUpload(index, file);
                          }}
                          disabled={item.imageUploading}
                          className="hidden"
                        />
                      </label>
                    )}
                  </div>
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    {t('menuSetup.itemImageUploadHint')}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Add Row Button */}
        {items.length < MAX_ITEMS && (
          <Button
            variant="secondary"
            onClick={handleAddRow}
            className="w-full flex items-center justify-center gap-2"
          >
            <PlusIcon className="h-4 w-4" />
            Add Another Item
          </Button>
        )}

        {/* Action Buttons */}
        <div className="flex gap-3">
          <Button variant="secondary" onClick={handleClose} className="flex-1">
            {t('common.cancel')}
          </Button>
          <Button onClick={handleSubmit} className="flex-1">
            Add {items.filter(i => i.name.trim() && i.category_id && i.price).length} Items
          </Button>
        </div>
      </div>
    </div>
    </div>
  );
}
