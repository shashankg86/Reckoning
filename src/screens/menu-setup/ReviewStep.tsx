/**
 * ReviewStep Component
 *
 * Final step - Review and complete menu setup
 */

import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { CheckCircleIcon, ArrowPathIcon } from '@heroicons/react/24/outline';
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

      {/* Categories and Items Preview */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          {t('menuSetup.yourCategories')} & Items
        </h3>

        <div className="space-y-6">
          {loadingCategories ? (
            <div className="flex items-center justify-center py-8">
              <ArrowPathIcon className="w-6 h-6 text-gray-400 animate-spin" />
            </div>
          ) : (
            categoriesWithCounts.map((category) => (
              <div key={category.id} className="space-y-3">
                {/* Category Header */}
                <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div
                      className="w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold"
                      style={{ backgroundColor: category.color }}
                    >
                      {category.name.charAt(0)}
                    </div>
                    <div>
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
                  <span className="text-sm font-medium text-gray-500 dark:text-gray-400">
                    {category.item_count} {t('common.items')}
                  </span>
                </div>

                {/* Items in Category */}
                {category.items && category.items.length > 0 && (
                  <div className="ml-6 space-y-2">
                    {category.items.map((item: any) => (
                      <div
                        key={item.id}
                        className="flex items-start justify-between p-3 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-600"
                      >
                        <div className="flex-1">
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
                        <div className="ml-4 text-right">
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
                )}
              </div>
            ))
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
