import { useState, useMemo, useCallback, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  MagnifyingGlassIcon,
  Squares2X2Icon,
  ListBulletIcon,
  XMarkIcon,
  ShoppingCartIcon,
  ArchiveBoxIcon
} from '@heroicons/react/24/outline';
import { Layout } from '../components/layout/Layout';
import { Card } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { usePOS } from '../contexts/POSContext';
import { useAuth } from '../contexts/AuthContext';
import { ItemGrid } from '../components/billing/ItemGrid';
import { CartPanel } from '../components/billing/CartPanel';
import { PaymentModal } from '../components/billing/PaymentModal';
import { HoldOrdersModal } from '../components/billing/HoldOrdersModal';
import { TaxConfigModal } from '../components/billing/TaxConfigModal';
import { InvoiceTaxModal } from '../components/billing/InvoiceTaxModal';
import { CustomerDetailsModal } from '../components/billing/CustomerDetailsModal';
import type { Item, CartItem, CustomerDetails } from '../types';
import { taxConfigAPI, type StoreTaxConfig, type InvoiceTaxOverride } from '../api/taxConfig';
import toast from 'react-hot-toast';
import { emailService } from '../services/emailService';
import { useCatalogQueries } from '../hooks/useCatalogQueries';
import { useTaxCalculation } from '../hooks/useTaxCalculation';

type ViewMode = 'grid' | 'list';
type DiscountType = 'flat' | 'percentage';
type MobileTab = 'menu' | 'cart';

interface HeldOrder {
  id: string;
  items: CartItem[];
  customer?: {
    name: string;
    phone: string;
  };
  timestamp: Date;
}

