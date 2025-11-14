# Complete Database Setup Guide for Reckoning POS

## Overview
This guide sets up ALL required tables for the Reckoning POS system from scratch.
Run these SQL commands in order in your Supabase SQL Editor.

---

## Step 1: Check Existing Tables

First, let's see what tables you already have:

```sql
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
ORDER BY table_name;
```

**Copy the output and let me know which tables exist.**

---

## Step 2: Create Items Table

```sql
-- Create items table (catalog/inventory)
CREATE TABLE IF NOT EXISTS public.items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'General',
  category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
  price DECIMAL(10, 2) NOT NULL,
  sku TEXT,
  stock INTEGER DEFAULT 0,
  low_stock_threshold INTEGER DEFAULT 5,
  image_url TEXT,
  description TEXT,
  tags TEXT[] DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  created_by UUID NOT NULL REFERENCES auth.users(id)
);

-- Create indexes for items
CREATE INDEX IF NOT EXISTS idx_items_store_id ON public.items(store_id);
CREATE INDEX IF NOT EXISTS idx_items_category_id ON public.items(category_id);
CREATE INDEX IF NOT EXISTS idx_items_sku ON public.items(sku);
CREATE INDEX IF NOT EXISTS idx_items_is_active ON public.items(is_active);
CREATE INDEX IF NOT EXISTS idx_items_tags ON public.items USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_items_name ON public.items(name);

-- Create updated_at trigger for items
CREATE TRIGGER update_items_updated_at BEFORE UPDATE ON public.items
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Add comments
COMMENT ON TABLE public.items IS 'Store catalog items/products';
COMMENT ON COLUMN public.items.category_id IS 'Reference to categories table (new system)';
COMMENT ON COLUMN public.items.category IS 'Legacy text category (for backward compatibility)';
COMMENT ON COLUMN public.items.tags IS 'Item tags for filtering (vegan, spicy, etc.)';
```

---

## Step 3: Create Categories Table

```sql
-- Create categories table
CREATE TABLE IF NOT EXISTS public.categories (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  color TEXT DEFAULT '#FF6B35',
  icon TEXT DEFAULT 'square-3-stack-3d',
  sort_order INTEGER NOT NULL DEFAULT 0,
  parent_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
  metadata JSONB DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  created_by UUID NOT NULL REFERENCES auth.users(id)
);

-- Create indexes for categories
CREATE INDEX IF NOT EXISTS idx_categories_store_id ON public.categories(store_id);
CREATE INDEX IF NOT EXISTS idx_categories_parent_id ON public.categories(parent_id);
CREATE INDEX IF NOT EXISTS idx_categories_sort_order ON public.categories(sort_order);
CREATE INDEX IF NOT EXISTS idx_categories_is_active ON public.categories(is_active);

-- Create updated_at trigger for categories
CREATE TRIGGER update_categories_updated_at BEFORE UPDATE ON public.categories
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Add comment
COMMENT ON TABLE public.categories IS 'Menu categories for organizing items';
```

---

## Step 4: Update Stores Table

```sql
-- Add menu setup tracking columns to stores
ALTER TABLE public.stores
ADD COLUMN IF NOT EXISTS menu_setup_completed BOOLEAN DEFAULT false;

ALTER TABLE public.stores
ADD COLUMN IF NOT EXISTS menu_setup_completed_at TIMESTAMP WITH TIME ZONE;

-- Create index
CREATE INDEX IF NOT EXISTS idx_stores_menu_setup_completed ON public.stores(menu_setup_completed);

-- Add comment
COMMENT ON COLUMN public.stores.menu_setup_completed IS 'Whether initial menu setup wizard is completed';
```

---

## Step 5: Create Invoices Table (if not exists)

```sql
-- Create invoices table
CREATE TABLE IF NOT EXISTS public.invoices (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  invoice_number TEXT NOT NULL,
  customer_id UUID,
  customer_name TEXT,
  customer_phone TEXT,
  subtotal DECIMAL(10, 2) NOT NULL,
  discount DECIMAL(10, 2) DEFAULT 0,
  discount_type TEXT CHECK (discount_type IN ('flat', 'percentage')) DEFAULT 'flat',
  tax DECIMAL(10, 2) NOT NULL,
  tax_rate DECIMAL(5, 2) NOT NULL,
  total DECIMAL(10, 2) NOT NULL,
  payment_method TEXT NOT NULL,
  payment_status TEXT CHECK (payment_status IN ('paid', 'pending', 'failed')) DEFAULT 'paid',
  status TEXT CHECK (status IN ('completed', 'cancelled', 'draft')) DEFAULT 'completed',
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  created_by UUID NOT NULL REFERENCES auth.users(id)
);

-- Create indexes for invoices
CREATE INDEX IF NOT EXISTS idx_invoices_store_id ON public.invoices(store_id);
CREATE INDEX IF NOT EXISTS idx_invoices_invoice_number ON public.invoices(invoice_number);
CREATE INDEX IF NOT EXISTS idx_invoices_created_at ON public.invoices(created_at);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON public.invoices(status);

-- Create updated_at trigger for invoices
CREATE TRIGGER update_invoices_updated_at BEFORE UPDATE ON public.invoices
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Add unique constraint for invoice numbers per store
CREATE UNIQUE INDEX IF NOT EXISTS idx_invoices_store_invoice_number
ON public.invoices(store_id, invoice_number);

-- Add comment
COMMENT ON TABLE public.invoices IS 'Sales invoices';
```

