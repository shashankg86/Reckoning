import React, { createContext, useContext, useReducer, ReactNode, useEffect } from 'react';
import toast from 'react-hot-toast';
import { useAuth } from './AuthContext';

export type Language = 'en' | 'hi' | 'ar' | 'mr';
export type Currency = 'INR' | 'AED' | 'USD' | 'EUR' | 'GBP';
export type Theme = 'light' | 'dark';
export type StoreType = 'restaurant' | 'cafe' | 'retail' | 'salon' | 'pharmacy' | 'other';
export type PaymentMethod = 'cash' | 'upi' | 'razorpay';
export type InvoiceStatus = 'paid' | 'pending' | 'cancelled';

export interface Store {
  name: string;
  type: StoreType;
  language: Language;
  currency: Currency;
  theme: Theme;
  logoURL?: string;
}

export interface Item {
  id: string;
  name: string;
  price: number;
  category: string;
  image?: string;
  stock?: number;
  sku?: string;
}

export interface CartItem extends Item {
  quantity: number;
}

export interface Invoice {
  id: string;
  items: CartItem[];
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
  paymentMethod: PaymentMethod;
  date: Date;
  customer?: string;
  status: InvoiceStatus;
}

interface POSState {
  items: Item[];
  cart: CartItem[];
  invoices: Invoice[];
  loading: boolean;
}

type POSAction = 
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'ADD_ITEM'; payload: Item }
  | { type: 'UPDATE_ITEM'; payload: Item }
  | { type: 'DELETE_ITEM'; payload: string }
  | { type: 'ADD_TO_CART'; payload: Item }
  | { type: 'UPDATE_CART_QUANTITY'; payload: { id: string; quantity: number } }
  | { type: 'REMOVE_FROM_CART'; payload: string }
  | { type: 'CLEAR_CART' }
  | { type: 'ADD_INVOICE'; payload: Invoice }
  | { type: 'RESET_STATE' };

const initialState: POSState = {
  items: [
    {
      id: '1',
      name: 'Organic Basmati Rice',
      price: 650,
      category: 'Grains & Pulses',
      stock: 50,
      sku: 'BR1KG',
      image: 'https://images.pexels.com/photos/4110256/pexels-photo-4110256.jpeg?auto=compress&cs=tinysrgb&w=400'
    },
    {
      id: '2',
      name: 'Amul Milk 1L Pouch',
      price: 65,
      category: 'Dairy',
      stock: 25,
      sku: 'AM1L',
      image: 'https://images.pexels.com/photos/416978/pexels-photo-416978.jpeg?auto=compress&cs=tinysrgb&w=400'
    },
    {
      id: '3',
      name: 'Dabur Honey 500g',
      price: 320,
      category: 'Pantry Staples',
      stock: 15,
      sku: 'DH500',
      image: 'https://images.pexels.com/photos/1638280/pexels-photo-1638280.jpeg?auto=compress&cs=tinysrgb&w=400'
    },
    {
      id: '4',
      name: 'Maggi 2-Minute Noodles',
      price: 14,
      category: 'Pantry Staples',
      stock: 0,
      sku: 'MG2MIN',
      image: 'https://images.pexels.com/photos/6287523/pexels-photo-6287523.jpeg?auto=compress&cs=tinysrgb&w=400'
    }
  ],
  cart: [],
  invoices: [
    {
      id: 'INV001',
      items: [
        { id: '1', name: 'Organic Basmati Rice', price: 650, category: 'Grains', quantity: 2 },
        { id: '2', name: 'Amul Milk 1L', price: 65, category: 'Dairy', quantity: 1 }
      ],
      subtotal: 1365,
      discount: 0,
      tax: 245.7,
      total: 1610.7,
      paymentMethod: 'upi',
      date: new Date('2024-11-07'),
      customer: 'Priya Sharma',
      status: 'paid'
    }
  ],
  loading: false
};

