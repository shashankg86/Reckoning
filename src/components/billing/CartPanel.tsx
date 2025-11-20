import React from 'react';
import { useTranslation } from 'react-i18next';
import {
  MinusIcon,
  PlusIcon,
  TrashIcon,
  UserIcon,
  ClockIcon,
  ShoppingCartIcon
} from '@heroicons/react/24/outline';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { Input } from '../ui/Input';
import type { CartItem } from '../../contexts/POSContext';

interface CustomerInfo {
  name: string;
  phone: string;
}

interface CartPanelProps {
  cart: CartItem[];
  calculations: {
    subtotal: number;
    tax: number;
    taxRate: number;
    discountAmount: number;
    total: number;
  };
  customer: CustomerInfo;
  showCustomerForm: boolean;
  discount: number;
  discountType: 'flat' | 'percentage';
  taxRate: number;
  onUpdateQuantity: (itemId: string, quantity: number) => void;
  onRemoveFromCart: (itemId: string) => void;
  onClearCart: () => void;
  onCustomerChange: (customer: CustomerInfo) => void;
  onToggleCustomerForm: () => void;
  onDiscountChange: (discount: number) => void;
  onDiscountTypeChange: (type: 'flat' | 'percentage') => void;
  onTaxRateChange: (rate: number | null) => void;
  onHoldOrder: () => void;
  onShowHeldOrders: () => void;
  onPayment: () => void;
  heldOrdersCount: number;
}