---

## Step 6: Create Invoice Items Table (if not exists)

```sql
-- Create invoice_items table
CREATE TABLE IF NOT EXISTS public.invoice_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  invoice_id UUID NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
  item_id UUID REFERENCES public.items(id) ON DELETE SET NULL,
  item_name TEXT NOT NULL,
  quantity INTEGER NOT NULL,
  price DECIMAL(10, 2) NOT NULL,
  subtotal DECIMAL(10, 2) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create indexes for invoice_items
CREATE INDEX IF NOT EXISTS idx_invoice_items_invoice_id ON public.invoice_items(invoice_id);
CREATE INDEX IF NOT EXISTS idx_invoice_items_item_id ON public.invoice_items(item_id);

-- Add comment
COMMENT ON TABLE public.invoice_items IS 'Line items for invoices';
```

---

## Step 7: Row Level Security (RLS) Policies

### Items Table RLS:

```sql
-- Enable RLS for items
ALTER TABLE public.items ENABLE ROW LEVEL SECURITY;

-- Users can view items from their stores
CREATE POLICY "Users can view items from their stores"
ON public.items FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.store_members sm
    WHERE sm.store_id = items.store_id
    AND sm.user_id = auth.uid()
    AND sm.is_active = true
  )
);

-- Users can insert items to their stores
CREATE POLICY "Users can insert items to their stores"
ON public.items FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.store_members sm
    WHERE sm.store_id = items.store_id
    AND sm.user_id = auth.uid()
    AND sm.is_active = true
    AND sm.role IN ('owner', 'manager')
  )
);

-- Users can update items in their stores
CREATE POLICY "Users can update items in their stores"
ON public.items FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.store_members sm
    WHERE sm.store_id = items.store_id
    AND sm.user_id = auth.uid()
    AND sm.is_active = true
    AND sm.role IN ('owner', 'manager')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.store_members sm
    WHERE sm.store_id = items.store_id
    AND sm.user_id = auth.uid()
    AND sm.is_active = true
    AND sm.role IN ('owner', 'manager')
  )
);

-- Users can delete items from their stores
CREATE POLICY "Users can delete items from their stores"
ON public.items FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.store_members sm
    WHERE sm.store_id = items.store_id
    AND sm.user_id = auth.uid()
    AND sm.is_active = true
    AND sm.role IN ('owner', 'manager')
  )
);
```

### Categories Table RLS:

```sql
-- Enable RLS for categories
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

-- Users can view categories from their stores
CREATE POLICY "Users can view categories from their stores"
ON public.categories FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.store_members sm
    WHERE sm.store_id = categories.store_id
    AND sm.user_id = auth.uid()
    AND sm.is_active = true
  )
);

-- Users can insert categories to their stores
CREATE POLICY "Users can insert categories to their stores"
ON public.categories FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.store_members sm
    WHERE sm.store_id = categories.store_id
    AND sm.user_id = auth.uid()
    AND sm.is_active = true
    AND sm.role IN ('owner', 'manager')
  )
);

-- Users can update categories in their stores
CREATE POLICY "Users can update categories in their stores"
ON public.categories FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.store_members sm
    WHERE sm.store_id = categories.store_id
    AND sm.user_id = auth.uid()
    AND sm.is_active = true
    AND sm.role IN ('owner', 'manager')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.store_members sm
    WHERE sm.store_id = categories.store_id
    AND sm.user_id = auth.uid()
    AND sm.is_active = true
    AND sm.role IN ('owner', 'manager')
  )
);

-- Users can delete categories from their stores
CREATE POLICY "Users can delete categories from their stores"
ON public.categories FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.store_members sm
    WHERE sm.store_id = categories.store_id
    AND sm.user_id = auth.uid()
    AND sm.is_active = true
    AND sm.role IN ('owner', 'manager')
  )
);
```

### Invoices Table RLS:

