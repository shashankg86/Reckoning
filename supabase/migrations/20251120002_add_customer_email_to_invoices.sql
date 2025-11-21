-- ============================================================================
-- Migration: Add customer email to invoices table
-- Date: 2025-11-20
-- Description: Adds customer_email column to store customer email addresses
--              for digital receipt delivery and customer communications
-- ============================================================================

-- Add customer_email column to invoices table
ALTER TABLE public.invoices
ADD COLUMN IF NOT EXISTS customer_email TEXT;

-- Add index for customer email lookups
CREATE INDEX IF NOT EXISTS idx_invoices_customer_email
ON public.invoices(customer_email);

-- Add comment
COMMENT ON COLUMN public.invoices.customer_email IS 'Customer email address for digital receipts and communications';
