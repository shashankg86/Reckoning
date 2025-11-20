import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  XMarkIcon,
  ReceiptPercentIcon,
  PlusIcon,
  TrashIcon
} from '@heroicons/react/24/outline';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';

export interface InvoiceTaxOverride {
  enabled: boolean;
  customRate?: number;
  serviceCharge?: {
    enabled: boolean;
    rate: number;
    applyVatOnServiceCharge?: boolean; // For Dubai: VAT applies on service charge
  };
  municipalityFee?: {
    enabled: boolean;
    rate: number;
  };
  customComponents?: {
    name: string;
    rate: number;
  }[];
}

interface InvoiceTaxModalProps {
  currentOverride: InvoiceTaxOverride | null;
  defaultTaxRate: number;
  subtotal: number;
  country?: string; // To show/hide Dubai-specific fields
  onClose: () => void;
  onApply: (override: InvoiceTaxOverride) => void;
}

export function InvoiceTaxModal({
  currentOverride,
  defaultTaxRate,
  subtotal,
  country,
  onClose,
  onApply
}: InvoiceTaxModalProps) {
  const { t } = useTranslation();

  // Initialize state from current override or defaults
  const [taxEnabled, setTaxEnabled] = useState(currentOverride?.enabled ?? true);
  const [customRate, setCustomRate] = useState<number | undefined>(currentOverride?.customRate);
  const [serviceChargeEnabled, setServiceChargeEnabled] = useState(
    currentOverride?.serviceCharge?.enabled ?? false
  );
  const [serviceChargeRate, setServiceChargeRate] = useState(
    currentOverride?.serviceCharge?.rate ?? 10
  );
  const [applyVatOnServiceCharge, setApplyVatOnServiceCharge] = useState(
    currentOverride?.serviceCharge?.applyVatOnServiceCharge ?? true
  );
  const [municipalityFeeEnabled, setMunicipalityFeeEnabled] = useState(
    currentOverride?.municipalityFee?.enabled ?? false
  );
  const [municipalityFeeRate, setMunicipalityFeeRate] = useState(
    currentOverride?.municipalityFee?.rate ?? 7
  );
  const [customComponents, setCustomComponents] = useState<{ name: string; rate: number }[]>(
    currentOverride?.customComponents ?? []
  );

  const isDubai = country === 'AE';

  // Calculate preview
  const calculatePreview = () => {
    let baseAmount = subtotal;

    // Service charge
    let serviceChargeAmount = 0;
    if (serviceChargeEnabled) {
      serviceChargeAmount = (baseAmount * serviceChargeRate) / 100;
    }

    // Base for tax calculation
    let taxableAmount = baseAmount;
    if (isDubai && serviceChargeEnabled && applyVatOnServiceCharge) {
      // In Dubai, VAT applies on service charge too
      taxableAmount += serviceChargeAmount;
    }

    // Tax
    let taxAmount = 0;
    if (taxEnabled) {
      const rate = customRate ?? defaultTaxRate;
      taxAmount = (taxableAmount * rate) / 100;
    }

    // Municipality fee (Dubai)
    let municipalityFeeAmount = 0;
    if (municipalityFeeEnabled && isDubai) {
      municipalityFeeAmount = (baseAmount * municipalityFeeRate) / 100;
    }

    // Custom components
    let customComponentsAmount = 0;
    customComponents.forEach(comp => {
      customComponentsAmount += (baseAmount * comp.rate) / 100;
    });

    const total = baseAmount + serviceChargeAmount + taxAmount + municipalityFeeAmount + customComponentsAmount;

    return {
      baseAmount,
      serviceChargeAmount,
      taxAmount,
      taxRate: customRate ?? defaultTaxRate,
      municipalityFeeAmount,
      customComponentsAmount,
      total
    };
  };

  const preview = calculatePreview();

  const handleAddCustomComponent = () => {
    setCustomComponents([...customComponents, { name: 'Custom Tax', rate: 0 }]);
  };

  const handleRemoveCustomComponent = (index: number) => {
    setCustomComponents(customComponents.filter((_, i) => i !== index));
  };

  const handleUpdateCustomComponent = (index: number, field: 'name' | 'rate', value: string | number) => {
    const updated = [...customComponents];
    updated[index] = {
      ...updated[index],
      [field]: value
    };
    setCustomComponents(updated);
  };

  const handleApply = () => {
    const override: InvoiceTaxOverride = {
      enabled: taxEnabled,
      customRate: customRate,
      serviceCharge: serviceChargeEnabled ? {
        enabled: true,
        rate: serviceChargeRate,
        applyVatOnServiceCharge: isDubai ? applyVatOnServiceCharge : undefined
      } : undefined,
      municipalityFee: municipalityFeeEnabled && isDubai ? {
        enabled: true,
        rate: municipalityFeeRate
      } : undefined,
      customComponents: customComponents.length > 0 ? customComponents : undefined
    };

    onApply(override);
  };

  const handleReset = () => {
    onApply({
      enabled: true
    });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg w-full max-w-2xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2">
            <ReceiptPercentIcon className="h-5 w-5 text-orange-500" />
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              {t('billing.customizeTax')}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
          >
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Info */}
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {t('billing.customizeTaxDescription')}
          </p>

          {/* Enable Tax Toggle */}
          <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
            <div>
              <label className="font-medium text-gray-900 dark:text-white">
                {t('billing.enableTaxForInvoice')}
              </label>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-0.5">
                {t('billing.enableTaxForInvoiceDescription')}
              </p>
            </div>
            <button
              onClick={() => setTaxEnabled(!taxEnabled)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                taxEnabled ? 'bg-orange-500' : 'bg-gray-300 dark:bg-gray-600'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  taxEnabled ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          {taxEnabled && (
            <>
              {/* Custom Tax Rate */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {t('billing.taxRate')} <span className="text-gray-500">({t('billing.defaultTaxRate')}: {defaultTaxRate}%)</span>
                </label>
                <div className="flex gap-2 items-center">
                  <Input
                    type="number"
                    value={customRate ?? ''}
                    onChange={(e) => setCustomRate(e.target.value ? Number(e.target.value) : undefined)}
                    placeholder={String(defaultTaxRate)}
                    className="flex-1"
                    step="0.1"
                    min="0"
                    max="100"
                  />
                  <span className="text-gray-600 dark:text-gray-400">%</span>
                  {customRate !== undefined && (
                    <button
                      onClick={() => setCustomRate(undefined)}
                      className="text-sm text-orange-500 hover:text-orange-600"
                    >
                      {t('common.reset')}
                    </button>
                  )}
                </div>
              </div>
            </>
          )}

          {/* Service Charge */}
          <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
            <div className="flex items-center justify-between mb-3">
              <div>
                <label className="font-medium text-gray-900 dark:text-white">
                  {t('billing.serviceCharge')}
                </label>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-0.5">
                  {isDubai ? t('billing.serviceChargeDescriptionDubai') : t('billing.serviceChargeDescriptionIndia')}
                </p>
              </div>
              <button
                onClick={() => setServiceChargeEnabled(!serviceChargeEnabled)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  serviceChargeEnabled ? 'bg-orange-500' : 'bg-gray-300 dark:bg-gray-600'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    serviceChargeEnabled ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            {serviceChargeEnabled && (
              <div className="space-y-3">
                <div className="flex gap-2 items-center">
                  <Input
                    type="number"
                    value={serviceChargeRate}
                    onChange={(e) => setServiceChargeRate(Number(e.target.value) || 0)}
                    className="flex-1"
                    step="0.1"
                    min="0"
                    max="100"
                  />
                  <span className="text-gray-600 dark:text-gray-400">%</span>
                </div>

                {/* Dubai specific: VAT on service charge */}
                {isDubai && (
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={applyVatOnServiceCharge}
                      onChange={(e) => setApplyVatOnServiceCharge(e.target.checked)}
                      className="rounded border-gray-300 text-orange-500 focus:ring-orange-500"
                    />
                    <span className="text-gray-700 dark:text-gray-300">
                      {t('billing.applyVatOnServiceCharge')}
                    </span>
                  </label>
                )}
              </div>
            )}
          </div>

          {/* Municipality Fee (Dubai Only) */}
          {isDubai && (
            <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <label className="font-medium text-gray-900 dark:text-white">
                    {t('billing.municipalityFee')}
                  </label>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-0.5">
                    {t('billing.municipalityFeeDescription')}
                  </p>
                </div>
                <button
                  onClick={() => setMunicipalityFeeEnabled(!municipalityFeeEnabled)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    municipalityFeeEnabled ? 'bg-orange-500' : 'bg-gray-300 dark:bg-gray-600'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      municipalityFeeEnabled ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>

              {municipalityFeeEnabled && (
                <div className="flex gap-2 items-center">
                  <Input
                    type="number"
                    value={municipalityFeeRate}
                    onChange={(e) => setMunicipalityFeeRate(Number(e.target.value) || 0)}
                    className="flex-1"
                    step="0.1"
                    min="0"
                    max="100"
                  />
                  <span className="text-gray-600 dark:text-gray-400">%</span>
                </div>
              )}
            </div>
          )}

          {/* Custom Tax Components */}
          <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
            <div className="flex items-center justify-between mb-3">
              <label className="font-medium text-gray-900 dark:text-white">
                {t('billing.customTaxComponents')}
              </label>
              <Button
                size="sm"
                variant="secondary"
                onClick={handleAddCustomComponent}
              >
                <PlusIcon className="h-4 w-4 mr-1" />
                {t('common.add')}
              </Button>
            </div>

            {customComponents.length > 0 && (
              <div className="space-y-2">
                {customComponents.map((component, index) => (
                  <div key={index} className="flex gap-2 items-center">
                    <Input
                      value={component.name}
                      onChange={(e) => handleUpdateCustomComponent(index, 'name', e.target.value)}
                      placeholder={t('billing.componentName')}
                      className="flex-1"
                    />
                    <Input
                      type="number"
                      value={component.rate}
                      onChange={(e) => handleUpdateCustomComponent(index, 'rate', Number(e.target.value) || 0)}
                      className="w-24"
                      step="0.1"
                      min="0"
                      max="100"
                    />
                    <span className="text-gray-600 dark:text-gray-400">%</span>
                    <button
                      onClick={() => handleRemoveCustomComponent(index)}
                      className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded"
                    >
                      <TrashIcon className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Preview */}
          <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
            <h3 className="font-medium text-gray-900 dark:text-white mb-3">
              {t('billing.preview')}
            </h3>
            <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600 dark:text-gray-400">{t('billing.subtotal')}</span>
                <span className="font-medium text-gray-900 dark:text-white">
                  ₹{preview.baseAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </span>
              </div>

              {serviceChargeEnabled && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-400">
                    {t('billing.serviceCharge')} ({serviceChargeRate}%)
                  </span>
                  <span className="font-medium text-gray-900 dark:text-white">
                    ₹{preview.serviceChargeAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              )}

              {taxEnabled && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-400">
                    {isDubai ? t('billing.vat') : t('billing.gst')} ({preview.taxRate}%)
                  </span>
                  <span className="font-medium text-gray-900 dark:text-white">
                    ₹{preview.taxAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              )}

              {municipalityFeeEnabled && preview.municipalityFeeAmount > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-400">
                    {t('billing.municipalityFee')} ({municipalityFeeRate}%)
                  </span>
                  <span className="font-medium text-gray-900 dark:text-white">
                    ₹{preview.municipalityFeeAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              )}

              {customComponents.map((comp, index) => (
                <div key={index} className="flex justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-400">
                    {comp.name} ({comp.rate}%)
                  </span>
                  <span className="font-medium text-gray-900 dark:text-white">
                    ₹{((preview.baseAmount * comp.rate) / 100).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              ))}

              <div className="flex justify-between text-base font-bold pt-2 border-t border-gray-200 dark:border-gray-700">
                <span className="text-gray-900 dark:text-white">{t('billing.total')}</span>
                <span className="text-orange-500">
                  ₹{preview.total.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-200 dark:border-gray-700">
          <div className="flex gap-3">
            <Button
              variant="ghost"
              onClick={handleReset}
              className="flex-1"
            >
              {t('common.reset')}
            </Button>
            <Button
              variant="secondary"
              onClick={onClose}
              className="flex-1"
            >
              {t('common.cancel')}
            </Button>
            <Button
              onClick={handleApply}
              className="flex-1 bg-orange-500 hover:bg-orange-600"
            >
              {t('common.apply')}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
