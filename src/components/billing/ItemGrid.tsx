import React from 'react';
import { useTranslation } from 'react-i18next';
import { PlusIcon, CubeIcon } from '@heroicons/react/24/outline';
import { Button } from '../ui/Button';
import type { Item, CartItem } from '../../contexts/POSContext';

interface ItemGridProps {
  items: Item[];
  viewMode: 'grid' | 'list';
  onAddToCart: (item: Item) => void;
  cart: CartItem[];
}

export function ItemGrid({ items, viewMode, onAddToCart, cart }: ItemGridProps) {
  const { t } = useTranslation();

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-gray-500 dark:text-gray-400">
        <CubeIcon className="h-16 w-16 mb-4" />
        <p className="text-lg font-medium">{t('billing.noItemsFound')}</p>
        <p className="text-sm">{t('billing.tryDifferentSearch')}</p>
      </div>
    );
  }

  if (viewMode === 'grid') {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-3 xl:grid-cols-4 gap-3">
        {items.map(item => {
          const cartItem = cart.find(ci => ci.id === item.id);
          const isOutOfStock = item.stock !== undefined && item.stock <= 0;
          const isLowStock = item.stock !== undefined && item.stock > 0 && item.stock <= 5;

          return (
            <button
              key={item.id}
              onClick={() => !isOutOfStock && onAddToCart(item)}
              disabled={isOutOfStock}
              className={`group relative p-3 rounded-lg border transition-all ${
                isOutOfStock
                  ? 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 opacity-60 cursor-not-allowed'
                  : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:border-orange-500 hover:shadow-md active:scale-95'
              }`}
            >
              {/* Image or Placeholder */}
              <div className="aspect-square mb-2 rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-700">
                {item.image ? (
                  <img
                    src={item.image}
                    alt={item.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <CubeIcon className="h-12 w-12 text-gray-400" />
                  </div>
                )}
              </div>

              {/* Item Info */}
              <div className="text-left">
                <h3 className="font-medium text-sm text-gray-900 dark:text-white truncate">
                  {item.name}
                </h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                  {item.category}
                </p>
                <div className="flex items-center justify-between mt-2">
                  <span className="text-lg font-bold text-orange-500">
                    ₹{item.price.toLocaleString('en-IN')}
                  </span>
                  {!isOutOfStock && (
                    <div className="flex items-center justify-center w-6 h-6 rounded-full bg-orange-500 text-white group-hover:scale-110 transition-transform">
                      <PlusIcon className="h-4 w-4" />
                    </div>
                  )}
                </div>
              </div>

              {/* Stock Badge */}
              {isOutOfStock && (
                <div className="absolute top-2 right-2 bg-red-500 text-white text-xs px-2 py-1 rounded-full font-medium">
                  {t('billing.outOfStock')}
                </div>
              )}
              {isLowStock && !isOutOfStock && (
                <div className="absolute top-2 right-2 bg-yellow-500 text-white text-xs px-2 py-1 rounded-full font-medium">
                  {item.stock} {t('common.left')}
                </div>
              )}

              {/* Cart Quantity Badge */}
              {cartItem && cartItem.quantity > 0 && (
                <div className="absolute top-2 left-2 bg-orange-500 text-white text-xs w-6 h-6 rounded-full font-bold flex items-center justify-center">
                  {cartItem.quantity}
                </div>
              )}
            </button>
          );
        })}
      </div>
    );
  }

  // List view
  return (
    <div className="space-y-2">
      {items.map(item => {
        const cartItem = cart.find(ci => ci.id === item.id);
        const isOutOfStock = item.stock !== undefined && item.stock <= 0;
        const isLowStock = item.stock !== undefined && item.stock > 0 && item.stock <= 5;

        return (
          <button
            key={item.id}
            onClick={() => !isOutOfStock && onAddToCart(item)}
            disabled={isOutOfStock}
            className={`w-full flex items-center gap-3 p-3 rounded-lg border transition-all ${
              isOutOfStock
                ? 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 opacity-60 cursor-not-allowed'
                : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:border-orange-500 hover:shadow-md active:scale-[0.99]'
            }`}
          >
            {/* Image */}
            <div className="w-16 h-16 flex-shrink-0 rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-700">
              {item.image ? (
                <img
                  src={item.image}
                  alt={item.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <CubeIcon className="h-8 w-8 text-gray-400" />
                </div>
              )}
            </div>

            {/* Item Details */}
            <div className="flex-1 text-left min-w-0">
              <h3 className="font-medium text-gray-900 dark:text-white truncate">
                {item.name}
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
                {item.category}
                {item.sku && ` • ${item.sku}`}
              </p>
              <div className="flex items-center gap-2 mt-1">
                {isOutOfStock && (
                  <span className="text-xs bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 px-2 py-0.5 rounded-full font-medium">
                    {t('billing.outOfStock')}
                  </span>
                )}
                {isLowStock && !isOutOfStock && (
                  <span className="text-xs bg-yellow-100 dark:bg-yellow-900/30 text-yellow-600 dark:text-yellow-400 px-2 py-0.5 rounded-full font-medium">
                    {item.stock} {t('common.left')}
                  </span>
                )}
                {cartItem && cartItem.quantity > 0 && (
                  <span className="text-xs bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 px-2 py-0.5 rounded-full font-medium">
                    {cartItem.quantity} {t('billing.inCart')}
                  </span>
                )}
              </div>
            </div>

            {/* Price and Add Button */}
            <div className="flex items-center gap-3">
              <span className="text-xl font-bold text-orange-500">
                ₹{item.price.toLocaleString('en-IN')}
              </span>
              {!isOutOfStock && (
                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-orange-500 text-white">
                  <PlusIcon className="h-5 w-5" />
                </div>
              )}
            </div>
          </button>
        );
      })}
    </div>
  );
}
