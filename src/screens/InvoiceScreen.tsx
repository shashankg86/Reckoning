import {
  MagnifyingGlassIcon,
  MinusIcon,
  PlusIcon,
  PrinterIcon,
  QrCodeIcon,
  ShareIcon,
  TrashIcon
} from '@heroicons/react/24/outline';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Layout } from '../components/layout/Layout';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { usePOS } from '../contexts/POSContext';
import type { Invoice, PaymentMethod } from '../contexts/POSContext';

export function InvoiceScreen() {
  const { t } = useTranslation();
  const { state, dispatch } = usePOS();
  const [searchTerm, setSearchTerm] = useState('');
  const [discount, setDiscount] = useState(0);

  const filteredItems = state.items.filter((item) =>
    item.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const subtotal = state.cart.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  );
  const tax = subtotal * 0.18; // 18% GST
  const total = subtotal + tax - discount;

  const addToCart = (item: any) => {
    dispatch({ type: 'ADD_TO_CART', payload: item });
  };

  const updateQuantity = (itemId: string, quantity: number) => {
    if (quantity <= 0) {
      dispatch({ type: 'REMOVE_FROM_CART', payload: itemId });
    } else {
      dispatch({
        type: 'UPDATE_CART_QUANTITY',
        payload: { id: itemId, quantity },
      });
    }
  };

  const generateInvoice = (paymentMethod: PaymentMethod) => {
    const invoice: Invoice = {
      id: Date.now().toString(),
      items: state.cart,
      subtotal,
      discount,
      tax,
      total,
      paymentMethod,
      date: new Date(),
      status: 'paid'
    };
    dispatch({ type: 'ADD_INVOICE', payload: invoice });
    dispatch({ type: 'CLEAR_CART' });
    // Show success message or redirect
  };

  return (
    <Layout title={t('invoice.title')}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Item Selection */}
          <div className="space-y-6">
            <Card className="p-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                {t('invoice.addItems')}
              </h2>

              <div className="relative mb-4">
                <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                <Input
                  placeholder={t('catalog.searchItems')}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>

              <div className="space-y-3 max-h-96 overflow-y-auto">
                {filteredItems.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between p-3 border border-gray-200 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer"
                    onClick={() => addToCart(item)}
                  >
                    <div>
                      <h3 className="font-medium text-gray-900 dark:text-white">
                        {item.name}
                      </h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {item.category}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-orange-500 dark:text-orange-400">
                        ₹{item.price}
                      </p>
                      <Button size="sm" className="mt-1">
                        <PlusIcon className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                ))}
                {filteredItems.length === 0 && (
                  <p className="text-center text-gray-500 dark:text-gray-400 py-4">
                    {t('catalog.noItemsFound')}
                  </p>
                )}
              </div>
            </Card>
          </div>

          {/* Cart Summary */}
          <div className="space-y-6">
            <Card className="p-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                {t('invoice.invoiceSummary')}
              </h2>

              {state.cart.length === 0 ? (
                <p className="text-center text-gray-500 dark:text-gray-400 py-8">
                  {t('invoice.cartEmpty')}
                </p>
              ) : (
                <>
                  <div className="space-y-3 mb-6 max-h-64 overflow-y-auto">
                    {state.cart.map((item) => (
                      <div
                        key={item.id}
                        className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg"
                      >
                        <div className="flex-1">
                          <h3 className="font-medium text-gray-900 dark:text-white">
                            {item.name}
                          </h3>
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            ₹{item.price} × {item.quantity}
                          </p>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() =>
                              updateQuantity(item.id, item.quantity - 1)
                            }
                            className="p-1"
                          >
                            <MinusIcon className="h-3 w-3" />
                          </Button>
                          <span className="w-8 text-center text-sm font-medium">
                            {item.quantity}
                          </span>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() =>
                              updateQuantity(item.id, item.quantity + 1)
                            }
                            className="p-1"
                          >
                            <PlusIcon className="h-3 w-3" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => updateQuantity(item.id, 0)}
                            className="p-1 text-red-600"
                          >
                            <TrashIcon className="h-3 w-3" />
                          </Button>
                        </div>
                        <div className="ml-4 text-right">
                          <p className="font-semibold text-gray-900 dark:text-white">
                            ₹{(item.price * item.quantity).toFixed(2)}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Discount Input */}
                  <div className="mb-4">
                    <Input
                      label={t('invoice.discountAmount')}
                      type="number"
                      value={discount}
                      onChange={(e) =>
                        setDiscount(Number(e.target.value) || 0)
                      }
                      placeholder="0"
                    />
                  </div>

                  {/* Totals */}
                  <div className="space-y-2 pt-4 border-t border-gray-200 dark:border-gray-600">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600 dark:text-gray-400">
                        {t('invoice.subtotal')}:
                      </span>
                      <span className="text-gray-900 dark:text-white">
                        ₹{subtotal.toFixed(2)}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600 dark:text-gray-400">
                        {t('invoice.tax')}:
                      </span>
                      <span className="text-gray-900 dark:text-white">
                        ₹{tax.toFixed(2)}
                      </span>
                    </div>
                    {discount > 0 && (
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600 dark:text-gray-400">
                          {t('invoice.discount')}:
                        </span>
                        <span className="text-green-600 dark:text-green-400">
                          -₹{discount.toFixed(2)}
                        </span>
                      </div>
                    )}
                    <div className="flex justify-between text-lg font-semibold pt-2 border-t border-gray-200 dark:border-gray-600">
                      <span className="text-gray-900 dark:text-white">
                        {t('invoice.total')}:
                      </span>
                      <span className="text-orange-500 dark:text-orange-400">
                        ₹{total.toFixed(2)}
                      </span>
                    </div>
                  </div>

                  {/* Payment Methods */}
                  <div className="space-y-3 pt-6">
                    <h3 className="font-medium text-gray-900 dark:text-white">
                      {t('invoice.paymentMethod')}
                    </h3>
                    <div className="grid grid-cols-1 gap-2">
                      <Button
                        onClick={() => generateInvoice('cash')}
                        className="justify-start"
                      >
                        💵 {t('invoice.cash')}
                      </Button>
                      <Button
                        onClick={() => generateInvoice('upi')}
                        variant="secondary"
                        className="justify-start"
                      >
                        <QrCodeIcon className="w-4 h-4 mr-2" />
                        {t('invoice.upiQr')}
                      </Button>
                      <Button
                        onClick={() => generateInvoice('razorpay')}
                        variant="secondary"
                        className="justify-start"
                      >
                        💳 {t('invoice.razorpay')}
                      </Button>
                    </div>
                  </div>

                  {/* Share Options */}
                  <div className="flex gap-2 pt-4">
                    <Button variant="ghost" size="sm" className="flex-1">
                      <ShareIcon className="w-4 h-4 mr-2" />
                      WhatsApp
                    </Button>
                    <Button variant="ghost" size="sm" className="flex-1">
                      <PrinterIcon className="w-4 h-4 mr-2" />
                      {t('common.print')}
                    </Button>
                  </div>
                </>
              )}
            </Card>
          </div>
        </div>
      </div>
    </Layout>
  );
}