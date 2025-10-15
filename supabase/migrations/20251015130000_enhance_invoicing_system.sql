-- ============================================================================
-- Migration: Enhanced Invoicing System with Multi-Language Support
-- Version: 1.0.0
-- Author: Universal POS Team
-- Date: 2025-10-15
-- Description: Enhances invoicing system with language tracking, payment metadata,
--              and digital receipt support. Frontend handles all translations.
-- Dependencies: Requires all previous migrations
-- Rollback: See rollback section at end of file
-- ============================================================================

-- ============================================================================
-- SECTION 1: ENHANCE INVOICES TABLE
-- ============================================================================

DO $$ 
BEGIN
    -- Add invoice_language (which language customer wants receipt in)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'invoices' 
        AND column_name = 'invoice_language'
    ) THEN
        ALTER TABLE public.invoices 
        ADD COLUMN invoice_language TEXT NOT NULL DEFAULT 'en';
        
        RAISE NOTICE 'Added invoice_language column to invoices table';
    END IF;

    -- Add payment_reference (UPI transaction ID, card last 4 digits, etc.)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'invoices' 
        AND column_name = 'payment_reference'
    ) THEN
        ALTER TABLE public.invoices 
        ADD COLUMN payment_reference TEXT;
        
        RAISE NOTICE 'Added payment_reference column to invoices table';
    END IF;

    -- Add payment_metadata (JSONB for storing UPI details, QR data, etc.)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'invoices' 
        AND column_name = 'payment_metadata'
    ) THEN
        ALTER TABLE public.invoices 
        ADD COLUMN payment_metadata JSONB;
        
        RAISE NOTICE 'Added payment_metadata column to invoices table';
    END IF;

    -- Add receipt_sent_via (whatsapp, sms, email, none)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'invoices' 
        AND column_name = 'receipt_sent_via'
    ) THEN
        ALTER TABLE public.invoices 
        ADD COLUMN receipt_sent_via TEXT[] DEFAULT ARRAY[]::TEXT[];
        
        RAISE NOTICE 'Added receipt_sent_via column to invoices table';
    END IF;

    -- Add receipt_sent_at timestamp
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'invoices' 
        AND column_name = 'receipt_sent_at'
    ) THEN
        ALTER TABLE public.invoices 
        ADD COLUMN receipt_sent_at TIMESTAMPTZ;
        
        RAISE NOTICE 'Added receipt_sent_at column to invoices table';
    END IF;

    -- Add round_off column (for Indian billing: ₹263.47 → ₹263.50)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'invoices' 
        AND column_name = 'round_off'
    ) THEN
        ALTER TABLE public.invoices 
        ADD COLUMN round_off DECIMAL(10,2) DEFAULT 0.00;
        
        RAISE NOTICE 'Added round_off column to invoices table';
    END IF;

    -- Add invoice_type (sale, return, cancelled)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'invoices' 
        AND column_name = 'invoice_type'
    ) THEN
        ALTER TABLE public.invoices 
        ADD COLUMN invoice_type TEXT NOT NULL DEFAULT 'sale';
        
        RAISE NOTICE 'Added invoice_type column to invoices table';
    END IF;

    -- Add table_number (for restaurant table tracking)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'invoices' 
        AND column_name = 'table_number'
    ) THEN
        ALTER TABLE public.invoices 
        ADD COLUMN table_number TEXT;
        
        RAISE NOTICE 'Added table_number column to invoices table';
    END IF;

    -- Add served_by (staff member who served)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'invoices' 
        AND column_name = 'served_by'
    ) THEN
        ALTER TABLE public.invoices 
        ADD COLUMN served_by UUID REFERENCES public.profiles(id);
        
        RAISE NOTICE 'Added served_by column to invoices table';
    END IF;
END $$;

