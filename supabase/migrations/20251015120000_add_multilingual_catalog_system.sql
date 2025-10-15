-- ============================================================================
-- Migration: Add Multi-Language Catalog System
-- Version: 1.0.0
-- Author: Universal POS Team
-- Date: 2025-10-15
-- Description: Implements multi-language support for items, categories, and product catalog
--              Supports English, Hindi, and Arabic (with RTL support)
--              Required for Phase 1 multi-language menu display
-- Dependencies: Requires 20251015110000_add_user_preferences_system.sql
-- Rollback: See rollback section at end of file
-- ============================================================================

-- ============================================================================
-- SECTION 1: CREATE CATEGORIES TABLE (Normalized Structure)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    store_id UUID REFERENCES public.stores(id) ON DELETE CASCADE NOT NULL,
    
    -- Multi-language names
    name_en TEXT NOT NULL,
    name_hi TEXT,
    name_ar TEXT,
    
    -- Multi-language descriptions
    description_en TEXT,
    description_hi TEXT,
    description_ar TEXT,
    
    -- Display settings
    display_order INTEGER NOT NULL DEFAULT 0,
    icon_url TEXT,
    color_hex TEXT DEFAULT '#6366F1',
    
    -- Status
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    is_visible BOOLEAN NOT NULL DEFAULT TRUE,
    
    -- Metadata
    parent_category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
    metadata JSONB DEFAULT '{}'::JSONB,
    
    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id),
    
    -- Constraints
    CONSTRAINT category_name_en_length CHECK (char_length(name_en) >= 2 AND char_length(name_en) <= 100),
    CONSTRAINT category_display_order_positive CHECK (display_order >= 0),
    CONSTRAINT category_color_format CHECK (color_hex ~ '^#[0-9A-Fa-f]{6}$'),
    CONSTRAINT unique_category_name_per_store UNIQUE(store_id, name_en)
);

-- Indexes for categories
CREATE INDEX IF NOT EXISTS idx_categories_store_active 
ON public.categories(store_id, display_order) 
WHERE is_active = TRUE AND is_visible = TRUE;

CREATE INDEX IF NOT EXISTS idx_categories_parent 
ON public.categories(parent_category_id) 
WHERE parent_category_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_categories_name_search_en 
ON public.categories USING gin(to_tsvector('english', name_en));

CREATE INDEX IF NOT EXISTS idx_categories_name_search_hi 
ON public.categories USING gin(to_tsvector('simple', name_hi)) 
WHERE name_hi IS NOT NULL;

-- Table comments
COMMENT ON TABLE public.categories IS 'Product categories with multi-language support (EN/HI/AR)';
COMMENT ON COLUMN public.categories.name_en IS 'Category name in English (required)';
COMMENT ON COLUMN public.categories.name_hi IS 'Category name in Hindi (optional)';
COMMENT ON COLUMN public.categories.name_ar IS 'Category name in Arabic (optional)';
COMMENT ON COLUMN public.categories.display_order IS 'Sort order for category display (ascending)';
COMMENT ON COLUMN public.categories.color_hex IS 'Category color for UI (hex format: #RRGGBB)';
COMMENT ON COLUMN public.categories.parent_category_id IS 'Parent category for hierarchical structure';
COMMENT ON COLUMN public.categories.metadata IS 'Additional category metadata (JSON)';

-- ============================================================================
-- SECTION 2: ADD MULTI-LANGUAGE COLUMNS TO ITEMS TABLE
-- ============================================================================

