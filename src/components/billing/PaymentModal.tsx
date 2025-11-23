import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  XMarkIcon,
  BanknotesIcon,
  QrCodeIcon,
  CreditCardIcon
} from '@heroicons/react/24/outline';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { useCurrency } from '../../hooks/useCurrency';

interface PaymentModalProps {
  total: number;
  onClose: () => void;
  onPayment: (method: string, amountPaid?: number) => void;
}

type PaymentMethod = 'cash' | 'upi' | 'card' | 'razorpay';

export function PaymentModal({ total, onClose, onPayment }: PaymentModalProps) {
  const { t } = useTranslation();
  const { formatCurrency } = useCurrency();
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod | null>(null);
  const [amountPaid, setAmountPaid] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState(false);

  const change = amountPaid ? Math.max(0, Number(amountPaid) - total) : 0;
  const isValid = selectedMethod === 'cash' ? Number(amountPaid) >= total : true;

  // Auto-fill amount for cash
  useEffect(() => {
    if (selectedMethod === 'cash' && !amountPaid) {
      setAmountPaid(total.toString());
    }
  }, [selectedMethod, total, amountPaid]);

  const handlePayment = async () => {
    if (!selectedMethod || (selectedMethod === 'cash' && !isValid)) return;

    setIsProcessing(true);
    try {
      await onPayment(selectedMethod, selectedMethod === 'cash' ? Number(amountPaid) : undefined);
    } finally {
      setIsProcessing(false);
    }
  };

  // Quick cash amounts
  const quickAmounts = [
    total,
    Math.ceil(total / 100) * 100, // Round up to nearest 100
    Math.ceil(total / 500) * 500, // Round up to nearest 500
    Math.ceil(total / 1000) * 1000  // Round up to nearest 1000
  ].filter((v, i, a) => a.indexOf(v) === i); // Remove duplicates

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
      if (e.key === 'Enter' && isValid && selectedMethod) {
        handlePayment();
      }
      // Number keys for quick selection
      if (e.key === '1') setSelectedMethod('cash');
      if (e.key === '2') setSelectedMethod('upi');
      if (e.key === '3') setSelectedMethod('card');
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [isValid, selectedMethod]);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg w-full max-w-md">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            {t('billing.selectPaymentMethod')}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
          >
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4">
          {/* Total Amount */}
          <div className="p-4 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
              {t('billing.totalAmount')}
            </p>
            <p className="text-3xl font-bold text-orange-500">
              {formatCurrency(total)}
            </p>
          </div>

          {/* Payment Methods */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
              {t('billing.paymentMethod')}
            </label>

            {/* Cash */}
            <button
              onClick={() => setSelectedMethod('cash')}
              className={`w-full flex items-center gap-3 p-4 rounded-lg border-2 transition-all ${selectedMethod === 'cash'
                  ? 'border-orange-500 bg-orange-50 dark:bg-orange-900/20'
                  : 'border-gray-200 dark:border-gray-700 hover:border-orange-300'
                }`}
            >
              <div className={`flex items-center justify-center w-10 h-10 rounded-full ${selectedMethod === 'cash'
                  ? 'bg-orange-500 text-white'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
                }`}>
                <BanknotesIcon className="h-5 w-5" />
              </div>
              <div className="flex-1 text-left">
                <p className="font-medium text-gray-900 dark:text-white">
                  {t('billing.cash')}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {t('billing.cashPayment')}
                </p>
              </div>
              <kbd className="text-xs bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">1</kbd>
            </button>

            {/* UPI */}
            <button
              onClick={() => setSelectedMethod('upi')}
              className={`w-full flex items-center gap-3 p-4 rounded-lg border-2 transition-all ${selectedMethod === 'upi'
                  ? 'border-orange-500 bg-orange-50 dark:bg-orange-900/20'
                  : 'border-gray-200 dark:border-gray-700 hover:border-orange-300'
                }`}
            >
              <div className={`flex items-center justify-center w-10 h-10 rounded-full ${selectedMethod === 'upi'
                  ? 'bg-orange-500 text-white'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
                }`}>
                <QrCodeIcon className="h-5 w-5" />
              </div>
              <div className="flex-1 text-left">
                <p className="font-medium text-gray-900 dark:text-white">
                  {t('billing.upi')}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {t('billing.upiPayment')}
                </p>
              </div>
              <kbd className="text-xs bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">2</kbd>
            </button>

            {/* Card/Razorpay */}
            <button
              onClick={() => setSelectedMethod('card')}
              className={`w-full flex items-center gap-3 p-4 rounded-lg border-2 transition-all ${selectedMethod === 'card'
                  ? 'border-orange-500 bg-orange-50 dark:bg-orange-900/20'
                  : 'border-gray-200 dark:border-gray-700 hover:border-orange-300'
                }`}
            >
              <div className={`flex items-center justify-center w-10 h-10 rounded-full ${selectedMethod === 'card'
                  ? 'bg-orange-500 text-white'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
                }`}>
                <CreditCardIcon className="h-5 w-5" />
              </div>
              <div className="flex-1 text-left">
                <p className="font-medium text-gray-900 dark:text-white">
                  {t('billing.card')}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {t('billing.cardPayment')}
                </p>
              </div>
              <kbd className="text-xs bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">3</kbd>
            </button>
          </div>

          {/* Cash Amount Input */}
          {selectedMethod === 'cash' && (
            <div className="space-y-3 p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
                  {t('billing.amountReceived')}
                </label>
                <Input
                  type="number"
                  value={amountPaid}
                  onChange={(e) => setAmountPaid(e.target.value)}
                  placeholder={total.toString()}
                  className="text-lg font-medium"
                  autoFocus
                />
              </div>

              {/* Quick Amount Buttons */}
              <div className="grid grid-cols-4 gap-2">
                {quickAmounts.map(amount => (
                  <Button
                    key={amount}
                    size="sm"
                    variant="secondary"
                    onClick={() => setAmountPaid(amount.toString())}
                    className="text-xs"
                  >
                    {formatCurrency(amount)}
                  </Button>
                ))}
              </div>

              {/* Change */}
              {change > 0 && (
                <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {t('billing.change')}
                  </p>
                  <p className="text-xl font-bold text-green-600 dark:text-green-400">
                    {formatCurrency(change)}
                  </p>
                </div>
              )}

              {/* Insufficient Amount Warning */}
              {amountPaid && Number(amountPaid) < total && (
                <div className="p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
                  <p className="text-sm font-medium text-red-600 dark:text-red-400">
                    {t('billing.insufficientAmount')}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex gap-3 p-4 border-t border-gray-200 dark:border-gray-700">
          <Button
            variant="secondary"
            onClick={onClose}
            className="flex-1"
            disabled={isProcessing}
          >
            {t('common.cancel')}
          </Button>
          <Button
            onClick={handlePayment}
            disabled={!isValid || !selectedMethod || isProcessing}
            className="flex-1 bg-orange-500 hover:bg-orange-600"
          >
            {isProcessing ? t('billing.processing') : t('billing.completePayment')}
          </Button>
        </div>

        {/* Keyboard Hint */}
        <div className="px-4 pb-4 text-xs text-center text-gray-500 dark:text-gray-400">
          {t('billing.pressEnterToConfirm')}
        </div>
      </div>
    </div>
  );
}
