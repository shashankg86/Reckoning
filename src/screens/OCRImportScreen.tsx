import {
  ArrowUpTrayIcon,
  CameraIcon,
  CheckIcon,
  DocumentTextIcon,
  PencilSquareIcon,
  XMarkIcon
} from '@heroicons/react/24/outline';
import React, { useState } from 'react';
import { Layout } from '../components/Layout';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { usePOS } from '../context/POSContext';

interface ParsedItem {
  id: string;
  name: string;
  price: number;
  category: string;
  confidence: number;
}

export function OCRImportScreen() {
  const { state, dispatch } = usePOS();
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [parsedItems, setParsedItems] = useState<ParsedItem[]>([]);
  const [editingItem, setEditingItem] = useState<string | null>(null);

  const t = (en: string, hi: string) =>
    state.store?.language === 'hi' ? hi : en;

  // Mock OCR processing - in real app this would call an OCR service
  const processFile = async (_file: File) => {
    setIsProcessing(true);

    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // Mock parsed results
    const mockResults: ParsedItem[] = [
      { id: '1', name: 'Chicken Biryani', price: 250, category: 'Main Course', confidence: 95 },
      { id: '2', name: 'Paneer Tikka', price: 180, category: 'Starter', confidence: 88 },
      { id: '3', name: 'Dal Makhani', price: 120, category: 'Main Course', confidence: 92 },
      { id: '4', name: 'Naan', price: 45, category: 'Bread', confidence: 96 },
      { id: '5', name: 'Lassi', price: 60, category: 'Beverage', confidence: 78 },
    ];

    setParsedItems(mockResults);
    setIsProcessing(false);
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setUploadedFile(file);
      processFile(file);
    }
  };

  const updateItem = (id: string, updates: Partial<ParsedItem>) => {
    setParsedItems((items) =>
      items.map((item) => (item.id === id ? { ...item, ...updates } : item))
    );
    setEditingItem(null);
  };

  const removeItem = (id: string) => {
    setParsedItems((items) => items.filter((item) => item.id !== id));
  };

  const saveItemsToCatalog = () => {
    parsedItems.forEach((item) => {
      const catalogItem = {
        id: Date.now().toString() + Math.random(),
        name: item.name,
        price: item.price,
        category: item.category,
      };
      dispatch({ type: 'ADD_ITEM', payload: catalogItem });
    });

    // Reset state
    setUploadedFile(null);
    setParsedItems([]);

    // Navigate to catalog
    dispatch({ type: 'SET_CURRENT_SCREEN', payload: 'catalog' });
  };

  const UploadArea = () => (
    <Card className="p-8">
      <div className="text-center">
        <div className="mx-auto w-16 h-16 bg-orange-100 dark:bg-orange-900 rounded-full flex items-center justify-center mb-4">
          <ArrowUpTrayIcon className="w-8 h-8 text-orange-500 dark:text-orange-400" />
        </div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
          {t('Import Items from Photo or PDF', 'फोटो या पीडीएफ से आइटम आयात करें')}
        </h3>
        <p className="text-gray-500 dark:text-gray-400 mb-6">
          {t(
            'Upload a menu photo or receipt PDF to automatically extract items',
            'आइटम को स्वचालित रूप से निकालने के लिए मेनू फोटो या रसीद पीडीएफ अपलोड करें'
          )}
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <label className="cursor-pointer">
            <Button variant="primary">
              <CameraIcon className="w-4 h-4 mr-2" />
              {t('Upload Photo', 'फोटो अपलोड करें')}
            </Button>
            <input
              type="file"
              accept="image/*"
              onChange={handleFileUpload}
              className="hidden"
            />
          </label>

          <label className="cursor-pointer">
            <Button variant="secondary">
              <DocumentTextIcon className="w-4 h-4 mr-2" />
              {t('Upload PDF', 'पीडीएफ अपलोड करें')}
            </Button>
            <input
              type="file"
              accept=".pdf"
              onChange={handleFileUpload}
              className="hidden"
            />
          </label>
        </div>

        <p className="text-xs text-gray-400 mt-4">
          {t('Supports JPG, PNG, and PDF files up to 10MB', 'JPG, PNG, और PDF फ़ाइलें 10MB तक समर्थित हैं')}
        </p>
      </div>
    </Card>
  );

  const ProcessingState = () => (
    <Card className="p-8">
      <div className="text-center">
        <div className="mx-auto w-16 h-16 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center mb-4 animate-pulse">
          <DocumentTextIcon className="w-8 h-8 text-blue-600 dark:text-blue-400" />
        </div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
          {t('Processing...', 'प्रोसेसिंग...')}
        </h3>
        <p className="text-gray-500 dark:text-gray-400">
          {t('Extracting items from your upload', 'आपके अपलोड से आइटम निकाला जा रहा है')}
        </p>
      </div>
    </Card>
  );

  const ResultsView = () => (
    <div className="space-y-6">
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            {t('Extracted Items', 'निकाले गए आइटम')} ({parsedItems.length})
          </h2>
          <Button
            variant="secondary"
            onClick={() => {
              setUploadedFile(null);
              setParsedItems([]);
            }}
          >
            {t('Upload New', 'नया अपलोड करें')}
          </Button>
        </div>

        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
          {t(
            'Review and edit the extracted items before adding to catalog',
            'कैटलॉग में जोड़ने से पहले निकाले गए आइटम की समीक्षा और संपादन करें'
          )}
        </p>

        <div className="space-y-3">
          {parsedItems.map((item) => (
            <div
              key={item.id}
              className="p-4 border border-gray-200 dark:border-gray-600 rounded-lg"
            >
              {editingItem === item.id ? (
                <div className="space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <Input
                      value={item.name}
                      onChange={(e) =>
                        updateItem(item.id, { name: e.target.value })
                      }
                      placeholder={t('Item name', 'आइटम का नाम')}
                    />
                    <Input
                      type="number"
                      value={item.price}
                      onChange={(e) =>
                        updateItem(item.id, { price: Number(e.target.value) })
                      }
                      placeholder={t('Price', 'कीमत')}
                    />
                  </div>
                  <Input
                    value={item.category}
                    onChange={(e) =>
                      updateItem(item.id, { category: e.target.value })
                    }
                    placeholder={t('Category', 'श्रेणी')}
                  />
                  <div className="flex gap-2">
                    <Button size="sm" onClick={() => setEditingItem(null)}>
                      <CheckIcon className="w-3 h-3 mr-1" />
                      {t('Save', 'सेव')}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setEditingItem(null)}
                    >
                      {t('Cancel', 'रद्द')}
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <div>
                        <h3 className="font-medium text-gray-900 dark:text-white">
                          {item.name}
                        </h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          {item.category} • ₹{item.price}
                        </p>
                      </div>
                      <div
                        className={`px-2 py-1 rounded text-xs font-medium ${item.confidence >= 90
                            ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300'
                            : item.confidence >= 80
                              ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300'
                              : 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300'
                          }`}
                      >
                        {item.confidence}% {t('confident', 'आत्मविश्वास')}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setEditingItem(item.id)}
                    >
                      <PencilSquareIcon className="w-3 h-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeItem(item.id)}
                      className="text-red-600"
                    >
                      <XMarkIcon className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        {parsedItems.length > 0 && (
          <div className="flex gap-3 mt-6 pt-4 border-t border-gray-200 dark:border-gray-600">
            <Button onClick={saveItemsToCatalog} className="flex-1">
              {t('Add All to Catalog', 'सभी को कैटलॉग में जोड़ें')} (
              {parsedItems.length})
            </Button>
          </div>
        )}
      </Card>
    </div>
  );

  return (
    <Layout title={t('OCR Import', 'OCR आयात')}>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {!uploadedFile && !isProcessing && parsedItems.length === 0 && (
          <UploadArea />
        )}
        {isProcessing && <ProcessingState />}
        {parsedItems.length > 0 && <ResultsView />}
      </div>
    </Layout>
  );
}
