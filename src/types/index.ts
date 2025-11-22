export interface User {
  uid: string;
  email: string | null;
  name: string | null;
  phone?: string;
  photoURL?: string;
  isOnboarded: boolean;
  store?: Store;
  createdAt: Date;
  lastLoginAt: Date;
}

export interface Store {
  id: string;
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

export interface SalesData {
  date: string;
  sales: number;
  orders: number;
}

export interface TopSellingItem {
  name: string;
  sales: number;
  revenue: number;
}

export type Language = 'en' | 'hi' | 'ar' | 'mr' | 'ur' | 'bn' | 'ta' | 'te' | 'gu' | 'kn' | 'ml' | 'pa';
export type Currency = 'INR' | 'AED' | 'USD' | 'EUR' | 'GBP';
export type Theme = 'light' | 'dark';
export type StoreType = 'restaurant' | 'cafe' | 'retail' | 'salon' | 'pharmacy' | 'other';
export type PaymentMethod = 'cash' | 'upi' | 'razorpay';
export type InvoiceStatus = 'paid' | 'pending' | 'cancelled';
export type ChartType = 'line' | 'bar' | 'pie' | 'doughnut';
export type ReportView = 'chart' | 'statistics';