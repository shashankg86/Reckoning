-- ============================================================================
-- Migration: Add Multi-Language Content System
-- Version: 1.0.0
-- Author: Universal POS Team
-- Date: 2025-10-15
-- Description: Implements comprehensive multi-language support for all user-facing content
--              Supports EN (English), HI (Hindi), AR (Arabic)
-- Dependencies: Requires 20251015110000_add_user_preferences_system.sql
-- Rollback: See rollback section at end of file
-- ============================================================================

-- ============================================================================
-- SECTION 1: CREATE CATEGORIES TABLE WITH MULTI-LANGUAGE SUPPORT
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    store_id UUID REFERENCES public.stores(id) ON DELETE CASCADE NOT NULL,
    
    -- Multi-language category names
    name TEXT NOT NULL,
    name_hi TEXT,
    name_ar TEXT,
    
    -- Multi-language descriptions
    description TEXT,
    description_hi TEXT,
    description_ar TEXT,
    
    -- Display and ordering
    display_order INTEGER NOT NULL DEFAULT 0,
    color_code TEXT,
    icon TEXT,
    image_url TEXT,
    
    -- Status and metadata
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id),
    
    -- Constraints
    CONSTRAINT category_name_length CHECK (char_length(name) >= 2 AND char_length(name) <= 100),
    CONSTRAINT unique_category_per_store UNIQUE(store_id, name),
    CONSTRAINT valid_color_code CHECK (color_code IS NULL OR color_code ~ '^#[0-9A-Fa-f]{6}$')
);

-- Indexes for categories
CREATE INDEX IF NOT EXISTS idx_categories_store_active 
ON public.categories(store_id, display_order) 
WHERE is_active = TRUE;

CREATE INDEX IF NOT EXISTS idx_categories_store_order 
ON public.categories(store_id, display_order ASC);

-- Full-text search indexes for all languages
CREATE INDEX IF NOT EXISTS idx_categories_name_search_en 
ON public.categories USING gin(to_tsvector('english', name));

CREATE INDEX IF NOT EXISTS idx_categories_name_search_hi 
ON public.categories USING gin(to_tsvector('simple', name_hi))
WHERE name_hi IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_categories_name_search_ar 
ON public.categories USING gin(to_tsvector('simple', name_ar))
WHERE name_ar IS NOT NULL;

-- Table comments
COMMENT ON TABLE public.categories IS 'Product categories with multi-language support (EN/HI/AR)';
COMMENT ON COLUMN public.categories.name IS 'Category name in English (required)';
COMMENT ON COLUMN public.categories.name_hi IS 'Category name in Hindi (optional)';
COMMENT ON COLUMN public.categories.name_ar IS 'Category name in Arabic (optional)';
COMMENT ON COLUMN public.categories.display_order IS 'Order for displaying categories (lower numbers first)';
COMMENT ON COLUMN public.categories.color_code IS 'Hex color code for category badge/icon (#RRGGBB)';

-- ============================================================================
-- SECTION 2: UPDATE ITEMS TABLE - Add Multi-Language Support
-- ============================================================================