```sql
-- Enable RLS for invoices
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;

-- Users can view invoices from their stores
CREATE POLICY "Users can view invoices from their stores"
ON public.invoices FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.store_members sm
    WHERE sm.store_id = invoices.store_id
    AND sm.user_id = auth.uid()
    AND sm.is_active = true
  )
);

-- Users can insert invoices to their stores
CREATE POLICY "Users can insert invoices to their stores"
ON public.invoices FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.store_members sm
    WHERE sm.store_id = invoices.store_id
    AND sm.user_id = auth.uid()
    AND sm.is_active = true
  )
);

-- Users can update invoices in their stores
CREATE POLICY "Users can update invoices in their stores"
ON public.invoices FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.store_members sm
    WHERE sm.store_id = invoices.store_id
    AND sm.user_id = auth.uid()
    AND sm.is_active = true
    AND sm.role IN ('owner', 'manager')
  )
);
```

### Invoice Items Table RLS:

```sql
-- Enable RLS for invoice_items
ALTER TABLE public.invoice_items ENABLE ROW LEVEL SECURITY;

-- Users can view invoice items through invoices
CREATE POLICY "Users can view invoice items"
ON public.invoice_items FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.invoices i
    JOIN public.store_members sm ON sm.store_id = i.store_id
    WHERE i.id = invoice_items.invoice_id
    AND sm.user_id = auth.uid()
    AND sm.is_active = true
  )
);

-- Users can insert invoice items
CREATE POLICY "Users can insert invoice items"
ON public.invoice_items FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.invoices i
    JOIN public.store_members sm ON sm.store_id = i.store_id
    WHERE i.id = invoice_items.invoice_id
    AND sm.user_id = auth.uid()
    AND sm.is_active = true
  )
);
```

---

## Step 8: Helper Functions

### Update Updated At Column Function:

```sql
-- Function to update updated_at column
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = timezone('utc'::text, now());
  RETURN NEW;
END;
$$ language 'plpgsql';
```

### Update Category Sort Orders:

```sql
-- Function to update category sort orders
CREATE OR REPLACE FUNCTION update_category_sort_orders(
  category_ids UUID[],
  new_orders INTEGER[]
)
RETURNS void AS $$
DECLARE
  i INTEGER;
BEGIN
  FOR i IN 1..array_length(category_ids, 1) LOOP
    UPDATE public.categories
    SET sort_order = new_orders[i]
    WHERE id = category_ids[i];
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION update_category_sort_orders TO authenticated;
```

### Get Category Hierarchy:

```sql
-- Recursive function to get category with all nested children
CREATE OR REPLACE FUNCTION get_category_hierarchy(
  p_store_id UUID,
  p_parent_id UUID DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  name TEXT,
  description TEXT,
  color TEXT,
  icon TEXT,
  sort_order INTEGER,
  parent_id UUID,
  depth INTEGER
) AS $$
BEGIN
  RETURN QUERY
  WITH RECURSIVE category_tree AS (
    -- Base case: top-level categories
    SELECT
      c.id,
      c.name,
      c.description,
      c.color,
      c.icon,
      c.sort_order,
      c.parent_id,
      0 as depth
    FROM public.categories c
    WHERE c.store_id = p_store_id
    AND c.parent_id IS NULL
    AND c.is_active = true

    UNION ALL

    -- Recursive case: child categories
    SELECT
      c.id,
      c.name,
      c.description,
      c.color,
      c.icon,
      c.sort_order,
      c.parent_id,
      ct.depth + 1
    FROM public.categories c
    INNER JOIN category_tree ct ON c.parent_id = ct.id
    WHERE c.store_id = p_store_id
    AND c.is_active = true
  )
  SELECT * FROM category_tree
  ORDER BY depth, sort_order;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION get_category_hierarchy TO authenticated;
```

### Create Default Categories:

