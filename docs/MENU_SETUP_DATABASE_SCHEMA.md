# Menu Setup System - Database Schema Guide

## Overview
This guide will help you set up the database schema in Supabase for the menu creation system.

---

## Step 1: Create `categories` Table

Go to **Supabase Dashboard → SQL Editor** and run this SQL:

```sql
-- Create categories table
CREATE TABLE IF NOT EXISTS public.categories (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  color TEXT DEFAULT '#FF6B35', -- Default orange color
  icon TEXT DEFAULT 'square-3-stack-3d', -- Heroicon name
  sort_order INTEGER NOT NULL DEFAULT 0,
  parent_id UUID REFERENCES public.categories(id) ON DELETE SET NULL, -- For nested categories
  metadata JSONB DEFAULT '{}', -- For future extensibility
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  created_by UUID NOT NULL REFERENCES auth.users(id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_categories_store_id ON public.categories(store_id);
CREATE INDEX IF NOT EXISTS idx_categories_parent_id ON public.categories(parent_id);
CREATE INDEX IF NOT EXISTS idx_categories_sort_order ON public.categories(sort_order);
CREATE INDEX IF NOT EXISTS idx_categories_is_active ON public.categories(is_active);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = timezone('utc'::text, now());
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_categories_updated_at BEFORE UPDATE ON public.categories
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Add comment
COMMENT ON TABLE public.categories IS 'Menu categories for organizing items';
```

---

## Step 2: Update `items` Table

Add category relationship to items:

```sql
-- Add category_id column to items table
ALTER TABLE public.items
ADD COLUMN IF NOT EXISTS category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL;

-- Add tags for filtering (vegan, gluten-free, etc.)
ALTER TABLE public.items
ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}';

-- Create index
CREATE INDEX IF NOT EXISTS idx_items_category_id ON public.items(category_id);
CREATE INDEX IF NOT EXISTS idx_items_tags ON public.items USING GIN(tags);

-- Add comment
COMMENT ON COLUMN public.items.category_id IS 'Category this item belongs to';
COMMENT ON COLUMN public.items.tags IS 'Item tags for filtering (vegan, spicy, etc.)';
```

---

## Step 3: Update `stores` Table

Track menu setup completion:

```sql
-- Add menu setup tracking columns
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

## Step 4: Row Level Security (RLS) Policies

### Categories Table RLS:

```sql
-- Enable RLS
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view categories from their stores
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

-- Policy: Users can insert categories to their stores
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

-- Policy: Users can update categories in their stores
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

-- Policy: Users can delete categories from their stores
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

---

## Step 5: Helper Functions

### Function to reorder categories:

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

### Function to get category hierarchy:

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

---

## Step 6: Seed Default Categories (Optional)

You can create default categories for new stores:

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

---

## Step 7: Verify Setup

Run this query to verify everything is set up correctly:

```sql
-- Check if tables exist
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN ('categories', 'items', 'stores');

-- Check if columns were added
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'items'
AND column_name IN ('category_id', 'tags');

SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'stores'
AND column_name IN ('menu_setup_completed', 'menu_setup_completed_at');

-- Check RLS policies
SELECT schemaname, tablename, policyname
FROM pg_policies
WHERE tablename = 'categories';
```

---

## Next Steps

After completing the database setup:
1. Verify all queries ran successfully
2. Check RLS policies are active
3. Confirm no errors in Supabase logs
4. Ready to implement frontend components

---

## Rollback (If Needed)

If you need to undo these changes:

```sql
-- Drop categories table and related objects
DROP FUNCTION IF EXISTS update_category_sort_orders CASCADE;
DROP FUNCTION IF EXISTS get_category_hierarchy CASCADE;
DROP FUNCTION IF EXISTS create_default_categories CASCADE;
DROP TABLE IF EXISTS public.categories CASCADE;

-- Remove columns from items
ALTER TABLE public.items DROP COLUMN IF EXISTS category_id;
ALTER TABLE public.items DROP COLUMN IF EXISTS tags;

-- Remove columns from stores
ALTER TABLE public.stores DROP COLUMN IF EXISTS menu_setup_completed;
ALTER TABLE public.stores DROP COLUMN IF EXISTS menu_setup_completed_at;
```
