-- ============================================================================
-- Migration: Create Storage Buckets for Images
-- Date: 2025-11-13
-- Description: Creates Supabase Storage buckets for category and item images
--              with proper access policies
-- ============================================================================

-- Create category-images bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('category-images', 'category-images', true)
ON CONFLICT (id) DO NOTHING;

-- Create item-images bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('item-images', 'item-images', true)
ON CONFLICT (id) DO NOTHING;

-- Create store-images bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('store-images', 'store-images', true)
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- Storage Policies for category-images
-- ============================================================================

-- Allow authenticated users to upload category images for their stores
CREATE POLICY "Store members can upload category images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
    bucket_id = 'category-images'
    AND auth.uid() IN (
        SELECT user_id
        FROM public.store_members
        WHERE is_active = TRUE
    )
);

-- Allow everyone to view category images (public bucket)
CREATE POLICY "Anyone can view category images"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'category-images');

-- Allow store members to delete their category images
CREATE POLICY "Store members can delete category images"
ON storage.objects FOR DELETE
TO authenticated
USING (
    bucket_id = 'category-images'
    AND auth.uid() IN (
        SELECT user_id
        FROM public.store_members
        WHERE is_active = TRUE
    )
);

-- ============================================================================
-- Storage Policies for item-images
-- ============================================================================

-- Allow authenticated users to upload item images for their stores
CREATE POLICY "Store members can upload item images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
    bucket_id = 'item-images'
    AND auth.uid() IN (
        SELECT user_id
        FROM public.store_members
        WHERE is_active = TRUE
    )
);

-- Allow everyone to view item images (public bucket)
CREATE POLICY "Anyone can view item images"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'item-images');

-- Allow store members to delete their item images
CREATE POLICY "Store members can delete item images"
ON storage.objects FOR DELETE
TO authenticated
USING (
    bucket_id = 'item-images'
    AND auth.uid() IN (
        SELECT user_id
        FROM public.store_members
        WHERE is_active = TRUE
    )
);

-- ============================================================================
-- Storage Policies for store-images
-- ============================================================================

-- Allow authenticated users to upload store images
CREATE POLICY "Store owners can upload store images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
    bucket_id = 'store-images'
    AND auth.uid() IN (
        SELECT user_id
        FROM public.store_members
        WHERE role = 'owner' AND is_active = TRUE
    )
);

-- Allow everyone to view store images (public bucket)
CREATE POLICY "Anyone can view store images"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'store-images');

-- Allow store owners to delete their store images
CREATE POLICY "Store owners can delete store images"
ON storage.objects FOR DELETE
TO authenticated
USING (
    bucket_id = 'store-images'
    AND auth.uid() IN (
        SELECT user_id
        FROM public.store_members
        WHERE role = 'owner' AND is_active = TRUE
    )
);

COMMENT ON POLICY "Store members can upload category images" ON storage.objects IS 'Allows store members to upload category images';
COMMENT ON POLICY "Anyone can view category images" ON storage.objects IS 'Public read access to category images';
COMMENT ON POLICY "Store members can delete category images" ON storage.objects IS 'Allows store members to delete category images';
