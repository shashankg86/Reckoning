-- ============================================================================
-- Migration: Add image_url column to categories table
-- Date: 2025-11-13
-- Description: Adds image_url column to support category images
--              This allows categories to have optional images displayed in the UI
-- ============================================================================

-- Add image_url column to categories if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'categories'
          AND column_name = 'image_url'
    ) THEN
        ALTER TABLE public.categories
        ADD COLUMN image_url TEXT;

        COMMENT ON COLUMN public.categories.image_url IS 'Optional image URL for category display';

        RAISE NOTICE 'Added image_url column to categories table';
    ELSE
        RAISE NOTICE 'image_url column already exists in categories table';
    END IF;
END $$;
