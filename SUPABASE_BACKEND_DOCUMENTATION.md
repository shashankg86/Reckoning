# Supabase Backend Implementation Guide
## Universal POS System - Complete Backend Documentation

**Version:** 1.0  
**Date:** January 2025  
**Status:** Ready for Implementation  
**Purpose:** Complete guide for migrating from Firebase to Supabase

---

## Table of Contents

1. [Overview](#overview)
2. [Authentication System](#authentication-system)
3. [Database Schema](#database-schema)
4. [Row Level Security (RLS)](#row-level-security-rls)
5. [API Layer](#api-layer)
6. [Migration Guide](#migration-guide)
7. [Code Examples](#code-examples)
8. [Environment Setup](#environment-setup)
9. [Testing Strategy](#testing-strategy)
10. [Deployment Checklist](#deployment-checklist)

---

## Overview

### Technology Stack

**Backend:**
- **Database:** Supabase PostgreSQL
- **Authentication:** Supabase Auth (replaces Firebase Auth)
- **Storage:** Supabase Storage (replaces Firebase Storage)
- **Real-time:** Supabase Realtime subscriptions
- **API:** Auto-generated REST API + Supabase Client SDK

**Current Stack (To Be Replaced):**
- Firebase Authentication
- Firebase Firestore
- Firebase Storage

### Key Requirements

1. **Mandatory Fields:** Both phone number AND email required for all users
2. **Authentication Methods:** 
   - Email + Password
   - Phone + OTP
   - Google OAuth
3. **User Roles:** Owner, Manager, Cashier
4. **Multi-Store Support:** Single user can access multiple stores
5. **Data Isolation:** Strict RLS to prevent cross-store data access
6. **Offline Support:** IndexedDB caching + sync queue

---

## Authentication System

### 1. Authentication Requirements

**Mandatory User Fields:**
```typescript
interface UserProfile {
  id: string;              // UUID from Supabase auth.users
  email: string;           // MANDATORY - for login and communication
  phone: string;           // MANDATORY - for login and verification
  name: string;            // Full name
  photo_url?: string;      // Profile picture URL
  created_at: Date;
  last_login_at: Date;
}
```

### 2. Signup Flow

**Step 1: User enters details**
- Full Name (required)
- Phone Number (required, with country code)
- Email Address (required)
- Password (required, min 6 characters)

**Step 2: Email Signup**
```typescript
// Supabase signup with email
const { data, error } = await supabase.auth.signUp({
  email: email,
  password: password,
  options: {
    data: {
      name: name,
      phone: phone
    }
  }
});
```

**Step 3: Create Profile Record**
```sql
-- Triggered automatically via database function
INSERT INTO profiles (id, email, phone, name, created_at, last_login_at)
VALUES (auth.uid(), email, phone, name, NOW(), NOW());
```

**Step 4: Phone Verification**
```typescript
// Send OTP to phone for verification
const { data, error } = await supabase.auth.signInWithOtp({
  phone: phone
});
```

**Step 5: Email Verification**
```typescript
// Supabase automatically sends verification email
// User must click link to verify
```

### 3. Login Flows

#### Option A: Email + Password Login
```typescript
async function loginWithEmail(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email: email,
    password: password
  });
  
  if (error) throw error;
  
  // Update last login
  await supabase
    .from('profiles')
    .update({ last_login_at: new Date() })
    .eq('id', data.user.id);
  
  return data.user;
}
```

#### Option B: Phone + OTP Login
```typescript
// Step 1: Request OTP
async function requestPhoneOTP(phone: string) {
  const { data, error } = await supabase.auth.signInWithOtp({
    phone: phone
  });
  
  if (error) throw error;
  return data;
}

// Step 2: Verify OTP
async function verifyPhoneOTP(phone: string, otp: string) {
  const { data, error } = await supabase.auth.verifyOtp({
    phone: phone,
    token: otp,
    type: 'sms'
  });
  
  if (error) throw error;
  return data.user;
}
```

#### Option C: Google OAuth Login
```typescript
async function loginWithGoogle() {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${window.location.origin}/auth/callback`
    }
  });
  
  if (error) throw error;
  
  // After OAuth callback, check if phone exists
  const user = await supabase.auth.getUser();
  const profile = await supabase
    .from('profiles')
    .select('phone')
    .eq('id', user.data.user.id)
    .single();
  
  // If no phone, prompt user to add phone number
  if (!profile.data?.phone) {
    // Show phone collection UI
    return { needsPhone: true };
  }
  
  return { needsPhone: false };
}
```

### 4. Password Reset Flow

```typescript
// Step 1: Request password reset email
async function requestPasswordReset(email: string) {
  const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}/reset-password`
  });
  
  if (error) throw error;
  return data;
}

// Step 2: Update password with token
async function updatePassword(newPassword: string) {
  const { data, error } = await supabase.auth.updateUser({
    password: newPassword
  });
  
  if (error) throw error;
  return data;
}
```

### 5. Session Management

```typescript
// Listen to auth state changes
supabase.auth.onAuthStateChange((event, session) => {
  if (event === 'SIGNED_IN') {
    // User logged in
    console.log('User signed in:', session.user);
  } else if (event === 'SIGNED_OUT') {
    // User logged out
    console.log('User signed out');
  } else if (event === 'TOKEN_REFRESHED') {
    // Token refreshed automatically
    console.log('Token refreshed');
  }
});

// Get current session
const { data: { session } } = await supabase.auth.getSession();

// Logout
await supabase.auth.signOut();
```

---

## Database Schema

### Complete PostgreSQL Schema

```sql
-- =====================================================
-- SUPABASE UNIVERSAL POS DATABASE SCHEMA
-- Version: 1.0
-- =====================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- 1. PROFILES TABLE (Extends auth.users)
-- =====================================================

CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  phone TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  photo_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  last_login_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  
  -- Constraints
  CONSTRAINT email_format CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'),
  CONSTRAINT phone_format CHECK (phone ~* '^\+[1-9]\d{1,14}$')
);

-- Indexes
CREATE INDEX idx_profiles_email ON profiles(email);
CREATE INDEX idx_profiles_phone ON profiles(phone);

-- Comments
COMMENT ON TABLE profiles IS 'User profiles linked to Supabase auth.users';
COMMENT ON COLUMN profiles.phone IS 'Phone number in E.164 format (e.g., +919876543210)';
COMMENT ON COLUMN profiles.email IS 'Email address for login and communication';

-- =====================================================
-- 2. STORES TABLE
-- =====================================================

CREATE TABLE stores (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  owner_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('restaurant', 'cafe', 'retail', 'salon', 'pharmacy', 'other')),
  language TEXT DEFAULT 'en' NOT NULL CHECK (language IN ('en', 'hi', 'ar', 'mr', 'ur', 'bn', 'ta', 'te', 'gu', 'kn', 'ml', 'pa')),
  currency TEXT DEFAULT 'INR' NOT NULL CHECK (currency IN ('INR', 'AED', 'USD', 'EUR', 'GBP')),
  theme TEXT DEFAULT 'light' NOT NULL CHECK (theme IN ('light', 'dark')),
  logo_url TEXT,
  address TEXT,
  city TEXT,
  state TEXT,
  country TEXT DEFAULT 'India',
  pincode TEXT,
  gst_number TEXT,
  phone TEXT,
  email TEXT,
  is_active BOOLEAN DEFAULT true NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  
  -- Constraints
  CONSTRAINT store_name_length CHECK (char_length(name) >= 2 AND char_length(name) <= 100)
);

-- Indexes
CREATE INDEX idx_stores_owner ON stores(owner_id) WHERE is_active = true;
CREATE INDEX idx_stores_type ON stores(type) WHERE is_active = true;

-- Trigger to update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_stores_updated_at
BEFORE UPDATE ON stores
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Comments
COMMENT ON TABLE stores IS 'Store/business information';
COMMENT ON COLUMN stores.type IS 'Business type: restaurant, cafe, retail, salon, pharmacy, other';
COMMENT ON COLUMN stores.language IS 'Default language for store UI';
COMMENT ON COLUMN stores.currency IS 'Default currency for store transactions';

-- =====================================================
-- 3. STORE_MEMBERS TABLE (Team & Roles)
-- =====================================================

CREATE TABLE store_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  store_id UUID REFERENCES stores(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('owner', 'manager', 'cashier')),
  is_active BOOLEAN DEFAULT true NOT NULL,
  invited_by UUID REFERENCES profiles(id),
  invited_at TIMESTAMPTZ,
  joined_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  
  -- Unique constraint: One user can have only one role per store
  CONSTRAINT unique_store_user UNIQUE(store_id, user_id)
);

-- Indexes
CREATE INDEX idx_store_members_store ON store_members(store_id) WHERE is_active = true;
CREATE INDEX idx_store_members_user ON store_members(user_id) WHERE is_active = true;
CREATE INDEX idx_store_members_role ON store_members(store_id, role) WHERE is_active = true;

-- Comments
COMMENT ON TABLE store_members IS 'Store team members with role-based access';
COMMENT ON COLUMN store_members.role IS 'User role: owner (full access), manager (limited admin), cashier (billing only)';

-- =====================================================
-- 4. ITEMS TABLE (Product Catalog)
-- =====================================================

CREATE TABLE items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  store_id UUID REFERENCES stores(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  price DECIMAL(10,2) NOT NULL CHECK (price >= 0),
  sku TEXT,
  stock INTEGER DEFAULT 0 CHECK (stock >= 0),
  low_stock_threshold INTEGER DEFAULT 10 CHECK (low_stock_threshold >= 0),
  image_url TEXT,
  description TEXT,
  is_active BOOLEAN DEFAULT true NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  created_by UUID REFERENCES profiles(id),
  
  -- Constraints
  CONSTRAINT item_name_length CHECK (char_length(name) >= 1 AND char_length(name) <= 200),
  CONSTRAINT unique_sku_per_store UNIQUE(store_id, sku)
);

-- Indexes
CREATE INDEX idx_items_store ON items(store_id) WHERE is_active = true;
CREATE INDEX idx_items_category ON items(store_id, category) WHERE is_active = true;
CREATE INDEX idx_items_sku ON items(store_id, sku) WHERE is_active = true AND sku IS NOT NULL;
CREATE INDEX idx_items_name_search ON items USING gin(to_tsvector('english', name));

-- Trigger
CREATE TRIGGER update_items_updated_at
BEFORE UPDATE ON items
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Comments
COMMENT ON TABLE items IS 'Product/item catalog for stores';
COMMENT ON COLUMN items.stock IS 'Current stock quantity';
COMMENT ON COLUMN items.low_stock_threshold IS 'Alert when stock falls below this value';

-- =====================================================
-- 5. CUSTOMERS TABLE (Basic CRM)
-- =====================================================

CREATE TABLE customers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  store_id UUID REFERENCES stores(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  address TEXT,
  city TEXT,
  notes TEXT,
  total_orders INTEGER DEFAULT 0 NOT NULL CHECK (total_orders >= 0),
  total_spent DECIMAL(12,2) DEFAULT 0 NOT NULL CHECK (total_spent >= 0),
  last_visit TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  
  -- Constraints
  CONSTRAINT customer_name_length CHECK (char_length(name) >= 2 AND char_length(name) <= 100),
  CONSTRAINT customer_contact CHECK (phone IS NOT NULL OR email IS NOT NULL)
);

-- Indexes
CREATE INDEX idx_customers_store ON customers(store_id);
CREATE INDEX idx_customers_phone ON customers(store_id, phone) WHERE phone IS NOT NULL;
CREATE INDEX idx_customers_name_search ON customers USING gin(to_tsvector('english', name));

-- Trigger
CREATE TRIGGER update_customers_updated_at
BEFORE UPDATE ON customers
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Comments
COMMENT ON TABLE customers IS 'Customer information for CRM and repeat orders';

-- =====================================================
-- 6. INVOICES TABLE
-- =====================================================

CREATE TABLE invoices (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  store_id UUID REFERENCES stores(id) ON DELETE CASCADE NOT NULL,
  invoice_number TEXT NOT NULL,
  customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
  customer_name TEXT,
  customer_phone TEXT,
  subtotal DECIMAL(10,2) NOT NULL CHECK (subtotal >= 0),
  discount DECIMAL(10,2) DEFAULT 0 NOT NULL CHECK (discount >= 0),
  discount_type TEXT DEFAULT 'flat' CHECK (discount_type IN ('flat', 'percentage')),
  tax DECIMAL(10,2) NOT NULL CHECK (tax >= 0),
  tax_rate DECIMAL(5,2) DEFAULT 18.00 CHECK (tax_rate >= 0 AND tax_rate <= 100),
  total DECIMAL(10,2) NOT NULL CHECK (total >= 0),
  payment_method TEXT NOT NULL CHECK (payment_method IN ('cash', 'upi', 'razorpay', 'card')),
  payment_status TEXT DEFAULT 'paid' CHECK (payment_status IN ('paid', 'pending', 'failed')),
  status TEXT DEFAULT 'completed' CHECK (status IN ('completed', 'cancelled', 'refunded')),
  notes TEXT,
  created_by UUID REFERENCES profiles(id) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  
  -- Constraints
  CONSTRAINT unique_invoice_number UNIQUE(store_id, invoice_number),
  CONSTRAINT discount_valid CHECK (
    (discount_type = 'flat' AND discount <= subtotal) OR
    (discount_type = 'percentage' AND discount <= 100)
  )
);

-- Indexes
CREATE INDEX idx_invoices_store ON invoices(store_id);
CREATE INDEX idx_invoices_store_date ON invoices(store_id, created_at DESC);
CREATE INDEX idx_invoices_customer ON invoices(customer_id) WHERE customer_id IS NOT NULL;
CREATE INDEX idx_invoices_number ON invoices(store_id, invoice_number);
CREATE INDEX idx_invoices_created_by ON invoices(created_by);
CREATE INDEX idx_invoices_today ON invoices(store_id, created_at) WHERE created_at >= CURRENT_DATE;

-- Trigger
CREATE TRIGGER update_invoices_updated_at
BEFORE UPDATE ON invoices
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Comments
COMMENT ON TABLE invoices IS 'Sales invoices/bills';
COMMENT ON COLUMN invoices.invoice_number IS 'Human-readable invoice number (e.g., INV-001)';
COMMENT ON COLUMN invoices.tax_rate IS 'Tax percentage (e.g., 18.00 for 18% GST)';

-- =====================================================
-- 7. INVOICE_ITEMS TABLE
-- =====================================================

CREATE TABLE invoice_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  invoice_id UUID REFERENCES invoices(id) ON DELETE CASCADE NOT NULL,
  item_id UUID REFERENCES items(id) ON DELETE SET NULL,
  item_name TEXT NOT NULL,
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  price DECIMAL(10,2) NOT NULL CHECK (price >= 0),
  subtotal DECIMAL(10,2) NOT NULL CHECK (subtotal >= 0),
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Indexes
CREATE INDEX idx_invoice_items_invoice ON invoice_items(invoice_id);
CREATE INDEX idx_invoice_items_item ON invoice_items(item_id) WHERE item_id IS NOT NULL;

-- Comments
COMMENT ON TABLE invoice_items IS 'Line items for invoices';

-- =====================================================
-- 8. STOCK_MOVEMENTS TABLE (Inventory Tracking)
-- =====================================================

CREATE TABLE stock_movements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  item_id UUID REFERENCES items(id) ON DELETE CASCADE NOT NULL,
  store_id UUID REFERENCES stores(id) ON DELETE CASCADE NOT NULL,
  quantity_change INTEGER NOT NULL,
  reason TEXT NOT NULL CHECK (reason IN ('sale', 'purchase', 'adjustment', 'return', 'damage', 'initial')),
  reference_type TEXT CHECK (reference_type IN ('invoice', 'manual', 'import')),
  reference_id UUID,
  notes TEXT,
  created_by UUID REFERENCES profiles(id) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Indexes
CREATE INDEX idx_stock_movements_item ON stock_movements(item_id, created_at DESC);
CREATE INDEX idx_stock_movements_store ON stock_movements(store_id, created_at DESC);
CREATE INDEX idx_stock_movements_reference ON stock_movements(reference_type, reference_id) WHERE reference_id IS NOT NULL;

-- Comments
COMMENT ON TABLE stock_movements IS 'Inventory movement history for audit trail';

-- =====================================================
-- DATABASE FUNCTIONS
-- =====================================================

-- Function to auto-create profile on signup
CREATE OR REPLACE FUNCTION create_profile_for_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, email, phone, name, created_at, last_login_at)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'phone', ''),
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    NOW(),
    NOW()
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create profile automatically
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION create_profile_for_user();

-- Function to generate invoice number
CREATE OR REPLACE FUNCTION generate_invoice_number(store_uuid UUID)
RETURNS TEXT AS $$
DECLARE
  latest_num INTEGER;
  new_number TEXT;
BEGIN
  SELECT COALESCE(MAX(CAST(SUBSTRING(invoice_number FROM '\d+$') AS INTEGER)), 0) + 1
  INTO latest_num
  FROM invoices
  WHERE store_id = store_uuid;
  
  new_number := 'INV-' || LPAD(latest_num::TEXT, 6, '0');
  RETURN new_number;
END;
$$ LANGUAGE plpgsql;

-- Function to update customer stats after invoice
CREATE OR REPLACE FUNCTION update_customer_stats()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.customer_id IS NOT NULL AND NEW.status = 'completed' THEN
    UPDATE customers
    SET 
      total_orders = total_orders + 1,
      total_spent = total_spent + NEW.total,
      last_visit = NEW.created_at
    WHERE id = NEW.customer_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update customer stats
CREATE TRIGGER on_invoice_created
AFTER INSERT ON invoices
FOR EACH ROW
EXECUTE FUNCTION update_customer_stats();

-- Function to reduce stock on sale
CREATE OR REPLACE FUNCTION reduce_stock_on_sale()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'completed' THEN
    -- Reduce stock for each item
    UPDATE items
    SET stock = stock - (
      SELECT quantity 
      FROM invoice_items 
      WHERE invoice_items.invoice_id = NEW.id 
        AND invoice_items.item_id = items.id
    )
    WHERE id IN (
      SELECT item_id 
      FROM invoice_items 
      WHERE invoice_id = NEW.id
    );
    
    -- Log stock movements
    INSERT INTO stock_movements (item_id, store_id, quantity_change, reason, reference_type, reference_id, created_by)
    SELECT 
      ii.item_id,
      NEW.store_id,
      -ii.quantity,
      'sale',
      'invoice',
      NEW.id,
      NEW.created_by
    FROM invoice_items ii
    WHERE ii.invoice_id = NEW.id AND ii.item_id IS NOT NULL;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to reduce stock
CREATE TRIGGER on_invoice_stock_update
AFTER INSERT ON invoices
FOR EACH ROW
EXECUTE FUNCTION reduce_stock_on_sale();
```

---

## Row Level Security (RLS)

### Enable RLS on All Tables

```sql
-- Enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE stores ENABLE ROW LEVEL SECURITY;
ALTER TABLE store_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE items ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_movements ENABLE ROW LEVEL SECURITY;
```

### RLS Policies

```sql
-- =====================================================
-- PROFILES POLICIES
-- =====================================================

-- Users can view their own profile
CREATE POLICY "Users can view own profile"
ON profiles FOR SELECT
USING (auth.uid() = id);

-- Users can update their own profile
CREATE POLICY "Users can update own profile"
ON profiles FOR UPDATE
USING (auth.uid() = id);

-- =====================================================
-- STORES POLICIES
-- =====================================================

-- Users can view stores they're members of
CREATE POLICY "Users can view member stores"
ON stores FOR SELECT
USING (
  id IN (
    SELECT store_id FROM store_members
    WHERE user_id = auth.uid() AND is_active = true
  )
);

-- Owners can update their stores
CREATE POLICY "Owners can update stores"
ON stores FOR UPDATE
USING (
  id IN (
    SELECT store_id FROM store_members
    WHERE user_id = auth.uid() AND role = 'owner' AND is_active = true
  )
);

-- Users can create stores (becomes owner)
CREATE POLICY "Users can create stores"
ON stores FOR INSERT
WITH CHECK (owner_id = auth.uid());

-- =====================================================
-- STORE_MEMBERS POLICIES
-- =====================================================

-- Users can view members of stores they belong to
CREATE POLICY "Users can view store members"
ON store_members FOR SELECT
USING (
  store_id IN (
    SELECT store_id FROM store_members
    WHERE user_id = auth.uid() AND is_active = true
  )
);

-- Owners can insert new members
CREATE POLICY "Owners can add members"
ON store_members FOR INSERT
WITH CHECK (
  store_id IN (
    SELECT store_id FROM store_members
    WHERE user_id = auth.uid() AND role = 'owner' AND is_active = true
  )
);

-- Owners can update/remove members
CREATE POLICY "Owners can manage members"
ON store_members FOR UPDATE
USING (
  store_id IN (
    SELECT store_id FROM store_members
    WHERE user_id = auth.uid() AND role = 'owner' AND is_active = true
  )
);

-- =====================================================
-- ITEMS POLICIES
-- =====================================================

-- All store members can view items
CREATE POLICY "Store members can view items"
ON items FOR SELECT
USING (
  store_id IN (
    SELECT store_id FROM store_members
    WHERE user_id = auth.uid() AND is_active = true
  )
);

-- Owners and managers can insert items
CREATE POLICY "Owners and managers can add items"
ON items FOR INSERT
WITH CHECK (
  store_id IN (
    SELECT store_id FROM store_members
    WHERE user_id = auth.uid() 
      AND role IN ('owner', 'manager')
      AND is_active = true
  )
);

-- Owners and managers can update items
CREATE POLICY "Owners and managers can update items"
ON items FOR UPDATE
USING (
  store_id IN (
    SELECT store_id FROM store_members
    WHERE user_id = auth.uid() 
      AND role IN ('owner', 'manager')
      AND is_active = true
  )
);

-- Only owners can delete items
CREATE POLICY "Owners can delete items"
ON items FOR DELETE
USING (
  store_id IN (
    SELECT store_id FROM store_members
    WHERE user_id = auth.uid() AND role = 'owner' AND is_active = true
  )
);

-- =====================================================
-- CUSTOMERS POLICIES
-- =====================================================

-- All store members can view customers
CREATE POLICY "Store members can view customers"
ON customers FOR SELECT
USING (
  store_id IN (
    SELECT store_id FROM store_members
    WHERE user_id = auth.uid() AND is_active = true
  )
);

-- All store members can add customers
CREATE POLICY "Store members can add customers"
ON customers FOR INSERT
WITH CHECK (
  store_id IN (
    SELECT store_id FROM store_members
    WHERE user_id = auth.uid() AND is_active = true
  )
);

-- Owners and managers can update customers
CREATE POLICY "Owners and managers can update customers"
ON customers FOR UPDATE
USING (
  store_id IN (
    SELECT store_id FROM store_members
    WHERE user_id = auth.uid() 
      AND role IN ('owner', 'manager')
      AND is_active = true
  )
);

-- =====================================================
-- INVOICES POLICIES
-- =====================================================

-- Store members can view invoices based on role
CREATE POLICY "Store members can view invoices"
ON invoices FOR SELECT
USING (
  store_id IN (
    SELECT sm.store_id FROM store_members sm
    WHERE sm.user_id = auth.uid() AND sm.is_active = true
      AND (
        -- Owners and managers see all
        sm.role IN ('owner', 'manager')
        OR
        -- Cashiers see only today's invoices
        (sm.role = 'cashier' AND created_at >= CURRENT_DATE)
      )
  )
);

-- All store members can create invoices
CREATE POLICY "Store members can create invoices"
ON invoices FOR INSERT
WITH CHECK (
  store_id IN (
    SELECT store_id FROM store_members
    WHERE user_id = auth.uid() AND is_active = true
  )
  AND created_by = auth.uid()
);

-- Owners and managers can update invoices
CREATE POLICY "Owners and managers can update invoices"
ON invoices FOR UPDATE
USING (
  store_id IN (
    SELECT store_id FROM store_members
    WHERE user_id = auth.uid() 
      AND role IN ('owner', 'manager')
      AND is_active = true
  )
);

-- Only owners can delete invoices
CREATE POLICY "Owners can delete invoices"
ON invoices FOR DELETE
USING (
  store_id IN (
    SELECT store_id FROM store_members
    WHERE user_id = auth.uid() AND role = 'owner' AND is_active = true
  )
);

-- =====================================================
-- INVOICE_ITEMS POLICIES
-- =====================================================

-- Access to invoice items follows invoice access
CREATE POLICY "Access invoice items via invoice"
ON invoice_items FOR ALL
USING (
  invoice_id IN (
    SELECT i.id FROM invoices i
    JOIN store_members sm ON sm.store_id = i.store_id
    WHERE sm.user_id = auth.uid() AND sm.is_active = true
  )
);

-- =====================================================
-- STOCK_MOVEMENTS POLICIES
-- =====================================================

-- Owners and managers can view stock movements
CREATE POLICY "Owners and managers can view stock movements"
ON stock_movements FOR SELECT
USING (
  store_id IN (
    SELECT store_id FROM store_members
    WHERE user_id = auth.uid() 
      AND role IN ('owner', 'manager')
      AND is_active = true
  )
);

-- Stock movements are auto-created by triggers
-- Manual inserts allowed for owners/managers
CREATE POLICY "Owners and managers can record stock movements"
ON stock_movements FOR INSERT
WITH CHECK (
  store_id IN (
    SELECT store_id FROM store_members
    WHERE user_id = auth.uid() 
      AND role IN ('owner', 'manager')
      AND is_active = true
  )
  AND created_by = auth.uid()
);
```

---

## API Layer

### Supabase Client Setup

**File: `src/lib/supabaseClient.ts`**

```typescript
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true
  },
  realtime: {
    params: {
      eventsPerSecond: 10
    }
  }
});

// Type definitions for database
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
      // Add other table types...
    };
  };
};
```

### API Functions

**File: `src/api/auth.ts`**

```typescript
import { supabase } from '../lib/supabaseClient';

export const authAPI = {
  // Email + Password Signup
  async signUpWithEmail(email: string, password: string, name: string, phone: string) {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          name,
          phone
        }
      }
    });
    
    if (error) throw error;
    return data;
  },

  // Email + Password Login
  async loginWithEmail(email: string, password: string) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });
    
    if (error) throw error;
    
    // Update last login
    if (data.user) {
      await supabase
        .from('profiles')
        .update({ last_login_at: new Date().toISOString() })
        .eq('id', data.user.id);
    }
    
    return data;
  },

  // Phone OTP Login - Step 1: Request OTP
  async requestPhoneOTP(phone: string) {
    const { data, error } = await supabase.auth.signInWithOtp({
      phone
    });
    
    if (error) throw error;
    return data;
  },

  // Phone OTP Login - Step 2: Verify OTP
  async verifyPhoneOTP(phone: string, otp: string) {
    const { data, error } = await supabase.auth.verifyOtp({
      phone,
      token: otp,
      type: 'sms'
    });
    
    if (error) throw error;
    return data;
  },

  // Google OAuth Login
  async loginWithGoogle() {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`
      }
    });
    
    if (error) throw error;
    return data;
  },

  // Logout
  async logout() {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  },

  // Get current user
  async getCurrentUser() {
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error) throw error;
    return user;
  },

  // Get current session
  async getSession() {
    const { data: { session }, error } = await supabase.auth.getSession();
    if (error) throw error;
    return session;
  },

  // Password reset
  async resetPassword(email: string) {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`
    });
    if (error) throw error;
  },

  // Update password
  async updatePassword(newPassword: string) {
    const { error } = await supabase.auth.updateUser({
      password: newPassword
    });
    if (error) throw error;
  }
};
```

**File: `src/api/stores.ts`**

```typescript
import { supabase } from '../lib/supabaseClient';
import type { Store } from '../types';

export const storesAPI = {
  // Create store and make user owner
  async createStore(storeData: Omit<Store, 'id'>) {
    const user = await supabase.auth.getUser();
    if (!user.data.user) throw new Error('Not authenticated');

    // Create store
    const { data: store, error: storeError } = await supabase
      .from('stores')
      .insert({
        ...storeData,
        owner_id: user.data.user.id
      })
      .select()
      .single();

    if (storeError) throw storeError;

    // Add user as owner in store_members
    const { error: memberError } = await supabase
      .from('store_members')
      .insert({
        store_id: store.id,
        user_id: user.data.user.id,
        role: 'owner'
      });

    if (memberError) throw memberError;

    return store;
  },

  // Get user's stores
  async getUserStores() {
    const user = await supabase.auth.getUser();
    if (!user.data.user) throw new Error('Not authenticated');

    const { data, error } = await supabase
      .from('stores')
      .select(`
        *,
        store_members!inner(role, is_active)
      `)
      .eq('store_members.user_id', user.data.user.id)
      .eq('store_members.is_active', true)
      .eq('is_active', true);

    if (error) throw error;
    return data;
  },

  // Update store settings
  async updateStore(storeId: string, updates: Partial<Store>) {
    const { data, error } = await supabase
      .from('stores')
      .update(updates)
      .eq('id', storeId)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // Get store with members
  async getStoreWithMembers(storeId: string) {
    const { data, error } = await supabase
      .from('stores')
      .select(`
        *,
        store_members(
          id,
          role,
          is_active,
          joined_at,
          profiles(id, name, email, phone, photo_url)
        )
      `)
      .eq('id', storeId)
      .single();

    if (error) throw error;
    return data;
  }
};
```

**File: `src/api/items.ts`**

```typescript
import { supabase } from '../lib/supabaseClient';
import type { Item } from '../types';

export const itemsAPI = {
  // Get all items for store
  async getItems(storeId: string) {
    const { data, error } = await supabase
      .from('items')
      .select('*')
      .eq('store_id', storeId)
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
  },

  // Create item
  async createItem(storeId: string, item: Omit<Item, 'id'>) {
    const user = await supabase.auth.getUser();
    if (!user.data.user) throw new Error('Not authenticated');

    const { data, error } = await supabase
      .from('items')
      .insert({
        ...item,
        store_id: storeId,
        created_by: user.data.user.id
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // Update item
  async updateItem(itemId: string, updates: Partial<Item>) {
    const { data, error } = await supabase
      .from('items')
      .update(updates)
      .eq('id', itemId)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // Delete item (soft delete)
  async deleteItem(itemId: string) {
    const { error } = await supabase
      .from('items')
      .update({ is_active: false })
      .eq('id', itemId);

    if (error) throw error;
  },

  // Bulk create items (for OCR import)
  async bulkCreateItems(storeId: string, items: Omit<Item, 'id'>[]) {
    const user = await supabase.auth.getUser();
    if (!user.data.user) throw new Error('Not authenticated');

    const itemsWithStore = items.map(item => ({
      ...item,
      store_id: storeId,
      created_by: user.data.user.id
    }));

    const { data, error } = await supabase
      .from('items')
      .insert(itemsWithStore)
      .select();

    if (error) throw error;
    return data;
  },

  // Search items
  async searchItems(storeId: string, query: string) {
    const { data, error } = await supabase
      .from('items')
      .select('*')
      .eq('store_id', storeId)
      .eq('is_active', true)
      .or(`name.ilike.%${query}%,sku.ilike.%${query}%`)
      .limit(20);

    if (error) throw error;
    return data;
  },

  // Get low stock items
  async getLowStockItems(storeId: string) {
    const { data, error } = await supabase
      .from('items')
      .select('*')
      .eq('store_id', storeId)
      .eq('is_active', true)
      .filter('stock', 'lte', 'low_stock_threshold');

    if (error) throw error;
    return data;
  }
};
```

**File: `src/api/invoices.ts`**

```typescript
import { supabase } from '../lib/supabaseClient';
import type { Invoice, CartItem } from '../types';

export const invoicesAPI = {
  // Create invoice with items
  async createInvoice(storeId: string, invoiceData: {
    customer_name?: string;
    customer_phone?: string;
    customer_id?: string;
    items: CartItem[];
    subtotal: number;
    discount: number;
    discount_type: 'flat' | 'percentage';
    tax: number;
    tax_rate: number;
    total: number;
    payment_method: string;
    notes?: string;
  }) {
    const user = await supabase.auth.getUser();
    if (!user.data.user) throw new Error('Not authenticated');

    // Generate invoice number
    const { data: invNum, error: invNumError } = await supabase
      .rpc('generate_invoice_number', { store_uuid: storeId });
    
    if (invNumError) throw invNumError;

    // Create invoice
    const { data: invoice, error: invoiceError } = await supabase
      .from('invoices')
      .insert({
        store_id: storeId,
        invoice_number: invNum,
        customer_id: invoiceData.customer_id,
        customer_name: invoiceData.customer_name,
        customer_phone: invoiceData.customer_phone,
        subtotal: invoiceData.subtotal,
        discount: invoiceData.discount,
        discount_type: invoiceData.discount_type,
        tax: invoiceData.tax,
        tax_rate: invoiceData.tax_rate,
        total: invoiceData.total,
        payment_method: invoiceData.payment_method,
        payment_status: 'paid',
        status: 'completed',
        notes: invoiceData.notes,
        created_by: user.data.user.id
      })
      .select()
      .single();

    if (invoiceError) throw invoiceError;

    // Create invoice items
    const invoiceItems = invoiceData.items.map(item => ({
      invoice_id: invoice.id,
      item_id: item.id,
      item_name: item.name,
      quantity: item.quantity,
      price: item.price,
      subtotal: item.price * item.quantity
    }));

    const { error: itemsError } = await supabase
      .from('invoice_items')
      .insert(invoiceItems);

    if (itemsError) throw itemsError;

    return invoice;
  },

  // Get invoices for store
  async getInvoices(storeId: string, options?: {
    startDate?: Date;
    endDate?: Date;
    limit?: number;
  }) {
    let query = supabase
      .from('invoices')
      .select(`
        *,
        invoice_items(*)
      `)
      .eq('store_id', storeId)
      .order('created_at', { ascending: false });

    if (options?.startDate) {
      query = query.gte('created_at', options.startDate.toISOString());
    }

    if (options?.endDate) {
      query = query.lte('created_at', options.endDate.toISOString());
    }

    if (options?.limit) {
      query = query.limit(options.limit);
    }

    const { data, error } = await query;

    if (error) throw error;
    return data;
  },

  // Get today's invoices (for cashiers)
  async getTodayInvoices(storeId: string) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const { data, error } = await supabase
      .from('invoices')
      .select(`
        *,
        invoice_items(*)
      `)
      .eq('store_id', storeId)
      .gte('created_at', today.toISOString())
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
  },

  // Get invoice by ID
  async getInvoice(invoiceId: string) {
    const { data, error } = await supabase
      .from('invoices')
      .select(`
        *,
        invoice_items(*)
      `)
      .eq('id', invoiceId)
      .single();

    if (error) throw error;
    return data;
  },

  // Cancel invoice
  async cancelInvoice(invoiceId: string) {
    const { data, error } = await supabase
      .from('invoices')
      .update({ status: 'cancelled' })
      .eq('id', invoiceId)
      .select()
      .single();

    if (error) throw error;
    return data;
  }
};
```

---

## Migration Guide

### Step 1: Supabase Project Setup

1. **Create Supabase Project:**
   - Go to https://supabase.com
   - Click "New Project"
   - Choose organization
   - Set project name: "universal-pos"
   - Set database password (save securely)
   - Select region closest to users

2. **Get API Credentials:**
   - Go to Project Settings → API
   - Copy:
     - Project URL
     - anon/public key

3. **Enable Phone Auth:**
   - Go to Authentication → Providers
   - Enable Phone provider
   - Configure Twilio (recommended) or other SMS provider

4. **Enable Google OAuth:**
   - Go to Authentication → Providers
   - Enable Google provider
   - Add OAuth credentials from Google Cloud Console

### Step 2: Database Setup

1. **Run Schema SQL:**
   - Go to SQL Editor in Supabase dashboard
   - Copy the complete schema from above
   - Run the script
   - Verify all tables created

2. **Enable RLS:**
   - Run all RLS policies
   - Test with sample data
   - Verify isolation between stores

3. **Test Functions:**
   - Create test user
   - Verify profile auto-creation
   - Test invoice number generation

### Step 3: Environment Variables

Update `.env` file:

```bash
# Remove Firebase variables
# VITE_FIREBASE_API_KEY=...
# VITE_FIREBASE_AUTH_DOMAIN=...

# Add Supabase variables
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

### Step 4: Code Migration

1. **Install Supabase Client:**
```bash
npm install @supabase/supabase-js
```

2. **Create Supabase Client:**
   - Create `src/lib/supabaseClient.ts`
   - Initialize client with credentials

3. **Update AuthContext:**
   - Replace Firebase imports with Supabase
   - Update login/signup functions
   - Add phone auth functions

4. **Update Screens:**
   - LoginScreen: Add phone login option
   - SignupScreen: Make phone mandatory
   - Add OTP verification screen

5. **Update API Calls:**
   - Replace Firestore calls with Supabase
   - Use provided API functions

### Step 5: Data Migration

**Option A: Manual (Small Dataset)**
1. Export Firebase data to JSON
2. Transform to Supabase format
3. Import via Supabase dashboard

**Option B: Script (Large Dataset)**
```typescript
// migration-script.ts
import { supabase } from './src/lib/supabaseClient';
import { db } from './src/lib/firebaseClient';
import { collection, getDocs } from 'firebase/firestore';

async function migrateUsers() {
  const usersSnapshot = await getDocs(collection(db, 'users'));
  
  for (const doc of usersSnapshot.docs) {
    const firebaseUser = doc.data();
    
    // Create auth user in Supabase
    const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
      email: firebaseUser.email,
      email_confirm: true,
      user_metadata: {
        name: firebaseUser.name,
        phone: firebaseUser.phone
      }
    });
    
    if (authError) {
      console.error('Failed to create user:', authError);
      continue;
    }
    
    // Profile created automatically via trigger
    
    // Migrate store if exists
    if (firebaseUser.store) {
      await supabase.from('stores').insert({
        owner_id: authUser.user.id,
        name: firebaseUser.store.name,
        type: firebaseUser.store.type,
        language: firebaseUser.store.language,
        currency: firebaseUser.store.currency,
        theme: firebaseUser.store.theme
      });
    }
  }
}

