import { createClient } from '@supabase/supabase-js';
import { secureStorage } from './secureStorage';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables. Please check your .env file.');
}

// Create Supabase client with enhanced security
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    // Use secure encrypted storage instead of plain localStorage
    storage: secureStorage,

    // Auto refresh tokens before expiry
    autoRefreshToken: true,

    // Persist session securely
    persistSession: true,

    // Detect session from URL (OAuth redirects)
    detectSessionInUrl: true,

    // Use PKCE flow for enhanced OAuth security
    flowType: 'pkce',

    // Custom storage key
    storageKey: 'sb-auth-token',
  },

  global: {
    headers: {
      'x-client-info': 'universal-pos-app',
    },
  },

  db: {
    schema: 'public',
  },

  realtime: {
    params: {
      eventsPerSecond: 10,
    },
  },
});

// Log authentication state changes in development
if (import.meta.env.DEV) {
  supabase.auth.onAuthStateChange((event, session) => {
    console.log('[Supabase Auth]', event, {
      user: session?.user?.email,
      expiresAt: session?.expires_at
        ? new Date(session.expires_at * 1000).toLocaleString()
        : 'N/A',
    });
  });
}

// Type definitions for your database
export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          email: string;
          phone: string;
          name: string;
          photo_url: string | null;
          created_at: string;
          last_login_at: string;
        };
        Insert: Omit<Database['public']['Tables']['profiles']['Row'], 'id' | 'created_at'>;
        Update: Partial<Database['public']['Tables']['profiles']['Insert']>;
      };
      stores: {
        Row: {
          id: string;
          owner_id: string;
          name: string;
          type: string;
          language: string;
          currency: string;
          theme: string;
          logo_url: string | null;
          address: string | null;
          city: string | null;
          state: string | null;
          country: string;
          pincode: string | null;
          gst_number: string | null;
          phone: string | null;
          email: string | null;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['stores']['Row'], 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['stores']['Insert']>;
      };
      store_members: {
        Row: {
          id: string;
          store_id: string;
          user_id: string;
          role: 'owner' | 'manager' | 'cashier';
          is_active: boolean;
          invited_by: string | null;
          invited_at: string | null;
          joined_at: string;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['store_members']['Row'], 'id' | 'created_at'>;
        Update: Partial<Database['public']['Tables']['store_members']['Insert']>;
      };
      items: {
        Row: {
          id: string;
          store_id: string;
          name: string;
          category: string;
          price: number;
          sku: string | null;
          stock: number;
          low_stock_threshold: number;
          image_url: string | null;
          description: string | null;
          is_active: boolean;
          created_at: string;
          updated_at: string;
          created_by: string | null;
        };
        Insert: Omit<Database['public']['Tables']['items']['Row'], 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['items']['Insert']>;
      };
      customers: {
        Row: {
          id: string;
          store_id: string;
          name: string;
          phone: string | null;
          email: string | null;
          address: string | null;
          city: string | null;
          notes: string | null;
          total_orders: number;
          total_spent: number;
          last_visit: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['customers']['Row'], 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['customers']['Insert']>;
      };
      invoices: {
        Row: {
          id: string;
          store_id: string;
          invoice_number: string;
          customer_id: string | null;
          customer_name: string | null;
          customer_phone: string | null;
          subtotal: number;
          discount: number;
          discount_type: 'flat' | 'percentage';
          tax: number;
          tax_rate: number;
          total: number;
          payment_method: string;
          payment_status: string;
          status: string;
          notes: string | null;
          created_by: string;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['invoices']['Row'], 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['invoices']['Insert']>;
      };
      invoice_items: {
        Row: {
          id: string;
          invoice_id: string;
          item_id: string | null;
          item_name: string;
          quantity: number;
          price: number;
          subtotal: number;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['invoice_items']['Row'], 'id' | 'created_at'>;
        Update: Partial<Database['public']['Tables']['invoice_items']['Insert']>;
      };
      stock_movements: {
        Row: {
          id: string;
          item_id: string;
          store_id: string;
          quantity_change: number;
          reason: string;
          reference_type: string | null;
          reference_id: string | null;
          notes: string | null;
          created_by: string;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['stock_movements']['Row'], 'id' | 'created_at'>;
        Update: Partial<Database['public']['Tables']['stock_movements']['Insert']>;
      };
    };
  };
};