-- Add constraints
DO $$
BEGIN
    -- Language constraint
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'valid_invoice_language'
    ) THEN
        ALTER TABLE public.invoices 
        ADD CONSTRAINT valid_invoice_language 
        CHECK (invoice_language IN ('en', 'hi', 'ar'));
        
        RAISE NOTICE 'Added valid_invoice_language constraint';
    END IF;

    -- Invoice type constraint
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'valid_invoice_type'
    ) THEN
        ALTER TABLE public.invoices 
        ADD CONSTRAINT valid_invoice_type 
        CHECK (invoice_type IN ('sale', 'return', 'cancelled'));
        
        RAISE NOTICE 'Added valid_invoice_type constraint';
    END IF;

    -- Round off constraint (should be small amount)
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'valid_round_off'
    ) THEN
        ALTER TABLE public.invoices 
        ADD CONSTRAINT valid_round_off 
        CHECK (round_off >= -1.00 AND round_off <= 1.00);
        
        RAISE NOTICE 'Added valid_round_off constraint';
    END IF;
END $$;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_invoices_language 
ON public.invoices(invoice_language);

CREATE INDEX IF NOT EXISTS idx_invoices_payment_method 
ON public.invoices(payment_method, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_invoices_payment_status 
ON public.invoices(payment_status) 
WHERE payment_status != 'paid';

CREATE INDEX IF NOT EXISTS idx_invoices_type 
ON public.invoices(invoice_type, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_invoices_table_number 
ON public.invoices(store_id, table_number, created_at DESC) 
WHERE table_number IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_invoices_served_by 
ON public.invoices(served_by, created_at DESC) 
WHERE served_by IS NOT NULL;

-- Create GIN index for payment metadata JSONB queries
CREATE INDEX IF NOT EXISTS idx_invoices_payment_metadata 
ON public.invoices USING GIN(payment_metadata);

-- Add comments
COMMENT ON COLUMN public.invoices.invoice_language IS 'Language code for receipt (en/hi/ar) - Frontend handles translation';
COMMENT ON COLUMN public.invoices.payment_reference IS 'Payment reference: UPI transaction ID, card last 4 digits, etc.';
COMMENT ON COLUMN public.invoices.payment_metadata IS 'JSONB storage for payment gateway response, UPI details, etc.';
COMMENT ON COLUMN public.invoices.receipt_sent_via IS 'Array of delivery methods: whatsapp, sms, email';
COMMENT ON COLUMN public.invoices.receipt_sent_at IS 'Timestamp when receipt was sent to customer';
COMMENT ON COLUMN public.invoices.round_off IS 'Amount rounded off (±₹1.00 max) for cash payments';
COMMENT ON COLUMN public.invoices.invoice_type IS 'Type: sale (normal), return (refund), cancelled';
COMMENT ON COLUMN public.invoices.table_number IS 'Restaurant table number (if applicable)';
COMMENT ON COLUMN public.invoices.served_by IS 'Staff member who served this order';

-- ============================================================================
-- SECTION 2: ENHANCE INVOICE_ITEMS TABLE
-- ============================================================================

DO $$ 
BEGIN
    -- Add item_notes (customer notes: "extra spicy", "no onions", etc.)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'invoice_items' 
        AND column_name = 'item_notes'
    ) THEN
        ALTER TABLE public.invoice_items 
        ADD COLUMN item_notes TEXT;
        
        RAISE NOTICE 'Added item_notes column to invoice_items table';
    END IF;

    -- Add unit_price (price per item before quantity multiplication)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'invoice_items' 
        AND column_name = 'unit_price'
    ) THEN
        ALTER TABLE public.invoice_items 
        ADD COLUMN unit_price DECIMAL(10,2);
        
        -- Backfill: unit_price = price (for existing data)
        UPDATE public.invoice_items SET unit_price = price WHERE unit_price IS NULL;
        
        -- Now make it NOT NULL
        ALTER TABLE public.invoice_items ALTER COLUMN unit_price SET NOT NULL;
        
        RAISE NOTICE 'Added unit_price column to invoice_items table';
    END IF;

    -- Add discount_amount
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'invoice_items' 
        AND column_name = 'discount_amount'
    ) THEN
        ALTER TABLE public.invoice_items 
        ADD COLUMN discount_amount DECIMAL(10,2) DEFAULT 0 CHECK (discount_amount >= 0);
        
        RAISE NOTICE 'Added discount_amount column to invoice_items table';
    END IF;

    -- Add tax_amount
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'invoice_items' 
        AND column_name = 'tax_amount'
    ) THEN
        ALTER TABLE public.invoice_items 
        ADD COLUMN tax_amount DECIMAL(10,2) DEFAULT 0 CHECK (tax_amount >= 0);
        
        RAISE NOTICE 'Added tax_amount column to invoice_items table';
    END IF;

    -- Add item_sku (denormalized for historical record)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'invoice_items' 
        AND column_name = 'item_sku'
    ) THEN
        ALTER TABLE public.invoice_items 
        ADD COLUMN item_sku TEXT;
        
        RAISE NOTICE 'Added item_sku column to invoice_items table';
    END IF;
