import React, { createContext, useContext, useReducer, ReactNode } from 'react';

interface Store {
  name: string;
  type: string;
  language: 'en' | 'hi';
  theme: 'light' | 'dark';
}

interface Item {
  id: string;
  name: string;
  price: number;
  category: string;
  image?: string;
  stock?: number;
  sku?: string;
}

interface CartItem extends Item {
  quantity: number;
}

interface Invoice {
  id: string;
  items: CartItem[];
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
  paymentMethod: 'cash' | 'upi' | 'razorpay';
  date: Date;
  customer?: string;
  status: 'paid' | 'pending' | 'cancelled';
}

interface POSState {
  isAuthenticated: boolean;
  isOnboarded: boolean;
  store: Store | null;
  items: Item[];
  cart: CartItem[];
  invoices: Invoice[];
  currentScreen: string;
  user: {
    email?: string;
    phone?: string;
    name?: string;
  } | null;
}

type POSAction = 
  | { type: 'SET_AUTHENTICATED'; payload: boolean }
  | { type: 'SET_USER'; payload: any }
  | { type: 'SET_ONBOARDED'; payload: boolean }
  | { type: 'SET_STORE'; payload: Store }
  | { type: 'SET_THEME'; payload: 'light' | 'dark' }
  | { type: 'SET_LANGUAGE'; payload: 'en' | 'hi' }
  | { type: 'ADD_ITEM'; payload: Item }
  | { type: 'UPDATE_ITEM'; payload: Item }
  | { type: 'DELETE_ITEM'; payload: string }
  | { type: 'ADD_TO_CART'; payload: Item }
  | { type: 'UPDATE_CART_QUANTITY'; payload: { id: string; quantity: number } }
  | { type: 'REMOVE_FROM_CART'; payload: string }
  | { type: 'CLEAR_CART' }
  | { type: 'ADD_INVOICE'; payload: Invoice }
  | { type: 'SET_CURRENT_SCREEN'; payload: string }
  | { type: 'LOGOUT' };

const initialState: POSState = {
  isAuthenticated: false,
  isOnboarded: false,
  store: {
    name: 'My Store',
    type: 'retail',
    language: 'en',
    theme: 'light'
  },
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
    },
    {
      id: 'INV002',
      items: [
        { id: '3', name: 'Dabur Honey', price: 320, category: 'Pantry', quantity: 1 }
      ],
      subtotal: 320,
      discount: 0,
      tax: 57.6,
      total: 377.6,
      paymentMethod: 'cash',
      date: new Date('2024-11-07'),
      customer: 'Rajesh Kumar',
      status: 'pending'
    }
  ],
  currentScreen: 'login',
  user: null
};

function posReducer(state: POSState, action: POSAction): POSState {
  switch (action.type) {
    case 'SET_AUTHENTICATED':
      return { ...state, isAuthenticated: action.payload };
    case 'SET_USER':
      return { ...state, user: action.payload };
    case 'SET_ONBOARDED':
      return { ...state, isOnboarded: action.payload };
    case 'SET_STORE':
      return { ...state, store: action.payload };
    case 'SET_THEME':
      return { 
        ...state, 
        store: state.store ? { ...state.store, theme: action.payload } : null 
      };
    case 'SET_LANGUAGE':
      return { 
        ...state, 
        store: state.store ? { ...state.store, language: action.payload } : null 
      };
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
    case 'SET_CURRENT_SCREEN':
      return { ...state, currentScreen: action.payload };
    case 'LOGOUT':
      return { 
        ...state, 
        isAuthenticated: false, 
        user: null, 
        currentScreen: 'login',
        cart: []
      };
    default:
      return state;
  }
}

const POSContext = createContext<{
  state: POSState;
  dispatch: React.Dispatch<POSAction>;
} | null>(null);

export function POSProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(posReducer, initialState);

  // Apply theme to document root
  React.useEffect(() => {
    const root = document.documentElement;
    if (state.store?.theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [state.store?.theme]);

  return (
    <POSContext.Provider value={{ state, dispatch }}>
      {children}
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