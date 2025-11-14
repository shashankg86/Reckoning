import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { CheckCircleIcon, ArrowPathIcon, ChevronDownIcon, ChevronRightIcon, PhotoIcon } from '@heroicons/react/24/outline';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { useCategories } from '../../hooks/useCategories';

interface ReviewStepProps {
  onBack: () => void;
  onComplete: () => Promise<void>;
}

export function ReviewStep({ onBack, onComplete }: ReviewStepProps) {
  const { t } = useTranslation();
  const { categoriesWithCounts, loading: loadingCategories } = useCategories({
    autoLoad: true,
    withCounts: true,
  });

  const [isCompleting, setIsCompleting] = useState(false);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());

  const handleComplete = async () => {
    setIsCompleting(true);
    try {
      await onComplete();
    } catch (error) {
      console.error('Complete menu setup error:', error);
    } finally {
      setIsCompleting(false);
    }
  };

  const toggleCategory = (categoryId: string) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(categoryId)) {
      newExpanded.delete(categoryId);
    } else {
      newExpanded.add(categoryId);
    }
    setExpandedCategories(newExpanded);
  };

  const expandAll = () => {
    setExpandedCategories(new Set(categoriesWithCounts.map((cat) => cat.id)));
  };

  const collapseAll = () => {
    setExpandedCategories(new Set());
  };

  const totalItems = categoriesWithCounts.reduce((sum, cat) => sum + cat.item_count, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <div className="mx-auto w-16 h-16 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center mb-4">
          <CheckCircleIcon className="w-10 h-10 text-green-600 dark:text-green-400" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
          {t('menuSetup.reviewAndComplete')}
        </h2>
        <p className="text-gray-600 dark:text-gray-400 mt-2">
          {t('menuSetup.reviewDescription')}
        </p>
      </div>

      {/* Summary Card */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          {t('menuSetup.setupSummary')}
        </h3>

        <div className="grid grid-cols-2 gap-6">
          <div className="text-center p-4 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
            <p className="text-3xl font-bold text-orange-600 dark:text-orange-400">
              {categoriesWithCounts.length}
            </p>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              {t('menuSetup.categoriesCreated')}
            </p>
          </div>

          <div className="text-center p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
            <p className="text-3xl font-bold text-blue-600 dark:text-blue-400">
              {totalItems}
            </p>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              {t('menuSetup.itemsAdded')}
            </p>
          </div>
        </div>
      </Card>

      {/* Categories Accordion */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            {t('menuSetup.yourCategories')} & Items
          </h3>
          {categoriesWithCounts.length > 0 && (
            <div className="flex gap-2">
              <button
                onClick={expandAll}
                className="text-sm text-orange-600 dark:text-orange-400 hover:underline"
              >
                Expand All
              </button>
              <span className="text-gray-400">|</span>
              <button
                onClick={collapseAll}
                className="text-sm text-orange-600 dark:text-orange-400 hover:underline"
              >
                Collapse All
              </button>
            </div>
          )}
        </div>

        <div className="space-y-3">
          {loadingCategories ? (
            <div className="flex items-center justify-center py-8">
              <ArrowPathIcon className="w-6 h-6 text-gray-400 animate-spin" />
            </div>
          ) : categoriesWithCounts.length === 0 ? (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
              No categories found
            </div>
          ) : (
            categoriesWithCounts.map((category) => {
              const isExpanded = expandedCategories.has(category.id);
              const hasItems = category.items && category.items.length > 0;

              return (
                <div
                  key={category.id}
                  className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden"
                >
                  {/* Accordion Header */}
                  <button
                    onClick={() => toggleCategory(category.id)}
                    className="w-full flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
                  >
                    <div className="flex items-center space-x-3">
                      {category.image_url ? (
                        <img
                          src={category.image_url}
                          alt={category.name}
                          className="w-10 h-10 rounded-lg object-cover flex-shrink-0"
                        />
                      ) : (
                        <div
                          className="w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold flex-shrink-0"
                          style={{ backgroundColor: category.color }}
                        >
                          {category.name.charAt(0)}
                        </div>
                      )}
                      <div className="text-left">
                        <p className="font-medium text-gray-900 dark:text-white">
                          {category.name}
                        </p>
                        {category.description && (
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            {category.description}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-medium text-gray-500 dark:text-gray-400 px-3 py-1 bg-white dark:bg-gray-800 rounded-full">
                        {category.item_count} {category.item_count === 1 ? 'item' : 'items'}
                      </span>
                      {isExpanded ? (
                        <ChevronDownIcon className="w-5 h-5 text-gray-400" />
                      ) : (
                        <ChevronRightIcon className="w-5 h-5 text-gray-400" />
                      )}
                    </div>
                  </button>

                  {/* Accordion Content */}
                  {isExpanded && (
                    <div className="p-4 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700">
                      {hasItems ? (
                        <div className="space-y-2">
                          {category.items.map((item: any) => (
                            <div
                              key={item.id}
                              className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
                            >
                              {/* Item image or placeholder */}
                              {item.image_url ? (
                                <img
                                  src={item.image_url}
                                  alt={item.name}
                                  className="w-16 h-16 rounded-lg object-cover flex-shrink-0"
                                />
                              ) : (
                                <div className="w-16 h-16 rounded-lg bg-gray-200 dark:bg-gray-600 flex items-center justify-center flex-shrink-0">
                                  <PhotoIcon className="w-8 h-8 text-gray-400 dark:text-gray-500" />
                                </div>
                              )}

                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <p className="font-medium text-gray-900 dark:text-white">
                                    {item.name}
                                  </p>
                                  <span
                                    className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium"
                                    style={{
                                      backgroundColor: `${category.color}20`,
                                      color: category.color,
                                    }}
                                  >
                                    {category.name}
                                  </span>
                                </div>
                                {item.description && (
                                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                                    {item.description}
                                  </p>
                                )}
                              </div>
                              <div className="ml-4 text-right flex-shrink-0">
                                <p className="font-semibold text-orange-600 dark:text-orange-400">
                                  {t('common.currency')}
                                  {item.price.toFixed(2)}
                                </p>
                                {item.stock !== undefined && item.stock !== null && (
                                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                    Stock: {item.stock}
                                  </p>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-4 text-gray-500 dark:text-gray-400 text-sm">
                          No items in this category
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </Card>

      {/* Info Message */}
      <Card className="p-4 bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
        <p className="text-sm text-blue-800 dark:text-blue-300">
          💡 {t('menuSetup.completionNote')}
        </p>
      </Card>

      {/* Navigation */}
      <div className="flex justify-between pt-6 border-t border-gray-200 dark:border-gray-700">
        <Button variant="secondary" onClick={onBack} disabled={isCompleting} size="lg">
          {t('common.back')}
        </Button>
        <Button
          onClick={handleComplete}
          disabled={isCompleting || categoriesWithCounts.length === 0}
          size="lg"
        >
          {isCompleting ? (
            <>
              <ArrowPathIcon className="w-5 h-5 mr-2 animate-spin" />
              {t('common.completing')}
            </>
          ) : (
            t('menuSetup.completeSetup')
          )}
        </Button>
      </div>
    </div>
  );
}
