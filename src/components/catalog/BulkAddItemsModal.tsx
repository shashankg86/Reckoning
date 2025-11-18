import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  XMarkIcon,
  PlusIcon,
  TrashIcon
} from '@heroicons/react/24/outline';
import { Button } from '../ui/Button';
import type { Item, Category } from '../../types/menu';

interface ItemFormData {
  name: string;
  category_id: string;
  sku: string;
  price: string;
  stock: string;
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
  category_id: '',
  sku: '',
  price: '',
  stock: '0'
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
      description: '',
      category_id: item.category_id,
      sku: item.sku.trim(),
      price: item.price,
      stock: parseInt(item.stock) || 0
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
      <div className="bg-white dark:bg-gray-800 rounded-lg w-full max-w-5xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
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

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="space-y-4">
            {/* Instructions */}
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {t('catalog.quickAddItems')} ({items.length}/{MAX_ITEMS})
            </p>

            {/* Table */}
            <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-700">
                  <tr>
                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider w-12">
                      #
                    </th>
                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                      {t('catalog.itemName')} *
                    </th>
                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                      {t('catalog.category')} *
                    </th>
                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                      {t('catalog.sku')}
                    </th>
                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                      {t('catalog.price')} *
                    </th>
                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                      {t('catalog.stock')}
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
                            className="w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                          />
                        </td>

                        {/* Category Select */}
                        <td className="px-3 py-3">
                          <select
                            value={item.category_id}
                            onChange={(e) => handleChange(index, 'category_id', e.target.value)}
                            className="w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-orange-500"
                          >
                            <option value="">{t('menuSetup.selectCategory')}</option>
                            {categories.map((category) => (
                              <option key={category.id} value={category.id}>
                                {category.icon} {category.name}
                              </option>
                            ))}
                          </select>
                          {selectedCategory && (
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
                            className="w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                          />
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
          <Button onClick={handleSubmit} className="flex-1">
            {t('catalog.addItemsCount', {
              count: items.filter(i => i.name.trim() && i.category_id && i.price).length
            })}
          </Button>
        </div>
      </div>
    </div>
  );
}