migrateUsers().then(() => console.log('Migration complete'));
```

### Step 6: Testing

1. **Test Authentication:**
   - Email signup
   - Email login
   - Phone OTP login
   - Google OAuth
   - Password reset

2. **Test Permissions:**
   - Owner can see all data
   - Manager has limited access
   - Cashier sees today only

3. **Test Data Flow:**
   - Create items
   - Create invoices
   - Verify stock updates
   - Check customer stats

### Step 7: Deployment

1. Update production environment variables
2. Run database migrations on production
3. Test with staging environment first
4. Migrate data in off-peak hours
5. Monitor error logs
6. Rollback plan ready

---

## Code Examples

### Complete AuthContext with Supabase

**File: `src/contexts/AuthContext.tsx`**

```typescript
import React, { createContext, useContext, useReducer, useEffect, ReactNode } from 'react';
import { supabase } from '../lib/supabaseClient';
import toast from 'react-hot-toast';
import type { User, Store } from '../types';

interface AuthState {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  isOnboarded: boolean;
  error: string | null;
}

type AuthAction =
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_USER'; payload: User | null }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'CLEAR_ERROR' }
  | { type: 'LOGOUT' };

const initialState: AuthState = {
  user: null,
  isLoading: true,
  isAuthenticated: false,
  isOnboarded: false,
  error: null,
};

