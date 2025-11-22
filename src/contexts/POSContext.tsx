import React, { createContext, useContext, useReducer, ReactNode, useEffect, useRef } from 'react';
import toast from 'react-hot-toast';
import { useAuth } from './AuthContext';
import { invoicesAPI } from '../api/invoices';
import type { Item, CartItem, Invoice, CustomerDetails, PaymentMethod, InvoiceStatus } from '../types';

interface POSState { cart: CartItem[]; invoices: Invoice[]; loading: boolean; }

type POSAction =
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'ADD_TO_CART'; payload: Item }
  | { type: 'UPDATE_CART_QUANTITY'; payload: { id: string; quantity: number } }
  | { type: 'REMOVE_FROM_CART'; payload: string }
  | { type: 'CLEAR_CART' }
  | { type: 'SET_INVOICES'; payload: Invoice[] }
  | { type: 'ADD_INVOICE'; payload: Invoice }
  | { type: 'RESET_STATE' };

const initialState: POSState = { cart: [], invoices: [], loading: false };

function posReducer(state: POSState, action: POSAction): POSState {
  switch (action.type) {
    case 'SET_LOADING': return { ...state, loading: action.payload };
    case 'ADD_TO_CART': {
      const existing = state.cart.find(i => i.id === action.payload.id);
      if (existing) return { ...state, cart: state.cart.map(i => i.id === action.payload.id ? { ...i, quantity: i.quantity + 1 } : i) };
      return { ...state, cart: [...state.cart, { ...action.payload, quantity: 1 }] };
    }
    case 'UPDATE_CART_QUANTITY': return { ...state, cart: state.cart.map(i => i.id === action.payload.id ? { ...i, quantity: action.payload.quantity } : i) };
    case 'REMOVE_FROM_CART': return { ...state, cart: state.cart.filter(i => i.id !== action.payload) };
    case 'CLEAR_CART': return { ...state, cart: [] };
    case 'SET_INVOICES': return { ...state, invoices: action.payload, loading: false };
    case 'ADD_INVOICE': return { ...state, invoices: [action.payload, ...state.invoices] };
    case 'RESET_STATE': return initialState;
    default: return state;
  }
}

const POSContext = createContext<{
  state: POSState;
  dispatch: React.Dispatch<POSAction>;
  loadInvoices: (forceReload?: boolean) => Promise<void>;
  handleAddToCart: (item: Item) => void;
  handleCreateInvoice: (invoice: Omit<Invoice, 'id'>) => Promise<{ invoice: Invoice; rawInvoice: any }>;
} | null>(null);

export function POSProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(posReducer, initialState);
  const { state: authState } = useAuth();
  const storeId = authState.user?.store?.id;

  // Freshness guard: 60s
  const lastLoadRef = useRef({ invoicesAt: 0 });
  const FRESH_MS = 60_000;

  const loadInvoices = async (forceReload = false) => {
    if (!storeId) return;
    const now = Date.now();
    // Skip freshness check if forceReload is true
    if (!forceReload && now - lastLoadRef.current.invoicesAt < FRESH_MS) return;
    lastLoadRef.current.invoicesAt = now;
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      const invoices = await invoicesAPI.getTodayInvoices(storeId);
      const formatted: Invoice[] = invoices.map((inv: any) => ({
        id: inv.invoice_number,
        items: inv.invoice_items.map((it: any) => ({ id: it.item_id, name: it.item_name, price: parseFloat(it.price), category: '', quantity: it.quantity })),
        subtotal: parseFloat(inv.subtotal),
        discount: parseFloat(inv.discount),
        tax: parseFloat(inv.tax),
        total: parseFloat(inv.total),
        paymentMethod: inv.payment_method,
        date: new Date(inv.created_at),
        customer: inv.customer_name,
        status: inv.status,
      }));
      dispatch({ type: 'SET_INVOICES', payload: formatted });
    } catch (e) {
      console.error('Load invoices error:', e);
      toast.error('Failed to load invoices');
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  };

  useEffect(() => {
    if (storeId) {
      loadInvoices();
    }
  }, [storeId]);

  const handleAddToCart = (item: Item) => { dispatch({ type: 'ADD_TO_CART', payload: item }); toast.success(`${item.name} added to cart`); };

  const handleCreateInvoice = async (invoice: Omit<Invoice, 'id'>) => {
    if (!storeId) { toast.error('No store selected'); throw new Error('No store selected'); }
    try {
      const created = await invoicesAPI.createInvoice(storeId, {
        customer_name: invoice.customer || 'Walk-in Customer',
        customer_phone: invoice.customerDetails?.phone,
        customer_email: invoice.customerDetails?.email,
        items: invoice.items.map(i => ({ id: i.id, name: i.name, quantity: i.quantity, price: i.price })),
        subtotal: invoice.subtotal,
        discount: invoice.discount,
        discount_type: 'flat',
        tax: invoice.tax,
        tax_rate: invoice.taxRate || 0,
        total: invoice.total,
        payment_method: invoice.paymentMethod,
        notes: invoice.notes || ''
      });
      const formatted: Invoice = {
        id: created.invoice_number,
        items: invoice.items,
        subtotal: invoice.subtotal,
        discount: invoice.discount,
        tax: invoice.tax,
        total: invoice.total,
        paymentMethod: invoice.paymentMethod,
        date: new Date(created.created_at),
        customer: invoice.customer,
        status: 'paid'
      };
      dispatch({ type: 'ADD_INVOICE', payload: formatted });
      dispatch({ type: 'CLEAR_CART' });
      toast.success('Invoice created successfully');

      // Return the created invoice for further processing (e.g., email sending)
      return { invoice: formatted, rawInvoice: created };
    } catch (e) { console.error('Create invoice error:', e); toast.error('Failed to create invoice'); throw e; }
  };

  return (
    <POSContext.Provider value={{ state, dispatch, loadInvoices, handleAddToCart, handleCreateInvoice }}>
      {children}
    </POSContext.Provider>
  );
}

export function usePOS() {
  const context = useContext(POSContext);
  if (!context) throw new Error('usePOS must be used within a POSProvider');
  return context;
}
