-- ============================================================================
-- Migration: Add Tax Configuration System
-- Date: 2025-11-20
-- Description: Creates store_tax_config table for managing country-specific
--              tax settings (GST, VAT, Sales Tax, etc.)
-- ============================================================================

-- Create store_tax_config table
CREATE TABLE IF NOT EXISTS public.store_tax_config (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
    country VARCHAR(2) NOT NULL, -- ISO 3166-1 alpha-2 country code
    tax_enabled BOOLEAN NOT NULL DEFAULT true,
    tax_preset_id VARCHAR(50), -- Reference to predefined tax preset
    custom_tax_components JSONB, -- For custom tax configurations
    tax_number VARCHAR(100), -- GST number, VAT number, TIN, etc.
    tax_inclusive BOOLEAN NOT NULL DEFAULT false, -- Prices include tax or not
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(store_id)
);

-- Add comment to table
COMMENT ON TABLE public.store_tax_config IS 'Stores tax configuration for different countries (GST, VAT, Sales Tax, etc.)';

-- Add comments to columns
COMMENT ON COLUMN public.store_tax_config.country IS 'ISO 3166-1 alpha-2 country code (IN, AE, US, GB, etc.)';
COMMENT ON COLUMN public.store_tax_config.tax_enabled IS 'Whether tax is enabled for this store';
COMMENT ON COLUMN public.store_tax_config.tax_preset_id IS 'Reference to predefined tax preset (e.g., in_gst_5, ae_vat_5)';
COMMENT ON COLUMN public.store_tax_config.custom_tax_components IS 'Custom tax components as JSON array: [{"name": "CGST", "rate": 2.5, "applicableOn": "subtotal"}]';
COMMENT ON COLUMN public.store_tax_config.tax_number IS 'Tax registration number (GSTIN for India, VAT number for UAE, etc.)';
COMMENT ON COLUMN public.store_tax_config.tax_inclusive IS 'Whether displayed prices include tax (true) or exclude tax (false)';

-- Create index on store_id for faster lookups
CREATE INDEX IF NOT EXISTS idx_store_tax_config_store_id ON public.store_tax_config(store_id);

-- Create index on country for analytics
CREATE INDEX IF NOT EXISTS idx_store_tax_config_country ON public.store_tax_config(country);

-- ============================================================================
-- Row Level Security Policies
-- ============================================================================

-- Enable RLS
ALTER TABLE public.store_tax_config ENABLE ROW LEVEL SECURITY;

-- Policy: Store members can view their store's tax config
CREATE POLICY "Store members can view tax config"
ON public.store_tax_config FOR SELECT
TO authenticated
USING (
    store_id IN (
        SELECT store_id
        FROM public.store_members
        WHERE user_id = auth.uid() AND is_active = TRUE
    )
);

-- Policy: Store owners can insert tax config
CREATE POLICY "Store owners can create tax config"
ON public.store_tax_config FOR INSERT
TO authenticated
WITH CHECK (
    store_id IN (
        SELECT store_id
        FROM public.store_members
        WHERE user_id = auth.uid()
        AND role = 'owner'
        AND is_active = TRUE
    )
);

-- Policy: Store owners can update tax config
CREATE POLICY "Store owners can update tax config"
ON public.store_tax_config FOR UPDATE
TO authenticated
USING (
    store_id IN (
        SELECT store_id
        FROM public.store_members
        WHERE user_id = auth.uid()
        AND role = 'owner'
        AND is_active = TRUE
    )
);

-- Policy: Store owners can delete tax config
CREATE POLICY "Store owners can delete tax config"
ON public.store_tax_config FOR DELETE
TO authenticated
USING (
    store_id IN (
        SELECT store_id
        FROM public.store_members
        WHERE user_id = auth.uid()
        AND role = 'owner'
        AND is_active = TRUE
    )
);

-- ============================================================================
-- Trigger for automatic updated_at timestamp
-- ============================================================================

CREATE OR REPLACE FUNCTION public.update_store_tax_config_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_store_tax_config_updated_at
    BEFORE UPDATE ON public.store_tax_config
    FOR EACH ROW
    EXECUTE FUNCTION public.update_store_tax_config_updated_at();

-- ============================================================================
-- Sample Data (Optional - for testing)
-- ============================================================================

-- Note: You can uncomment this to add sample tax configs for testing
-- INSERT INTO public.store_tax_config (store_id, country, tax_enabled, tax_preset_id, tax_number)
-- SELECT
--     id,
--     'IN' as country,
--     true as tax_enabled,
--     'in_gst_5' as tax_preset_id,
--     NULL as tax_number
-- FROM public.stores
-- LIMIT 1
-- ON CONFLICT (store_id) DO NOTHING;
