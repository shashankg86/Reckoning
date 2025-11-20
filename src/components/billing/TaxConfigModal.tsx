import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  XMarkIcon,
  CurrencyRupeeIcon,
  InformationCircleIcon,
  CheckCircleIcon
} from '@heroicons/react/24/outline';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { taxConfigAPI, TAX_PRESETS, type StoreTaxConfig, type TaxPreset } from '../../api/taxConfig';
import toast from 'react-hot-toast';

interface TaxConfigModalProps {
  storeId: string;
  currentConfig: StoreTaxConfig | null;
  onClose: () => void;
  onConfigSaved: (config: StoreTaxConfig) => void;
}

const COUNTRIES = [
  { code: 'IN', name: 'India', flag: '🇮🇳' },
  { code: 'AE', name: 'UAE', flag: '🇦🇪' },
  { code: 'US', name: 'United States', flag: '🇺🇸' },
  { code: 'GB', name: 'United Kingdom', flag: '🇬🇧' },
];

export function TaxConfigModal({ storeId, currentConfig, onClose, onConfigSaved }: TaxConfigModalProps) {
  const { t } = useTranslation();

  // Form state
  const [country, setCountry] = useState(currentConfig?.country || 'IN');
  const [taxEnabled, setTaxEnabled] = useState(currentConfig?.tax_enabled ?? true);
  const [selectedPreset, setSelectedPreset] = useState<string | null>(currentConfig?.tax_preset_id || null);
  const [taxNumber, setTaxNumber] = useState(currentConfig?.tax_number || '');
  const [taxInclusive, setTaxInclusive] = useState(currentConfig?.tax_inclusive ?? false);
  const [isSaving, setIsSaving] = useState(false);

  // Get available presets for selected country
  const availablePresets = taxConfigAPI.getTaxPresets(country);

  // Update selected preset when country changes
  useEffect(() => {
    if (availablePresets.length > 0 && !selectedPreset) {
      setSelectedPreset(availablePresets[0].id);
    }
  }, [country, availablePresets, selectedPreset]);

  const handleSave = async () => {
    try {
      setIsSaving(true);

      const config: StoreTaxConfig = {
        store_id: storeId,
        country,
        tax_enabled: taxEnabled,
        tax_preset_id: selectedPreset || undefined,
        tax_number: taxNumber || undefined,
        tax_inclusive: taxInclusive,
      };

      const savedConfig = await taxConfigAPI.upsertTaxConfig(config);

      toast.success(t('billing.taxConfigSaved'));
      onConfigSaved(savedConfig);
      onClose();
    } catch (error) {
      console.error('Failed to save tax config:', error);
      toast.error(t('billing.taxConfigSaveFailed'));
    } finally {
      setIsSaving(false);
    }
  };

  const getPresetDetails = (preset: TaxPreset) => {
    const totalRate = preset.taxComponents.reduce((sum, comp) => sum + comp.rate, 0);
    return {
      totalRate,
      components: preset.taxComponents.map(c => `${c.name} ${c.rate}%`).join(' + ')
    };
  };

  const getTaxNumberLabel = () => {
    switch (country) {
      case 'IN':
        return 'GSTIN (GST Number)';
      case 'AE':
        return 'TRN (Tax Registration Number)';
      case 'US':
        return 'EIN (Employer Identification Number)';
      case 'GB':
        return 'VAT Registration Number';
      default:
        return 'Tax Registration Number';
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg w-full max-w-2xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2">
            <CurrencyRupeeIcon className="h-5 w-5 text-orange-500" />
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              {t('billing.taxConfiguration')}
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
          {/* Info Banner */}
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <InformationCircleIcon className="h-5 w-5 text-blue-500 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-blue-800 dark:text-blue-200">
                <p className="font-medium mb-1">{t('billing.taxConfigInfo')}</p>
                <p className="text-blue-600 dark:text-blue-300">
                  {t('billing.taxConfigInfoDescription')}
                </p>
              </div>
            </div>
          </div>

          {/* Country Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {t('billing.country')}
            </label>
            <div className="grid grid-cols-2 gap-3">
              {COUNTRIES.map(c => (
                <button
                  key={c.code}
                  onClick={() => setCountry(c.code)}
                  className={`flex items-center gap-2 p-3 rounded-lg border-2 transition-colors ${
                    country === c.code
                      ? 'border-orange-500 bg-orange-50 dark:bg-orange-900/20'
                      : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                  }`}
                >
                  <span className="text-2xl">{c.flag}</span>
                  <span className="font-medium text-gray-900 dark:text-white">{c.name}</span>
                  {country === c.code && (
                    <CheckCircleIcon className="h-5 w-5 text-orange-500 ml-auto" />
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Tax Enabled Toggle */}
          <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
            <div>
              <label className="font-medium text-gray-900 dark:text-white">
                {t('billing.enableTax')}
              </label>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-0.5">
                {t('billing.enableTaxDescription')}
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
              {/* Tax Presets */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                  {t('billing.taxPreset')}
                </label>
                <div className="space-y-2">
                  {availablePresets.map(preset => {
                    const details = getPresetDetails(preset);
                    return (
                      <button
                        key={preset.id}
                        onClick={() => setSelectedPreset(preset.id)}
                        className={`w-full text-left p-4 rounded-lg border-2 transition-colors ${
                          selectedPreset === preset.id
                            ? 'border-orange-500 bg-orange-50 dark:bg-orange-900/20'
                            : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                        }`}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-gray-900 dark:text-white">
                                {preset.name}
                              </span>
                              <span className="text-sm px-2 py-0.5 bg-orange-100 dark:bg-orange-900/40 text-orange-700 dark:text-orange-300 rounded">
                                {details.totalRate}%
                              </span>
                            </div>
                            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                              {preset.description}
                            </p>
                            <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                              {details.components}
                            </p>
                          </div>
                          {selectedPreset === preset.id && (
                            <CheckCircleIcon className="h-5 w-5 text-orange-500 flex-shrink-0 ml-2" />
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Tax Number */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {getTaxNumberLabel()} <span className="text-gray-500">(Optional)</span>
                </label>
                <Input
                  value={taxNumber}
                  onChange={(e) => setTaxNumber(e.target.value.toUpperCase())}
                  placeholder={country === 'IN' ? '22AAAAA0000A1Z5' : 'Enter your tax registration number'}
                  className="font-mono"
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  {t('billing.taxNumberHint')}
                </p>
              </div>

              {/* Tax Inclusive/Exclusive */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                  {t('billing.pricingMode')}
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => setTaxInclusive(false)}
                    className={`p-4 rounded-lg border-2 transition-colors ${
                      !taxInclusive
                        ? 'border-orange-500 bg-orange-50 dark:bg-orange-900/20'
                        : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                    }`}
                  >
                    <div className="font-medium text-gray-900 dark:text-white mb-1">
                      {t('billing.taxExclusive')}
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      {t('billing.taxExclusiveDescription')}
                    </div>
                  </button>
                  <button
                    onClick={() => setTaxInclusive(true)}
                    className={`p-4 rounded-lg border-2 transition-colors ${
                      taxInclusive
                        ? 'border-orange-500 bg-orange-50 dark:bg-orange-900/20'
                        : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                    }`}
                  >
                    <div className="font-medium text-gray-900 dark:text-white mb-1">
                      {t('billing.taxInclusive')}
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      {t('billing.taxInclusiveDescription')}
                    </div>
                  </button>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-200 dark:border-gray-700">
          <div className="flex gap-3">
            <Button
              variant="secondary"
              onClick={onClose}
              className="flex-1"
              disabled={isSaving}
            >
              {t('common.cancel')}
            </Button>
            <Button
              onClick={handleSave}
              className="flex-1 bg-orange-500 hover:bg-orange-600"
              disabled={isSaving}
            >
              {isSaving ? t('common.saving') : t('common.save')}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