export function CartPanel({
  cart,
  calculations,
  customer,
  showCustomerForm,
  discount,
  discountType,
  taxRate,
  onUpdateQuantity,
  onRemoveFromCart,
  onClearCart,
  onCustomerChange,
  onToggleCustomerForm,
  onDiscountChange,
  onDiscountTypeChange,
  onTaxRateChange,
  onHoldOrder,
  onShowHeldOrders,
  onPayment,
  heldOrdersCount
}: CartPanelProps) {
  const { t } = useTranslation();

  return (
    <Card className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            {t('billing.currentOrder')}
          </h2>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="ghost"
              onClick={onShowHeldOrders}
              className="relative"
            >
              <ClockIcon className="h-4 w-4" />
              {heldOrdersCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-orange-500 text-white text-xs w-4 h-4 rounded-full flex items-center justify-center">
                  {heldOrdersCount}
                </span>
              )}
            </Button>
            {cart.length > 0 && (
              <Button
                size="sm"
                variant="ghost"
                onClick={onClearCart}
                className="text-red-600 hover:text-red-700"
              >
                <TrashIcon className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>

        {/* Customer Info */}
        {!showCustomerForm ? (
          <Button
            size="sm"
            variant="secondary"
            onClick={onToggleCustomerForm}
            className="w-full justify-start"
          >
            <UserIcon className="h-4 w-4 mr-2" />
            {t('billing.addCustomer')}
          </Button>
        ) : (
          <div className="space-y-2 p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                {t('billing.customerInfo')}
              </span>
              <button
                onClick={onToggleCustomerForm}
                className="text-xs text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              >
                {t('common.remove')}
              </button>
            </div>
            <Input
              placeholder={t('billing.customerName')}
              value={customer.name}
              onChange={(e) => onCustomerChange({ ...customer, name: e.target.value })}
              className="text-sm"
            />
            <Input
              placeholder={t('billing.customerPhone')}
              value={customer.phone}
              onChange={(e) => onCustomerChange({ ...customer, phone: e.target.value })}
              className="text-sm"
            />
          </div>
        )}
      </div>

      {/* Cart Items */}
      <div className="flex-1 overflow-y-auto p-4">
        {cart.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-500 dark:text-gray-400">
            <ShoppingCartIcon className="h-16 w-16 mb-4" />
            <p className="text-center">{t('billing.cartEmpty')}</p>
            <p className="text-sm text-center mt-2">{t('billing.addItemsToStart')}</p>
          </div>
        ) : (
          <div className="space-y-3">
            {cart.map(item => (
              <div
                key={item.id}
                className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg"
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-gray-900 dark:text-white truncate">
                      {item.name}
                    </h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      ₹{item.price.toLocaleString('en-IN')} × {item.quantity}
                    </p>
                  </div>
                  <button
                    onClick={() => onRemoveFromCart(item.id)}
                    className="p-1 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded"
                  >
                    <TrashIcon className="h-4 w-4" />
                  </button>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 bg-white dark:bg-gray-600 rounded-lg p-1">
                    <button
                      onClick={() => onUpdateQuantity(item.id, item.quantity - 1)}
                      className="p-1 hover:bg-gray-100 dark:hover:bg-gray-500 rounded transition-colors"
                    >
                      <MinusIcon className="h-4 w-4 text-gray-700 dark:text-gray-300" />
                    </button>
                    <span className="w-8 text-center text-sm font-medium text-gray-900 dark:text-white">
                      {item.quantity}
                    </span>
                    <button
                      onClick={() => onUpdateQuantity(item.id, item.quantity + 1)}
                      className="p-1 hover:bg-gray-100 dark:hover:bg-gray-500 rounded transition-colors"
                    >
                      <PlusIcon className="h-4 w-4 text-gray-700 dark:text-gray-300" />
                    </button>
                  </div>

                  <span className="text-lg font-bold text-gray-900 dark:text-white">
                    ₹{(item.price * item.quantity).toLocaleString('en-IN')}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Pricing Section */}
      {cart.length > 0 && (
        <div className="border-t border-gray-200 dark:border-gray-700 p-4 space-y-4">
          {/* Discount */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
              {t('billing.discount')}
            </label>
            <div className="flex gap-2">
              <Input
                type="number"
                value={discount || ''}
                onChange={(e) => onDiscountChange(Number(e.target.value) || 0)}
                placeholder="0"
                className="flex-1"
              />
              <select
                value={discountType}
                onChange={(e) => onDiscountTypeChange(e.target.value as 'flat' | 'percentage')}
                className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              >
                <option value="flat">₹</option>
                <option value="percentage">%</option>
              </select>
            </div>
          </div>

          {/* Totals */}
          <div className="space-y-2 pt-2 border-t border-gray-200 dark:border-gray-600">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600 dark:text-gray-400">
                {t('billing.subtotal')}
              </span>
              <span className="font-medium text-gray-900 dark:text-white">
                ₹{calculations.subtotal.toLocaleString('en-IN')}
              </span>
            </div>

            <div className="flex justify-between text-sm">
              <span className="text-gray-600 dark:text-gray-400">
                {t('billing.tax')} ({taxRate}%)
              </span>
              <span className="font-medium text-gray-900 dark:text-white">
                ₹{calculations.tax.toLocaleString('en-IN')}
              </span>
            </div>

            {calculations.discountAmount > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-gray-600 dark:text-gray-400">
                  {t('billing.discount')}
                </span>
                <span className="font-medium text-green-600 dark:text-green-400">
                  -₹{calculations.discountAmount.toLocaleString('en-IN')}
                </span>
              </div>
            )}

            <div className="flex justify-between text-lg font-bold pt-2 border-t border-gray-200 dark:border-gray-600">
              <span className="text-gray-900 dark:text-white">
                {t('billing.total')}
              </span>
              <span className="text-orange-500 dark:text-orange-400">
                ₹{calculations.total.toLocaleString('en-IN')}
              </span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="grid grid-cols-2 gap-2 pt-2">
            <Button
              variant="secondary"
              onClick={onHoldOrder}
              className="w-full"
            >
              <ClockIcon className="h-4 w-4 mr-2" />
              {t('billing.hold')}
            </Button>
            <Button
              onClick={onPayment}
              className="w-full bg-orange-500 hover:bg-orange-600"
            >
              {t('billing.payment')}
            </Button>
          </div>

          {/* Keyboard Shortcuts Hint */}
          <div className="text-xs text-gray-500 dark:text-gray-400 text-center space-y-1 pt-2">
            <p>F9: {t('billing.payment')} • Ctrl+H: {t('billing.hold')}</p>
            <p>Ctrl+K: {t('billing.search')} • Ctrl+R: {t('billing.recall')}</p>
          </div>
        </div>
      )}
    </Card>
  );
}
