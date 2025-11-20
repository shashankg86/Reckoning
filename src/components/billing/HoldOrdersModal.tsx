import React from 'react';
import { useTranslation } from 'react-i18next';
import {
  XMarkIcon,
  ClockIcon,
  TrashIcon,
  UserIcon,
  ShoppingBagIcon
} from '@heroicons/react/24/outline';
import { Button } from '../ui/Button';
import type { CartItem } from '../../contexts/POSContext';

interface HeldOrder {
  id: string;
  items: CartItem[];
  customer?: {
    name: string;
    phone: string;
  };
  timestamp: Date;
}

interface HoldOrdersModalProps {
  heldOrders: HeldOrder[];
  onClose: () => void;
  onRecall: (order: HeldOrder) => void;
  onDelete: (orderId: string) => void;
}

export function HoldOrdersModal({ heldOrders, onClose, onRecall, onDelete }: HoldOrdersModalProps) {
  const { t } = useTranslation();

  const formatTime = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);

    if (minutes < 1) return t('billing.justNow');
    if (minutes < 60) return t('billing.minutesAgo', { count: minutes });

    const hours = Math.floor(minutes / 60);
    if (hours < 24) return t('billing.hoursAgo', { count: hours });

    return date.toLocaleString();
  };

  const getTotalAmount = (items: CartItem[]) => {
    return items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  };

  const getTotalItems = (items: CartItem[]) => {
    return items.reduce((sum, item) => sum + item.quantity, 0);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg w-full max-w-2xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2">
            <ClockIcon className="h-5 w-5 text-orange-500" />
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              {t('billing.heldOrders')}
            </h2>
            <span className="text-sm text-gray-500 dark:text-gray-400">
              ({heldOrders.length})
            </span>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
          >
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {heldOrders.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-500 dark:text-gray-400 py-12">
              <ClockIcon className="h-16 w-16 mb-4" />
              <p className="text-lg font-medium">{t('billing.noHeldOrders')}</p>
              <p className="text-sm text-center mt-2">{t('billing.heldOrdersHint')}</p>
            </div>
          ) : (
            <div className="space-y-3">
              {heldOrders.map((order) => (
                <div
                  key={order.id}
                  className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:border-orange-300 dark:hover:border-orange-700 transition-colors"
                >
                  {/* Order Header */}
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <ClockIcon className="h-4 w-4 text-gray-400" />
                        <span className="text-sm text-gray-500 dark:text-gray-400">
                          {formatTime(order.timestamp)}
                        </span>
                      </div>

                      {order.customer && (
                        <div className="flex items-center gap-2">
                          <UserIcon className="h-4 w-4 text-gray-400" />
                          <div className="text-sm">
                            <span className="font-medium text-gray-900 dark:text-white">
                              {order.customer.name}
                            </span>
                            {order.customer.phone && (
                              <span className="text-gray-500 dark:text-gray-400 ml-2">
                                {order.customer.phone}
                              </span>
                            )}
                          </div>
                        </div>
                      )}
                    </div>

                    <button
                      onClick={() => {
                        if (window.confirm(t('billing.confirmDeleteHeldOrder'))) {
                          onDelete(order.id);
                        }
                      }}
                      className="p-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                    >
                      <TrashIcon className="h-4 w-4" />
                    </button>
                  </div>

                  {/* Order Items Summary */}
                  <div className="space-y-2 mb-3">
                    {order.items.slice(0, 3).map((item) => (
                      <div
                        key={item.id}
                        className="flex items-center justify-between text-sm"
                      >
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          <span className="w-6 h-6 flex items-center justify-center bg-gray-100 dark:bg-gray-700 rounded text-xs font-medium text-gray-600 dark:text-gray-300">
                            {item.quantity}×
                          </span>
                          <span className="text-gray-900 dark:text-white truncate">
                            {item.name}
                          </span>
                        </div>
                        <span className="text-gray-600 dark:text-gray-400 ml-2">
                          ₹{(item.price * item.quantity).toLocaleString('en-IN')}
                        </span>
                      </div>
                    ))}

                    {order.items.length > 3 && (
                      <div className="text-xs text-gray-500 dark:text-gray-400 pl-8">
                        +{order.items.length - 3} {t('billing.moreItems')}
                      </div>
                    )}
                  </div>

                  {/* Order Footer */}
                  <div className="flex items-center justify-between pt-3 border-t border-gray-200 dark:border-gray-700">
                    <div className="flex items-center gap-4 text-sm">
                      <div className="flex items-center gap-1 text-gray-500 dark:text-gray-400">
                        <ShoppingBagIcon className="h-4 w-4" />
                        <span>{getTotalItems(order.items)} {t('billing.items')}</span>
                      </div>
                      <div className="text-lg font-bold text-orange-500">
                        ₹{getTotalAmount(order.items).toLocaleString('en-IN')}
                      </div>
                    </div>

                    <Button
                      size="sm"
                      onClick={() => onRecall(order)}
                      className="bg-orange-500 hover:bg-orange-600"
                    >
                      {t('billing.recall')}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-200 dark:border-gray-700">
          <Button
            variant="secondary"
            onClick={onClose}
            className="w-full"
          >
            {t('common.close')}
          </Button>
        </div>

        {/* Keyboard Hint */}
        <div className="px-4 pb-4 text-xs text-center text-gray-500 dark:text-gray-400">
          {t('billing.pressEscToClose')}
        </div>
      </div>
    </div>
  );
}
