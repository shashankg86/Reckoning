-- ============================================================================
-- Migration: Digital Receipt and Payment System
-- Version: 1.0.0
-- Author: Universal POS Team
-- Date: 2025-10-15
-- Description: Implements digital receipt delivery system (WhatsApp/SMS/Email)
--              and comprehensive payment tracking with audit trails
--              NO PAPER - 100% Digital receipts
-- Dependencies: Requires 20251015130000_add_enhanced_invoicing_system.sql
-- Rollback: See rollback section at end of file
-- ============================================================================

-- ============================================================================
-- SECTION 1: CREATE DIGITAL RECEIPTS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.digital_receipts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    invoice_id UUID REFERENCES public.invoices(id) ON DELETE CASCADE NOT NULL,
    store_id UUID REFERENCES public.stores(id) ON DELETE CASCADE NOT NULL,
    receipt_number TEXT NOT NULL,
    delivery_method TEXT NOT NULL CHECK (delivery_method IN ('whatsapp', 'sms', 'email', 'none')),
    recipient_phone TEXT,
    recipient_email TEXT,
    delivery_status TEXT NOT NULL DEFAULT 'pending' CHECK (delivery_status IN ('pending', 'sent', 'delivered', 'failed', 'bounced')),
    delivery_provider TEXT, -- 'twilio', 'msg91', 'whatsapp_business', 'resend', 'manual'
    provider_message_id TEXT,
    provider_response JSONB,
    retry_count INTEGER NOT NULL DEFAULT 0,
    max_retries INTEGER NOT NULL DEFAULT 3,
    sent_at TIMESTAMPTZ,
    delivered_at TIMESTAMPTZ,
    failed_at TIMESTAMPTZ,
    failure_reason TEXT,
    receipt_url TEXT, -- Public URL to view receipt online
    receipt_data JSONB, -- Full receipt data in JSON format
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT unique_receipt_per_invoice UNIQUE(invoice_id, delivery_method),
    CONSTRAINT valid_recipient CHECK (
        (delivery_method = 'email' AND recipient_email IS NOT NULL) OR
        (delivery_method IN ('whatsapp', 'sms') AND recipient_phone IS NOT NULL) OR
        delivery_method = 'none'
    ),
    CONSTRAINT valid_retry_count CHECK (retry_count >= 0 AND retry_count <= max_retries)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_digital_receipts_invoice 
ON public.digital_receipts(invoice_id);

CREATE INDEX IF NOT EXISTS idx_digital_receipts_store 
ON public.digital_receipts(store_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_digital_receipts_status 
ON public.digital_receipts(delivery_status, created_at DESC)
WHERE delivery_status IN ('pending', 'failed');

CREATE INDEX IF NOT EXISTS idx_digital_receipts_retry 
ON public.digital_receipts(delivery_status, retry_count)
WHERE delivery_status = 'failed' AND retry_count < max_retries;

CREATE INDEX IF NOT EXISTS idx_digital_receipts_phone 
ON public.digital_receipts(recipient_phone)
WHERE recipient_phone IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_digital_receipts_email 
ON public.digital_receipts(recipient_email)
WHERE recipient_email IS NOT NULL;

-- Comments
COMMENT ON TABLE public.digital_receipts IS 'Digital receipt delivery tracking (WhatsApp, SMS, Email)';
COMMENT ON COLUMN public.digital_receipts.delivery_method IS 'Method: whatsapp (preferred), sms (fallback), email (professional), none (manual)';
COMMENT ON COLUMN public.digital_receipts.receipt_url IS 'Public URL for customer to view/download receipt';
COMMENT ON COLUMN public.digital_receipts.receipt_data IS 'Full receipt JSON for regeneration';

-- ============================================================================
-- SECTION 2: CREATE PAYMENT TRANSACTIONS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.payment_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    invoice_id UUID REFERENCES public.invoices(id) ON DELETE CASCADE NOT NULL,
    store_id UUID REFERENCES public.stores(id) ON DELETE CASCADE NOT NULL,
    transaction_id TEXT, -- External payment gateway transaction ID
    payment_method TEXT NOT NULL CHECK (payment_method IN ('cash', 'upi', 'razorpay', 'card', 'wallet')),
    payment_provider TEXT, -- 'razorpay', 'phonepe', 'paytm', 'manual'
    amount DECIMAL(10,2) NOT NULL CHECK (amount > 0),
    currency TEXT NOT NULL DEFAULT 'INR',
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'refunded', 'cancelled')),
    payment_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Additional payment details
    card_last4 TEXT, -- Last 4 digits of card (for card payments)
    card_brand TEXT, -- 'visa', 'mastercard', 'amex', etc.
    upi_id TEXT, -- UPI ID for UPI payments
    bank_reference TEXT, -- Bank reference number
    
    -- Payment gateway response
    gateway_response JSONB,
    error_code TEXT,
    error_message TEXT,
    
    -- Metadata
    ip_address INET,
    user_agent TEXT,
    device_info JSONB,
    
    -- Refund tracking
    is_refunded BOOLEAN NOT NULL DEFAULT FALSE,
    refund_amount DECIMAL(10,2),
    refund_date TIMESTAMPTZ,
    refund_reason TEXT,
    refund_transaction_id TEXT,
    
    -- Audit
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT valid_currency CHECK (currency IN ('INR', 'AED')),
    CONSTRAINT valid_refund_amount CHECK (
        refund_amount IS NULL OR 
        (refund_amount > 0 AND refund_amount <= amount)
    )
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_payment_transactions_invoice 
ON public.payment_transactions(invoice_id);

