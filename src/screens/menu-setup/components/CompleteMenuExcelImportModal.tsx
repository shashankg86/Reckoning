/**
 * CompleteMenuExcelImportModal Component
 *
 * Import complete menu (categories + items) from Excel/CSV files
 * Supports two formats:
 * 1. Combined format: Single sheet with category and item data
 * 2. Two-sheet format: Separate sheets for categories and items
 */

import React, { useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ArrowUpTrayIcon,
  DocumentTextIcon,
  XMarkIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import { Button } from '../../../components/ui/Button';
import { Card } from '../../../components/ui/Card';
import type { CreateCategoryData, CreateItemData, CompleteMenuImport } from '../../../types/menu';

interface ParsedMenuItem {
  category: string;
  categoryDescription?: string;
  categoryColor?: string;
  itemName: string;
  price: number;
  description?: string;
  tags?: string;
  isValid: boolean;
  error?: string;
}

interface CompleteMenuExcelImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (menuData: CompleteMenuImport) => Promise<void>;
}

const DEFAULT_CATEGORY_COLORS = [
  '#EF4444', '#F59E0B', '#10B981', '#3B82F6',
  '#6366F1', '#8B5CF6', '#EC4899', '#14B8A6'
];

export function CompleteMenuExcelImportModal({
  isOpen,
  onClose,
  onSubmit,
}: CompleteMenuExcelImportModalProps) {
  const { t } = useTranslation();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [parsedData, setParsedData] = useState<ParsedMenuItem[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsProcessing(true);
    try {
      const fileName = file.name.toLowerCase();

      if (fileName.endsWith('.csv')) {
        await processCSV(file);
      } else if (fileName.endsWith('.xlsx') || fileName.endsWith('.xls')) {
        await processExcel(file);
      } else {
        alert('Please upload a CSV or Excel file');
      }
    } catch (error) {
      console.error('File processing error:', error);
      alert('Failed to process file. Please check the format and try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const processCSV = async (file: File) => {
    const text = await file.text();
    const result = Papa.parse(text, { header: true, skipEmptyLines: true });

    const menuItems: ParsedMenuItem[] = result.data.map((row: any) => {
      const category = (row.category || row.Category || '').trim();
      const categoryDescription = (row.category_description || row.categoryDescription || '').trim();
      const categoryColor = (row.category_color || row.categoryColor || row.color || '').trim();
      const itemName = (row.item_name || row.itemName || row.name || row.Name || '').trim();
      const price = parseFloat(row.price || row.Price || '0');
      const description = (row.description || row.Description || '').trim();
      const tags = (row.tags || row.Tags || '').trim();

      const isValid = category.length >= 2 && itemName.length >= 2 && price > 0;
      let error = '';
      if (category.length < 2) error = 'Category name too short';
      else if (itemName.length < 2) error = 'Item name too short';
      else if (price <= 0) error = 'Invalid price';

      return {
        category,
        categoryDescription,
        categoryColor,
        itemName,
        price,
        description,
        tags,
        isValid,
        error,
      };
    });

    setParsedData(menuItems.filter((item) => item.category.length > 0 && item.itemName.length > 0));
  };

  const processExcel = async (file: File) => {
    const arrayBuffer = await file.arrayBuffer();
    const workbook = XLSX.read(arrayBuffer, { type: 'array' });

    // Check if two-sheet format (separate categories and items sheets)
    if (workbook.SheetNames.includes('Categories') && workbook.SheetNames.includes('Items')) {
      await processTwoSheetFormat(workbook);
    } else {
      // Single sheet format
      await processSingleSheetFormat(workbook);
    }
  };

  const processSingleSheetFormat = async (workbook: XLSX.WorkBook) => {
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const jsonData = XLSX.utils.sheet_to_json(sheet);

    const menuItems: ParsedMenuItem[] = (jsonData as any[]).map((row) => {
      const category = String(row.category || row.Category || '').trim();
      const categoryDescription = String(row.category_description || row.categoryDescription || '').trim();
      const categoryColor = String(row.category_color || row.categoryColor || row.color || '').trim();
      const itemName = String(row.item_name || row.itemName || row.name || row.Name || '').trim();
      const price = parseFloat(String(row.price || row.Price || '0'));
      const description = String(row.description || row.Description || '').trim();
      const tags = String(row.tags || row.Tags || '').trim();

      const isValid = category.length >= 2 && itemName.length >= 2 && price > 0;
      let error = '';
      if (category.length < 2) error = 'Category name too short';
      else if (itemName.length < 2) error = 'Item name too short';
      else if (price <= 0) error = 'Invalid price';

      return {
        category,
        categoryDescription,
        categoryColor,
        itemName,
        price,
        description,
        tags,
        isValid,
        error,
      };
    });

    setParsedData(menuItems.filter((item) => item.category.length > 0 && item.itemName.length > 0));
  };

  const processTwoSheetFormat = async (workbook: XLSX.WorkBook) => {
    // Process categories sheet
    const categoriesSheet = workbook.Sheets['Categories'];
    const categoriesData = XLSX.utils.sheet_to_json(categoriesSheet);
    const categoryMap = new Map<string, { description: string; color: string }>();

    (categoriesData as any[]).forEach((row) => {
      const name = String(row.name || row.Name || '').trim();
      const description = String(row.description || row.Description || '').trim();
      const color = String(row.color || row.Color || '').trim();
      if (name) {
        categoryMap.set(name, { description, color });
      }
    });

    // Process items sheet
    const itemsSheet = workbook.Sheets['Items'];
    const itemsData = XLSX.utils.sheet_to_json(itemsSheet);

    const menuItems: ParsedMenuItem[] = (itemsData as any[]).map((row) => {
      const category = String(row.category || row.Category || '').trim();
      const itemName = String(row.item_name || row.itemName || row.name || row.Name || '').trim();
      const price = parseFloat(String(row.price || row.Price || '0'));
      const description = String(row.description || row.Description || '').trim();
      const tags = String(row.tags || row.Tags || '').trim();

      const categoryData = categoryMap.get(category);

      const isValid = category.length >= 2 && itemName.length >= 2 && price > 0;
      let error = '';
      if (category.length < 2) error = 'Category name too short';
      else if (itemName.length < 2) error = 'Item name too short';
      else if (price <= 0) error = 'Invalid price';

      return {
        category,
        categoryDescription: categoryData?.description || '',
        categoryColor: categoryData?.color || '',
        itemName,
        price,
        description,
        tags,
        isValid,
        error,
      };
    });

    setParsedData(menuItems.filter((item) => item.category.length > 0 && item.itemName.length > 0));
  };

  const handleSubmit = async () => {
    const validItems = parsedData.filter((item) => item.isValid);

    if (validItems.length === 0) {
      return;
    }

    setIsSubmitting(true);
    try {
      // Group items by category and build menu structure
      const categoryNames = new Set<string>();
      const categoryMap = new Map<string, { description: string; color: string; items: ParsedMenuItem[] }>();

      validItems.forEach((item) => {
        categoryNames.add(item.category);
        if (!categoryMap.has(item.category)) {
          categoryMap.set(item.category, {
            description: item.categoryDescription || '',
            color: item.categoryColor || '',
            items: [],
          });
        }
        categoryMap.get(item.category)!.items.push(item);
      });

      // Build categories array
      const categories: CreateCategoryData[] = [];
      let colorIndex = 0;
      categoryMap.forEach((data, name) => {
        let color = data.color;
        if (!color || !color.match(/^#[0-9A-F]{6}$/i)) {
          color = DEFAULT_CATEGORY_COLORS[colorIndex % DEFAULT_CATEGORY_COLORS.length];
          colorIndex++;
        }

        categories.push({
          name,
          description: data.description || undefined,
          color,
          sort_order: categories.length,
        });
      });

      // Build items array
      const items: CreateItemData[] = [];
      validItems.forEach((item) => {
        items.push({
          name: item.itemName,
          price: item.price,
          category: item.category,
          description: item.description || undefined,
          tags: item.tags ? item.tags.split(',').map(t => t.trim()) : undefined,
          is_active: true,
        });
      });

      // Build category-items map
      const categoryItemsMap = new Map<string, CreateItemData[]>();
      categories.forEach((cat) => {
        const catItems = items.filter((item) => item.category === cat.name);
        categoryItemsMap.set(cat.name, catItems);
      });

      const menuData: CompleteMenuImport = {
        categories,
        items,
        categoryItemsMap,
      };

      await onSubmit(menuData);
      setParsedData([]);
      onClose();
    } catch (error) {
      console.error('Submit error:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const downloadTemplate = () => {
    const csvContent = `category,item_name,price,description,tags,category_description,category_color
Appetizers,Spring Rolls,5.99,Fresh Vietnamese spring rolls,vegan|popular,Starters and small bites,#F59E0B
Appetizers,Samosas,4.99,Crispy vegetable samosas,vegetarian,Starters and small bites,#F59E0B
Main Course,Pad Thai,12.99,Traditional Thai noodles,spicy|popular,Main dishes and entrees,#EF4444
Main Course,Butter Chicken,14.99,Creamy chicken curry,,Main dishes and entrees,#EF4444
Desserts,Mango Sticky Rice,6.99,Sweet coconut rice with mango,popular,Sweet treats and desserts,#EC4899
Beverages,Thai Iced Tea,3.99,Sweet Thai milk tea,,Drinks and refreshments,#3B82F6`;

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'complete-menu-template.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  if (!isOpen) return null;

  const validCount = parsedData.filter((item) => item.isValid).length;
  const categoryCount = new Set(parsedData.filter(i => i.isValid).map(i => i.category)).size;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              {t('menuSetup.importCompleteMenu')}
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              {t('menuSetup.importCompleteMenuDescription')}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {parsedData.length === 0 ? (
            <div className="space-y-4">
              {/* Upload area */}
              <Card
                hover
                onClick={() => fileInputRef.current?.click()}
                className="cursor-pointer border-2 border-dashed border-gray-300 dark:border-gray-600 p-8 text-center"
              >
                <div className="mx-auto w-16 h-16 bg-orange-100 dark:bg-orange-900 rounded-full flex items-center justify-center mb-4">
                  <ArrowUpTrayIcon className="w-8 h-8 text-orange-500 dark:text-orange-400" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                  {t('menuSetup.uploadCompleteMenuFile')}
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                  {t('menuSetup.supportedFormats')}: CSV, Excel (.xlsx, .xls)
                </p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,.xlsx,.xls"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </Card>

              {/* Download template */}
              <div className="text-center">
                <button
                  onClick={downloadTemplate}
                  className="text-sm text-orange-600 dark:text-orange-400 hover:underline flex items-center justify-center gap-2 mx-auto"
                >
                  <DocumentTextIcon className="h-4 w-4" />
                  {t('menuSetup.downloadCompleteMenuTemplate')}
                </button>
              </div>

              {/* Format info */}
              <Card className="bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 p-4">
                <h4 className="font-semibold text-blue-900 dark:text-blue-300 mb-2">
                  {t('menuSetup.excelFormatInfo')}:
                </h4>
                <div className="text-sm text-blue-800 dark:text-blue-300 space-y-2">
                  <p><strong>{t('menuSetup.combinedFormat')}:</strong> {t('menuSetup.combinedFormatDescription')}</p>
                  <p className="font-mono text-xs bg-blue-100 dark:bg-blue-900 p-2 rounded">
                    category | item_name | price | description | tags
                  </p>
                  <p className="mt-2"><strong>{t('menuSetup.twoSheetFormat')}:</strong> {t('menuSetup.twoSheetFormatDescription')}</p>
                </div>
              </Card>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Summary */}
              <Card className="bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800 p-4">
                <div className="flex items-center gap-3">
                  <CheckCircleIcon className="h-6 w-6 text-green-600 dark:text-green-400" />
                  <div>
                    <p className="font-semibold text-green-900 dark:text-green-300">
                      {t('menuSetup.menuDetected')}
                    </p>
                    <p className="text-sm text-green-800 dark:text-green-400">
                      {t('menuSetup.categoriesAndItemsCount', { categories: categoryCount, items: validCount })}
                    </p>
                  </div>
                </div>
              </Card>

              {/* Preview by category */}
              <div className="space-y-4">
                <h3 className="font-semibold text-gray-900 dark:text-white">
                  {t('menuSetup.previewMenu')}
                </h3>
                {Array.from(new Set(parsedData.map(i => i.category))).map((categoryName) => {
                  const categoryItems = parsedData.filter(i => i.category === categoryName);
                  const validItems = categoryItems.filter(i => i.isValid);
                  const invalidItems = categoryItems.filter(i => !i.isValid);

                  return (
                    <div key={categoryName} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                      <h4 className="font-semibold text-gray-900 dark:text-white mb-3">
                        {categoryName} ({validItems.length} {t('common.items')})
                      </h4>
                      <div className="space-y-2">
                        {validItems.map((item, idx) => (
                          <div
                            key={idx}
                            className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-700 rounded"
                          >
                            <div className="flex-1">
                              <span className="font-medium text-gray-900 dark:text-white">{item.itemName}</span>
                              {item.description && (
                                <p className="text-sm text-gray-500 dark:text-gray-400">{item.description}</p>
                              )}
                            </div>
                            <span className="font-semibold text-gray-900 dark:text-white ml-4">
                              ₹{item.price.toFixed(2)}
                            </span>
                          </div>
                        ))}
                        {invalidItems.map((item, idx) => (
                          <div
                            key={`invalid-${idx}`}
                            className="flex items-center justify-between p-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded"
                          >
                            <div className="flex-1">
                              <span className="font-medium text-red-900 dark:text-red-300">{item.itemName || '(No name)'}</span>
                              <p className="text-sm text-red-600 dark:text-red-400">{item.error}</p>
                            </div>
                            <ExclamationTriangleIcon className="h-5 w-5 text-red-600 dark:text-red-400" />
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Upload different file */}
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  setParsedData([]);
                  fileInputRef.current?.click();
                }}
              >
                {t('menuSetup.uploadDifferentFile')}
              </Button>
            </div>
          )}
        </div>

        {/* Footer */}
        {parsedData.length > 0 && (
          <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200 dark:border-gray-700">
            <Button
              variant="secondary"
              onClick={() => {
                setParsedData([]);
                onClose();
              }}
              disabled={isSubmitting}
            >
              {t('common.cancel')}
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={isSubmitting || validCount === 0}
            >
              {isSubmitting
                ? t('menuSetup.creatingMenu')
                : t('menuSetup.importCompleteMenu')} ({categoryCount} {t('menuSetup.categories')}, {validCount} {t('menuSetup.items')})}
            </Button>
          </div>
        )}

        {isProcessing && (
          <div className="absolute inset-0 bg-white dark:bg-gray-800 bg-opacity-90 flex items-center justify-center rounded-lg">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto mb-4"></div>
              <p className="text-gray-600 dark:text-gray-400">{t('menuSetup.processingFile')}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