DO $$ 
BEGIN
    -- Add English name (rename existing name column)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'items' 
        AND column_name = 'name_en'
    ) THEN
        -- Rename existing name column to name_en
        ALTER TABLE public.items RENAME COLUMN name TO name_en;
        RAISE NOTICE 'Renamed items.name to items.name_en';
    END IF;

    -- Add Hindi name
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'items' 
        AND column_name = 'name_hi'
    ) THEN
        ALTER TABLE public.items ADD COLUMN name_hi TEXT;
        RAISE NOTICE 'Added name_hi column to items table';
    END IF;

    -- Add Arabic name
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'items' 
        AND column_name = 'name_ar'
    ) THEN
        ALTER TABLE public.items ADD COLUMN name_ar TEXT;
        RAISE NOTICE 'Added name_ar column to items table';
    END IF;

    -- Add English description (rename existing description column)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'items' 
        AND column_name = 'description_en'
    ) THEN
        ALTER TABLE public.items RENAME COLUMN description TO description_en;
        RAISE NOTICE 'Renamed items.description to items.description_en';
    EXCEPTION
        WHEN undefined_column THEN
            ALTER TABLE public.items ADD COLUMN description_en TEXT;
            RAISE NOTICE 'Added description_en column to items table';
    END IF;

    -- Add Hindi description
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'items' 
        AND column_name = 'description_hi'
    ) THEN
        ALTER TABLE public.items ADD COLUMN description_hi TEXT;
        RAISE NOTICE 'Added description_hi column to items table';
    END IF;

    -- Add Arabic description
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'items' 
        AND column_name = 'description_ar'
    ) THEN
        ALTER TABLE public.items ADD COLUMN description_ar TEXT;
        RAISE NOTICE 'Added description_ar column to items table';
    END IF;

    -- Add category_id foreign key
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'items' 
        AND column_name = 'category_id'
    ) THEN
        ALTER TABLE public.items ADD COLUMN category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL;
        RAISE NOTICE 'Added category_id column to items table';
    END IF;

    -- Add tags for better search
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'items' 
        AND column_name = 'tags'
    ) THEN
        ALTER TABLE public.items ADD COLUMN tags TEXT[] DEFAULT ARRAY[]::TEXT[];
        RAISE NOTICE 'Added tags column to items table';
    END IF;

    -- Add metadata JSONB
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'items' 
        AND column_name = 'metadata'
    ) THEN
        ALTER TABLE public.items ADD COLUMN metadata JSONB DEFAULT '{}'::JSONB;
        RAISE NOTICE 'Added metadata column to items table';
    END IF;

    -- Add is_vegetarian column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'items' 
        AND column_name = 'is_vegetarian'
    ) THEN
        ALTER TABLE public.items ADD COLUMN is_vegetarian BOOLEAN DEFAULT TRUE;
        RAISE NOTICE 'Added is_vegetarian column to items table';
    END IF;

    -- Add is_vegan column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'items' 
        AND column_name = 'is_vegan'
    ) THEN
        ALTER TABLE public.items ADD COLUMN is_vegan BOOLEAN DEFAULT FALSE;
        RAISE NOTICE 'Added is_vegan column to items table';
    END IF;

    -- Add allergens array
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'items' 
        AND column_name = 'allergens'
    ) THEN
        ALTER TABLE public.items ADD COLUMN allergens TEXT[] DEFAULT ARRAY[]::TEXT[];
        RAISE NOTICE 'Added allergens column to items table';
    END IF;

    -- Add preparation_time_minutes
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'items' 
        AND column_name = 'preparation_time_minutes'
    ) THEN
        ALTER TABLE public.items ADD COLUMN preparation_time_minutes INTEGER;
        RAISE NOTICE 'Added preparation_time_minutes column to items table';
    END IF;
END $$;

-- Update constraints on items
ALTER TABLE public.items DROP CONSTRAINT IF EXISTS item_name_length;
ALTER TABLE public.items ADD CONSTRAINT item_name_en_length 
CHECK (char_length(name_en) >= 1 AND char_length(name_en) <= 200);

-- Make category column optional now (we have category_id)
ALTER TABLE public.items ALTER COLUMN category DROP NOT NULL;

-- Add indexes for multi-language search
CREATE INDEX IF NOT EXISTS idx_items_name_search_en 
ON public.items USING gin(to_tsvector('english', name_en)) 
WHERE is_active = TRUE;

CREATE INDEX IF NOT EXISTS idx_items_name_search_hi 
ON public.items USING gin(to_tsvector('simple', name_hi)) 
WHERE name_hi IS NOT NULL AND is_active = TRUE;

CREATE INDEX IF NOT EXISTS idx_items_tags 
ON public.items USING gin(tags) 
WHERE is_active = TRUE;

