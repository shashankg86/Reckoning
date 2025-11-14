-- =============================================================================
-- MISSING TABLES SETUP FOR RECKONING POS
-- Run this in Supabase SQL Editor
-- =============================================================================
-- You already have: categories, onboarding_progress, profiles, store_members, stores
-- This script creates: items, invoices, invoice_items, and all related objects
-- =============================================================================

-- -----------------------------------------------------------------------------
-- STEP 1: Create update_updated_at_column function (if not exists)
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = timezone('utc'::text, now());
  RETURN NEW;
END;
$$ language 'plpgsql';


-- -----------------------------------------------------------------------------
-- STEP 2: Update stores table with menu setup tracking
-- -----------------------------------------------------------------------------

ALTER TABLE public.stores
ADD COLUMN IF NOT EXISTS menu_setup_completed BOOLEAN DEFAULT false;

ALTER TABLE public.stores
ADD COLUMN IF NOT EXISTS menu_setup_completed_at TIMESTAMP WITH TIME ZONE;

CREATE INDEX IF NOT EXISTS idx_stores_menu_setup_completed ON public.stores(menu_setup_completed);

COMMENT ON COLUMN public.stores.menu_setup_completed IS 'Whether initial menu setup wizard is completed';


-- -----------------------------------------------------------------------------
-- STEP 3: Create items table
-- -----------------------------------------------------------------------------

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
DROP TRIGGER IF EXISTS update_items_updated_at ON public.items;
CREATE TRIGGER update_items_updated_at BEFORE UPDATE ON public.items
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Add comments
COMMENT ON TABLE public.items IS 'Store catalog items/products';
COMMENT ON COLUMN public.items.category_id IS 'Reference to categories table';
COMMENT ON COLUMN public.items.category IS 'Legacy text category (for backward compatibility)';
COMMENT ON COLUMN public.items.tags IS 'Item tags for filtering (vegan, spicy, etc.)';


-- -----------------------------------------------------------------------------
-- STEP 4: Create invoices table
-- -----------------------------------------------------------------------------

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
DROP TRIGGER IF EXISTS update_invoices_updated_at ON public.invoices;
CREATE TRIGGER update_invoices_updated_at BEFORE UPDATE ON public.invoices
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Add unique constraint for invoice numbers per store
CREATE UNIQUE INDEX IF NOT EXISTS idx_invoices_store_invoice_number
ON public.invoices(store_id, invoice_number);

-- Add comment
COMMENT ON TABLE public.invoices IS 'Sales invoices';


-- -----------------------------------------------------------------------------
-- STEP 5: Create invoice_items table
-- -----------------------------------------------------------------------------

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


-- -----------------------------------------------------------------------------
-- STEP 6: Row Level Security (RLS) Policies - Items
-- -----------------------------------------------------------------------------

ALTER TABLE public.items ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view items from their stores" ON public.items;
DROP POLICY IF EXISTS "Users can insert items to their stores" ON public.items;
DROP POLICY IF EXISTS "Users can update items in their stores" ON public.items;
DROP POLICY IF EXISTS "Users can delete items from their stores" ON public.items;

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


-- -----------------------------------------------------------------------------
-- STEP 7: Row Level Security (RLS) Policies - Invoices
-- -----------------------------------------------------------------------------

ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view invoices from their stores" ON public.invoices;
DROP POLICY IF EXISTS "Users can insert invoices to their stores" ON public.invoices;
DROP POLICY IF EXISTS "Users can update invoices in their stores" ON public.invoices;

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


-- -----------------------------------------------------------------------------
-- STEP 8: Row Level Security (RLS) Policies - Invoice Items
-- -----------------------------------------------------------------------------

ALTER TABLE public.invoice_items ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view invoice items" ON public.invoice_items;
DROP POLICY IF EXISTS "Users can insert invoice items" ON public.invoice_items;

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


-- -----------------------------------------------------------------------------
-- STEP 9: Helper Functions
-- -----------------------------------------------------------------------------

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

GRANT EXECUTE ON FUNCTION update_category_sort_orders TO authenticated;


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

GRANT EXECUTE ON FUNCTION get_category_hierarchy TO authenticated;


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

GRANT EXECUTE ON FUNCTION create_default_categories TO authenticated;


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

GRANT EXECUTE ON FUNCTION generate_invoice_number TO authenticated;


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

GRANT EXECUTE ON FUNCTION update_item_stock TO authenticated;


-- Function to get low stock items
CREATE OR REPLACE FUNCTION get_low_stock_items(
  store_uuid UUID
)
RETURNS TABLE (
  id UUID,
  name TEXT,
  stock INTEGER,
  low_stock_threshold INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    i.id,
    i.name,
    i.stock,
    i.low_stock_threshold
  FROM public.items i
  WHERE i.store_id = store_uuid
  AND i.is_active = true
  AND i.stock <= i.low_stock_threshold
  ORDER BY i.stock ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION get_low_stock_items TO authenticated;


-- =============================================================================
-- VERIFICATION QUERIES
-- =============================================================================

-- Check if all tables exist
SELECT 'Tables created:' as status;
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN ('items', 'invoices', 'invoice_items')
ORDER BY table_name;

-- Check if columns were added to stores
SELECT 'Stores table columns:' as status;
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'stores'
AND column_name IN ('menu_setup_completed', 'menu_setup_completed_at');

-- Check RLS policies
SELECT 'RLS Policies:' as status;
SELECT tablename, policyname
FROM pg_policies
WHERE tablename IN ('items', 'invoices', 'invoice_items')
ORDER BY tablename, policyname;

-- Check functions
SELECT 'Helper Functions:' as status;
SELECT routine_name
FROM information_schema.routines
WHERE routine_schema = 'public'
AND routine_name IN (
  'update_category_sort_orders',
  'get_category_hierarchy',
  'create_default_categories',
  'generate_invoice_number',
  'update_item_stock',
  'get_low_stock_items'
)
ORDER BY routine_name;

SELECT '✅ Setup complete!' as status;