END $$;

-- Add comments
COMMENT ON COLUMN public.invoice_items.item_notes IS 'Customer customization notes (extra spicy, no onions, etc.)';
COMMENT ON COLUMN public.invoice_items.unit_price IS 'Price per single unit (before quantity multiplication)';
COMMENT ON COLUMN public.invoice_items.discount_amount IS 'Discount applied to this line item';
COMMENT ON COLUMN public.invoice_items.tax_amount IS 'Tax amount for this line item';
COMMENT ON COLUMN public.invoice_items.item_sku IS 'Item SKU at time of sale (denormalized for history)';

-- ============================================================================
-- SECTION 3: CREATE DIGITAL RECEIPTS LOG TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.digital_receipts_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    invoice_id UUID REFERENCES public.invoices(id) ON DELETE CASCADE NOT NULL,
    recipient_type TEXT NOT NULL CHECK (recipient_type IN ('customer', 'owner', 'other')),
    delivery_method TEXT NOT NULL CHECK (delivery_method IN ('whatsapp', 'sms', 'email')),
    recipient_identifier TEXT NOT NULL, -- phone number or email
    language_code TEXT NOT NULL CHECK (language_code IN ('en', 'hi', 'ar')),
    status TEXT NOT NULL CHECK (status IN ('pending', 'sent', 'delivered', 'failed', 'bounced')),
    provider_response JSONB,
    provider_message_id TEXT,
    error_message TEXT,
    sent_at TIMESTAMPTZ,
    delivered_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- For rate limiting
    CONSTRAINT unique_invoice_recipient UNIQUE(invoice_id, recipient_identifier, delivery_method)
);