CREATE INDEX IF NOT EXISTS idx_items_category_id 
ON public.items(category_id, display_order) 
WHERE is_active = TRUE;

CREATE INDEX IF NOT EXISTS idx_items_vegetarian 
ON public.items(store_id, is_vegetarian) 
WHERE is_active = TRUE;

-- Add comments
COMMENT ON COLUMN public.items.name_en IS 'Item name in English (required)';
COMMENT ON COLUMN public.items.name_hi IS 'Item name in Hindi (optional)';
COMMENT ON COLUMN public.items.name_ar IS 'Item name in Arabic (optional)';
COMMENT ON COLUMN public.items.description_en IS 'Item description in English';
COMMENT ON COLUMN public.items.description_hi IS 'Item description in Hindi';
COMMENT ON COLUMN public.items.description_ar IS 'Item description in Arabic';
COMMENT ON COLUMN public.items.category_id IS 'Foreign key to categories table';
COMMENT ON COLUMN public.items.tags IS 'Array of searchable tags (e.g., spicy, bestseller, new)';
COMMENT ON COLUMN public.items.metadata IS 'Additional item metadata (JSON)';
COMMENT ON COLUMN public.items.is_vegetarian IS 'Indicates if item is vegetarian';
COMMENT ON COLUMN public.items.is_vegan IS 'Indicates if item is vegan';
COMMENT ON COLUMN public.items.allergens IS 'Array of allergen names (e.g., nuts, dairy, gluten)';
COMMENT ON COLUMN public.items.preparation_time_minutes IS 'Estimated preparation time in minutes';

-- ============================================================================
-- SECTION 3: CREATE ITEM VARIANTS TABLE (For sizes, flavors, etc.)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.item_variants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    item_id UUID REFERENCES public.items(id) ON DELETE CASCADE NOT NULL,
    
    -- Variant details (multi-language)
    name_en TEXT NOT NULL,
    name_hi TEXT,
    name_ar TEXT,
    
    -- Pricing
    price_adjustment DECIMAL(10,2) NOT NULL DEFAULT 0,
    price_adjustment_type TEXT NOT NULL DEFAULT 'absolute' CHECK (price_adjustment_type IN ('absolute', 'percentage')),
    
    -- Stock (if variant has separate inventory)
    stock INTEGER,
    sku TEXT,
    
    -- Display
    display_order INTEGER NOT NULL DEFAULT 0,
    is_available BOOLEAN NOT NULL DEFAULT TRUE,
    
    -- Metadata
    metadata JSONB DEFAULT '{}'::JSONB,
    
    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT variant_name_en_length CHECK (char_length(name_en) >= 1 AND char_length(name_en) <= 100),
    CONSTRAINT unique_variant_per_item UNIQUE(item_id, name_en)
);

CREATE INDEX IF NOT EXISTS idx_item_variants_item 
ON public.item_variants(item_id, display_order) 
WHERE is_available = TRUE;

COMMENT ON TABLE public.item_variants IS 'Item variants (e.g., sizes: Small/Medium/Large, flavors, etc.)';
COMMENT ON COLUMN public.item_variants.price_adjustment IS 'Price adjustment for this variant (can be negative for discounts)';
COMMENT ON COLUMN public.item_variants.price_adjustment_type IS 'How to apply adjustment: absolute (fixed amount) or percentage';

-- ============================================================================
-- SECTION 4: CREATE ITEM ADDONS TABLE (For extras, toppings, etc.)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.item_addons (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    item_id UUID REFERENCES public.items(id) ON DELETE CASCADE NOT NULL,
    
    -- Addon details (multi-language)
    name_en TEXT NOT NULL,
    name_hi TEXT,
    name_ar TEXT,
    
    description_en TEXT,
    description_hi TEXT,
    description_ar TEXT,
    
    -- Pricing
    price DECIMAL(10,2) NOT NULL CHECK (price >= 0),
    
    -- Constraints
    is_required BOOLEAN NOT NULL DEFAULT FALSE,
    max_quantity INTEGER DEFAULT 1 CHECK (max_quantity > 0),
    
    -- Display
    display_order INTEGER NOT NULL DEFAULT 0,
    is_available BOOLEAN NOT NULL DEFAULT TRUE,
    
    -- Metadata
    metadata JSONB DEFAULT '{}'::JSONB,
    
    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    CONSTRAINT addon_name_en_length CHECK (char_length(name_en) >= 1 AND char_length(name_en) <= 100)
);

