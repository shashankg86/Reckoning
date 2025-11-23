import React, { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import Tesseract from 'tesseract.js';
import * as pdfjsLib from 'pdfjs-dist';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import {
  CloudArrowUpIcon,
  DocumentTextIcon,
  PhotoIcon,
  XMarkIcon,
  CheckIcon,
  ArrowUpTrayIcon,
  CameraIcon,
} from '@heroicons/react/24/outline';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Input } from '../components/ui/Input';

import { useAuth } from '../contexts/AuthContext';
import { useCatalogQueries } from '../hooks/useCatalogQueries';
import { useCurrency } from '../hooks/useCurrency';

// Initialize PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

interface ParsedItem {
  id: string;
  name: string;
  price: number;
  category: string;
  confidence: number;
  image?: string; // Base64 image data
  currency?: string;
}

interface ImageRegion {
  x: number;
  y: number;
  width: number;
  height: number;
  imageData: string;
}

const CURRENCY_PATTERNS = {
  symbols: ['$', '₹', '€', '£', '¥', 'د.إ', 'Rs', 'AED', 'USD', 'INR', 'EUR', 'GBP'],
};

export function OCRImportScreen() {
  const { t } = useTranslation();
  const { state } = useAuth();
  const storeId = state.user?.store?.id || '';
  const { createItemMutation, categoriesQuery } = useCatalogQueries(storeId);
  const { currency: storeCurrencyCode, formatCurrency } = useCurrency();

  const [parsedItems, setParsedItems] = useState<ParsedItem[]>([]);
  const [debugText, setDebugText] = useState<string>('');
  const [ocrConfidence, setOcrConfidence] = useState<number>(0);
  const [extractedImages, setExtractedImages] = useState<ImageRegion[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [editingItem, setEditingItem] = useState<string | null>(null);

  const imageInputRef = useRef<HTMLInputElement>(null);
  const pdfInputRef = useRef<HTMLInputElement>(null);
  const csvExcelInputRef = useRef<HTMLInputElement>(null);

  const processFile = async (file: File) => {
    setIsProcessing(true);
    setParsedItems([]);
    setDebugText('');
    setOcrConfidence(0);
    setExtractedImages([]);

    const fileName = file.name.toLowerCase();

    try {
      if (fileName.endsWith('.csv')) {
        await processCSV(file);
      } else if (fileName.endsWith('.xls') || fileName.endsWith('.xlsx')) {
        await processExcel(file);
      } else if (fileName.endsWith('.pdf')) {
        await processPDF(file);
      } else if (file.type.startsWith('image/')) {
        await processImage(file);
      } else {
        alert('Unsupported file format. Please upload Image, PDF, or Excel/CSV.');
      }
    } catch (err) {
      console.error('Processing error:', err);
      alert('Failed to process file. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const detectAndExtractImages = async (file: File): Promise<ImageRegion[]> => {
    // Basic implementation: return the whole image as one region
    // In a real app, this would use OpenCV or advanced logic to find product images
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          resolve([{
            x: 0,
            y: 0,
            width: img.width,
            height: img.height,
            imageData: e.target?.result as string
          }]);
        };
        img.src = e.target?.result as string;
      };
      reader.readAsDataURL(file);
    });
  };

  const processImage = async (file: File) => {
    try {
      const images = await detectAndExtractImages(file);
      setExtractedImages(images);

      const result = await Tesseract.recognize(file, 'eng', {
        logger: (m) => {
          if (m.status === 'recognizing text') {
            console.log(`OCR Progress: ${Math.round(m.progress * 100)}%`);
          }
        }
      });

      const text = result.data.text;
      const confidence = result.data.confidence;

      setDebugText(text);
      setOcrConfidence(confidence);

      let items = extractItemsFromText(text);
      items = matchImagesToItems(items, images, result);
      setParsedItems(items);

      if (items.length === 0) {
        alert(`No items found (OCR confidence: ${Math.round(confidence)}%). Try a clearer image or check the extracted text.`);
      }
    } catch (error) {
      console.error('OCR Error:', error);
      throw error;
    }
  };

  const matchImagesToItems = (items: ParsedItem[], images: ImageRegion[], ocrResult: any) => {
    if (!ocrResult || !ocrResult.data.words || images.length === 0) return items;

    // For each item, find closest image based on text position
    return items.map(item => {
      // Find text position from OCR words
      const matchingWords = ocrResult.data.words.filter((w: any) =>
        item.name.toLowerCase().includes(w.text.toLowerCase())
      );

      if (matchingWords.length === 0) return item;

      // Calculate average position of item text
      const avgX = matchingWords.reduce((sum: number, w: any) => sum + w.bbox.x0, 0) / matchingWords.length;
      const avgY = matchingWords.reduce((sum: number, w: any) => sum + w.bbox.y0, 0) / matchingWords.length;

      // Find closest image
      let closestImage: ImageRegion | null = null;
      let minDistance = Infinity;

      images.forEach(img => {
        const imgCenterX = img.x + img.width / 2;
        const imgCenterY = img.y + img.height / 2;
        const distance = Math.sqrt(Math.pow(avgX - imgCenterX, 2) + Math.pow(avgY - imgCenterY, 2));

        if (distance < minDistance) {
          minDistance = distance;
          closestImage = img;
        }
      });

      // Only assign if reasonably close (within 300px)
      if (closestImage && minDistance < 300) {
        return { ...item, image: (closestImage as ImageRegion).imageData };
      }

      return item;
    });
  };

  const processPDF = async (file: File) => {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    let text = '';

    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      text += content.items.map((item: any) => item.str).join(' ') + '\n';
    }

    console.log('PDF Text:', text);
    setDebugText(text);
    const items = extractItemsFromText(text);
    setParsedItems(items);
  };

  const processCSV = async (file: File) => {
    const text = await file.text();
    const result = Papa.parse(text, { header: true, skipEmptyLines: true });

    const items: ParsedItem[] = result.data
      .map((row: any, i: number) => {
        const name = row.name || row.Item || row['Item Name'] || row.product || row.Product || '';
        const priceRaw = row.price || row.Price || row.Rate || row.rate || row.amount || row.Amount || '0';
        const price = parseFloat(String(priceRaw).replace(/[^0-9.]/g, ''));

        return {
          id: i.toString(),
          name: name.trim(),
          price: price,
          category: row.category || row.Category || 'General',
          confidence: 100
        };
      })
      .filter((i) => i.name && i.price > 0);

    setParsedItems(items);
  };

  const processExcel = async (file: File) => {
    const arrayBuffer = await file.arrayBuffer();
    const workbook = XLSX.read(arrayBuffer, { type: 'array' });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const jsonData = XLSX.utils.sheet_to_json(sheet);

    const items: ParsedItem[] = (jsonData as any[]).map((row, i) => {
      const name = row.name || row.Item || row['Item Name'] || row.product || row.Product || '';
      const priceRaw = row.price || row.Price || row.Rate || row.rate || row.amount || row.Amount || 0;
      const price = parseFloat(String(priceRaw).replace(/[^0-9.]/g, ''));

      return {
        id: i.toString(),
        name: String(name).trim(),
        price: price,
        category: row.category || row.Category || 'General',
        confidence: 100
      };
    }).filter((i) => i.name && i.price > 0);

    setParsedItems(items);
  };

  const extractItemsFromText = (rawText: string): ParsedItem[] => {
    const items: ParsedItem[] = [];
    const seenItems = new Map<string, boolean>();

    const text = rawText
      .replace(/\r\n/g, '\n')
      .replace(/\t/g, ' ')
      .replace(/\s+/g, ' ');

    const lines = text.split('\n').map(l => l.trim()).filter(Boolean);

    const detectedCurrency = detectCurrency(text);

    // Strategy 1: INLINE PATTERNS
    const inlinePatterns = generateInlinePatterns();

    for (const line of lines) {
      for (const pattern of inlinePatterns) {
        const matches = [...line.matchAll(pattern)];
        for (const match of matches) {
          const extracted = extractFromMatch(match, line, detectedCurrency);
          if (extracted && isValidItem(extracted)) {
            const key = generateItemKey(extracted.name, extracted.price);
            if (!seenItems.has(key)) {
              seenItems.set(key, true);
              items.push({ ...extracted, id: items.length.toString() });
            }
          }
        }
      }
    }

    // Strategy 2: MULTI-LINE PATTERNS
    for (let i = 0; i < lines.length - 1; i++) {
      const currentLine = lines[i];
      const nextLine = lines[i + 1];

      if (containsPrice(currentLine)) continue;

      const priceOnly = extractPriceOnly(nextLine, detectedCurrency);
      if (priceOnly && isLikelyItemName(currentLine)) {
        const extracted = {
          id: '',
          name: cleanItemName(currentLine),
          price: priceOnly.price,
          currency: priceOnly.currency,
          category: detectCategory(currentLine),
          confidence: 70
        };

        if (isValidItem(extracted)) {
          const key = generateItemKey(extracted.name, extracted.price);
          if (!seenItems.has(key)) {
            seenItems.set(key, true);
            items.push({ ...extracted, id: items.length.toString() });
            i++;
          }
        }
      }
    }

    // Strategy 3: STRUCTURED TABLE DETECTION
    const tableItems = detectTableStructure(lines, detectedCurrency);
    for (const item of tableItems) {
      const key = generateItemKey(item.name, item.price);
      if (!seenItems.has(key) && isValidItem(item)) {
        seenItems.set(key, true);
        items.push({ ...item, id: items.length.toString() });
      }
    }

    // Strategy 4: FALLBACK
    if (items.length === 0) {
      const fallbackItems = fallbackExtraction(text, detectedCurrency);
      fallbackItems.forEach(item => {
        const key = generateItemKey(item.name, item.price);
        if (!seenItems.has(key)) {
          items.push({ ...item, id: items.length.toString() });
        }
      });
    }

    return items;
  };

  const detectCurrency = (text: string): string => {
    const currencyCount = new Map<string, number>();

    CURRENCY_PATTERNS.symbols.forEach(symbol => {
      const regex = new RegExp(symbol.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
      const matches = text.match(regex);
      if (matches) {
        currencyCount.set(symbol, matches.length);
      }
    });

    let maxCount = 0;
    let detectedCurrency = storeCurrencyCode as string; // Default to store currency
    currencyCount.forEach((count, symbol) => {
      if (count > maxCount) {
        maxCount = count;
        detectedCurrency = symbol;
      }
    });

    return detectedCurrency;
  };

  const generateInlinePatterns = (): RegExp[] => {
    return [
      /^([A-Za-z][A-Za-z\s&'-]{2,50}?)\s*[.\-:,]*\s*([$₹€£¥د\.إ]|Rs\.?|AED|USD|INR|EUR|GBP)?\s*(\d+(?:[.,]\d{1,2})?)\s*$/gim,
      /^([$₹€£¥د\.إ]|Rs\.?|AED|USD|INR|EUR|GBP)?\s*(\d+(?:[.,]\d{1,2})?)\s+([A-Za-z][A-Za-z\s&'-]{2,50}?)\s*$/gim,
      /([A-Za-z][A-Za-z\s&'-]{2,50}?)\s*[|\-:]+\s*([$₹€£¥د\.إ]|Rs\.?|AED|USD|INR|EUR|GBP)?\s*(\d+(?:[.,]\d{1,2})?)/gim,
      /([A-Za-z][A-Za-z\s&'-]{2,50}?)\s{2,}([$₹€£¥د\.إ]|Rs\.?|AED|USD|INR|EUR|GBP)?\s*(\d+(?:[.,]\d{1,2})?)/gim,
      /([A-Za-z][A-Za-z\s&'-]{2,50}?)\.{2,}\s*([$₹€£¥د\.إ]|Rs\.?|AED|USD|INR|EUR|GBP)?\s*(\d+(?:[.,]\d{1,2})?)/gim,
    ];
  };

  const extractFromMatch = (match: RegExpMatchArray, line: string, defaultCurrency: string): ParsedItem | null => {
    try {
      let name = '';
      let price = 0;
      let currency = defaultCurrency;

      if (match[1] && match[3]) {
        name = match[1].trim();
        currency = match[2] || defaultCurrency;
        price = parseFloat(match[3].replace(',', '.'));
      } else if (match[2] && match[3]) {
        const first = match[1];
        const second = match[2];
        const third = match[3];

        if (isNaN(parseFloat(first))) {
          currency = first || defaultCurrency;
          price = parseFloat(second.replace(',', '.'));
          name = third.trim();
        } else {
          price = parseFloat(first.replace(',', '.'));
          currency = second || defaultCurrency;
          name = third.trim();
        }
      }

      if (!name || price <= 0) return null;

      return {
        id: '',
        name: cleanItemName(name),
        price: price,
        currency: currency,
        category: detectCategory(name),
        confidence: 85
      };
    } catch (e) {
      return null;
    }
  };

  const extractPriceOnly = (line: string, defaultCurrency: string): { price: number; currency: string } | null => {
    const pricePattern = /^\s*([$₹€£¥د\.إ]|Rs\.?|AED|USD|INR|EUR|GBP)?\s*(\d+(?:[.,]\d{1,2})?)\s*$/i;
    const match = line.match(pricePattern);

    if (match && match[2]) {
      return {
        price: parseFloat(match[2].replace(',', '.')),
        currency: match[1] || defaultCurrency
      };
    }
    return null;
  };

  const containsPrice = (line: string): boolean => {
    return /\d+(?:[.,]\d{1,2})?/.test(line);
  };

  const isLikelyItemName = (line: string): boolean => {
    const trimmed = line.trim();
    if (trimmed.length < 3 || trimmed.length > 60) return false;
    if (!/^[A-Za-z]/.test(trimmed)) return false;
    if (trimmed === trimmed.toUpperCase() && trimmed.length > 15) return false;
    const numberCount = (trimmed.match(/\d/g) || []).length;
    if (numberCount > trimmed.length / 3) return false;
    return true;
  };

  const cleanItemName = (name: string): string => {
    return name
      .replace(/\s+/g, ' ')
      .replace(/[•\-_|]+/g, '')
      .trim();
  };

  const detectCategory = (text: string): string => {
    const lower = text.toLowerCase();

    const categories = {
      'Appetizers': ['appetizer', 'starter', 'tikka', 'pakora', 'samosa', 'roll', 'wing', 'nacho'],
      'Main Course': ['chicken', 'beef', 'pork', 'lamb', 'fish', 'seafood', 'pasta', 'pizza', 'burger', 'curry', 'biryani', 'dal', 'paneer', 'kebab'],
      'Desserts': ['dessert', 'cake', 'ice cream', 'brownie', 'pudding', 'pie', 'gulab', 'sweet', 'kulfi'],
      'Beverages': ['drink', 'beverage', 'coffee', 'tea', 'juice', 'soda', 'cola', 'lassi', 'shake', 'smoothie', 'water', 'chai'],
      'Sides': ['side', 'fries', 'salad', 'rice', 'bread', 'naan', 'roti'],
      'Breakfast': ['breakfast', 'egg', 'omelet', 'pancake', 'waffle', 'toast'],
    };

    for (const [category, keywords] of Object.entries(categories)) {
      if (keywords.some(kw => lower.includes(kw))) {
        return category;
      }
    }

    return 'General';
  };

  const detectTableStructure = (lines: string[], defaultCurrency: string): ParsedItem[] => {
    const items: ParsedItem[] = [];

    for (const line of lines) {
      const parts = line.split(/\s{3,}|\t+/);

      if (parts.length >= 2) {
        const lastPart = parts[parts.length - 1];
        const priceMatch = lastPart.match(/([$₹€£¥د\.إ]|Rs\.?|AED|USD|INR|EUR|GBP)?\s*(\d+(?:[.,]\d{1,2})?)/i);

        if (priceMatch && priceMatch[2]) {
          const name = parts.slice(0, -1).join(' ').trim();
          if (isLikelyItemName(name)) {
            items.push({
              id: '',
              name: cleanItemName(name),
              price: parseFloat(priceMatch[2].replace(',', '.')),
              currency: priceMatch[1] || defaultCurrency,
              category: detectCategory(name),
              confidence: 80
            });
          }
        }
      }
    }

    return items;
  };

  const fallbackExtraction = (text: string, defaultCurrency: string): ParsedItem[] => {
    const items: ParsedItem[] = [];
    const pricePattern = /([$₹€£¥د\.إ]|Rs\.?|AED|USD|INR|EUR|GBP)?\s*(\d+(?:[.,]\d{1,2})?)/gi;
    const matches = [...text.matchAll(pricePattern)];

    for (const match of matches) {
      const price = parseFloat(match[2].replace(',', '.'));
      if (price >= 0.5 && price <= 50000) {
        const beforeText = text.substring(Math.max(0, match.index! - 100), match.index!);
        const words = beforeText.split(/[\s\n]+/).filter(w => w.length > 2);

        if (words.length > 0) {
          const name = words.slice(-5).join(' ');
          if (isLikelyItemName(name)) {
            items.push({
              id: '',
              name: cleanItemName(name),
              price: price,
              currency: match[1] || defaultCurrency,
              category: detectCategory(name),
              confidence: 50
            });
          }
        }
      }
    }

    return items;
  };

  const isValidItem = (item: Partial<ParsedItem>): boolean => {
    if (!item.name || !item.price) return false;
    if (item.name.length < 3 || item.name.length > 100) return false;
    if (item.price <= 0 || item.price > 100000) return false;

    const excluded = ['total', 'subtotal', 'tax', 'tip', 'discount', 'page', 'menu', 'price', 'amount'];
    const nameLower = item.name.toLowerCase();
    if (excluded.some(word => nameLower === word)) return false;

    return true;
  };

  const generateItemKey = (name: string, price: number): string => {
    return `${name.toLowerCase().replace(/\s/g, '')}_${price.toFixed(2)}`;
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setUploadedFile(file);
      processFile(file);
    }
  };

  const handleImageUpload = (itemId: string, event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const imageData = e.target?.result as string;
        updateItem(itemId, { image: imageData });
      };
      reader.readAsDataURL(file);
    }
  };

  const updateItem = (id: string, updates: Partial<ParsedItem>) => {
    setParsedItems((items) =>
      items.map((item) => (item.id === id ? { ...item, ...updates } : item))
    );
    setEditingItem(null);
  };

  const removeItem = (id: string) => {
    setParsedItems((items) => {
      const remaining = items.filter((item) => item.id !== id);
      if (remaining.length === 0) setUploadedFile(null);
      return remaining;
    });
  };

  const saveItemsToCatalog = () => {
    const categories = categoriesQuery.data || [];

    parsedItems.forEach((item) => {
      // Find matching category case-insensitive
      const matchingCategory = categories.find(c =>
        c.name.toLowerCase() === item.category.toLowerCase()
      ) || categories[0]; // Fallback to first category if no match

      createItemMutation.mutate({
        name: item.name,
        price: item.price,
        category_id: matchingCategory?.id || 'general',
        description: `Imported from ${item.category}`,
        image_url: item.image,
        is_active: true,
        stock: 50, // Default stock
        sku: `${item.name.substring(0, 3).toUpperCase()}-${Math.floor(Math.random() * 10000)}`, // Generate simple SKU
      });
    });

    setUploadedFile(null);
    setParsedItems([]);
    setDebugText('');
    setExtractedImages([]);

    // TODO: Navigate to catalog
  };

  if (isProcessing) {
    return <ProcessingState />;
  }

  return (
    <div className="space-y-6">
      {!uploadedFile && <UploadArea />}
      {uploadedFile && <ResultsView />}
    </div>
  );

  function UploadArea() {
    return (
      <Card className="p-8 text-center">
        <div className="mx-auto w-16 h-16 bg-orange-100 dark:bg-orange-900 rounded-full flex items-center justify-center mb-4">
          <ArrowUpTrayIcon className="w-8 h-8 text-orange-500 dark:text-orange-400" />
        </div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
          {t('ocr.importItems')}
        </h3>
        <p className="text-gray-500 dark:text-gray-400 mb-6">
          {t('ocr.uploadDescription')}
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Button variant="primary" onClick={() => imageInputRef.current?.click()}>
            <CameraIcon className="w-4 h-4 mr-2" />
            {t('ocr.uploadPhoto')}
          </Button>
          <input ref={imageInputRef} type="file" accept="image/*" onChange={handleFileUpload} className="hidden" />

          <Button variant="secondary" onClick={() => pdfInputRef.current?.click()}>
            <DocumentTextIcon className="w-4 h-4 mr-2" />
            {t('ocr.uploadPdf')}
          </Button>
          <input ref={pdfInputRef} type="file" accept=".pdf" onChange={handleFileUpload} className="hidden" />

          <Button variant="secondary" onClick={() => csvExcelInputRef.current?.click()}>
            <DocumentTextIcon className="w-4 h-4 mr-2" />
            Excel/CSV
          </Button>
          <input
            ref={csvExcelInputRef}
            type="file"
            accept=".csv, application/vnd.ms-excel, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            onChange={handleFileUpload}
            className="hidden"
          />
        </div>

      </Card>
    );
  }

  function ProcessingState() {
    return (
      <Card className="p-8 text-center">
        <div className="mx-auto w-16 h-16 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center mb-4 animate-pulse">
          <DocumentTextIcon className="w-8 h-8 text-blue-600 dark:text-blue-400" />
        </div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
          {t('ocr.processing')}
        </h3>
        <p className="text-gray-500 dark:text-gray-400">
          {t('ocr.extractingItems')}
        </p>
        <p className="text-xs text-gray-400 mt-2">
          This may take 10-30 seconds
        </p>
      </Card>
    );
  }

  function ResultsView() {
    return (
      <div className="space-y-6">
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                {t('ocr.extractedItems')} ({parsedItems.length})
              </h2>
              {ocrConfidence > 0 && (
                <p className="text-xs text-gray-500 mt-1">
                  OCR Confidence: {Math.round(ocrConfidence)}% • {parsedItems.filter(i => i.image).length} items with images
                </p>
              )}
            </div>
            <Button variant="secondary" onClick={() => {
              setUploadedFile(null);
              setParsedItems([]);
              setDebugText('');
              setExtractedImages([]);

            }}>
              {t('ocr.uploadNew')}
            </Button>
          </div>

          {parsedItems.length === 0 ? (
            <div className="text-center">
              <p className="text-gray-500 mb-4">No items found. Check extracted text below.</p>
              {debugText && (
                <details className="text-left">
                  <summary className="cursor-pointer text-sm text-blue-600 hover:text-blue-800 mb-2">
                    🔍 View Raw Extracted Text (Debug)
                  </summary>
                  <pre className="mt-2 p-3 bg-gray-100 dark:bg-gray-800 rounded text-xs overflow-auto max-h-96 whitespace-pre-wrap">
                    {debugText}
                  </pre>
                </details>
              )}
            </div>
          ) : (
            <>
              <div className="space-y-3 mb-4">
                {parsedItems.map((item) => (
                  <div key={item.id} className="p-4 border border-gray-200 dark:border-gray-600 rounded-lg">
                    {editingItem === item.id ? (
                      <div className="space-y-3">
                        {/* Image Upload Section */}
                        <div className="flex items-center gap-4">
                          {item.image ? (
                            <div className="relative">
                              <img
                                src={item.image}
                                alt={item.name}
                                className="w-24 h-24 object-cover rounded-lg"
                              />
                              <button
                                onClick={() => updateItem(item.id, { image: undefined })}
                                className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                              >
                                <XMarkIcon className="w-3 h-3" />
                              </button>
                            </div>
                          ) : (
                            <label className="w-24 h-24 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg flex items-center justify-center cursor-pointer hover:border-blue-500 dark:hover:border-blue-400">
                              <input
                                type="file"
                                accept="image/*"
                                onChange={(e) => handleImageUpload(item.id, e)}
                                className="hidden"
                              />
                              <PhotoIcon className="w-8 h-8 text-gray-400" />
                            </label>
                          )}
                          <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <Input
                              value={item.name}
                              onChange={(e) => updateItem(item.id, { name: e.target.value })}
                              placeholder={t('catalog.itemName')}
                            />
                            <Input
                              type="number"
                              step="0.01"
                              value={item.price}
                              onChange={(e) => updateItem(item.id, { price: Number(e.target.value) })}
                              placeholder={t('catalog.price')}
                            />
                          </div>
                        </div>
                        <Input
                          value={item.category}
                          onChange={(e) => updateItem(item.id, { category: e.target.value })}
                          placeholder={t('catalog.category')}
                        />
                        <div className="flex gap-2">
                          <Button size="sm" onClick={() => setEditingItem(null)}>
                            <CheckIcon className="w-3 h-3 mr-1" /> {t('catalog.save')}
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => setEditingItem(null)}>
                            {t('common.cancel')}
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center gap-4">
                        {/* Display Item Image */}
                        {item.image ? (
                          <img
                            src={item.image}
                            alt={item.name}
                            className="w-20 h-20 object-cover rounded-lg border-2 border-green-500"
                            title="Auto-extracted image"
                          />
                        ) : (
                          <div className="w-20 h-20 bg-gray-100 dark:bg-gray-800 rounded-lg flex items-center justify-center">
                            <PhotoIcon className="w-8 h-8 text-gray-400" />
                          </div>
                        )}
                        <div className="flex-1">
                          <h3 className="font-medium text-gray-900 dark:text-white flex items-center gap-2">
                            {item.name}
                            {item.image && (
                              <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded">
                                With Image
                              </span>
                            )}
                          </h3>
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            {item.category} • {item.currency ? `${item.currency}${item.price.toFixed(2)}` : formatCurrency(item.price)}
                            {item.confidence < 80 && (
                              <span className="ml-2 text-xs text-orange-500">({item.confidence}% confidence)</span>
                            )}
                          </p>
                        </div>
                        <div className="flex gap-2">
                          <Button variant="ghost" size="sm" onClick={() => setEditingItem(item.id)}>
                            Edit
                          </Button>
                          <Button variant="ghost" size="sm" className="text-red-500" onClick={() => removeItem(item.id)}>
                            <XMarkIcon className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              <div className="flex justify-end gap-4">
                <Button variant="secondary" onClick={() => {
                  setUploadedFile(null);
                  setParsedItems([]);
                  setDebugText('');
                  setExtractedImages([]);

                }}>
                  {t('common.cancel')}
                </Button>
                <Button variant="primary" onClick={saveItemsToCatalog} disabled={createItemMutation.isPending}>
                  {createItemMutation.isPending ? t('common.saving') : t('ocr.saveToCatalog')}
                </Button>
              </div>
            </>
          )}
        </Card>

        {/* Extracted Images Debug View (Optional) */}
        {extractedImages.length > 0 && (
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Extracted Image Regions (Debug)</h3>
            <div className="grid grid-cols-4 gap-4">
              {extractedImages.map((img, idx) => (
                <div key={idx} className="border p-2 rounded">
                  <img src={img.imageData} alt={`Region ${idx}`} className="w-full h-auto" />
                  <p className="text-xs mt-1">x:{Math.round(img.x)}, y:{Math.round(img.y)}</p>
                </div>
              ))}
            </div>
          </Card>
        )}
      </div>
    );
  }
}