DO $$ 
BEGIN
    -- Add multi-language name columns
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'items' 
        AND column_name = 'name_hi'
    ) THEN
        ALTER TABLE public.items ADD COLUMN name_hi TEXT;
        RAISE NOTICE 'Added name_hi column to items table';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'items' 
        AND column_name = 'name_ar'
    ) THEN
        ALTER TABLE public.items ADD COLUMN name_ar TEXT;
        RAISE NOTICE 'Added name_ar column to items table';
    END IF;

    -- Add multi-language description columns
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'items' 
        AND column_name = 'description_hi'
    ) THEN
        ALTER TABLE public.items ADD COLUMN description_hi TEXT;
        RAISE NOTICE 'Added description_hi column to items table';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'items' 
        AND column_name = 'description_ar'
    ) THEN
        ALTER TABLE public.items ADD COLUMN description_ar TEXT;
        RAISE NOTICE 'Added description_ar column to items table';
    END IF;

    -- Add category_id reference (upgrade from TEXT category to UUID reference)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'items' 
        AND column_name = 'category_id'
    ) THEN
        ALTER TABLE public.items ADD COLUMN category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL;
        RAISE NOTICE 'Added category_id column to items table';
    END IF;

    -- Add variants support (for sizes, flavors, etc.)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'items' 
        AND column_name = 'has_variants'
    ) THEN
        ALTER TABLE public.items ADD COLUMN has_variants BOOLEAN NOT NULL DEFAULT FALSE;
        RAISE NOTICE 'Added has_variants column to items table';
    END IF;

    -- Add is_veg flag (important for India market)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'items' 
        AND column_name = 'is_veg'
    ) THEN
        ALTER TABLE public.items ADD COLUMN is_veg BOOLEAN DEFAULT TRUE;
        RAISE NOTICE 'Added is_veg column to items table';
    END IF;

    -- Add allergen information
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'items' 
        AND column_name = 'allergens'
    ) THEN
        ALTER TABLE public.items ADD COLUMN allergens TEXT[];
        RAISE NOTICE 'Added allergens column to items table';
    END IF;

    -- Add cost_price for profit calculations
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'items' 
        AND column_name = 'cost_price'
    ) THEN
        ALTER TABLE public.items ADD COLUMN cost_price DECIMAL(10,2) DEFAULT 0 CHECK (cost_price >= 0);
        RAISE NOTICE 'Added cost_price column to items table';
    END IF;

    -- Add tax_rate (item-specific tax rate override)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'items' 
        AND column_name = 'tax_rate'
    ) THEN
        ALTER TABLE public.items ADD COLUMN tax_rate DECIMAL(5,2) CHECK (tax_rate IS NULL OR (tax_rate >= 0 AND tax_rate <= 100));
        RAISE NOTICE 'Added tax_rate column to items table';
    END IF;
END $$;

-- Create indexes for new columns
CREATE INDEX IF NOT EXISTS idx_items_category_id 
ON public.items(category_id) 
WHERE is_active = TRUE;

CREATE INDEX IF NOT EXISTS idx_items_has_variants 
ON public.items(store_id, has_variants) 
WHERE is_active = TRUE;

CREATE INDEX IF NOT EXISTS idx_items_is_veg 
ON public.items(store_id, is_veg) 
WHERE is_active = TRUE;

-- Full-text search indexes for multi-language item names
CREATE INDEX IF NOT EXISTS idx_items_name_search_hi 
ON public.items USING gin(to_tsvector('simple', name_hi))
WHERE name_hi IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_items_name_search_ar 
ON public.items USING gin(to_tsvector('simple', name_ar))
WHERE name_ar IS NOT NULL;

-- Add comments
COMMENT ON COLUMN public.items.name_hi IS 'Item name in Hindi (optional)';
COMMENT ON COLUMN public.items.name_ar IS 'Item name in Arabic (optional)';
COMMENT ON COLUMN public.items.description_hi IS 'Item description in Hindi (optional)';
COMMENT ON COLUMN public.items.description_ar IS 'Item description in Arabic (optional)';
COMMENT ON COLUMN public.items.category_id IS 'Reference to categories table (replaces TEXT category)';
COMMENT ON COLUMN public.items.has_variants IS 'Whether item has variants (sizes, flavors, etc.)';
COMMENT ON COLUMN public.items.is_veg IS 'Vegetarian flag (important for Indian market)';
COMMENT ON COLUMN public.items.allergens IS 'Array of allergen codes (nuts, dairy, gluten, etc.)';
COMMENT ON COLUMN public.items.cost_price IS 'Cost price for profit margin calculations';
COMMENT ON COLUMN public.items.tax_rate IS 'Item-specific tax rate (overrides store default)';

-- ============================================================================
-- SECTION 3: CREATE ITEM VARIANTS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.item_variants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    item_id UUID REFERENCES public.items(id) ON DELETE CASCADE NOT NULL,
    
    -- Variant details
    name TEXT NOT NULL,
    name_hi TEXT,
    name_ar TEXT,
    
    -- Pricing
    price DECIMAL(10,2) NOT NULL CHECK (price >= 0),
    cost_price DECIMAL(10,2) DEFAULT 0 CHECK (cost_price >= 0),
    
    -- Inventory
    sku TEXT,
    stock INTEGER DEFAULT 0 CHECK (stock >= 0),
    
    -- Display
    display_order INTEGER NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    is_default BOOLEAN NOT NULL DEFAULT FALSE,
    
    -- Metadata
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT variant_name_length CHECK (char_length(name) >= 1 AND char_length(name) <= 100),
    CONSTRAINT unique_variant_sku UNIQUE(sku) DEFERRABLE INITIALLY DEFERRED
);