CREATE INDEX IF NOT EXISTS idx_item_addons_item 
ON public.item_addons(item_id, display_order) 
WHERE is_available = TRUE;

COMMENT ON TABLE public.item_addons IS 'Item add-ons/extras (e.g., extra cheese, whipped cream)';
COMMENT ON COLUMN public.item_addons.is_required IS 'If true, customer must select this addon';
COMMENT ON COLUMN public.item_addons.max_quantity IS 'Maximum quantity customer can add';

-- ============================================================================
-- SECTION 5: CREATE HELPER FUNCTIONS
-- ============================================================================

-- Function to get item with localized fields based on user language
CREATE OR REPLACE FUNCTION public.get_localized_item(
    p_item_id UUID,
    p_language TEXT DEFAULT 'en'
)
RETURNS TABLE(
    id UUID,
    store_id UUID,
    name TEXT,
    description TEXT,
    price DECIMAL(10,2),
    category_name TEXT,
    image_url TEXT,
    is_active BOOLEAN,
    is_vegetarian BOOLEAN,
    is_vegan BOOLEAN,
    allergens TEXT[],
    tags TEXT[],
    preparation_time_minutes INTEGER
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        i.id,
        i.store_id,
        COALESCE(
            CASE p_language
                WHEN 'hi' THEN i.name_hi
                WHEN 'ar' THEN i.name_ar
                ELSE i.name_en
            END,
            i.name_en
        ) AS name,
        COALESCE(
            CASE p_language
                WHEN 'hi' THEN i.description_hi
                WHEN 'ar' THEN i.description_ar
                ELSE i.description_en
            END,
            i.description_en
        ) AS description,
        i.price,
        COALESCE(
            CASE p_language
                WHEN 'hi' THEN c.name_hi
                WHEN 'ar' THEN c.name_ar
                ELSE c.name_en
            END,
            c.name_en
        ) AS category_name,
        i.image_url,
        i.is_active,
        i.is_vegetarian,
        i.is_vegan,
        i.allergens,
        i.tags,
        i.preparation_time_minutes
    FROM public.items i
    LEFT JOIN public.categories c ON c.id = i.category_id
    WHERE i.id = p_item_id;
END;
$$;

COMMENT ON FUNCTION public.get_localized_item IS 'Returns item with fields in specified language (fallback to English)';

-- Function to get all items for a store with localization
CREATE OR REPLACE FUNCTION public.get_store_items_localized(
    p_store_id UUID,
    p_language TEXT DEFAULT 'en',
    p_category_id UUID DEFAULT NULL,
    p_include_inactive BOOLEAN DEFAULT FALSE
)
RETURNS TABLE(
    id UUID,
    name TEXT,
    description TEXT,
    price DECIMAL(10,2),
    category_id UUID,
    category_name TEXT,
    image_url TEXT,
    is_active BOOLEAN,
    stock INTEGER,
    is_vegetarian BOOLEAN,
    is_vegan BOOLEAN,
    allergens TEXT[],
    tags TEXT[],
    preparation_time_minutes INTEGER,
    display_order INTEGER
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        i.id,
        COALESCE(
            CASE p_language
                WHEN 'hi' THEN i.name_hi
                WHEN 'ar' THEN i.name_ar
                ELSE i.name_en
            END,
            i.name_en
        ) AS name,
        COALESCE(
            CASE p_language
                WHEN 'hi' THEN i.description_hi
                WHEN 'ar' THEN i.description_ar
                ELSE i.description_en
            END,
            i.description_en
        ) AS description,
        i.price,
        i.category_id,
        COALESCE(
            CASE p_language
                WHEN 'hi' THEN c.name_hi
                WHEN 'ar' THEN c.name_ar
                ELSE c.name_en
            END,
            c.name_en
        ) AS category_name,
        i.image_url,
        i.is_active,
        i.stock,
        i.is_vegetarian,
        i.is_vegan,
        i.allergens,
        i.tags,
        i.preparation_time_minutes,
        COALESCE(i.display_order, 999) AS display_order
    FROM public.items i
    LEFT JOIN public.categories c ON c.id = i.category_id
    WHERE i.store_id = p_store_id
        AND (p_category_id IS NULL OR i.category_id = p_category_id)
        AND (p_include_inactive OR i.is_active = TRUE)
    ORDER BY category_name, display_order, name;
END;
$$;

COMMENT ON FUNCTION public.get_store_items_localized IS 'Returns all items for a store in specified language with optional category filter';

-- Function to search items by name (multi-language)
CREATE OR REPLACE FUNCTION public.search_items_multilingual(
    p_store_id UUID,
    p_search_query TEXT,
    p_language TEXT DEFAULT 'en',
    p_limit INTEGER DEFAULT 20
)
RETURNS TABLE(
    id UUID,
    name TEXT,
    description TEXT,
    price DECIMAL(10,2),
    category_name TEXT,
    image_url TEXT,
    relevance REAL
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        i.id,
        COALESCE(
            CASE p_language
                WHEN 'hi' THEN i.name_hi
                WHEN 'ar' THEN i.name_ar
                ELSE i.name_en
            END,
            i.name_en
        ) AS name,
        COALESCE(
            CASE p_language
                WHEN 'hi' THEN i.description_hi
                WHEN 'ar' THEN i.description_ar
                ELSE i.description_en
            END,
            i.description_en
        ) AS description,
        i.price,
        COALESCE(
            CASE p_language
                WHEN 'hi' THEN c.name_hi
                WHEN 'ar' THEN c.name_ar
                ELSE c.name_en
            END,
            c.name_en
        ) AS category_name,
        i.image_url,
        ts_rank(
            to_tsvector('simple', 
                COALESCE(i.name_en, '') || ' ' || 
                COALESCE(i.name_hi, '') || ' ' || 
                COALESCE(i.name_ar, '') || ' ' ||
                array_to_string(i.tags, ' ')
            ),
            plainto_tsquery('simple', p_search_query)
        ) AS relevance
    FROM public.items i
    LEFT JOIN public.categories c ON c.id = i.category_id
    WHERE i.store_id = p_store_id
        AND i.is_active = TRUE
        AND (
            to_tsvector('simple', 
                COALESCE(i.name_en, '') || ' ' || 
                COALESCE(i.name_hi, '') || ' ' || 
                COALESCE(i.name_ar, '') || ' ' ||
                array_to_string(i.tags, ' ')
            ) @@ plainto_tsquery('simple', p_search_query)
            OR
            i.name_en ILIKE '%' || p_search_query || '%'
            OR
            i.name_hi ILIKE '%' || p_search_query || '%'
            OR
            i.name_ar ILIKE '%' || p_search_query || '%'
        )
    ORDER BY relevance DESC, name
    LIMIT p_limit;
END;
$$;

COMMENT ON FUNCTION public.search_items_multilingual IS 'Full-text search across all language fields with relevance ranking';

-- ============================================================================
-- SECTION 6: ENABLE RLS AND CREATE POLICIES
-- ============================================================================

-- Enable RLS on new tables
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.item_variants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.item_addons ENABLE ROW LEVEL SECURITY;

-- Categories Policies
CREATE POLICY "Store members can view categories"
ON public.categories
FOR SELECT
USING (
    store_id IN (
        SELECT store_id FROM public.store_members
        WHERE user_id = auth.uid() AND is_active = TRUE
    )
);

CREATE POLICY "Owners and managers can manage categories"
ON public.categories
FOR ALL
USING (
    store_id IN (
        SELECT store_id FROM public.store_members
        WHERE user_id = auth.uid() 
            AND role IN ('owner', 'manager')
            AND is_active = TRUE
    )
);

-- Item Variants Policies
CREATE POLICY "Store members can view item variants"
ON public.item_variants
FOR SELECT
USING (
    item_id IN (
        SELECT i.id FROM public.items i
        JOIN public.store_members sm ON sm.store_id = i.store_id
        WHERE sm.user_id = auth.uid() AND sm.is_active = TRUE
    )
);

CREATE POLICY "Owners and managers can manage item variants"
ON public.item_variants
FOR ALL
USING (
    item_id IN (
        SELECT i.id FROM public.items i
        JOIN public.store_members sm ON sm.store_id = i.store_id
        WHERE sm.user_id = auth.uid() 
            AND sm.role IN ('owner', 'manager')
            AND sm.is_active = TRUE
    )
);

-- Item Addons Policies (same as variants)
CREATE POLICY "Store members can view item addons"
ON public.item_addons
FOR SELECT
USING (
    item_id IN (
        SELECT i.id FROM public.items i
        JOIN public.store_members sm ON sm.store_id = i.store_id
        WHERE sm.user_id = auth.uid() AND sm.is_active = TRUE
    )
);

CREATE POLICY "Owners and managers can manage item addons"
ON public.item_addons
FOR ALL
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
-- SECTION 7: CREATE TRIGGERS
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

-- Trigger for item_addons updated_at
CREATE TRIGGER update_item_addons_updated_at
BEFORE UPDATE ON public.item_addons
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================================
-- SECTION 8: DATA MIGRATION
-- ============================================================================

-- Migrate existing categories from items.category to categories table
INSERT INTO public.categories (store_id, name_en, display_order, created_at)
SELECT DISTINCT 
    store_id,
    category,
    ROW_NUMBER() OVER (PARTITION BY store_id ORDER BY category) as display_order,
    MIN(created_at) as created_at
FROM public.items
WHERE category IS NOT NULL 
    AND category != ''
    AND NOT EXISTS (
        SELECT 1 FROM public.categories c 
        WHERE c.store_id = items.store_id 
        AND c.name_en = items.category
    )
GROUP BY store_id, category
ORDER BY store_id, category;

-- Link existing items to their categories
UPDATE public.items i
SET category_id = c.id
FROM public.categories c
WHERE i.store_id = c.store_id 
    AND i.category = c.name_en
    AND i.category_id IS NULL;

-- ============================================================================
-- SECTION 9: GRANT PERMISSIONS
-- ============================================================================

GRANT SELECT ON public.categories TO authenticated;
GRANT SELECT ON public.item_variants TO authenticated;
GRANT SELECT ON public.item_addons TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_localized_item TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_store_items_localized TO authenticated;
GRANT EXECUTE ON FUNCTION public.search_items_multilingual TO authenticated;

-- ============================================================================
-- ROLLBACK SCRIPT (Keep for reference, do not execute)
-- ============================================================================

/*
-- To rollback this migration, execute:

-- Drop functions
DROP FUNCTION IF EXISTS public.search_items_multilingual CASCADE;
DROP FUNCTION IF EXISTS public.get_store_items_localized CASCADE;
DROP FUNCTION IF EXISTS public.get_localized_item CASCADE;

-- Drop tables
DROP TABLE IF EXISTS public.item_addons CASCADE;
DROP TABLE IF EXISTS public.item_variants CASCADE;
DROP TABLE IF EXISTS public.categories CASCADE;

-- Revert items table changes
ALTER TABLE public.items RENAME COLUMN name_en TO name;
ALTER TABLE public.items RENAME COLUMN description_en TO description;
ALTER TABLE public.items DROP COLUMN IF EXISTS name_hi;
ALTER TABLE public.items DROP COLUMN IF EXISTS name_ar;
ALTER TABLE public.items DROP COLUMN IF EXISTS description_hi;
ALTER TABLE public.items DROP COLUMN IF EXISTS description_ar;
ALTER TABLE public.items DROP COLUMN IF EXISTS category_id;
ALTER TABLE public.items DROP COLUMN IF EXISTS tags;
ALTER TABLE public.items DROP COLUMN IF EXISTS metadata;
ALTER TABLE public.items DROP COLUMN IF EXISTS is_vegetarian;
ALTER TABLE public.items DROP COLUMN IF EXISTS is_vegan;
ALTER TABLE public.items DROP COLUMN IF EXISTS allergens;
ALTER TABLE public.items DROP COLUMN IF EXISTS preparation_time_minutes;
*/

-- ============================================================================
-- END OF MIGRATION
-- ============================================================================