function authReducer(state: AuthState, action: AuthAction): AuthState {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, isLoading: action.payload };
    case 'SET_USER':
      return {
        ...state,
        user: action.payload,
        isAuthenticated: action.payload !== null,
        isOnboarded: action.payload?.isOnboarded || false,
        isLoading: false,
        error: null,
      };
    case 'SET_ERROR':
      return { ...state, error: action.payload, isLoading: false };
    case 'CLEAR_ERROR':
      return { ...state, error: null };
    case 'LOGOUT':
      return { ...initialState, isLoading: false };
    default:
      return state;
  }
}

interface AuthContextType {
  state: AuthState;
  login: (email: string, password: string) => Promise<boolean>;
  loginWithGoogle: () => Promise<void>;
  loginWithPhone: (phone: string) => Promise<void>;
  verifyPhoneOTP: (phone: string, otp: string) => Promise<boolean>;
  register: (email: string, password: string, name: string, phone: string) => Promise<void>;
  logout: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  completeOnboarding: (storeData: Store) => Promise<void>;
  updateStoreSettings: (updates: Partial<Store>) => Promise<void>;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(authReducer, initialState);

  useEffect(() => {
    // Check active session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        loadUserProfile(session.user.id);
      } else {
        dispatch({ type: 'SET_LOADING', payload: false });
      }
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === 'SIGNED_IN' && session) {
          await loadUserProfile(session.user.id);
        } else if (event === 'SIGNED_OUT') {
          dispatch({ type: 'LOGOUT' });
        }
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const loadUserProfile = async (userId: string) => {
    try {
      // Get profile
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (profileError) throw profileError;

      // Get user's stores
      const { data: stores, error: storesError } = await supabase
        .from('stores')
        .select(`
          *,
          store_members!inner(role, is_active)
        `)
        .eq('store_members.user_id', userId)
        .eq('store_members.is_active', true)
        .eq('is_active', true)
        .limit(1)
        .single();

      const user: User = {
        uid: profile.id,
        email: profile.email,
        name: profile.name,
        phone: profile.phone,
        photoURL: profile.photo_url,
        isOnboarded: stores ? true : false,
        store: stores || undefined,
        createdAt: new Date(profile.created_at),
        lastLoginAt: new Date(profile.last_login_at)
      };

      dispatch({ type: 'SET_USER', payload: user });
    } catch (error: any) {
      console.error('Error loading profile:', error);
      dispatch({ type: 'SET_ERROR', payload: 'Failed to load user profile' });
    }
  };

  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      dispatch({ type: 'CLEAR_ERROR' });
      
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password
      });
      
      if (error) throw error;
      
      toast.success('Login successful!');
      return true;
    } catch (error: any) {
      const errorMessage = error.message || 'Login failed. Please try again.';
      dispatch({ type: 'SET_ERROR', payload: errorMessage });
      toast.error(errorMessage);
      return false;
    }
  };

  const loginWithGoogle = async () => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      dispatch({ type: 'CLEAR_ERROR' });
      
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`
        }
      });
      
      if (error) throw error;
      
      toast.success('Redirecting to Google...');
    } catch (error: any) {
      const errorMessage = error.message || 'Google login failed. Please try again.';
      dispatch({ type: 'SET_ERROR', payload: errorMessage });
      toast.error(errorMessage);
    }
  };

  const loginWithPhone = async (phone: string) => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      dispatch({ type: 'CLEAR_ERROR' });
      
      const { error } = await supabase.auth.signInWithOtp({ phone });
      
      if (error) throw error;
      
      toast.success('OTP sent to your phone!');
    } catch (error: any) {
      const errorMessage = error.message || 'Failed to send OTP. Please try again.';
      dispatch({ type: 'SET_ERROR', payload: errorMessage });
      toast.error(errorMessage);
      throw error;
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  };

  const verifyPhoneOTP = async (phone: string, otp: string): Promise<boolean> => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      dispatch({ type: 'CLEAR_ERROR' });
      
      const { error } = await supabase.auth.verifyOtp({
        phone,
        token: otp,
        type: 'sms'
      });
      
      if (error) throw error;
      
      toast.success('Phone verified successfully!');
      return true;
    } catch (error: any) {
      const errorMessage = error.message || 'Invalid OTP. Please try again.';
      dispatch({ type: 'SET_ERROR', payload: errorMessage });
      toast.error(errorMessage);
      return false;
    }
  };

  const register = async (
    email: string,
    password: string,
    name: string,
    phone: string
  ) => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      dispatch({ type: 'CLEAR_ERROR' });
      
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            name,
            phone
          }
        }
      });
      
      if (error) throw error;
      
      toast.success('Account created! Please check your email to verify.');
    } catch (error: any) {
      const errorMessage = error.message || 'Registration failed. Please try again.';
      dispatch({ type: 'SET_ERROR', payload: errorMessage });
      toast.error(errorMessage);
    }
  };

  const logout = async () => {
    try {
      await supabase.auth.signOut();
      dispatch({ type: 'LOGOUT' });
      toast.success('Logged out successfully');
    } catch (error: any) {
      const errorMessage = 'Logout failed. Please try again.';
      dispatch({ type: 'SET_ERROR', payload: errorMessage });
      toast.error(errorMessage);
    }
  };

  const resetPassword = async (email: string) => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      dispatch({ type: 'CLEAR_ERROR' });
      
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`
      });
      
      if (error) throw error;
      
      toast.success('Password reset email sent!');
    } catch (error: any) {
      const errorMessage = error.message || 'Failed to send reset email.';
      dispatch({ type: 'SET_ERROR', payload: errorMessage });
      toast.error(errorMessage);
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  };

  const completeOnboarding = async (storeData: Store) => {
    try {
      if (!state.user) throw new Error('No authenticated user');
      
      dispatch({ type: 'SET_LOADING', payload: true });
      
      // Create store
      const { data: store, error: storeError } = await supabase
        .from('stores')
        .insert({
          ...storeData,
          owner_id: state.user.uid
        })
        .select()
        .single();
      
      if (storeError) throw storeError;
      
      // Add user as owner
      const { error: memberError } = await supabase
        .from('store_members')
        .insert({
          store_id: store.id,
          user_id: state.user.uid,
          role: 'owner'
        });
      
      if (memberError) throw memberError;
      
      // Reload user profile
      await loadUserProfile(state.user.uid);
      
      toast.success('Store setup completed!');
    } catch (error: any) {
      const errorMessage = 'Failed to complete setup. Please try again.';
      dispatch({ type: 'SET_ERROR', payload: errorMessage });
      toast.error(errorMessage);
    }
  };

  const updateStoreSettings = async (updates: Partial<Store>) => {
    try {
      if (!state.user || !state.user.store) {
        throw new Error('No authenticated user or store');
      }
      
      const { error } = await supabase
        .from('stores')
        .update(updates)
        .eq('id', state.user.store.id);
      
      if (error) throw error;
      
      // Reload user profile
      await loadUserProfile(state.user.uid);
      
      toast.success('Settings updated!');
    } catch (error: any) {
      const errorMessage = 'Failed to update settings. Please try again.';
      dispatch({ type: 'SET_ERROR', payload: errorMessage });
      toast.error(errorMessage);
    }
  };

  const clearError = () => {
    dispatch({ type: 'CLEAR_ERROR' });
  };

  return (
    <AuthContext.Provider
      value={{
        state,
        login,
        loginWithGoogle,
        loginWithPhone,
        verifyPhoneOTP,
        register,
        logout,
        resetPassword,
        completeOnboarding,
        updateStoreSettings,
        clearError,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
```

---

## Environment Setup

### Required Environment Variables

```bash
# Supabase
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here

# Optional: For phone auth with Twilio
VITE_TWILIO_ACCOUNT_SID=your-twilio-sid
VITE_TWILIO_AUTH_TOKEN=your-twilio-token
VITE_TWILIO_PHONE_NUMBER=your-twilio-number
```

### Supabase Dashboard Configuration

1. **Phone Auth Provider:**
   - Authentication → Providers → Phone
   - Enable phone provider
   - Add Twilio credentials
   - Configure message template

2. **Google OAuth:**
   - Authentication → Providers → Google
   - Enable Google provider
   - Add Client ID and Client Secret from Google Cloud Console
   - Add authorized redirect URI

3. **Email Templates:**
   - Authentication → Email Templates
   - Customize signup confirmation email
   - Customize password reset email
   - Add your branding

---

## Testing Strategy

### Unit Tests

```typescript
// Test auth functions
describe('AuthContext', () => {
  it('should login with email and password', async () => {
    const result = await login('test@example.com', 'password123');
    expect(result).toBe(true);
  });

  it('should send OTP to phone', async () => {
    await expect(loginWithPhone('+919876543210')).resolves.not.toThrow();
  });

  it('should verify OTP correctly', async () => {
    const result = await verifyPhoneOTP('+919876543210', '123456');
    expect(result).toBe(true);
  });
});
```

### Integration Tests

```typescript
// Test complete flow
describe('User Signup Flow', () => {
  it('should create user and profile', async () => {
    await register('new@example.com', 'password', 'Test User', '+919876543210');
    
    // Verify profile created
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('email', 'new@example.com')
      .single();
    
    expect(data).toBeDefined();
    expect(data.phone).toBe('+919876543210');
  });
});
```

### Manual Testing Checklist

- [ ] Email signup with mandatory phone
- [ ] Email login
- [ ] Phone OTP login
- [ ] Google OAuth login
- [ ] Google login with phone collection
- [ ] Password reset
- [ ] Profile creation
- [ ] Store creation
- [ ] Owner can see all data
- [ ] Manager has limited access
- [ ] Cashier sees today only
- [ ] Create items
- [ ] Create invoices
- [ ] Stock updates after sale
- [ ] Customer stats update

---

## Deployment Checklist

### Pre-Deployment

- [ ] All tests passing
- [ ] Database schema deployed
- [ ] RLS policies enabled and tested
- [ ] Environment variables configured
- [ ] Phone auth provider configured
- [ ] Google OAuth configured
- [ ] Email templates customized
- [ ] Backup Firebase data
- [ ] Migration script tested on staging
- [ ] Rollback plan documented

### Deployment

- [ ] Deploy database migrations
- [ ] Update production environment variables
- [ ] Run data migration script
- [ ] Verify auth flows
- [ ] Test critical paths
- [ ] Monitor error logs
- [ ] Check performance metrics

### Post-Deployment

- [ ] Notify users of changes
- [ ] Monitor for issues
- [ ] Verify data integrity
- [ ] Test all user roles
- [ ] Check real-time features
- [ ] Verify offline sync
- [ ] Update documentation

---

## Troubleshooting

### Common Issues

**Issue: "Invalid API key"**
- Solution: Check VITE_SUPABASE_ANON_KEY in .env

**Issue: "Row Level Security policy violated"**
- Solution: User not member of store. Check store_members table.

**Issue: "Phone authentication not working"**
- Solution: Verify Twilio credentials in Supabase dashboard.

**Issue: "Profile not created after signup"**
- Solution: Check trigger function `create_profile_for_user`.

**Issue: "Stock not updating after sale"**
- Solution: Check trigger function `reduce_stock_on_sale`.

---

## Support and Resources

### Documentation
- Supabase Docs: https://supabase.com/docs
- Supabase Auth: https://supabase.com/docs/guides/auth
- PostgreSQL Docs: https://www.postgresql.org/docs/

### Community
- Supabase Discord: https://discord.supabase.com
- GitHub Issues: Report bugs and feature requests

---

**Document Version:** 1.0  
**Last Updated:** January 2025  
**Maintainer:** Development Team  
**Status:** Production Ready

---

**END OF DOCUMENT**