-- Indexes for variants
CREATE INDEX IF NOT EXISTS idx_item_variants_item 
ON public.item_variants(item_id, display_order);

CREATE INDEX IF NOT EXISTS idx_item_variants_sku 
ON public.item_variants(sku) 
WHERE sku IS NOT NULL;

COMMENT ON TABLE public.item_variants IS 'Item variants (sizes, flavors, etc.) with multi-language support';
COMMENT ON COLUMN public.item_variants.is_default IS 'Default variant to show when item is selected';

-- ============================================================================
-- SECTION 4: CREATE ITEM ADDONS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.item_addons (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    item_id UUID REFERENCES public.items(id) ON DELETE CASCADE NOT NULL,
    
    -- Addon details
    name TEXT NOT NULL,
    name_hi TEXT,
    name_ar TEXT,
    
    -- Pricing
    price DECIMAL(10,2) NOT NULL DEFAULT 0 CHECK (price >= 0),
    
    -- Display
    display_order INTEGER NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    max_selection INTEGER,
    
    -- Metadata
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT addon_name_length CHECK (char_length(name) >= 1 AND char_length(name) <= 100)
);

-- Indexes for addons
CREATE INDEX IF NOT EXISTS idx_item_addons_item 
ON public.item_addons(item_id, display_order) 
WHERE is_active = TRUE;

COMMENT ON TABLE public.item_addons IS 'Item add-ons/extras (toppings, extras, etc.) with multi-language support';
COMMENT ON COLUMN public.item_addons.max_selection IS 'Maximum number of times this addon can be selected (NULL = unlimited)';

-- ============================================================================
-- SECTION 5: UPDATE CUSTOMERS TABLE - Multi-Language Support
-- ============================================================================

DO $$ 
BEGIN
    -- Add name_local for native script names
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'customers' 
        AND column_name = 'name_local'
    ) THEN
        ALTER TABLE public.customers ADD COLUMN name_local TEXT;
        RAISE NOTICE 'Added name_local column to customers table';
    END IF;

    -- Add preferred_language
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'customers' 
        AND column_name = 'preferred_language'
    ) THEN
        ALTER TABLE public.customers ADD COLUMN preferred_language TEXT DEFAULT 'en';
        RAISE NOTICE 'Added preferred_language column to customers table';
    END IF;
END $$;

COMMENT ON COLUMN public.customers.name_local IS 'Customer name in their local language (Hindi/Arabic script)';
COMMENT ON COLUMN public.customers.preferred_language IS 'Customer preferred language for communications';

-- ============================================================================
-- SECTION 6: CREATE HELPER FUNCTIONS FOR MULTI-LANGUAGE CONTENT
-- ============================================================================

-- Function to get localized item name
CREATE OR REPLACE FUNCTION public.get_localized_item_name(
    p_item_id UUID,
    p_language TEXT DEFAULT 'en'
)
RETURNS TEXT
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
DECLARE
    v_name TEXT;
BEGIN
    SELECT 
        CASE p_language
            WHEN 'hi' THEN COALESCE(name_hi, name)
            WHEN 'ar' THEN COALESCE(name_ar, name)
            ELSE name
        END
    INTO v_name
    FROM public.items
    WHERE id = p_item_id;
    
    RETURN v_name;
END;
$$;

COMMENT ON FUNCTION public.get_localized_item_name IS 'Returns item name in specified language (fallback to English)';

-- Function to get localized category name
CREATE OR REPLACE FUNCTION public.get_localized_category_name(
    p_category_id UUID,
    p_language TEXT DEFAULT 'en'
)
RETURNS TEXT
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
DECLARE
    v_name TEXT;
BEGIN
    SELECT 
        CASE p_language
            WHEN 'hi' THEN COALESCE(name_hi, name)
            WHEN 'ar' THEN COALESCE(name_ar, name)
            ELSE name
        END
    INTO v_name
    FROM public.categories
    WHERE id = p_category_id;
    
    RETURN v_name;
END;
$$;

COMMENT ON FUNCTION public.get_localized_category_name IS 'Returns category name in specified language (fallback to English)';