export function BillingScreen() {
  const { t } = useTranslation();
  const { state: posState, dispatch, handleCreateInvoice } = usePOS();
  const { state: authState } = useAuth();
  const storeId = authState.user?.store?.id;

  // View state
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [mobileTab, setMobileTab] = useState<MobileTab>('menu');

  // Load tax configuration
  const [taxConfig, setTaxConfig] = useState<StoreTaxConfig | null>(null);
  useEffect(() => {
    const loadTaxConfig = async () => {
      if (storeId) {
        const config = await taxConfigAPI.getTaxConfig(storeId);
        setTaxConfig(config);
      }
    };
    loadTaxConfig();
  }, [storeId]);

  // Pricing state
  const [discount, setDiscount] = useState(0);
  const [discountType, setDiscountType] = useState<DiscountType>('flat');

  // Customer state
  const [customer, setCustomer] = useState<CustomerDetails>({
    name: '',
    phone: '',
    email: '',
    countryCode: '+91' // Will be updated based on store country
  });
  const [showCustomerForm, setShowCustomerForm] = useState(false);

  // Modal state
  const [showCustomerDetailsModal, setShowCustomerDetailsModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showHoldOrdersModal, setShowHoldOrdersModal] = useState(false);
  const [showTaxConfigModal, setShowTaxConfigModal] = useState(false);
  const [showInvoiceTaxModal, setShowInvoiceTaxModal] = useState(false);

  // Invoice Tax Override
  const [invoiceTaxOverride, setInvoiceTaxOverride] = useState<InvoiceTaxOverride | null>(null);

  // Held orders
  const [heldOrders, setHeldOrders] = useState<HeldOrder[]>([]);

  // Data Fetching
  // Debounce search term
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearchTerm(searchTerm), 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Data Fetching
  const { useInfiniteItems, categoriesQuery } = useCatalogQueries(storeId || '');

  // Categories
  const categories = useMemo(() => categoriesQuery.data || [], [categoriesQuery.data]);

  // Items with Server-Side Filtering
  const {
    data: itemsResult,
    isLoading: itemsLoading,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage
  } = useInfiniteItems(
    {
      category_id: selectedCategory === 'all' ? undefined : selectedCategory,
      search: debouncedSearchTerm,
      is_active: true
    },
    50, // limit per page
    'name', // sortBy
    'asc' // sortOrder
  );

  const catalogItems = useMemo(() =>
    itemsResult?.pages.flatMap(page => page.data) || [],
    [itemsResult?.pages]
  );

  // No client-side filtering needed anymore
  const filteredItems = catalogItems;

  // Calculate totals using hook
  const subtotal = useMemo(() =>
    posState.cart.reduce((sum, item) => sum + item.price * item.quantity, 0),
    [posState.cart]
  );

  // Derive country from currency if not explicitly available
  const storeCountry = useMemo(() => {
    const currency = authState.user?.store?.currency;
    if (currency === 'INR') return 'IN';
    if (currency === 'AED') return 'AE';
    return 'IN'; // Default to India
  }, [authState.user?.store?.currency]);

  const calculations = useTaxCalculation({
    subtotal,
    storeCountry,
    taxConfig,
    discount,
    discountType,
    invoiceTaxOverride
  });

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
    // Optional: Switch to cart tab on mobile when adding item? 
    // setMobileTab('cart'); 
  }, [posState.cart, dispatch, t]);

  // Update quantity
  const handleUpdateQuantity = useCallback((itemId: string, quantity: number) => {
    if (quantity <= 0) {
      dispatch({ type: 'REMOVE_FROM_CART', payload: itemId });
    } else {
      // Check stock
      const item = catalogItems.find(i => i.id === itemId);
      if (item?.stock !== undefined && quantity > item.stock) {
        toast.error(t('billing.insufficientStock', { available: item.stock }));
        return;
      }

      dispatch({
        type: 'UPDATE_CART_QUANTITY',
        payload: { id: itemId, quantity },
      });
    }
  }, [catalogItems, dispatch, t]);

  // Remove item from cart
  const handleRemoveFromCart = useCallback((itemId: string) => {
    dispatch({ type: 'REMOVE_FROM_CART', payload: itemId });
  }, [dispatch]);

  // Clear cart
  const handleClearCart = useCallback(() => {
    dispatch({ type: 'CLEAR_CART' });
    setDiscount(0);
    setCustomer({ name: '', phone: '', email: '', countryCode: '+91' });
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
      customer: customer.name || customer.phone ? { name: customer.name, phone: customer.phone } : undefined,
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
      setCustomer({
        name: order.customer.name,
        phone: order.customer.phone,
        email: '',
        countryCode: '+91'
      });
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

  // Handle payment button click - check if customer details are complete
  const handlePaymentClick = useCallback(() => {
    // Check if customer details are complete
    const isCustomerComplete = customer.name.trim() && customer.phone.trim() && customer.email.trim();

    if (!isCustomerComplete) {
      // Show customer details modal first
      setShowCustomerDetailsModal(true);
    } else {
      // Customer details are complete, proceed to payment
      setShowPaymentModal(true);
    }
  }, [customer]);

  // Handle customer details submission
  const handleCustomerDetailsSubmit = useCallback((details: CustomerDetails) => {
    setCustomer(details);
    setShowCustomerDetailsModal(false);
    // After customer details are saved, show payment modal
    setShowPaymentModal(true);
  }, []);

  // Process payment
  const handlePayment = useCallback(async (paymentMethod: string, amountPaid?: number) => {
    try {
      const result = await handleCreateInvoice({
        items: posState.cart,
        subtotal: calculations.subtotal,
        discount: calculations.discountAmount,
        tax: calculations.tax,
        taxRate: calculations.taxRate,
        serviceCharge: calculations.serviceCharge,
        municipalityFee: calculations.municipalityFee,
        total: calculations.total,
        paymentMethod: paymentMethod as 'cash' | 'card' | 'upi',
        customer: customer.name,
        customerDetails: customer,
        date: new Date(),
        status: 'paid'
      });

      // Calculate change if cash payment
      const change = amountPaid ? amountPaid - calculations.total : 0;

      if (change > 0) {
        toast.success(t('billing.changeAmount', { amount: change.toFixed(2) }));
      }

      // Send invoice email if customer email is provided
      if (result && customer.email) {
        try {
          const store = authState.user?.store;
          await emailService.sendInvoiceEmail({
            to: customer.email,
            invoiceNumber: result.invoice.id,
            customerName: customer.name,
            storeName: store?.name || 'Universal POS',
            storePhone: store?.store_phone,
            storeEmail: store?.store_email,
            storeAddress: store?.store_address,
            items: posState.cart.map(item => ({
              name: item.name,
              quantity: item.quantity,
              price: item.price,
              total: item.price * item.quantity
            })),
            subtotal: calculations.subtotal,
            discount: calculations.discountAmount,
            tax: calculations.tax,
            serviceCharge: calculations.serviceCharge,
            municipalityFee: calculations.municipalityFee,
            total: calculations.total,
            paymentMethod: paymentMethod.toUpperCase(),
            date: new Date().toLocaleDateString('en-IN', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit'
            }),
            taxComponents: calculations.taxComponents
          });
          toast.success(t('billing.invoiceEmailSent', { email: customer.email }));
        } catch (emailError) {
          console.error('Email send error:', emailError);
          // Don't fail the payment if email fails
          toast.error(t('billing.emailSendFailed'));
        }
      }

      handleClearCart();
      setShowPaymentModal(false);
      toast.success(t('billing.invoiceCreated'));
    } catch (error) {
      console.error('Payment error:', error);
      toast.error(t('billing.paymentFailed'));
    }
  }, [posState.cart, calculations, customer, handleCreateInvoice, handleClearCart, authState.user?.store, t]);

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
      <div className="h-[calc(100vh-4rem)] flex flex-col lg:flex-row gap-4 p-4 overflow-hidden relative">

        {/* Mobile Tab Switcher */}
        <div className="lg:hidden flex w-full bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 mb-2">
          <button
            onClick={() => setMobileTab('menu')}
            className={`flex-1 py-3 text-center font-medium text-sm flex items-center justify-center gap-2 ${mobileTab === 'menu'
              ? 'text-orange-500 border-b-2 border-orange-500'
              : 'text-gray-500 dark:text-gray-400'
              }`}
          >
            <ArchiveBoxIcon className="h-5 w-5" />
            Menu
          </button>
          <button
            onClick={() => setMobileTab('cart')}
            className={`flex-1 py-3 text-center font-medium text-sm flex items-center justify-center gap-2 ${mobileTab === 'cart'
              ? 'text-orange-500 border-b-2 border-orange-500'
              : 'text-gray-500 dark:text-gray-400'
              }`}
          >
            <ShoppingCartIcon className="h-5 w-5" />
            Cart ({posState.cart.length})
          </button>
        </div>

        {/* Left Panel - Items (Menu) */}
        <div className={`flex-1 flex flex-col min-w-0 overflow-hidden transition-all duration-300 ${mobileTab === 'menu' ? 'block' : 'hidden lg:flex'
          }`}>
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
              <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hide">
                <button
                  onClick={() => setSelectedCategory('all')}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${selectedCategory === 'all'
                    ? 'bg-orange-500 text-white'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                    }`}
                >
                  {t('common.all')}
                </button>
                {categories.map(category => (
                  <button
                    key={category.id}
                    onClick={() => setSelectedCategory(category.id)}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${selectedCategory === category.id
                      ? 'bg-orange-500 text-white'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                      }`}
                  >
                    {category.name}
                  </button>
                ))}

                <div className="ml-auto flex items-center gap-1 bg-gray-100 dark:bg-gray-700 rounded-lg p-1 hidden sm:flex">
                  <button
                    onClick={() => setViewMode('grid')}
                    className={`p-1.5 rounded transition-colors ${viewMode === 'grid'
                      ? 'bg-white dark:bg-gray-600 text-orange-500'
                      : 'text-gray-600 dark:text-gray-400'
                      }`}
                  >
                    <Squares2X2Icon className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => setViewMode('list')}
                    className={`p-1.5 rounded transition-colors ${viewMode === 'list'
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
              {itemsLoading ? (
                <div className="flex items-center justify-center h-full">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
                </div>
              ) : (
                <ItemGrid
                  items={filteredItems}
                  viewMode={viewMode}
                  onAddToCart={handleAddToCart}
                  cart={posState.cart}
                  onLoadMore={fetchNextPage}
                  hasNextPage={hasNextPage}
                  isFetchingNextPage={isFetchingNextPage}
                />
              )}
            </div>
          </Card>
        </div>

        {/* Right Panel - Cart */}
        <div className={`w-full lg:w-96 flex flex-col min-h-0 transition-all duration-300 ${mobileTab === 'cart' ? 'block' : 'hidden lg:flex'
          }`}>
          <CartPanel
            cart={posState.cart}
            calculations={calculations}
            customer={customer}
            showCustomerForm={showCustomerForm}
            discount={discount}
            discountType={discountType}
            taxRate={0} // Handled by taxComponents now
            taxComponents={calculations.taxComponents}
            taxConfig={taxConfig}
            invoiceTaxOverride={invoiceTaxOverride}
            onUpdateQuantity={handleUpdateQuantity}
            onRemoveFromCart={handleRemoveFromCart}
            onClearCart={handleClearCart}
            onCustomerChange={setCustomer}
            onToggleCustomerForm={() => setShowCustomerForm(!showCustomerForm)}
            onDiscountChange={setDiscount}
            onDiscountTypeChange={setDiscountType}
            onTaxRateChange={() => { }} // Deprecated
            onTaxConfigClick={() => setShowTaxConfigModal(true)}
            onInvoiceTaxClick={() => setShowInvoiceTaxModal(true)}
            onHoldOrder={handleHoldOrder}
            onShowHeldOrders={() => setShowHoldOrdersModal(true)}
            onPayment={handlePaymentClick}
            heldOrdersCount={heldOrders.length}
          />
        </div>
      </div>

      {/* Customer Details Modal */}
      {showCustomerDetailsModal && (
        <CustomerDetailsModal
          currentDetails={customer}
          defaultCountry={taxConfig?.country}
          onClose={() => setShowCustomerDetailsModal(false)}
          onSubmit={handleCustomerDetailsSubmit}
        />
      )}

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

      {/* Tax Configuration Modal */}
      {showTaxConfigModal && authState.user?.store?.id && (
        <TaxConfigModal
          storeId={authState.user.store.id}
          currentConfig={taxConfig}
          onClose={() => setShowTaxConfigModal(false)}
          onConfigSaved={(config) => {
            setTaxConfig(config);
            setShowTaxConfigModal(false);
          }}
        />
      )}

      {/* Invoice Tax Customization Modal */}
      {showInvoiceTaxModal && (
        <InvoiceTaxModal
          currentOverride={invoiceTaxOverride}
          defaultTaxRate={0}
          subtotal={calculations.subtotal}
          country={taxConfig?.country}
          onClose={() => setShowInvoiceTaxModal(false)}
          onApply={(override) => {
            setInvoiceTaxOverride(override);
            setShowInvoiceTaxModal(false);
          }}
        />
      )}
    </Layout>
  );
}
