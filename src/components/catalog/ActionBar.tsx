import React from 'react';
import { useTranslation } from 'react-i18next';
import {
  CheckIcon,
  XMarkIcon,
  PlusIcon,
  FolderPlusIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';
import { Button } from '../ui/Button';

interface ActionBarProps {
  hasUnsavedChanges: boolean;
  changeCount: number;
  onSaveAll: () => void;
  onDiscardAll: () => void;
  onBulkAddCategories: () => void;
  onBulkAddItems: () => void;
  isSaving?: boolean;
}

export function ActionBar({
  hasUnsavedChanges,
  changeCount,
  onSaveAll,
  onDiscardAll,
  onBulkAddCategories,
  onBulkAddItems,
  isSaving = false
}: ActionBarProps) {
  const { t } = useTranslation();

  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg">
      {/* Left: Unsaved Changes Indicator */}
      <div className="flex items-center gap-3">
        {hasUnsavedChanges ? (
          <>
            <div className="flex items-center gap-2 px-3 py-1.5 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
              <ExclamationTriangleIcon className="h-5 w-5 text-amber-600 dark:text-amber-400" />
              <div>
                <p className="text-sm font-medium text-amber-900 dark:text-amber-100">
                  {t('catalog.unsavedChanges')}
                </p>
                <p className="text-xs text-amber-700 dark:text-amber-300">
                  {t('catalog.changesCount', { count: changeCount })}
                </p>
              </div>
            </div>

            {/* Save/Discard Buttons */}
            <div className="flex gap-2">
              <Button
                onClick={onSaveAll}
                disabled={isSaving}
                className="flex items-center gap-2"
              >
                <CheckIcon className="h-4 w-4" />
                {isSaving ? t('common.saving') : t('catalog.saveAll')}
              </Button>
              <Button
                variant="secondary"
                onClick={onDiscardAll}
                disabled={isSaving}
                className="flex items-center gap-2"
              >
                <XMarkIcon className="h-4 w-4" />
                {t('catalog.discardAll')}
              </Button>
            </div>
          </>
        ) : (
          <div className="flex items-center gap-2 px-3 py-1.5 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
            <CheckIcon className="h-5 w-5 text-green-600 dark:text-green-400" />
            <p className="text-sm font-medium text-green-900 dark:text-green-100">
              {t('catalog.allChangesSaved')}
            </p>
          </div>
        )}
      </div>

      {/* Right: Bulk Add Actions */}
      <div className="flex gap-2">
        <Button
          variant="secondary"
          size="sm"
          onClick={onBulkAddCategories}
          className="flex items-center gap-2"
          disabled={isSaving}
        >
          <FolderPlusIcon className="h-4 w-4" />
          <span className="hidden sm:inline">{t('catalog.bulkAddCategories')}</span>
          <span className="sm:hidden">{t('catalog.categories')}</span>
        </Button>
        <Button
          size="sm"
          onClick={onBulkAddItems}
          className="flex items-center gap-2"
          disabled={isSaving}
        >
          <PlusIcon className="h-4 w-4" />
          <span className="hidden sm:inline">{t('catalog.bulkAddItems')}</span>
          <span className="sm:hidden">{t('catalog.items')}</span>
        </Button>
      </div>
    </div>
  );
}
