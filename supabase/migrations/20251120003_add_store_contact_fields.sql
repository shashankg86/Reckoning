-- ============================================================================
-- Migration: Add store contact fields for invoices
-- Date: 2025-11-20
-- Description: Adds phone, email, and address fields to stores table
--              These fields are needed for invoice generation and customer
--              communication (email invoice headers/footers)
-- ============================================================================

-- Add store contact fields
ALTER TABLE public.stores
ADD COLUMN IF NOT EXISTS store_phone TEXT;

ALTER TABLE public.stores
ADD COLUMN IF NOT EXISTS store_email TEXT;

ALTER TABLE public.stores
ADD COLUMN IF NOT EXISTS store_address TEXT;

-- Add indexes for contact lookups (email and phone are commonly used for searching)
CREATE INDEX IF NOT EXISTS idx_stores_email
ON public.stores(store_email);

CREATE INDEX IF NOT EXISTS idx_stores_phone
ON public.stores(store_phone);

-- Add comments
COMMENT ON COLUMN public.stores.store_phone IS 'Store contact phone number for customer communication and invoices';
COMMENT ON COLUMN public.stores.store_email IS 'Store contact email for customer communication and invoices';
COMMENT ON COLUMN public.stores.store_address IS 'Store physical address for invoices and customer information';
