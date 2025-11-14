/**
 * TemplatePreviewModal Component
 *
 * Shows preview of default categories before creating them
 */

import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { XMarkIcon, CheckIcon } from '@heroicons/react/24/outline';
import { Button } from '../../../components/ui/Button';
import { useAuth } from '../../../contexts/AuthContext';
import type { CreateCategoryData } from '../../../types/menu';

interface TemplatePreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  getDefaultCategories: (storeType: string) => CreateCategoryData[];
}

export function TemplatePreviewModal({
  isOpen,
  onClose,
  onConfirm,
  getDefaultCategories,
}: TemplatePreviewModalProps) {
  const { t } = useTranslation();
  const { state } = useAuth();
  const [isCreating, setIsCreating] = React.useState(false);

  const storeType = (state.user as any)?.store?.store_type || 'restaurant';

  const previewCategories = useMemo(() => {
    return getDefaultCategories(storeType);
  }, [storeType, getDefaultCategories]);

  const handleConfirm = async () => {
    setIsCreating(true);
    try {
      await onConfirm();
      onClose();
    } catch (error) {
      console.error('Template creation error:', error);
    } finally {
      setIsCreating(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              {t('menuSetup.previewDefaultCategories')}
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              {t('menuSetup.templatePreviewDescription', { storeType: t(`onboarding.storeTypes.${storeType}`) })}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        {/* Preview List */}
        <div className="p-6">
          <div className="space-y-3">
            {previewCategories.map((category, index) => (
              <div
                key={index}
                className="flex items-center gap-3 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg"
              >
                <div
                  className="w-12 h-12 rounded-lg flex items-center justify-center text-white font-bold text-lg flex-shrink-0"
                  style={{ backgroundColor: category.color }}
                >
                  {category.name.charAt(0)}
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900 dark:text-white">
                    {category.name}
                  </h3>
                  {category.description && (
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {category.description}
                    </p>
                  )}
                </div>
                <CheckIcon className="h-5 w-5 text-green-600 dark:text-green-400" />
              </div>
            ))}
          </div>

          {/* Info Box */}
          <div className="mt-6 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
            <p className="text-sm text-blue-800 dark:text-blue-300">
              <strong>{t('common.note')}:</strong> {t('menuSetup.templateNote')}
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200 dark:border-gray-700">
          <Button
            variant="secondary"
            onClick={onClose}
            disabled={isCreating}
          >
            {t('common.cancel')}
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={isCreating}
          >
            {isCreating
              ? t('menuSetup.creatingCategories')
              : t('menuSetup.createTheseCategories', { count: previewCategories.length })}
          </Button>
        </div>
      </div>
    </div>
  );
}