-- Function to search items across all languages
CREATE OR REPLACE FUNCTION public.search_items_multilang(
    p_store_id UUID,
    p_search_query TEXT,
    p_language TEXT DEFAULT 'en'
)
RETURNS TABLE(
    id UUID,
    name TEXT,
    category TEXT,
    price DECIMAL,
    image_url TEXT,
    is_active BOOLEAN,
    relevance_score FLOAT
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        i.id,
        CASE p_language
            WHEN 'hi' THEN COALESCE(i.name_hi, i.name)
            WHEN 'ar' THEN COALESCE(i.name_ar, i.name)
            ELSE i.name
        END AS name,
        CASE p_language
            WHEN 'hi' THEN COALESCE(c.name_hi, c.name)
            WHEN 'ar' THEN COALESCE(c.name_ar, c.name)
            ELSE c.name
        END AS category,
        i.price,
        i.image_url,
        i.is_active,
        -- Calculate relevance score
        GREATEST(
            SIMILARITY(LOWER(i.name), LOWER(p_search_query)),
            SIMILARITY(LOWER(COALESCE(i.name_hi, '')), LOWER(p_search_query)),
            SIMILARITY(LOWER(COALESCE(i.name_ar, '')), LOWER(p_search_query))
        ) AS relevance_score
    FROM public.items i
    LEFT JOIN public.categories c ON c.id = i.category_id
    WHERE i.store_id = p_store_id
        AND i.is_active = TRUE
        AND (
            i.name ILIKE '%' || p_search_query || '%'
            OR i.name_hi ILIKE '%' || p_search_query || '%'
            OR i.name_ar ILIKE '%' || p_search_query || '%'
            OR i.sku ILIKE '%' || p_search_query || '%'
        )
    ORDER BY relevance_score DESC, i.name ASC
    LIMIT 50;
END;
$$;

-- Enable pg_trgm extension for similarity search
CREATE EXTENSION IF NOT EXISTS pg_trgm;

COMMENT ON FUNCTION public.search_items_multilang IS 'Search items across all languages with relevance scoring';

-- ============================================================================
-- SECTION 7: ENABLE RLS AND CREATE POLICIES
-- ============================================================================

-- Enable RLS on new tables
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.item_variants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.item_addons ENABLE ROW LEVEL SECURITY;

-- Categories policies
CREATE POLICY "Store members can view categories"
ON public.categories FOR SELECT
USING (
    store_id IN (
        SELECT store_id FROM public.store_members
        WHERE user_id = auth.uid() AND is_active = TRUE
    )
);

CREATE POLICY "Owners and managers can manage categories"
ON public.categories FOR ALL
USING (
    store_id IN (
        SELECT store_id FROM public.store_members
        WHERE user_id = auth.uid() 
            AND role IN ('owner', 'manager')
            AND is_active = TRUE
    )
);

-- Item variants policies
CREATE POLICY "Store members can view variants"
ON public.item_variants FOR SELECT
USING (
    item_id IN (
        SELECT i.id FROM public.items i
        JOIN public.store_members sm ON sm.store_id = i.store_id
        WHERE sm.user_id = auth.uid() AND sm.is_active = TRUE
    )
);

CREATE POLICY "Owners and managers can manage variants"
ON public.item_variants FOR ALL
USING (
    item_id IN (
        SELECT i.id FROM public.items i
        JOIN public.store_members sm ON sm.store_id = i.store_id
        WHERE sm.user_id = auth.uid() 
            AND sm.role IN ('owner', 'manager')
            AND sm.is_active = TRUE
    )
);

-- Item addons policies
CREATE POLICY "Store members can view addons"
ON public.item_addons FOR SELECT
USING (
    item_id IN (
        SELECT i.id FROM public.items i
        JOIN public.store_members sm ON sm.store_id = i.store_id
        WHERE sm.user_id = auth.uid() AND sm.is_active = TRUE
    )
);

CREATE POLICY "Owners and managers can manage addons"
ON public.item_addons FOR ALL
USING (
    item_id IN (
        SELECT i.id FROM public.items i
        JOIN public.store_members sm ON sm.store_id = i.store_id
        WHERE sm.user_id = auth.uid() 
            AND sm.role IN ('owner', 'manager')
            AND sm.is_active = TRUE
    )
);

-- ============================================================================
-- SECTION 8: CREATE TRIGGERS
-- ============================================================================

-- Trigger for categories updated_at
CREATE TRIGGER update_categories_updated_at
BEFORE UPDATE ON public.categories
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger for item_variants updated_at
CREATE TRIGGER update_item_variants_updated_at
BEFORE UPDATE ON public.item_variants
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================================
-- SECTION 9: DATA MIGRATION
-- ============================================================================

-- Migrate existing TEXT categories to categories table
INSERT INTO public.categories (store_id, name, display_order, created_by)
SELECT DISTINCT 
    i.store_id,
    i.category,
    ROW_NUMBER() OVER (PARTITION BY i.store_id ORDER BY i.category) as display_order,
    i.created_by
FROM public.items i
WHERE i.category IS NOT NULL 
    AND i.category != ''
    AND NOT EXISTS (
        SELECT 1 FROM public.categories c
        WHERE c.store_id = i.store_id AND c.name = i.category
    )
ORDER BY i.store_id, i.category;

-- Link items to their categories
UPDATE public.items i
SET category_id = c.id
FROM public.categories c
WHERE i.store_id = c.store_id 
    AND i.category = c.name
    AND i.category_id IS NULL;

-- Set default category for items without categories
DO $$
DECLARE
    v_store_id UUID;
    v_uncategorized_id UUID;
BEGIN
    FOR v_store_id IN 
        SELECT DISTINCT store_id FROM public.items WHERE category_id IS NULL
    LOOP
        -- Create "Uncategorized" category if doesn't exist
        INSERT INTO public.categories (store_id, name, name_hi, name_ar)
        VALUES (
            v_store_id, 
            'Uncategorized',
            'अवर्गीकृत',
            'غير مصنف'
        )
        ON CONFLICT (store_id, name) DO NOTHING
        RETURNING id INTO v_uncategorized_id;
        
        -- Link uncategorized items
        UPDATE public.items
        SET category_id = v_uncategorized_id
        WHERE store_id = v_store_id AND category_id IS NULL;
    END LOOP;
END $$;

-- ============================================================================
-- SECTION 10: GRANT PERMISSIONS
-- ============================================================================

GRANT SELECT ON public.categories TO authenticated;
GRANT SELECT ON public.item_variants TO authenticated;
GRANT SELECT ON public.item_addons TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_localized_item_name TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_localized_category_name TO authenticated;
GRANT EXECUTE ON FUNCTION public.search_items_multilang TO authenticated;

-- ============================================================================
-- ROLLBACK SCRIPT (Keep for reference, do not execute)
-- ============================================================================

/*
-- To rollback this migration, execute:

-- Drop functions
DROP FUNCTION IF EXISTS public.search_items_multilang CASCADE;
DROP FUNCTION IF EXISTS public.get_localized_category_name CASCADE;
DROP FUNCTION IF EXISTS public.get_localized_item_name CASCADE;

-- Drop tables
DROP TABLE IF EXISTS public.item_addons CASCADE;
DROP TABLE IF EXISTS public.item_variants CASCADE;
DROP TABLE IF EXISTS public.categories CASCADE;

-- Remove columns from customers
ALTER TABLE public.customers DROP COLUMN IF EXISTS preferred_language;
ALTER TABLE public.customers DROP COLUMN IF EXISTS name_local;

-- Remove columns from items
ALTER TABLE public.items DROP COLUMN IF EXISTS tax_rate;
ALTER TABLE public.items DROP COLUMN IF EXISTS cost_price;
ALTER TABLE public.items DROP COLUMN IF EXISTS allergens;
ALTER TABLE public.items DROP COLUMN IF EXISTS is_veg;
ALTER TABLE public.items DROP COLUMN IF EXISTS has_variants;
ALTER TABLE public.items DROP COLUMN IF EXISTS category_id;
ALTER TABLE public.items DROP COLUMN IF EXISTS description_ar;
ALTER TABLE public.items DROP COLUMN IF EXISTS description_hi;
ALTER TABLE public.items DROP COLUMN IF EXISTS name_ar;
ALTER TABLE public.items DROP COLUMN IF EXISTS name_hi;
*/

-- ============================================================================
-- END OF MIGRATION
-- ============================================================================