CREATE INDEX IF NOT EXISTS idx_payment_transactions_store 
ON public.payment_transactions(store_id, payment_date DESC);

CREATE INDEX IF NOT EXISTS idx_payment_transactions_status 
ON public.payment_transactions(status, payment_date DESC);

CREATE INDEX IF NOT EXISTS idx_payment_transactions_method 
ON public.payment_transactions(payment_method, status, payment_date DESC);

CREATE INDEX IF NOT EXISTS idx_payment_transactions_transaction_id 
ON public.payment_transactions(transaction_id)
WHERE transaction_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_payment_transactions_refunded 
ON public.payment_transactions(is_refunded, refund_date DESC)
WHERE is_refunded = TRUE;

-- Comments
COMMENT ON TABLE public.payment_transactions IS 'Complete payment transaction history with gateway integration';
COMMENT ON COLUMN public.payment_transactions.transaction_id IS 'External payment gateway transaction/order ID';
COMMENT ON COLUMN public.payment_transactions.gateway_response IS 'Complete response from payment gateway (for debugging)';

-- ============================================================================
-- SECTION 3: CREATE RECEIPT TEMPLATES TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.receipt_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    store_id UUID REFERENCES public.stores(id) ON DELETE CASCADE NOT NULL,
    template_name TEXT NOT NULL,
    template_type TEXT NOT NULL CHECK (template_type IN ('whatsapp', 'sms', 'email_html', 'email_text', 'pdf')),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    is_default BOOLEAN NOT NULL DEFAULT FALSE,
    
    -- Template structure (NO TRANSLATIONS STORED)
    template_structure JSONB NOT NULL, -- Structure with translation keys, not actual text
    
    -- Customization
    header_logo_url TEXT,
    footer_text_key TEXT, -- Translation key for footer
    show_store_info BOOLEAN NOT NULL DEFAULT TRUE,
    show_qr_code BOOLEAN NOT NULL DEFAULT TRUE,
    show_tax_breakdown BOOLEAN NOT NULL DEFAULT TRUE,
    
    -- Metadata
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    CONSTRAINT unique_template_per_store UNIQUE(store_id, template_name, template_type)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_receipt_templates_store 
ON public.receipt_templates(store_id, is_active)
WHERE is_active = TRUE;

CREATE INDEX IF NOT EXISTS idx_receipt_templates_default 
ON public.receipt_templates(store_id, template_type, is_default)
WHERE is_default = TRUE;

