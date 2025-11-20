import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  MagnifyingGlassIcon,
  Squares2X2Icon,
  ListBulletIcon,
  ClockIcon,
  UserIcon,
  XMarkIcon
} from '@heroicons/react/24/outline';
import { Layout } from '../components/layout/Layout';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { usePOS } from '../contexts/POSContext';
import { useAuth } from '../contexts/AuthContext';
import { ItemGrid } from '../components/billing/ItemGrid';
import { CartPanel } from '../components/billing/CartPanel';
import { PaymentModal } from '../components/billing/PaymentModal';
import { HoldOrdersModal } from '../components/billing/HoldOrdersModal';
import type { Item, CartItem } from '../contexts/POSContext';
import toast from 'react-hot-toast';

type ViewMode = 'grid' | 'list';
type DiscountType = 'flat' | 'percentage';

interface HeldOrder {
  id: string;
  items: CartItem[];
  customer?: {
    name: string;
    phone: string;
  };
  timestamp: Date;
}

interface CustomerInfo {
  name: string;
  phone: string;
}

export function BillingScreen() {
  const { t } = useTranslation();
  const { state: posState, dispatch, handleCreateInvoice } = usePOS();
  const { state: authState } = useAuth();

  // View state
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  // Pricing state
  const [discount, setDiscount] = useState(0);
  const [discountType, setDiscountType] = useState<DiscountType>('flat');
  const [customTaxRate, setCustomTaxRate] = useState<number | null>(null);

  // Customer state
  const [customer, setCustomer] = useState<CustomerInfo>({ name: '', phone: '' });
  const [showCustomerForm, setShowCustomerForm] = useState(false);

  // Modal state
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showHoldOrdersModal, setShowHoldOrdersModal] = useState(false);

  // Held orders
  const [heldOrders, setHeldOrders] = useState<HeldOrder[]>([]);

  // Get categories from items
  const categories = useMemo(() => {
    const categoryMap = new Map<string, string>();
    posState.items.forEach(item => {
      if (item.category && !categoryMap.has(item.category)) {
        categoryMap.set(item.category, item.category);
      }
    });
    return Array.from(categoryMap.values());
  }, [posState.items]);

  // Filter items by search and category
  const filteredItems = useMemo(() => {
    let items = posState.items;

    // Filter by category
    if (selectedCategory !== 'all') {
      items = items.filter(item => item.category === selectedCategory);
    }

    // Filter by search term
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      items = items.filter(item =>
        item.name.toLowerCase().includes(term) ||
        item.sku?.toLowerCase().includes(term) ||
        item.category?.toLowerCase().includes(term)
      );
    }

    return items;
  }, [posState.items, selectedCategory, searchTerm]);

  // Calculate totals
  const calculations = useMemo(() => {
    const subtotal = posState.cart.reduce(
      (sum, item) => sum + item.price * item.quantity,
      0
    );

    // Get tax rate from store config or use custom
    const storeType = authState.user?.store?.type;
    let taxRate = customTaxRate ?? (storeType === 'restaurant' || storeType === 'cafe' ? 5 : 18);
    const tax = (subtotal * taxRate) / 100;

    // Calculate discount
    const discountAmount = discountType === 'percentage'
      ? (subtotal * discount) / 100
      : discount;

    const total = Math.max(0, subtotal + tax - discountAmount);

    return {
      subtotal,
      tax,
      taxRate,
      discountAmount,
      total
    };
  }, [posState.cart, discount, discountType, customTaxRate, authState.user?.store?.type]);

  // Add item to cart
  const handleAddToCart = useCallback((item: Item) => {
    // Check stock availability
    if (item.stock !== undefined && item.stock <= 0) {
      toast.error(t('billing.outOfStock'));
      return;
    }

    // Check if adding would exceed stock
    const cartItem = posState.cart.find(ci => ci.id === item.id);
    if (item.stock !== undefined && cartItem) {
      if (cartItem.quantity >= item.stock) {
        toast.error(t('billing.insufficientStock', { available: item.stock }));
        return;
      }
    }

    dispatch({ type: 'ADD_TO_CART', payload: item });
  }, [posState.cart, dispatch, t]);

  // Update quantity
  const handleUpdateQuantity = useCallback((itemId: string, quantity: number) => {
    if (quantity <= 0) {
      dispatch({ type: 'REMOVE_FROM_CART', payload: itemId });
    } else {
      // Check stock
      const item = posState.items.find(i => i.id === itemId);
      if (item?.stock !== undefined && quantity > item.stock) {
        toast.error(t('billing.insufficientStock', { available: item.stock }));
        return;
      }

      dispatch({
        type: 'UPDATE_CART_QUANTITY',
        payload: { id: itemId, quantity },
      });
    }
  }, [posState.items, dispatch, t]);

  // Remove item from cart
  const handleRemoveFromCart = useCallback((itemId: string) => {
    dispatch({ type: 'REMOVE_FROM_CART', payload: itemId });
  }, [dispatch]);

  // Clear cart
  const handleClearCart = useCallback(() => {
    dispatch({ type: 'CLEAR_CART' });
    setDiscount(0);
    setCustomer({ name: '', phone: '' });
    setShowCustomerForm(false);
  }, [dispatch]);

  // Hold current order
  const handleHoldOrder = useCallback(() => {
    if (posState.cart.length === 0) {
      toast.error(t('billing.cartEmpty'));
      return;
    }

    const heldOrder: HeldOrder = {
      id: Date.now().toString(),
      items: [...posState.cart],
      customer: customer.name || customer.phone ? { ...customer } : undefined,
      timestamp: new Date()
    };

    setHeldOrders(prev => [heldOrder, ...prev]);
    handleClearCart();
    toast.success(t('billing.orderHeld'));
  }, [posState.cart, customer, handleClearCart, t]);

  // Recall held order
  const handleRecallOrder = useCallback((order: HeldOrder) => {
    // Clear current cart if not empty
    if (posState.cart.length > 0) {
      const confirmed = window.confirm(t('billing.replaceCurrentCart'));
      if (!confirmed) return;
    }

    // Restore the order
    order.items.forEach(item => {
      dispatch({ type: 'ADD_TO_CART', payload: item });
      dispatch({
        type: 'UPDATE_CART_QUANTITY',
        payload: { id: item.id, quantity: item.quantity }
      });
    });

    if (order.customer) {
      setCustomer(order.customer);
      setShowCustomerForm(true);
    }

    // Remove from held orders
    setHeldOrders(prev => prev.filter(o => o.id !== order.id));
    setShowHoldOrdersModal(false);
    toast.success(t('billing.orderRecalled'));
  }, [posState.cart, dispatch, t]);

  // Delete held order
  const handleDeleteHeldOrder = useCallback((orderId: string) => {
    setHeldOrders(prev => prev.filter(o => o.id !== orderId));
    toast.success(t('billing.orderDeleted'));
  }, [t]);

  // Process payment
  const handlePayment = useCallback(async (paymentMethod: string, amountPaid?: number) => {
    try {
      await handleCreateInvoice({
        items: posState.cart,
        subtotal: calculations.subtotal,
        discount: calculations.discountAmount,
        tax: calculations.tax,
        total: calculations.total,
        paymentMethod: paymentMethod as any,
        customer: customer.name || customer.phone ? customer.name : undefined,
        status: 'paid'
      });

      // Calculate change if cash payment
      const change = amountPaid ? amountPaid - calculations.total : 0;

      if (change > 0) {
        toast.success(t('billing.changeAmount', { amount: change.toFixed(2) }));
      }

      handleClearCart();
      setShowPaymentModal(false);
      toast.success(t('billing.invoiceCreated'));
    } catch (error) {
      console.error('Payment error:', error);
      toast.error(t('billing.paymentFailed'));
    }
  }, [posState.cart, calculations, customer, handleCreateInvoice, handleClearCart, t]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      // Ctrl/Cmd + K for search focus
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        document.getElementById('item-search')?.focus();
      }

      // Ctrl/Cmd + H to hold order
      if ((e.ctrlKey || e.metaKey) && e.key === 'h') {
        e.preventDefault();
        handleHoldOrder();
      }

      // Ctrl/Cmd + R to recall orders
      if ((e.ctrlKey || e.metaKey) && e.key === 'r') {
        e.preventDefault();
        setShowHoldOrdersModal(true);
      }

      // F9 for payment
      if (e.key === 'F9' && posState.cart.length > 0) {
        e.preventDefault();
        setShowPaymentModal(true);
      }

      // Escape to clear search
      if (e.key === 'Escape' && searchTerm) {
        setSearchTerm('');
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [searchTerm, posState.cart.length, handleHoldOrder]);

  return (
    <Layout title={t('billing.title')}>
      <div className="h-[calc(100vh-4rem)] flex flex-col lg:flex-row gap-4 p-4 overflow-hidden">
        {/* Left Panel - Items */}
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          <Card className="flex-1 flex flex-col overflow-hidden">
            {/* Search and Filters */}
            <div className="p-4 border-b border-gray-200 dark:border-gray-700 space-y-3">
              {/* Search Bar */}
              <div className="relative">
                <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                <Input
                  id="item-search"
                  placeholder={t('billing.searchItems')}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 pr-10"
                />
                {searchTerm && (
                  <button
                    onClick={() => setSearchTerm('')}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    <XMarkIcon className="h-4 w-4" />
                  </button>
                )}
              </div>

              {/* Categories and View Toggle */}
              <div className="flex items-center gap-2 overflow-x-auto pb-2">
                <button
                  onClick={() => setSelectedCategory('all')}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                    selectedCategory === 'all'
                      ? 'bg-orange-500 text-white'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                  }`}
                >
                  {t('common.all')}
                </button>
                {categories.map(category => (
                  <button
                    key={category}
                    onClick={() => setSelectedCategory(category)}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                      selectedCategory === category
                        ? 'bg-orange-500 text-white'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                    }`}
                  >
                    {category}
                  </button>
                ))}

                <div className="ml-auto flex items-center gap-1 bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
                  <button
                    onClick={() => setViewMode('grid')}
                    className={`p-1.5 rounded transition-colors ${
                      viewMode === 'grid'
                        ? 'bg-white dark:bg-gray-600 text-orange-500'
                        : 'text-gray-600 dark:text-gray-400'
                    }`}
                  >
                    <Squares2X2Icon className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => setViewMode('list')}
                    className={`p-1.5 rounded transition-colors ${
                      viewMode === 'list'
                        ? 'bg-white dark:bg-gray-600 text-orange-500'
                        : 'text-gray-600 dark:text-gray-400'
                    }`}
                  >
                    <ListBulletIcon className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>

            {/* Items Grid/List */}
            <div className="flex-1 overflow-y-auto p-4">
              <ItemGrid
                items={filteredItems}
                viewMode={viewMode}
                onAddToCart={handleAddToCart}
                cart={posState.cart}
              />
            </div>
          </Card>
        </div>

        {/* Right Panel - Cart */}
        <div className="w-full lg:w-96 flex flex-col min-h-0">
          <CartPanel
            cart={posState.cart}
            calculations={calculations}
            customer={customer}
            showCustomerForm={showCustomerForm}
            discount={discount}
            discountType={discountType}
            taxRate={calculations.taxRate}
            onUpdateQuantity={handleUpdateQuantity}
            onRemoveFromCart={handleRemoveFromCart}
            onClearCart={handleClearCart}
            onCustomerChange={setCustomer}
            onToggleCustomerForm={() => setShowCustomerForm(!showCustomerForm)}
            onDiscountChange={setDiscount}
            onDiscountTypeChange={setDiscountType}
            onTaxRateChange={setCustomTaxRate}
            onHoldOrder={handleHoldOrder}
            onShowHeldOrders={() => setShowHoldOrdersModal(true)}
            onPayment={() => setShowPaymentModal(true)}
            heldOrdersCount={heldOrders.length}
          />
        </div>
      </div>

      {/* Payment Modal */}
      {showPaymentModal && (
        <PaymentModal
          total={calculations.total}
          onClose={() => setShowPaymentModal(false)}
          onPayment={handlePayment}
        />
      )}

      {/* Held Orders Modal */}
      {showHoldOrdersModal && (
        <HoldOrdersModal
          heldOrders={heldOrders}
          onClose={() => setShowHoldOrdersModal(false)}
          onRecall={handleRecallOrder}
          onDelete={handleDeleteHeldOrder}
        />
      )}
    </Layout>
  );
}
