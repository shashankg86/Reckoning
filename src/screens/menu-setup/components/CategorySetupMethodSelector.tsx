/**
 * CategorySetupMethodSelector Component
 *
 * Smart selector for different category setup methods
 */

import React from 'react';
import { useTranslation } from 'react-i18next';
import {
  SparklesIcon,
  DocumentArrowUpIcon,
  PlusCircleIcon,
  RectangleStackIcon,
  CameraIcon,
  TableCellsIcon,
} from '@heroicons/react/24/outline';
import { Card } from '../../../components/ui/Card';

export type CategorySetupMethod =
  | 'template'
  | 'ocr-import'
  | 'excel-import'
  | 'bulk-create'
  | 'manual';

interface SetupMethodOption {
  method: CategorySetupMethod;
  icon: React.ComponentType<{ className?: string }>;
  titleKey: string;
  descriptionKey: string;
  color: string;
  recommended?: boolean;
}

interface CategorySetupMethodSelectorProps {
  onMethodSelect: (method: CategorySetupMethod) => void;
}

export function CategorySetupMethodSelector({ onMethodSelect }: CategorySetupMethodSelectorProps) {
  const { t } = useTranslation();

  const methods: SetupMethodOption[] = [
    {
      method: 'template',
      icon: SparklesIcon,
      titleKey: 'menuSetup.methods.template.title',
      descriptionKey: 'menuSetup.methods.template.description',
      color: 'bg-gradient-to-br from-orange-500 to-pink-500',
      recommended: true,
    },
    {
      method: 'ocr-import',
      icon: CameraIcon,
      titleKey: 'menuSetup.methods.ocrImport.title',
      descriptionKey: 'menuSetup.methods.ocrImport.description',
      color: 'bg-gradient-to-br from-purple-500 to-indigo-500',
    },
    {
      method: 'excel-import',
      icon: TableCellsIcon,
      titleKey: 'menuSetup.methods.excelImport.title',
      descriptionKey: 'menuSetup.methods.excelImport.description',
      color: 'bg-gradient-to-br from-green-500 to-teal-500',
    },
    {
      method: 'bulk-create',
      icon: RectangleStackIcon,
      titleKey: 'menuSetup.methods.bulkCreate.title',
      descriptionKey: 'menuSetup.methods.bulkCreate.description',
      color: 'bg-gradient-to-br from-blue-500 to-cyan-500',
    },
    {
      method: 'manual',
      icon: PlusCircleIcon,
      titleKey: 'menuSetup.methods.manual.title',
      descriptionKey: 'menuSetup.methods.manual.description',
      color: 'bg-gradient-to-br from-gray-500 to-slate-500',
    },
  ];

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
          {t('menuSetup.chooseSetupMethod')}
        </h3>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          {t('menuSetup.chooseSetupMethodDescription')}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {methods.map((option) => {
          const Icon = option.icon;
          return (
            <Card
              key={option.method}
              hover
              onClick={() => onMethodSelect(option.method)}
              className="relative cursor-pointer transition-all duration-200 hover:scale-105 hover:shadow-xl"
            >
              {option.recommended && (
                <div className="absolute -top-3 -right-3 bg-orange-500 text-white text-xs font-bold px-3 py-1 rounded-full shadow-lg">
                  {t('menuSetup.recommended')}
                </div>
              )}

              <div className="p-6">
                <div className="flex items-start space-x-4">
                  <div className={`${option.color} p-3 rounded-xl text-white flex-shrink-0`}>
                    <Icon className="h-6 w-6" />
                  </div>

                  <div className="flex-1">
                    <h4 className="font-semibold text-gray-900 dark:text-white mb-1">
                      {t(option.titleKey)}
                    </h4>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {t(option.descriptionKey)}
                    </p>
                  </div>
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
        <div className="flex items-start space-x-3">
          <DocumentArrowUpIcon className="h-5 w-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-blue-800 dark:text-blue-300">
            <strong>{t('menuSetup.tip')}:</strong> {t('menuSetup.setupMethodTip')}
          </div>
        </div>
      </div>
    </div>
  );
}