-- Comments
COMMENT ON TABLE public.receipt_templates IS 'Receipt templates with translation keys (actual translations handled by frontend)';
COMMENT ON COLUMN public.receipt_templates.template_structure IS 'JSON structure with i18n keys, NOT translated text';

-- ============================================================================
-- SECTION 4: CREATE RECEIPT DELIVERY LOG
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.receipt_delivery_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    digital_receipt_id UUID REFERENCES public.digital_receipts(id) ON DELETE CASCADE NOT NULL,
    attempt_number INTEGER NOT NULL,
    delivery_method TEXT NOT NULL,
    provider TEXT NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('sent', 'delivered', 'failed', 'bounced')),
    provider_response JSONB,
    error_code TEXT,
    error_message TEXT,
    cost_amount DECIMAL(10,4), -- Cost per SMS/WhatsApp message
    cost_currency TEXT DEFAULT 'INR',
    attempted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    CONSTRAINT valid_attempt_number CHECK (attempt_number > 0)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_receipt_delivery_log_receipt 
ON public.receipt_delivery_log(digital_receipt_id, attempt_number DESC);

CREATE INDEX IF NOT EXISTS idx_receipt_delivery_log_status 
ON public.receipt_delivery_log(status, attempted_at DESC);

-- Comments
COMMENT ON TABLE public.receipt_delivery_log IS 'Detailed log of every receipt delivery attempt';

-- ============================================================================
-- SECTION 5: CREATE HELPER FUNCTIONS
-- ============================================================================

-- Function to generate receipt number
CREATE OR REPLACE FUNCTION public.generate_receipt_number(
    p_store_id UUID,
    p_invoice_number TEXT
)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_receipt_number TEXT;
BEGIN
    -- Receipt number format: RCT-{INVOICE_NUMBER}-{METHOD_SUFFIX}
    -- Example: RCT-INV-000001-WA (WhatsApp), RCT-INV-000001-SM (SMS), RCT-INV-000001-EM (Email)
    v_receipt_number := 'RCT-' || p_invoice_number;
    
    RETURN v_receipt_number;
END;
$$;

COMMENT ON FUNCTION public.generate_receipt_number IS 'Generates unique receipt number based on invoice';

