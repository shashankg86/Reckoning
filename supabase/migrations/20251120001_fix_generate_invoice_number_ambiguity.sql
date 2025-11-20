-- ============================================================================
-- Migration: Fix ambiguous column reference in generate_invoice_number
-- Date: 2025-11-20
-- Description: Fixes "column reference 'invoice_number' is ambiguous" error
--              by properly qualifying the column reference with table alias
-- ============================================================================

-- Drop and recreate the function with proper column qualification
CREATE OR REPLACE FUNCTION generate_invoice_number(
  store_uuid UUID
)
RETURNS TEXT AS $$
DECLARE
  next_number INTEGER;
  invoice_number_result TEXT;
BEGIN
  -- Get the next invoice number for this store
  -- Use table alias 'inv' to avoid ambiguous column reference
  SELECT COALESCE(MAX(
    CASE
      WHEN inv.invoice_number ~ '^\d+$' THEN inv.invoice_number::INTEGER
      WHEN inv.invoice_number ~ '^INV-(\d+)$' THEN
        substring(inv.invoice_number from 'INV-(\d+)')::INTEGER
      ELSE 0
    END
  ), 0) + 1
  INTO next_number
  FROM public.invoices inv
  WHERE inv.store_id = store_uuid;

  -- Format: INV-00001
  invoice_number_result := 'INV-' || LPAD(next_number::TEXT, 5, '0');

  RETURN invoice_number_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Ensure the function has proper grants
GRANT EXECUTE ON FUNCTION generate_invoice_number TO authenticated;

-- Add comment
COMMENT ON FUNCTION generate_invoice_number(UUID) IS 'Generates sequential invoice numbers per store (INV-00001, INV-00002, etc.)';
