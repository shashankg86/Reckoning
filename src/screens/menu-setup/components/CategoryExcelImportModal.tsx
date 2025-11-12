/**
 * CategoryExcelImportModal Component
 *
 * Import categories from Excel/CSV files
 */

import React, { useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ArrowUpTrayIcon,
  DocumentTextIcon,
  XMarkIcon,
  CheckCircleIcon,
} from '@heroicons/react/24/outline';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import { Button } from '../../../components/ui/Button';
import { Card } from '../../../components/ui/Card';
import type { CreateCategoryData } from '../../../types/menu';

interface ParsedCategoryRow {
  name: string;
  description?: string;
  color?: string;
  isValid: boolean;
  error?: string;
}

interface CategoryExcelImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (categories: CreateCategoryData[]) => Promise<void>;
}

export function CategoryExcelImportModal({
  isOpen,
  onClose,
  onSubmit,
}: CategoryExcelImportModalProps) {
  const { t } = useTranslation();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [parsedCategories, setParsedCategories] = useState<ParsedCategoryRow[]>([]);
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

    const categories: ParsedCategoryRow[] = result.data.map((row: any) => {
      const name = row.name || row.Name || row.category || row.Category || '';
      const description = row.description || row.Description || '';
      const color = row.color || row.Color || '';

      return {
        name: name.trim(),
        description: description.trim(),
        color: color.trim() || undefined,
        isValid: name.trim().length >= 2,
        error: name.trim().length < 2 ? 'Name too short' : undefined,
      };
    });

    setParsedCategories(categories.filter((cat) => cat.name.length > 0));
  };

  const processExcel = async (file: File) => {
    const arrayBuffer = await file.arrayBuffer();
    const workbook = XLSX.read(arrayBuffer, { type: 'array' });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const jsonData = XLSX.utils.sheet_to_json(sheet);

    const categories: ParsedCategoryRow[] = (jsonData as any[]).map((row) => {
      const name = row.name || row.Name || row.category || row.Category || '';
      const description = row.description || row.Description || '';
      const color = row.color || row.Color || '';

      return {
        name: String(name).trim(),
        description: String(description).trim(),
        color: String(color).trim() || undefined,
        isValid: String(name).trim().length >= 2,
        error: String(name).trim().length < 2 ? 'Name too short' : undefined,
      };
    });

    setParsedCategories(categories.filter((cat) => cat.name.length > 0));
  };

  const handleSubmit = async () => {
    const validCategories = parsedCategories.filter((cat) => cat.isValid);

    if (validCategories.length === 0) {
      return;
    }

    setIsSubmitting(true);
    try {
      const categoriesToSubmit: CreateCategoryData[] = validCategories.map((cat, index) => ({
        name: cat.name,
        description: cat.description,
        color: cat.color || undefined,
        sort_order: index,
      }));

      await onSubmit(categoriesToSubmit);
      setParsedCategories([]);
      onClose();
    } catch (error) {
      console.error('Submit error:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const downloadTemplate = () => {
    const csvContent = `name,description,color
Appetizers,Starters and small bites,#F59E0B
Main Course,Main dishes and entrees,#EF4444
Desserts,Sweet treats and desserts,#EC4899
Beverages,Drinks and refreshments,#3B82F6
Sides,Side dishes and extras,#10B981`;

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'category-template.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  if (!isOpen) return null;

  const validCount = parsedCategories.filter((cat) => cat.isValid).length;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg w-full max-w-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              {t('menuSetup.importFromExcel')}
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              {t('menuSetup.importFromExcelDescription')}
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
          {parsedCategories.length === 0 ? (
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
                  {t('menuSetup.uploadFile')}
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
                  {t('menuSetup.downloadTemplate')}
                </button>
              </div>

              {/* Format info */}
              <Card className="bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 p-4">
                <h4 className="font-semibold text-blue-900 dark:text-blue-300 mb-2">
                  {t('menuSetup.fileFormat')}:
                </h4>
                <div className="text-sm text-blue-800 dark:text-blue-300 space-y-1">
                  <p>• {t('menuSetup.requiredColumn')}: <code className="bg-blue-200 dark:bg-blue-800 px-1 rounded">name</code></p>
                  <p>• {t('menuSetup.optionalColumns')}: <code className="bg-blue-200 dark:bg-blue-800 px-1 rounded">description</code>, <code className="bg-blue-200 dark:bg-blue-800 px-1 rounded">color</code></p>
                </div>
              </Card>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Preview */}
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-white mb-3">
                  {t('menuSetup.previewCategories')} ({validCount})
                </h3>
                <div className="max-h-64 overflow-y-auto space-y-2">
                  {parsedCategories.map((category, index) => (
                    <div
                      key={index}
                      className={`flex items-center justify-between p-3 rounded-lg ${
                        category.isValid
                          ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800'
                          : 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800'
                      }`}
                    >
                      <div className="flex items-center space-x-3 flex-1">
                        {category.color && (
                          <div
                            className="w-8 h-8 rounded"
                            style={{ backgroundColor: category.color }}
                          />
                        )}
                        <div>
                          <p className="font-medium text-gray-900 dark:text-white">
                            {category.name}
                          </p>
                          {category.description && (
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                              {category.description}
                            </p>
                          )}
                          {category.error && (
                            <p className="text-sm text-red-600 dark:text-red-400">
                              {category.error}
                            </p>
                          )}
                        </div>
                      </div>
                      {category.isValid && (
                        <CheckCircleIcon className="h-5 w-5 text-green-600 dark:text-green-400" />
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Upload different file */}
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  setParsedCategories([]);
                  fileInputRef.current?.click();
                }}
              >
                {t('menuSetup.uploadDifferentFile')}
              </Button>
            </div>
          )}
        </div>

        {/* Footer */}
        {parsedCategories.length > 0 && (
          <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200 dark:border-gray-700">
            <Button
              variant="secondary"
              onClick={() => {
                setParsedCategories([]);
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
                ? t('common.importing')
                : t('menuSetup.importCategories', { count: validCount })}
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