```sql
-- Function to create default categories for a new store
CREATE OR REPLACE FUNCTION create_default_categories(
  p_store_id UUID,
  p_store_type TEXT,
  p_user_id UUID
)
RETURNS void AS $$
BEGIN
  -- Restaurant/Cafe categories
  IF p_store_type IN ('restaurant', 'cafe') THEN
    INSERT INTO public.categories (store_id, name, description, color, icon, sort_order, created_by)
    VALUES
      (p_store_id, 'Appetizers', 'Starters and small bites', '#F59E0B', 'sparkles', 1, p_user_id),
      (p_store_id, 'Main Course', 'Main dishes and entrees', '#EF4444', 'fire', 2, p_user_id),
      (p_store_id, 'Desserts', 'Sweet treats and desserts', '#EC4899', 'cake', 3, p_user_id),
      (p_store_id, 'Beverages', 'Drinks and refreshments', '#3B82F6', 'beaker', 4, p_user_id),
      (p_store_id, 'Sides', 'Side dishes and extras', '#10B981', 'squares-plus', 5, p_user_id);

  -- Retail categories
  ELSIF p_store_type = 'retail' THEN
    INSERT INTO public.categories (store_id, name, description, color, icon, sort_order, created_by)
    VALUES
      (p_store_id, 'Electronics', 'Electronic devices and accessories', '#3B82F6', 'cpu-chip', 1, p_user_id),
      (p_store_id, 'Clothing', 'Apparel and accessories', '#EC4899', 'shopping-bag', 2, p_user_id),
      (p_store_id, 'Home & Garden', 'Home decor and garden supplies', '#10B981', 'home', 3, p_user_id),
      (p_store_id, 'Sports', 'Sports equipment and gear', '#F59E0B', 'trophy', 4, p_user_id);

  -- Salon categories
  ELSIF p_store_type = 'salon' THEN
    INSERT INTO public.categories (store_id, name, description, color, icon, sort_order, created_by)
    VALUES
      (p_store_id, 'Hair Services', 'Haircuts, styling, and treatments', '#EC4899', 'scissors', 1, p_user_id),
      (p_store_id, 'Spa Services', 'Massage and spa treatments', '#3B82F6', 'heart', 2, p_user_id),
      (p_store_id, 'Beauty Services', 'Makeup, nails, and skincare', '#F59E0B', 'sparkles', 3, p_user_id);

  -- Pharmacy categories
  ELSIF p_store_type = 'pharmacy' THEN
    INSERT INTO public.categories (store_id, name, description, color, icon, sort_order, created_by)
    VALUES
      (p_store_id, 'Prescription', 'Prescription medications', '#EF4444', 'clipboard-document-list', 1, p_user_id),
      (p_store_id, 'Over-the-Counter', 'OTC medications and supplements', '#3B82F6', 'beaker', 2, p_user_id),
      (p_store_id, 'Personal Care', 'Personal hygiene and care products', '#10B981', 'heart', 3, p_user_id);

  -- Generic categories for other types
  ELSE
    INSERT INTO public.categories (store_id, name, description, color, icon, sort_order, created_by)
    VALUES
      (p_store_id, 'Products', 'All products and services', '#FF6B35', 'cube', 1, p_user_id),
      (p_store_id, 'Services', 'Service offerings', '#3B82F6', 'wrench-screwdriver', 2, p_user_id);
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION create_default_categories TO authenticated;
```

### Generate Invoice Number:

```sql
-- Function to generate sequential invoice numbers per store
CREATE OR REPLACE FUNCTION generate_invoice_number(
  store_uuid UUID
)
RETURNS TEXT AS $$
DECLARE
  next_number INTEGER;
  invoice_number TEXT;
BEGIN
  -- Get the next invoice number for this store
  SELECT COALESCE(MAX(
    CASE
      WHEN invoice_number ~ '^\d+$' THEN invoice_number::INTEGER
      ELSE 0
    END
  ), 0) + 1
  INTO next_number
  FROM public.invoices
  WHERE store_id = store_uuid;

  -- Format: INV-00001
  invoice_number := 'INV-' || LPAD(next_number::TEXT, 5, '0');

  RETURN invoice_number;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION generate_invoice_number TO authenticated;
```

### Update Item Stock:

```sql
-- Function to update item stock atomically
CREATE OR REPLACE FUNCTION update_item_stock(
  item_uuid UUID,
  quantity_change INTEGER
)
RETURNS void AS $$
BEGIN
  UPDATE public.items
  SET stock = GREATEST(0, stock + quantity_change)
  WHERE id = item_uuid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION update_item_stock TO authenticated;
```

---

## Step 9: Verification

Run this to verify everything is set up correctly:

```sql
-- Check if all tables exist
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN ('items', 'categories', 'stores', 'invoices', 'invoice_items', 'store_members', 'profiles')
ORDER BY table_name;

-- Check if columns were added to items
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'items'
AND column_name IN ('category_id', 'tags');

-- Check if columns were added to stores
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'stores'
AND column_name IN ('menu_setup_completed', 'menu_setup_completed_at');

-- Check RLS policies
SELECT schemaname, tablename, policyname
FROM pg_policies
WHERE tablename IN ('items', 'categories', 'invoices', 'invoice_items')
ORDER BY tablename, policyname;

-- Check functions
SELECT routine_name
FROM information_schema.routines
WHERE routine_schema = 'public'
AND routine_name IN (
  'update_updated_at_column',
  'update_category_sort_orders',
  'get_category_hierarchy',
  'create_default_categories',
  'generate_invoice_number',
  'update_item_stock'
)
ORDER BY routine_name;
```

---

## Summary

You should now have:
- ✅ `items` table with all fields
- ✅ `categories` table with hierarchy support
- ✅ `invoices` and `invoice_items` tables
- ✅ Updated `stores` table with menu_setup tracking
- ✅ All RLS policies for security
- ✅ All helper functions

**Next step:** Test the application!
