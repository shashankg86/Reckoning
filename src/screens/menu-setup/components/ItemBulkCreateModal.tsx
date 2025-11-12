/**
 * ItemBulkCreateModal Component
 *
 * Modal for creating multiple items at once
 */

import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { PlusIcon, TrashIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { Button } from '../../../components/ui/Button';
import type { ItemData } from '../../../api/items';
import type { Category } from '../../../types/menu';

interface ItemRow extends ItemData {
  tempId: string;
}

interface ItemBulkCreateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (items: ItemData[]) => Promise<void>;
  availableCategories?: Category[];
  defaultCategoryId?: string;
}

export function ItemBulkCreateModal({
  isOpen,
  onClose,
  onSubmit,
  availableCategories = [],
  defaultCategoryId,
}: ItemBulkCreateModalProps) {
  const { t } = useTranslation();
  const [items, setItems] = useState<ItemRow[]>([
    {
      tempId: '1',
      name: '',
      price: 0,
      category_id: defaultCategoryId || '',
      description: '',
      sku: '',
      stock: 0,
    },
    {
      tempId: '2',
      name: '',
      price: 0,
      category_id: defaultCategoryId || '',
      description: '',
      sku: '',
      stock: 0,
    },
    {
      tempId: '3',
      name: '',
      price: 0,
      category_id: defaultCategoryId || '',
      description: '',
      sku: '',
      stock: 0,
    },
  ]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const addRow = () => {
    const newId = Date.now().toString();
    setItems([
      ...items,
      {
        tempId: newId,
        name: '',
        price: 0,
        category_id: defaultCategoryId || '',
        description: '',
        sku: '',
        stock: 0,
      },
    ]);
  };

  const removeRow = (tempId: string) => {
    if (items.length <= 1) return;
    setItems(items.filter((item) => item.tempId !== tempId));
  };

  const updateRow = (tempId: string, field: keyof ItemData, value: any) => {
    setItems(items.map((item) => (item.tempId === tempId ? { ...item, [field]: value } : item)));
  };

  const handleSubmit = async () => {
    // VALIDATE: name, price > 0, and description are all required
    const validItems = items.filter(
      (item) =>
        item.name.trim().length > 0 &&
        item.price > 0 &&
        (item.description || '').trim().length > 0
    );

    if (validItems.length === 0) {
      return;
    }

    setIsSubmitting(true);
    try {
      // Remove tempId before submitting
      const itemsToSubmit = validItems.map(({ tempId, ...item }) => item);
      await onSubmit(itemsToSubmit);
      onClose();
    } catch (error) {
      console.error('Bulk create items error:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  const validCount = items.filter(
    (item) =>
      item.name.trim().length > 0 &&
      item.price > 0 &&
      (item.description || '').trim().length > 0
  ).length;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 overflow-y-auto">
      <div className="bg-white dark:bg-gray-800 rounded-lg w-full max-w-6xl my-8">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Bulk Create Items
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Add multiple items quickly in table format
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        {/* Table */}
        <div className="p-6 max-h-[500px] overflow-x-auto overflow-y-auto">
          <div className="space-y-3 min-w-max">
            {/* Header Row */}
            <div className="grid grid-cols-[auto_2fr_1fr_2fr_1fr_1fr_1fr_auto] gap-3 px-3 pb-2 border-b border-gray-200 dark:border-gray-700 text-xs font-medium text-gray-600 dark:text-gray-400">
              <div className="w-8">#</div>
              <div>Name *</div>
              <div>Price *</div>
              <div>Category</div>
              <div>SKU</div>
              <div>Stock</div>
              <div>Description *</div>
              <div className="w-10"></div>
            </div>

            {/* Data Rows */}
            {items.map((item, index) => (
              <div
                key={item.tempId}
                className="grid grid-cols-[auto_2fr_1fr_2fr_1fr_1fr_1fr_auto] gap-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg items-start"
              >
                {/* Order number */}
                <div className="w-8 h-10 flex items-center justify-center bg-gray-200 dark:bg-gray-600 rounded text-sm font-medium text-gray-700 dark:text-gray-300">
                  {index + 1}
                </div>

                {/* Name input */}
                <input
                  type="text"
                  value={item.name}
                  onChange={(e) => updateRow(item.tempId, 'name', e.target.value)}
                  placeholder="Item name"
                  className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-orange-500"
                />

                {/* Price input */}
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={item.price}
                  onChange={(e) => updateRow(item.tempId, 'price', parseFloat(e.target.value) || 0)}
                  placeholder="0.00"
                  className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-orange-500"
                />

                {/* Category select */}
                <select
                  value={item.category_id || ''}
                  onChange={(e) => updateRow(item.tempId, 'category_id', e.target.value)}
                  className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                >
                  <option value="">None</option>
                  {availableCategories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  ))}
                </select>

                {/* SKU input */}
                <input
                  type="text"
                  value={item.sku || ''}
                  onChange={(e) => updateRow(item.tempId, 'sku', e.target.value)}
                  placeholder="SKU"
                  className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-orange-500"
                />

                {/* Stock input */}
                <input
                  type="number"
                  min="0"
                  value={item.stock || 0}
                  onChange={(e) => updateRow(item.tempId, 'stock', parseInt(e.target.value) || 0)}
                  placeholder="0"
                  className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-orange-500"
                />

                {/* Description input */}
                <input
                  type="text"
                  value={item.description || ''}
                  onChange={(e) => updateRow(item.tempId, 'description', e.target.value)}
                  placeholder="Description"
                  className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-orange-500"
                />

                {/* Delete button */}
                <button
                  onClick={() => removeRow(item.tempId)}
                  disabled={items.length <= 1}
                  className="p-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  <TrashIcon className="h-5 w-5" />
                </button>
              </div>
            ))}
          </div>

          {/* Add row button */}
          <button
            onClick={addRow}
            className="mt-3 w-full py-2 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg text-gray-600 dark:text-gray-400 hover:border-orange-500 hover:text-orange-500 dark:hover:border-orange-400 dark:hover:text-orange-400 transition-colors flex items-center justify-center gap-2"
          >
            <PlusIcon className="h-5 w-5" />
            Add Another Item
          </button>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-gray-200 dark:border-gray-700">
          <div className="text-sm text-gray-600 dark:text-gray-400">
            {validCount} {validCount === 1 ? 'item' : 'items'} ready
          </div>

          <div className="flex gap-3">
            <Button variant="secondary" onClick={onClose} disabled={isSubmitting}>
              {t('common.cancel')}
            </Button>
            <Button onClick={handleSubmit} disabled={isSubmitting || validCount === 0}>
              {isSubmitting ? t('common.creating') : `Create ${validCount} Items`}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