CREATE INDEX IF NOT EXISTS idx_digital_receipts_invoice 
ON public.digital_receipts_log(invoice_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_digital_receipts_status 
ON public.digital_receipts_log(status, created_at DESC) 
WHERE status IN ('pending', 'failed');

CREATE INDEX IF NOT EXISTS idx_digital_receipts_method 
ON public.digital_receipts_log(delivery_method, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_digital_receipts_recipient 
ON public.digital_receipts_log(recipient_identifier, created_at DESC);

COMMENT ON TABLE public.digital_receipts_log IS 'Tracks all digital receipt deliveries (WhatsApp/SMS/Email)';
COMMENT ON COLUMN public.digital_receipts_log.recipient_type IS 'Who received it: customer, owner (for records), other';
COMMENT ON COLUMN public.digital_receipts_log.provider_response IS 'Full response from WhatsApp/Twilio/SendGrid API';
COMMENT ON COLUMN public.digital_receipts_log.language_code IS 'Language of the receipt sent (frontend translates before sending)';

-- Enable RLS
ALTER TABLE public.digital_receipts_log ENABLE ROW LEVEL SECURITY;

-- Create policy
CREATE POLICY "Store members can view receipt logs"
ON public.digital_receipts_log
FOR SELECT
USING (
    invoice_id IN (
        SELECT i.id FROM public.invoices i
        JOIN public.store_members sm ON sm.store_id = i.store_id
        WHERE sm.user_id = auth.uid() AND sm.is_active = true
    )
);

CREATE POLICY "Store members can create receipt logs"
ON public.digital_receipts_log
FOR INSERT
WITH CHECK (
    invoice_id IN (
        SELECT i.id FROM public.invoices i
        JOIN public.store_members sm ON sm.store_id = i.store_id
        WHERE sm.user_id = auth.uid() AND sm.is_active = true
    )
);

-- ============================================================================
-- SECTION 4: CREATE PAYMENT METHODS CONFIGURATION TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.payment_methods_config (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    store_id UUID REFERENCES public.stores(id) ON DELETE CASCADE NOT NULL,
    method_type TEXT NOT NULL CHECK (method_type IN ('cash', 'upi', 'card', 'razorpay', 'digital_wallet', 'credit')),
    is_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    display_name TEXT NOT NULL,
    display_order INTEGER NOT NULL DEFAULT 0,
    metadata JSONB, -- Store UPI ID, QR code URL, Razorpay keys, etc.
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    CONSTRAINT unique_store_method UNIQUE(store_id, method_type)
);

CREATE INDEX IF NOT EXISTS idx_payment_methods_store 
ON public.payment_methods_config(store_id, display_order) 
WHERE is_enabled = true;

COMMENT ON TABLE public.payment_methods_config IS 'Store-specific payment method configuration';
COMMENT ON COLUMN public.payment_methods_config.metadata IS 'JSONB: {upi_id, qr_code_url, razorpay_key, etc.}';
COMMENT ON COLUMN public.payment_methods_config.display_name IS 'Custom display name (e.g., "Pay via PhonePe")';

-- Enable RLS
ALTER TABLE public.payment_methods_config ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Store members can view payment methods"
ON public.payment_methods_config
FOR SELECT
USING (
    store_id IN (
        SELECT store_id FROM public.store_members
        WHERE user_id = auth.uid() AND is_active = true
    )
);

CREATE POLICY "Owners can manage payment methods"
ON public.payment_methods_config
FOR ALL
USING (
    store_id IN (
        SELECT store_id FROM public.store_members
        WHERE user_id = auth.uid() AND role = 'owner' AND is_active = true
    )
);

-- Trigger for updated_at
CREATE TRIGGER update_payment_methods_updated_at
BEFORE UPDATE ON public.payment_methods_config
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================================
-- SECTION 5: CREATE HELPER FUNCTIONS FOR INVOICING
-- ============================================================================

-- Function to calculate invoice totals (with round-off)
CREATE OR REPLACE FUNCTION public.calculate_invoice_totals(
    p_subtotal DECIMAL(10,2),
    p_discount DECIMAL(10,2),
    p_discount_type TEXT,
    p_tax_rate DECIMAL(5,2)
)
RETURNS TABLE(
    subtotal_after_discount DECIMAL(10,2),
    tax_amount DECIMAL(10,2),
    total_before_round DECIMAL(10,2),
    round_off DECIMAL(10,2),
    final_total DECIMAL(10,2)
)
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
    v_discount_amount DECIMAL(10,2);
    v_subtotal_after_discount DECIMAL(10,2);
    v_tax_amount DECIMAL(10,2);
    v_total_before_round DECIMAL(10,2);
    v_round_off DECIMAL(10,2);
    v_final_total DECIMAL(10,2);
BEGIN
    -- Calculate discount amount
    IF p_discount_type = 'percentage' THEN
        v_discount_amount := p_subtotal * (p_discount / 100);
    ELSE
        v_discount_amount := p_discount;
    END IF;

    -- Subtotal after discount
    v_subtotal_after_discount := p_subtotal - v_discount_amount;
    
    -- Calculate tax
    v_tax_amount := v_subtotal_after_discount * (p_tax_rate / 100);
    
    -- Total before rounding
    v_total_before_round := v_subtotal_after_discount + v_tax_amount;
    
    -- Round to nearest 0.50 for cash payments (Indian style)
    v_final_total := ROUND(v_total_before_round * 2) / 2;
    v_round_off := v_final_total - v_total_before_round;

    RETURN QUERY SELECT 
        v_subtotal_after_discount,
        v_tax_amount,
        v_total_before_round,
        v_round_off,
        v_final_total;
END;
$$;

COMMENT ON FUNCTION public.calculate_invoice_totals IS 'Calculates invoice totals with discount, tax, and round-off';

-- Function to get invoice for receipt (with all data needed for frontend)
CREATE OR REPLACE FUNCTION public.get_invoice_for_receipt(p_invoice_id UUID)
RETURNS TABLE(
    -- Invoice data
    invoice_id UUID,
    invoice_number TEXT,
    invoice_date TIMESTAMPTZ,
    invoice_language TEXT,
    invoice_type TEXT,
    
    -- Store data
    store_name TEXT,
    store_address TEXT,
    store_phone TEXT,
    store_email TEXT,
    store_gst_number TEXT,
    store_logo_url TEXT,
    
    -- Customer data
    customer_name TEXT,
    customer_phone TEXT,
    customer_email TEXT,
    
    -- Amounts
    subtotal DECIMAL(10,2),
    discount DECIMAL(10,2),
    discount_type TEXT,
    tax DECIMAL(10,2),
    tax_rate DECIMAL(5,2),
    round_off DECIMAL(10,2),
    total DECIMAL(10,2),
    
    -- Payment
    payment_method TEXT,
    payment_reference TEXT,
    payment_status TEXT,
    
    -- Other
    table_number TEXT,
    served_by_name TEXT,
    created_by_name TEXT,
    notes TEXT,
    
    -- Items (as JSONB array)
    items JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        i.id,
        i.invoice_number,
        i.created_at,
        i.invoice_language,
        i.invoice_type,
        
        s.name,
        s.address,
        s.phone,
        s.email,
        s.gst_number,
        s.logo_url,
        
        i.customer_name,
        i.customer_phone,
        COALESCE(c.email, i.customer_phone),
        
        i.subtotal,
        i.discount,
        i.discount_type,
        i.tax,
        i.tax_rate,
        i.round_off,
        i.total,
        
        i.payment_method,
        i.payment_reference,
        i.payment_status,
        
        i.table_number,
        sb.name,
        cb.name,
        i.notes,
        
        -- Aggregate items as JSONB
        COALESCE(
            jsonb_agg(
                jsonb_build_object(
                    'id', ii.id,
                    'item_name', ii.item_name,
                    'item_sku', ii.item_sku,
                    'quantity', ii.quantity,
                    'unit_price', ii.unit_price,
                    'price', ii.price,
                    'discount_amount', ii.discount_amount,
                    'tax_amount', ii.tax_amount,
                    'subtotal', ii.subtotal,
                    'item_notes', ii.item_notes
                ) ORDER BY ii.created_at
            ),
            '[]'::jsonb
        )
    FROM public.invoices i
    JOIN public.stores s ON s.id = i.store_id
    LEFT JOIN public.customers c ON c.id = i.customer_id
    LEFT JOIN public.profiles sb ON sb.id = i.served_by
    LEFT JOIN public.profiles cb ON cb.id = i.created_by
    LEFT JOIN public.invoice_items ii ON ii.invoice_id = i.id
    WHERE i.id = p_invoice_id
    GROUP BY 
        i.id, i.invoice_number, i.created_at, i.invoice_language, i.invoice_type,
        s.name, s.address, s.phone, s.email, s.gst_number, s.logo_url,
        i.customer_name, i.customer_phone, c.email,
        i.subtotal, i.discount, i.discount_type, i.tax, i.tax_rate, i.round_off, i.total,
        i.payment_method, i.payment_reference, i.payment_status,
        i.table_number, sb.name, cb.name, i.notes;
END;
$$;

COMMENT ON FUNCTION public.get_invoice_for_receipt IS 'Returns complete invoice data for receipt generation (frontend handles translation)';

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.calculate_invoice_totals TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_invoice_for_receipt TO authenticated;

-- ============================================================================
-- SECTION 6: CREATE VIEW FOR INVOICE ANALYTICS
-- ============================================================================

CREATE OR REPLACE VIEW public.invoice_analytics AS
SELECT 
    i.store_id,
    i.invoice_language,
    i.payment_method,
    i.payment_status,
    i.invoice_type,
    DATE(i.created_at) as invoice_date,
    COUNT(*) as invoice_count,
    SUM(i.total) as total_amount,
    AVG(i.total) as average_amount,
    SUM(i.discount) as total_discount,
    SUM(i.tax) as total_tax,
    COUNT(DISTINCT i.customer_id) FILTER (WHERE i.customer_id IS NOT NULL) as unique_customers
FROM public.invoices i
WHERE i.status = 'completed' AND i.invoice_type = 'sale'
GROUP BY 
    i.store_id,
    i.invoice_language,
    i.payment_method,
    i.payment_status,
    i.invoice_type,
    DATE(i.created_at);

COMMENT ON VIEW public.invoice_analytics IS 'Aggregated invoice analytics for reporting';

-- Grant access to view
GRANT SELECT ON public.invoice_analytics TO authenticated;

-- ============================================================================
-- SECTION 7: SEED DEFAULT PAYMENT METHODS FOR EXISTING STORES
-- ============================================================================

INSERT INTO public.payment_methods_config (store_id, method_type, display_name, display_order, is_enabled)
SELECT 
    id,
    unnest(ARRAY['cash', 'upi', 'card', 'razorpay']::TEXT[]),
    unnest(ARRAY['Cash', 'UPI', 'Card', 'Online Payment']::TEXT[]),
    unnest(ARRAY[1, 2, 3, 4]::INTEGER[]),
    unnest(ARRAY[true, true, true, false]::BOOLEAN[])
FROM public.stores
ON CONFLICT (store_id, method_type) DO NOTHING;

-- ============================================================================
-- SECTION 8: UPDATE EXISTING INVOICES
-- ============================================================================

-- Set invoice_language based on store language
UPDATE public.invoices i
SET invoice_language = COALESCE(s.language, 'en')
FROM public.stores s
WHERE i.store_id = s.id
    AND i.invoice_language = 'en'; -- Only update if still default

-- Backfill unit_price in invoice_items
UPDATE public.invoice_items
SET unit_price = price
WHERE unit_price IS NULL;

-- ============================================================================
-- ROLLBACK SCRIPT (Keep for reference, do not execute)
-- ============================================================================

/*
-- To rollback this migration, execute:

-- Drop view
DROP VIEW IF EXISTS public.invoice_analytics CASCADE;

-- Drop functions
DROP FUNCTION IF EXISTS public.get_invoice_for_receipt CASCADE;
DROP FUNCTION IF EXISTS public.calculate_invoice_totals CASCADE;

-- Drop tables
DROP TABLE IF EXISTS public.payment_methods_config CASCADE;
DROP TABLE IF EXISTS public.digital_receipts_log CASCADE;

-- Remove columns from invoice_items
ALTER TABLE public.invoice_items DROP COLUMN IF EXISTS item_sku;
ALTER TABLE public.invoice_items DROP COLUMN IF EXISTS tax_amount;
ALTER TABLE public.invoice_items DROP COLUMN IF EXISTS discount_amount;
ALTER TABLE public.invoice_items DROP COLUMN IF EXISTS unit_price;
ALTER TABLE public.invoice_items DROP COLUMN IF EXISTS item_notes;

-- Remove columns from invoices
ALTER TABLE public.invoices DROP COLUMN IF EXISTS served_by;
ALTER TABLE public.invoices DROP COLUMN IF EXISTS table_number;
ALTER TABLE public.invoices DROP COLUMN IF EXISTS invoice_type;
ALTER TABLE public.invoices DROP COLUMN IF EXISTS round_off;
ALTER TABLE public.invoices DROP COLUMN IF EXISTS receipt_sent_at;
ALTER TABLE public.invoices DROP COLUMN IF EXISTS receipt_sent_via;
ALTER TABLE public.invoices DROP COLUMN IF EXISTS payment_metadata;
ALTER TABLE public.invoices DROP COLUMN IF EXISTS payment_reference;
ALTER TABLE public.invoices DROP COLUMN IF EXISTS invoice_language;
*/

-- ============================================================================
-- END OF MIGRATION
-- ============================================================================