function posReducer(state: POSState, action: POSAction): POSState {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, loading: action.payload };
    case 'ADD_ITEM':
      return { ...state, items: [...state.items, action.payload] };
    case 'UPDATE_ITEM':
      return { 
        ...state, 
        items: state.items.map(item => 
          item.id === action.payload.id ? action.payload : item
        ) 
      };
    case 'DELETE_ITEM':
      return { 
        ...state, 
        items: state.items.filter(item => item.id !== action.payload) 
      };
    case 'ADD_TO_CART':
      const existingItem = state.cart.find(item => item.id === action.payload.id);
      if (existingItem) {
        return {
          ...state,
          cart: state.cart.map(item =>
            item.id === action.payload.id 
              ? { ...item, quantity: item.quantity + 1 }
              : item
          )
        };
      }
      return { 
        ...state, 
        cart: [...state.cart, { ...action.payload, quantity: 1 }] 
      };
    case 'UPDATE_CART_QUANTITY':
      return {
        ...state,
        cart: state.cart.map(item =>
          item.id === action.payload.id 
            ? { ...item, quantity: action.payload.quantity }
            : item
        )
      };
    case 'REMOVE_FROM_CART':
      return { 
        ...state, 
        cart: state.cart.filter(item => item.id !== action.payload) 
      };
    case 'CLEAR_CART':
      return { ...state, cart: [] };
    case 'ADD_INVOICE':
      return { ...state, invoices: [...state.invoices, action.payload] };
    case 'RESET_STATE':
      return initialState;
    default:
      return state;
  }
}

const POSContext = createContext<{
  state: POSState;
  dispatch: React.Dispatch<POSAction>;
  handleDeleteItem?: (itemId: string) => void;
  handleAddItem: (item: Item) => void;
  handleUpdateItem: (item: Item) => void;
  handleAddToCart: (item: Item) => void;
  handleCreateInvoice: (invoice: Invoice) => void;
} | null>(null);

export function POSProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(posReducer, initialState);
  const { state: authState } = useAuth();
  const handleDeleteItem = (itemId: string) => {
    dispatch({ type: 'DELETE_ITEM', payload: itemId });
    toast.success('Item deleted successfully');
  };

  const handleAddItem = (item: Item) => {
    dispatch({ type: 'ADD_ITEM', payload: item });
    toast.success('Item added to catalog');
  };

  const handleUpdateItem = (item: Item) => {
    dispatch({ type: 'UPDATE_ITEM', payload: item });
    toast.success('Item updated successfully');
  };

  const handleAddToCart = (item: Item) => {
    dispatch({ type: 'ADD_TO_CART', payload: item });
    toast.success(`${item.name} added to cart`);
  };

  const handleCreateInvoice = (invoice: Invoice) => {
    dispatch({ type: 'ADD_INVOICE', payload: invoice });
    dispatch({ type: 'CLEAR_CART' });
    toast.success('Invoice created successfully');
  };

  // Apply theme to document root - optimized to prevent infinite loops
  useEffect(() => {
    const root = document.documentElement;
    const theme = authState.user?.store?.theme;
    
    if (theme === 'dark') {
      root.classList.add('dark');
    } else if (theme === 'light') {
      root.classList.remove('dark');
    }
  }, [authState.user?.store?.theme]);

  // Apply language and direction - optimized
  useEffect(() => {
    const root = document.documentElement;
    const language = authState.user?.store?.language;
    
    if (language === 'ar') {
      root.dir = 'rtl';
    }
  }
  )
  return (
    <POSContext.Provider value={{ 
      state, 
      dispatch,
      handleDeleteItem,
      handleAddItem,
      handleUpdateItem,
      handleAddToCart,
      handleCreateInvoice
    }}>
      {children}
    } else {
      root.dir = 'ltr';
    }
    
    root.lang = language || 'en';
  }, [authState.user?.store?.language]);

    </POSContext.Provider>
  );
}

export function usePOS() {
  const context = useContext(POSContext);
  if (!context) {
    throw new Error('usePOS must be used within a POSProvider');
  }
  return context;
}