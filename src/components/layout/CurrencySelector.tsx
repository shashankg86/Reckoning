import React from 'react';
import { useTranslation } from 'react-i18next';
import { CurrencyRupeeIcon, ChevronDownIcon } from '@heroicons/react/24/outline';
import { Button } from '../ui/Button';
import { useAuth } from '../../contexts/AuthContext';
import type { Currency } from '../../contexts/POSContext';

const currencies = [
  { code: 'INR' as Currency, symbol: '₹' },
  { code: 'AED' as Currency, symbol: 'د.إ' },
  { code: 'USD' as Currency, symbol: '$' },
  { code: 'EUR' as Currency, symbol: '€' },
  { code: 'GBP' as Currency, symbol: '£' },
];

export function CurrencySelector() {
  const { t } = useTranslation();
  const { state, updateStoreSettings } = useAuth();
  const [isOpen, setIsOpen] = React.useState(false);

  const currentCurrency = currencies.find(curr => curr.code === state.user?.store?.currency) || currencies[0];

  const handleCurrencyChange = async (currencyCode: Currency) => {
    if (!state.user?.store) return;
    
    await updateStoreSettings({ currency: currencyCode });
    setIsOpen(false);
  };

  return (
    <div className="relative">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-2 px-3 py-2"
        aria-label="Select currency"
      >
        <CurrencyRupeeIcon className="h-4 w-4" />
        <span className="text-sm font-medium">{currentCurrency.symbol}</span>
        <ChevronDownIcon className="h-3 w-3" />
      </Button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
            aria-hidden="true"
          />
          <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-md shadow-lg py-1 z-20 border border-gray-200 dark:border-gray-700">
            {currencies.map((currency) => {
              const isActive = state.user?.store?.currency === currency.code;
              const currencyName = t(`currencies.${currency.code}`);
              
              return (
                <button
                  key={currency.code}
                  onClick={() => handleCurrencyChange(currency.code)}
                  className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center justify-between ${
                    isActive
                      ? 'bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400'
                      : 'text-gray-700 dark:text-gray-300'
                  }`}
                  aria-current={isActive ? 'true' : 'false'}
                >
                  <div>
                    <div className="font-medium flex items-center">
                      <span className="mr-2">{currency.symbol}</span>
                      {currencyName}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">{currency.code}</div>
                  </div>
                  {isActive && (
                    <div className="w-2 h-2 bg-orange-500 rounded-full" aria-label="Selected" />
                  )}
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
