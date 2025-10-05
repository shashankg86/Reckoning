import React, { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { CalendarIcon, ChevronDownIcon } from '@heroicons/react/24/outline';
import { Button } from './Button';
import { Input } from './Input';

export interface DateRange {
  startDate: string;
  endDate: string;
  preset?: string;
}

interface DateRangePickerProps {
  value: DateRange;
  onChange: (range: DateRange) => void;
  className?: string;
}

export function DateRangePicker({ value, onChange, className }: DateRangePickerProps) {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);

  const presets = [
    { key: 'today', label: t('reports.dateRanges.today') },
    { key: 'yesterday', label: t('reports.dateRanges.yesterday') },
    { key: 'thisWeek', label: t('reports.dateRanges.thisWeek') },
    { key: 'lastWeek', label: t('reports.dateRanges.lastWeek') },
    { key: 'thisMonth', label: t('reports.dateRanges.thisMonth') },
    { key: 'lastMonth', label: t('reports.dateRanges.lastMonth') },
    { key: 'custom', label: t('reports.dateRanges.customRange') },
  ];

  const getDateRange = (preset: string): DateRange => {
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - today.getDay());

    const startOfLastWeek = new Date(startOfWeek);
    startOfLastWeek.setDate(startOfLastWeek.getDate() - 7);
    const endOfLastWeek = new Date(startOfWeek);
    endOfLastWeek.setDate(endOfLastWeek.getDate() - 1);

    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const startOfLastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
    const endOfLastMonth = new Date(today.getFullYear(), today.getMonth(), 0);

    const formatDate = (date: Date) => date.toISOString().split('T')[0];

    switch (preset) {
      case 'today':
        return { startDate: formatDate(today), endDate: formatDate(today), preset };
      case 'yesterday':
        return { startDate: formatDate(yesterday), endDate: formatDate(yesterday), preset };
      case 'thisWeek':
        return { startDate: formatDate(startOfWeek), endDate: formatDate(today), preset };
      case 'lastWeek':
        return { startDate: formatDate(startOfLastWeek), endDate: formatDate(endOfLastWeek), preset };
      case 'thisMonth':
        return { startDate: formatDate(startOfMonth), endDate: formatDate(today), preset };
      case 'lastMonth':
        return { startDate: formatDate(startOfLastMonth), endDate: formatDate(endOfLastMonth), preset };
      default:
        return value;
    }
  };

  const handlePresetSelect = (preset: string) => {
    if (preset === 'custom') {
      onChange({ ...value, preset });
    } else {
      onChange(getDateRange(preset));
      setIsOpen(false);
    }
  };

  const getDisplayText = (): string => {
    if (value.preset && value.preset !== 'custom') {
      const preset = presets.find(p => p.key === value.preset);
      return preset?.label || '';
    }
    return `${value.startDate} - ${value.endDate}`;
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className={`relative ${className}`} ref={popoverRef}>
      <Button
        variant="secondary"
        onClick={() => setIsOpen(!isOpen)}
        className="justify-between min-w-[200px]"
      >
        <div className="flex items-center">
          <CalendarIcon className="w-4 h-4 mr-2" />
          <span className="truncate">{getDisplayText()}</span>
        </div>
        <ChevronDownIcon className="w-4 h-4 ml-2" />
      </Button>

      {isOpen && (
        <div className="absolute top-full left-0 mt-2 w-80 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-50">
          <div className="p-4">
            <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-3">
              {t('reports.selectDateRange')}
            </h3>
            
            {/* Preset Options */}
            <div className="space-y-1 mb-4">
              {presets.map((preset) => (
                <button
                  key={preset.key}
                  onClick={() => handlePresetSelect(preset.key)}
                  className={`w-full text-left px-3 py-2 text-sm rounded-md transition-colors ${
                    value.preset === preset.key
                      ? 'bg-orange-100 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400'
                      : 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300'
                  }`}
                >
                  {preset.label}
                </button>
              ))}
            </div>

            {/* Custom Date Inputs */}
            {value.preset === 'custom' && (
              <div className="space-y-3 pt-3 border-t border-gray-200 dark:border-gray-700">
                <Input
                  label={t('reports.startDate')}
                  type="date"
                  value={value.startDate}
                  onChange={(e) => onChange({ ...value, startDate: e.target.value })}
                />
                <Input
                  label={t('reports.endDate')}
                  type="date"
                  value={value.endDate}
                  onChange={(e) => onChange({ ...value, endDate: e.target.value })}
                />
                <div className="flex gap-2 pt-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => setIsOpen(false)}
                    className="flex-1"
                  >
                    {t('common.cancel')}
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => setIsOpen(false)}
                    className="flex-1"
                  >
                    {t('common.apply')}
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}