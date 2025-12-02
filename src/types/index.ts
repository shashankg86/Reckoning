

export interface User {
  id: string;
  uid: string;
  email: string;
  name: string;
  role: 'admin' | 'manager' | 'cashier';
  store?: Store;
}

export interface Category {
  id: string;
  name: string;
  color?: string;
  store_id: string;
  created_at: string;
}

export interface Store {
  id: string;
  name: string;
  type: StoreType;

  // Address fields
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  pincode?: string;

  // Contact fields
  phone?: string;
  secondary_phone?: string;
  email?: string;

  // Business fields
  gst_number?: string;

  // Settings
  language?: string;
  currency: string;
  theme?: string;
  tax_rate?: number;
  logo_url?: string;
  logoURL?: string; // Alias for compatibility

  // Store metadata
  menu_setup_completed?: boolean;
  is_active?: boolean;

  settings?: {
    print_header?: string;
    print_footer?: string;
    logo_url?: string;
  };
}

export interface Item {
  id: string;
  name: string;
  description?: string;
  price: number;
  category: string | Category;
  stock: number;
  sku?: string;
  barcode?: string;
  image_url?: string;
  is_active: boolean;
  store_id: string;
  created_at: string;
  updated_at: string;
}

export interface CartItem extends Item {
  quantity: number;
}

export interface Invoice {
  id: string;
  store_id: string;
  invoice_number: string;
  subtotal: number;
  tax: number;
  discount: number;
  total: number;
  payment_method: PaymentMethod;
  status: InvoiceStatus;
  customer_name?: string;
  customer_phone?: string;
  items: CartItem[];
  created_at: string;
  updated_at: string;
}

export interface SalesData {
  date: string;
  amount: number;
  orders: number;
}

export interface TopSellingItem {
  id: string;
  name: string;
  quantity: number;
  revenue: number;
}

export type Language = 'en' | 'es' | 'fr' | 'de' | 'hi' | 'zh' | 'ar';
export type Currency = 'USD' | 'EUR' | 'GBP' | 'INR' | 'JPY' | 'CNY' | 'AED';
export type Theme = 'light' | 'dark' | 'system';
export type StoreType = 'retail' | 'restaurant' | 'service' | 'other';
export type PaymentMethod = 'cash' | 'card' | 'upi' | 'other';
export type InvoiceStatus = 'completed' | 'pending' | 'cancelled' | 'refunded';
export type ChartType = 'bar' | 'line' | 'pie' | 'doughnut';
export type ReportView = 'daily' | 'weekly' | 'monthly' | 'yearly';

export interface DashboardStats {
  totalSales: number;
  totalOrders: number;
  averageOrder: number;
  activeItems: number;
  totalInvoices: number;
  totalTax?: number;
  itemsSold?: number;
}

export interface Transaction {
  id: string;
  invoice_number: string;
  total: number;
  payment_method: PaymentMethod;
  status: InvoiceStatus;
  created_at: string;
  items: {
    id: string;
    item_name: string;
    quantity: number;
    price: number;
  }[];
}

export interface ItemData {
  id: string;
  name: string;
  stock: number;
  price: number;
  category: any;
}

export interface DashboardSummary {
  stats: DashboardStats;
  recentTransactions: Transaction[];
  topSellingItems: TopSellingItem[];
  lowStockItems: ItemData[];
}