-- Function to create digital receipt
CREATE OR REPLACE FUNCTION public.create_digital_receipt(
    p_invoice_id UUID,
    p_delivery_method TEXT,
    p_recipient_phone TEXT DEFAULT NULL,
    p_recipient_email TEXT DEFAULT NULL,
    p_receipt_data JSONB DEFAULT NULL
)
RETURNS TABLE(
    receipt_id UUID,
    receipt_number TEXT,
    receipt_url TEXT,
    success BOOLEAN,
    error_message TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_receipt_id UUID;
    v_receipt_number TEXT;
    v_receipt_url TEXT;
    v_store_id UUID;
    v_invoice_number TEXT;
BEGIN
    -- Get store_id and invoice_number
    SELECT i.store_id, i.invoice_number
    INTO v_store_id, v_invoice_number
    FROM public.invoices i
    WHERE i.id = p_invoice_id;
    
    IF v_store_id IS NULL THEN
        RETURN QUERY SELECT 
            NULL::UUID,
            NULL::TEXT,
            NULL::TEXT,
            FALSE,
            'Invoice not found'::TEXT;
        RETURN;
    END IF;

    -- Generate receipt number
    v_receipt_number := public.generate_receipt_number(v_store_id, v_invoice_number);
    
    -- Generate public receipt URL
    v_receipt_url := 'https://app.universalpos.com/receipt/' || v_receipt_number;

    -- Insert digital receipt
    INSERT INTO public.digital_receipts (
        invoice_id,
        store_id,
        receipt_number,
        delivery_method,
        recipient_phone,
        recipient_email,
        receipt_url,
        receipt_data,
        delivery_status
    )
    VALUES (
        p_invoice_id,
        v_store_id,
        v_receipt_number,
        p_delivery_method,
        p_recipient_phone,
        p_recipient_email,
        v_receipt_url,
        p_receipt_data,
        'pending'
    )
    RETURNING id INTO v_receipt_id;

    RETURN QUERY SELECT 
        v_receipt_id,
        v_receipt_number,
        v_receipt_url,
        TRUE,
        NULL::TEXT;
END;
$$;

COMMENT ON FUNCTION public.create_digital_receipt IS 'Creates digital receipt record and generates public URL';

-- Function to mark receipt as delivered
CREATE OR REPLACE FUNCTION public.mark_receipt_delivered(
    p_receipt_id UUID,
    p_provider TEXT,
    p_provider_message_id TEXT,
    p_provider_response JSONB DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    UPDATE public.digital_receipts
    SET 
        delivery_status = 'delivered',
        delivery_provider = p_provider,
        provider_message_id = p_provider_message_id,
        provider_response = p_provider_response,
        sent_at = COALESCE(sent_at, NOW()),
        delivered_at = NOW(),
        updated_at = NOW()
    WHERE id = p_receipt_id;
    
    RETURN FOUND;
END;
$$;

-- Function to mark receipt as failed
CREATE OR REPLACE FUNCTION public.mark_receipt_failed(
    p_receipt_id UUID,
    p_failure_reason TEXT,
    p_provider_response JSONB DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_current_retry INTEGER;
    v_max_retry INTEGER;
BEGIN
    -- Get current retry count
    SELECT retry_count, max_retries
    INTO v_current_retry, v_max_retry
    FROM public.digital_receipts
    WHERE id = p_receipt_id;

    -- Update receipt
    UPDATE public.digital_receipts
    SET 
        delivery_status = 'failed',
        retry_count = retry_count + 1,
        failure_reason = p_failure_reason,
        provider_response = p_provider_response,
        failed_at = NOW(),
        updated_at = NOW()
    WHERE id = p_receipt_id;
    
    RETURN FOUND;
END;
$$;

-- Function to record payment transaction
CREATE OR REPLACE FUNCTION public.record_payment_transaction(
    p_invoice_id UUID,
    p_payment_method TEXT,
    p_amount DECIMAL,
    p_transaction_id TEXT DEFAULT NULL,
    p_payment_provider TEXT DEFAULT NULL,
    p_gateway_response JSONB DEFAULT NULL,
    p_created_by UUID DEFAULT NULL
)
RETURNS TABLE(
    payment_id UUID,
    success BOOLEAN,
    error_message TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_payment_id UUID;
    v_store_id UUID;
    v_currency TEXT;
BEGIN
    -- Get store and currency from invoice
    SELECT i.store_id, s.currency
    INTO v_store_id, v_currency
    FROM public.invoices i
    JOIN public.stores s ON s.id = i.store_id
    WHERE i.id = p_invoice_id;
    
    IF v_store_id IS NULL THEN
        RETURN QUERY SELECT 
            NULL::UUID,
            FALSE,
            'Invoice not found'::TEXT;
        RETURN;
    END IF;

    -- Insert payment transaction
    INSERT INTO public.payment_transactions (
        invoice_id,
        store_id,
        transaction_id,
        payment_method,
        payment_provider,
        amount,
        currency,
        status,
        gateway_response,
        created_by
    )
    VALUES (
        p_invoice_id,
        v_store_id,
        p_transaction_id,
        p_payment_method,
        p_payment_provider,
        p_amount,
        v_currency,
        CASE 
            WHEN p_payment_method = 'cash' THEN 'completed'
            ELSE 'processing'
        END,
        p_gateway_response,
        COALESCE(p_created_by, auth.uid())
    )
    RETURNING id INTO v_payment_id;

    -- Update invoice payment status
    UPDATE public.invoices
    SET 
        payment_status = CASE 
            WHEN p_payment_method = 'cash' THEN 'paid'
            ELSE 'pending'
        END,
        updated_at = NOW()
    WHERE id = p_invoice_id;

    RETURN QUERY SELECT 
        v_payment_id,
        TRUE,
        NULL::TEXT;
END;
$$;

COMMENT ON FUNCTION public.record_payment_transaction IS 'Records payment transaction with automatic status handling';

-- Function to get receipt delivery statistics
CREATE OR REPLACE FUNCTION public.get_receipt_delivery_stats(
    p_store_id UUID,
    p_from_date TIMESTAMPTZ DEFAULT NULL,
    p_to_date TIMESTAMPTZ DEFAULT NULL
)
RETURNS TABLE(
    delivery_method TEXT,
    total_sent INTEGER,
    total_delivered INTEGER,
    total_failed INTEGER,
    delivery_rate DECIMAL,
    avg_delivery_time INTERVAL
)
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        dr.delivery_method,
        COUNT(*)::INTEGER AS total_sent,
        COUNT(*) FILTER (WHERE dr.delivery_status = 'delivered')::INTEGER AS total_delivered,
        COUNT(*) FILTER (WHERE dr.delivery_status = 'failed')::INTEGER AS total_failed,
        ROUND(
            (COUNT(*) FILTER (WHERE dr.delivery_status = 'delivered')::DECIMAL / 
            NULLIF(COUNT(*), 0) * 100), 
            2
        ) AS delivery_rate,
        AVG(dr.delivered_at - dr.sent_at) FILTER (WHERE dr.delivered_at IS NOT NULL) AS avg_delivery_time
    FROM public.digital_receipts dr
    WHERE dr.store_id = p_store_id
        AND (p_from_date IS NULL OR dr.created_at >= p_from_date)
        AND (p_to_date IS NULL OR dr.created_at <= p_to_date)
    GROUP BY dr.delivery_method;
END;
$$;

COMMENT ON FUNCTION public.get_receipt_delivery_stats IS 'Returns delivery statistics by method for a store';

-- ============================================================================
-- SECTION 6: CREATE TRIGGERS
-- ============================================================================

-- Trigger for updated_at on digital_receipts
CREATE TRIGGER update_digital_receipts_updated_at
BEFORE UPDATE ON public.digital_receipts
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger for updated_at on payment_transactions
CREATE TRIGGER update_payment_transactions_updated_at
BEFORE UPDATE ON public.payment_transactions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger for updated_at on receipt_templates
CREATE TRIGGER update_receipt_templates_updated_at
BEFORE UPDATE ON public.receipt_templates
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================================
-- SECTION 7: ENABLE RLS AND CREATE POLICIES
-- ============================================================================

-- Enable RLS
ALTER TABLE public.digital_receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.receipt_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.receipt_delivery_log ENABLE ROW LEVEL SECURITY;

-- Digital Receipts Policies
CREATE POLICY "Store members can view receipts"
ON public.digital_receipts
FOR SELECT
USING (
    store_id IN (
        SELECT store_id FROM public.store_members
        WHERE user_id = auth.uid() AND is_active = TRUE
    )
);

CREATE POLICY "Store members can create receipts"
ON public.digital_receipts
FOR INSERT
WITH CHECK (
    store_id IN (
        SELECT store_id FROM public.store_members
        WHERE user_id = auth.uid() AND is_active = TRUE
    )
);

CREATE POLICY "Service role full access to receipts"
ON public.digital_receipts
FOR ALL
USING (auth.jwt()->>'role' = 'service_role');

-- Payment Transactions Policies
CREATE POLICY "Store members can view payments"
ON public.payment_transactions
FOR SELECT
USING (
    store_id IN (
        SELECT store_id FROM public.store_members
        WHERE user_id = auth.uid() AND is_active = TRUE
    )
);

CREATE POLICY "Store members can record payments"
ON public.payment_transactions
FOR INSERT
WITH CHECK (
    store_id IN (
        SELECT store_id FROM public.store_members
        WHERE user_id = auth.uid() AND is_active = TRUE
    )
);

CREATE POLICY "Owners can update payments"
ON public.payment_transactions
FOR UPDATE
USING (
    store_id IN (
        SELECT store_id FROM public.store_members
        WHERE user_id = auth.uid() AND role = 'owner' AND is_active = TRUE
    )
);

-- Receipt Templates Policies
CREATE POLICY "Store members can view templates"
ON public.receipt_templates
FOR SELECT
USING (
    store_id IN (
        SELECT store_id FROM public.store_members
        WHERE user_id = auth.uid() AND is_active = TRUE
    )
);

CREATE POLICY "Owners and managers can manage templates"
ON public.receipt_templates
FOR ALL
USING (
    store_id IN (
        SELECT store_id FROM public.store_members
        WHERE user_id = auth.uid() 
        AND role IN ('owner', 'manager')
        AND is_active = TRUE
    )
);

-- Receipt Delivery Log Policies
CREATE POLICY "Store members can view delivery logs"
ON public.receipt_delivery_log
FOR SELECT
USING (
    digital_receipt_id IN (
        SELECT id FROM public.digital_receipts
        WHERE store_id IN (
            SELECT store_id FROM public.store_members
            WHERE user_id = auth.uid() AND is_active = TRUE
        )
    )
);

CREATE POLICY "Service role full access to delivery logs"
ON public.receipt_delivery_log
FOR ALL
USING (auth.jwt()->>'role' = 'service_role');

-- ============================================================================
-- SECTION 8: INSERT DEFAULT RECEIPT TEMPLATES
-- ============================================================================

-- This will be populated by backend service with translation keys
-- Example template structure (stored as JSONB):
/*
{
  "sections": [
    {
      "type": "header",
      "logo": true,
      "storeName": true,
      "storeAddress": true
    },
    {
      "type": "invoice_info",
      "fields": ["invoice_number", "date", "time"]
    },
    {
      "type": "items_list",
      "showImages": false,
      "columns": ["name", "quantity", "price", "total"]
    },
    {
      "type": "totals",
      "fields": ["subtotal", "discount", "tax", "total"]
    },
    {
      "type": "payment_info",
      "fields": ["payment_method", "transaction_id"]
    },
    {
      "type": "footer",
      "textKey": "receipt.footer.thanks",
      "showQR": true
    }
  ]
}
*/

-- ============================================================================
-- SECTION 9: GRANT PERMISSIONS
-- ============================================================================

GRANT SELECT, INSERT ON public.digital_receipts TO authenticated;
GRANT SELECT, INSERT ON public.payment_transactions TO authenticated;
GRANT SELECT ON public.receipt_templates TO authenticated;
GRANT SELECT ON public.receipt_delivery_log TO authenticated;

GRANT EXECUTE ON FUNCTION public.create_digital_receipt TO authenticated;
GRANT EXECUTE ON FUNCTION public.mark_receipt_delivered TO authenticated;
GRANT EXECUTE ON FUNCTION public.mark_receipt_failed TO authenticated;
GRANT EXECUTE ON FUNCTION public.record_payment_transaction TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_receipt_delivery_stats TO authenticated;

-- ============================================================================
-- ROLLBACK SCRIPT (Keep for reference, do not execute)
-- ============================================================================

/*
-- To rollback this migration, execute:

-- Drop functions
DROP FUNCTION IF EXISTS public.get_receipt_delivery_stats CASCADE;
DROP FUNCTION IF EXISTS public.record_payment_transaction CASCADE;
DROP FUNCTION IF EXISTS public.mark_receipt_failed CASCADE;
DROP FUNCTION IF EXISTS public.mark_receipt_delivered CASCADE;
DROP FUNCTION IF EXISTS public.create_digital_receipt CASCADE;
DROP FUNCTION IF EXISTS public.generate_receipt_number CASCADE;

-- Drop tables
DROP TABLE IF EXISTS public.receipt_delivery_log CASCADE;
DROP TABLE IF EXISTS public.receipt_templates CASCADE;
DROP TABLE IF EXISTS public.payment_transactions CASCADE;
DROP TABLE IF EXISTS public.digital_receipts CASCADE;
*/

-- ============================================================================
-- END OF MIGRATION
-- ============================================================================