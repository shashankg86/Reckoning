-- ============================================================================
-- Migration: Advanced Stock Management & Analytics Foundation
-- Version: 1.0.0
-- Author: Universal POS Team
-- Date: 2025-10-15
-- Description: Implements comprehensive stock tracking, price history, 
--              low stock alerts, and analytics foundation for reporting
-- Dependencies: Requires all previous migrations (20251015130000)
-- Rollback: See rollback section at end of file
-- ============================================================================

-- ============================================================================
-- SECTION 1: ENHANCE STOCK_MOVEMENTS TABLE
-- ============================================================================

-- Add additional tracking columns
DO $$ 
BEGIN
    -- Add unit_cost column for COGS tracking
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'stock_movements' 
        AND column_name = 'unit_cost'
    ) THEN
        ALTER TABLE public.stock_movements 
        ADD COLUMN unit_cost DECIMAL(10,2);
        
        RAISE NOTICE 'Added unit_cost column to stock_movements';
    END IF;

    -- Add total_cost column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'stock_movements' 
        AND column_name = 'total_cost'
    ) THEN
        ALTER TABLE public.stock_movements 
        ADD COLUMN total_cost DECIMAL(10,2);
        
        RAISE NOTICE 'Added total_cost column to stock_movements';
    END IF;

    -- Add batch_number for lot tracking
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'stock_movements' 
        AND column_name = 'batch_number'
    ) THEN
        ALTER TABLE public.stock_movements 
        ADD COLUMN batch_number TEXT;
        
        RAISE NOTICE 'Added batch_number column to stock_movements';
    END IF;

    -- Add expiry_date for perishable items
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'stock_movements' 
        AND column_name = 'expiry_date'
    ) THEN
        ALTER TABLE public.stock_movements 
        ADD COLUMN expiry_date DATE;
        
        RAISE NOTICE 'Added expiry_date column to stock_movements';
    END IF;
END $$;

-- Add computed column for movement value
ALTER TABLE public.stock_movements 
ADD COLUMN IF NOT EXISTS movement_value DECIMAL(10,2) 
GENERATED ALWAYS AS (quantity_change * COALESCE(unit_cost, 0)) STORED;

-- Add indexes for analytics queries
CREATE INDEX IF NOT EXISTS idx_stock_movements_reason_date 
ON public.stock_movements(reason, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_stock_movements_batch 
ON public.stock_movements(batch_number) 
WHERE batch_number IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_stock_movements_expiry 
ON public.stock_movements(expiry_date) 
WHERE expiry_date IS NOT NULL AND expiry_date > CURRENT_DATE;

-- Add comments
COMMENT ON COLUMN public.stock_movements.unit_cost IS 'Cost per unit at time of movement (for COGS calculation)';
COMMENT ON COLUMN public.stock_movements.total_cost IS 'Total cost of movement (quantity × unit_cost)';
COMMENT ON COLUMN public.stock_movements.batch_number IS 'Batch/lot number for inventory tracking';
COMMENT ON COLUMN public.stock_movements.expiry_date IS 'Expiry date for perishable items';
COMMENT ON COLUMN public.stock_movements.movement_value IS 'Computed: quantity_change × unit_cost';

-- ============================================================================
-- SECTION 2: ADD COST TRACKING TO ITEMS
-- ============================================================================

DO $$ 
BEGIN
    -- Add cost_price column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'items' 
        AND column_name = 'cost_price'
    ) THEN
        ALTER TABLE public.items 
        ADD COLUMN cost_price DECIMAL(10,2) DEFAULT 0 CHECK (cost_price >= 0);
        
        RAISE NOTICE 'Added cost_price column to items';
    END IF;

    -- Add profit_margin computed column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'items' 
        AND column_name = 'profit_margin'
    ) THEN
        ALTER TABLE public.items 
        ADD COLUMN profit_margin DECIMAL(5,2);
        
        RAISE NOTICE 'Added profit_margin column to items';
    END IF;

    -- Add is_perishable flag
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'items' 
        AND column_name = 'is_perishable'
    ) THEN
        ALTER TABLE public.items 
        ADD COLUMN is_perishable BOOLEAN DEFAULT FALSE;
        
        RAISE NOTICE 'Added is_perishable column to items';
    END IF;

    -- Add reorder_point
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'items' 
        AND column_name = 'reorder_point'
    ) THEN
        ALTER TABLE public.items 
        ADD COLUMN reorder_point INTEGER DEFAULT 10 CHECK (reorder_point >= 0);
        
        RAISE NOTICE 'Added reorder_point column to items';
    END IF;

    -- Add reorder_quantity
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'items' 
        AND column_name = 'reorder_quantity'
    ) THEN
        ALTER TABLE public.items 
        ADD COLUMN reorder_quantity INTEGER DEFAULT 50 CHECK (reorder_quantity > 0);
        
        RAISE NOTICE 'Added reorder_quantity column to items';
    END IF;

    -- Add last_restocked_at
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'items' 
        AND column_name = 'last_restocked_at'
    ) THEN
        ALTER TABLE public.items 
        ADD COLUMN last_restocked_at TIMESTAMPTZ;
        
        RAISE NOTICE 'Added last_restocked_at column to items';
    END IF;
END $$;

-- Create index for low stock queries
CREATE INDEX IF NOT EXISTS idx_items_low_stock 
ON public.items(store_id, stock, reorder_point) 
WHERE is_active = TRUE AND stock <= low_stock_threshold;

COMMENT ON COLUMN public.items.cost_price IS 'Cost price per unit (for profit calculation)';
COMMENT ON COLUMN public.items.profit_margin IS 'Profit margin percentage ((price - cost) / price × 100)';
COMMENT ON COLUMN public.items.is_perishable IS 'Flag for items with expiry dates';
COMMENT ON COLUMN public.items.reorder_point IS 'Stock level that triggers reorder alert';
COMMENT ON COLUMN public.items.reorder_quantity IS 'Suggested quantity to reorder';
COMMENT ON COLUMN public.items.last_restocked_at IS 'Timestamp of last stock replenishment';

-- ============================================================================
-- SECTION 3: CREATE PRICE HISTORY TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.item_price_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    item_id UUID REFERENCES public.items(id) ON DELETE CASCADE NOT NULL,
    old_price DECIMAL(10,2) NOT NULL CHECK (old_price >= 0),
    new_price DECIMAL(10,2) NOT NULL CHECK (new_price >= 0),
    old_cost_price DECIMAL(10,2) CHECK (old_cost_price >= 0),
    new_cost_price DECIMAL(10,2) CHECK (new_cost_price >= 0),
    price_change_percent DECIMAL(5,2),
    reason TEXT,
    changed_by UUID REFERENCES auth.users(id) NOT NULL,
    changed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    effective_from TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_item_price_history_item 
ON public.item_price_history(item_id, changed_at DESC);

CREATE INDEX IF NOT EXISTS idx_item_price_history_changed_by 
ON public.item_price_history(changed_by, changed_at DESC);

-- Add comments
COMMENT ON TABLE public.item_price_history IS 'Tracks all price changes for audit and analytics';
COMMENT ON COLUMN public.item_price_history.price_change_percent IS 'Percentage change: ((new_price - old_price) / old_price × 100)';
COMMENT ON COLUMN public.item_price_history.effective_from IS 'When the new price becomes effective';

-- Enable RLS
ALTER TABLE public.item_price_history ENABLE ROW LEVEL SECURITY;

-- Create policy
CREATE POLICY "Store members can view price history"
ON public.item_price_history
FOR SELECT
USING (
    item_id IN (
        SELECT i.id FROM public.items i
        JOIN public.store_members sm ON sm.store_id = i.store_id
        WHERE sm.user_id = auth.uid() AND sm.is_active = TRUE
    )
);

-- ============================================================================
-- SECTION 4: CREATE LOW STOCK ALERTS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.low_stock_alerts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    item_id UUID REFERENCES public.items(id) ON DELETE CASCADE NOT NULL,
    store_id UUID REFERENCES public.stores(id) ON DELETE CASCADE NOT NULL,
    alert_type TEXT NOT NULL CHECK (alert_type IN ('low_stock', 'out_of_stock', 'expiring_soon')),
    current_stock INTEGER NOT NULL,
    threshold INTEGER NOT NULL,
    priority TEXT NOT NULL CHECK (priority IN ('low', 'medium', 'high', 'critical')) DEFAULT 'medium',
    is_resolved BOOLEAN NOT NULL DEFAULT FALSE,
    resolved_at TIMESTAMPTZ,
    resolved_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ,
    metadata JSONB
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_low_stock_alerts_store_unresolved 
ON public.low_stock_alerts(store_id, is_resolved, priority) 
WHERE is_resolved = FALSE;

CREATE INDEX IF NOT EXISTS idx_low_stock_alerts_item 
ON public.low_stock_alerts(item_id, created_at DESC);

-- Add comments
COMMENT ON TABLE public.low_stock_alerts IS 'Automated alerts for low stock, out of stock, and expiring items';
COMMENT ON COLUMN public.low_stock_alerts.metadata IS 'Additional alert data (e.g., expiry date for expiring items)';

-- Enable RLS
ALTER TABLE public.low_stock_alerts ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Store members can view alerts"
ON public.low_stock_alerts
FOR SELECT
USING (
    store_id IN (
        SELECT store_id FROM public.store_members
        WHERE user_id = auth.uid() AND is_active = TRUE
    )
);

CREATE POLICY "Owners and managers can resolve alerts"
ON public.low_stock_alerts
FOR UPDATE
USING (
    store_id IN (
        SELECT store_id FROM public.store_members
        WHERE user_id = auth.uid() 
        AND role IN ('owner', 'manager')
        AND is_active = TRUE
    )
);

-- ============================================================================
-- SECTION 5: CREATE ANALYTICS AGGREGATION TABLES
-- ============================================================================

-- Daily sales summary table for faster reporting
CREATE TABLE IF NOT EXISTS public.daily_sales_summary (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    store_id UUID REFERENCES public.stores(id) ON DELETE CASCADE NOT NULL,
    sale_date DATE NOT NULL,
    total_invoices INTEGER NOT NULL DEFAULT 0,
    total_items_sold INTEGER NOT NULL DEFAULT 0,
    gross_sales DECIMAL(12,2) NOT NULL DEFAULT 0,
    total_discounts DECIMAL(12,2) NOT NULL DEFAULT 0,
    total_tax DECIMAL(12,2) NOT NULL DEFAULT 0,
    net_sales DECIMAL(12,2) NOT NULL DEFAULT 0,
    total_cost DECIMAL(12,2) NOT NULL DEFAULT 0,
    gross_profit DECIMAL(12,2) NOT NULL DEFAULT 0,
    average_order_value DECIMAL(10,2) NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    CONSTRAINT unique_store_date UNIQUE(store_id, sale_date)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_daily_sales_summary_store_date 
ON public.daily_sales_summary(store_id, sale_date DESC);

CREATE INDEX IF NOT EXISTS idx_daily_sales_summary_date 
ON public.daily_sales_summary(sale_date DESC);

-- Add comments
COMMENT ON TABLE public.daily_sales_summary IS 'Pre-aggregated daily sales data for fast reporting';
COMMENT ON COLUMN public.daily_sales_summary.gross_profit IS 'Net sales minus total cost of goods sold';
COMMENT ON COLUMN public.daily_sales_summary.average_order_value IS 'Net sales divided by total invoices';

-- Enable RLS
ALTER TABLE public.daily_sales_summary ENABLE ROW LEVEL SECURITY;

-- Create policy
CREATE POLICY "Store members can view sales summary"
ON public.daily_sales_summary
FOR SELECT
USING (
    store_id IN (
        SELECT store_id FROM public.store_members
        WHERE user_id = auth.uid() AND is_active = TRUE
    )
);

-- ============================================================================
-- SECTION 6: CREATE HELPER FUNCTIONS
-- ============================================================================

-- Function to calculate profit margin
CREATE OR REPLACE FUNCTION public.calculate_profit_margin(
    p_selling_price DECIMAL,
    p_cost_price DECIMAL
)
RETURNS DECIMAL
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
    IF p_selling_price <= 0 THEN
        RETURN 0;
    END IF;
    
    RETURN ROUND(((p_selling_price - COALESCE(p_cost_price, 0)) / p_selling_price * 100), 2);
END;
$$;

COMMENT ON FUNCTION public.calculate_profit_margin IS 'Calculates profit margin percentage: ((price - cost) / price × 100)';

-- Function to update profit margins for all items
CREATE OR REPLACE FUNCTION public.update_item_profit_margins()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_updated_count INTEGER;
BEGIN
    UPDATE public.items
    SET profit_margin = public.calculate_profit_margin(price, cost_price)
    WHERE price > 0;
    
    GET DIAGNOSTICS v_updated_count = ROW_COUNT;
    
    RETURN v_updated_count;
END;
$$;

COMMENT ON FUNCTION public.update_item_profit_margins IS 'Batch update profit margins for all items';

-- Function to create low stock alert
CREATE OR REPLACE FUNCTION public.create_low_stock_alert(
    p_item_id UUID,
    p_store_id UUID,
    p_current_stock INTEGER,
    p_threshold INTEGER
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_alert_id UUID;
    v_priority TEXT;
    v_alert_type TEXT;
BEGIN
    -- Determine priority and type
    IF p_current_stock = 0 THEN
        v_priority := 'critical';
        v_alert_type := 'out_of_stock';
    ELSIF p_current_stock <= (p_threshold * 0.5) THEN
        v_priority := 'high';
        v_alert_type := 'low_stock';
    ELSE
        v_priority := 'medium';
        v_alert_type := 'low_stock';
    END IF;

    -- Check if unresolved alert already exists
    SELECT id INTO v_alert_id
    FROM public.low_stock_alerts
    WHERE item_id = p_item_id
        AND is_resolved = FALSE
        AND alert_type = v_alert_type
    LIMIT 1;

    -- Create new alert if none exists
    IF v_alert_id IS NULL THEN
        INSERT INTO public.low_stock_alerts (
            item_id,
            store_id,
            alert_type,
            current_stock,
            threshold,
            priority
        )
        VALUES (
            p_item_id,
            p_store_id,
            v_alert_type,
            p_current_stock,
            p_threshold,
            v_priority
        )
        RETURNING id INTO v_alert_id;
    ELSE
        -- Update existing alert with new stock level
        UPDATE public.low_stock_alerts
        SET current_stock = p_current_stock,
            priority = v_priority,
            created_at = NOW()
        WHERE id = v_alert_id;
    END IF;

    RETURN v_alert_id;
END;
$$;

COMMENT ON FUNCTION public.create_low_stock_alert IS 'Creates or updates low stock alert with automatic priority assignment';

-- Function to check and create alerts for all low stock items
CREATE OR REPLACE FUNCTION public.check_low_stock_items(p_store_id UUID)
RETURNS TABLE(
    item_id UUID,
    item_name TEXT,
    current_stock INTEGER,
    reorder_point INTEGER,
    alert_id UUID
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    WITH low_stock_items AS (
        SELECT 
            i.id,
            i.name,
            i.stock,
            i.reorder_point
        FROM public.items i
        WHERE i.store_id = p_store_id
            AND i.is_active = TRUE
            AND i.stock <= i.reorder_point
    )
    SELECT 
        lsi.id,
        lsi.name,
        lsi.stock,
        lsi.reorder_point,
        public.create_low_stock_alert(
            lsi.id,
            p_store_id,
            lsi.stock,
            lsi.reorder_point
        ) as alert_id
    FROM low_stock_items lsi;
END;
$$;

COMMENT ON FUNCTION public.check_low_stock_items IS 'Checks all items in a store and creates alerts for low stock';

-- Function to aggregate daily sales
CREATE OR REPLACE FUNCTION public.aggregate_daily_sales(
    p_store_id UUID,
    p_date DATE
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_total_invoices INTEGER;
    v_total_items_sold INTEGER;
    v_gross_sales DECIMAL(12,2);
    v_total_discounts DECIMAL(12,2);
    v_total_tax DECIMAL(12,2);
    v_net_sales DECIMAL(12,2);
    v_total_cost DECIMAL(12,2);
    v_gross_profit DECIMAL(12,2);
    v_average_order_value DECIMAL(10,2);
BEGIN
    -- Calculate aggregates
    SELECT 
        COUNT(DISTINCT i.id),
        COALESCE(SUM(ii.quantity), 0),
        COALESCE(SUM(i.subtotal), 0),
        COALESCE(SUM(i.discount), 0),
        COALESCE(SUM(i.tax), 0),
        COALESCE(SUM(i.total), 0)
    INTO
        v_total_invoices,
        v_total_items_sold,
        v_gross_sales,
        v_total_discounts,
        v_total_tax,
        v_net_sales
    FROM public.invoices i
    LEFT JOIN public.invoice_items ii ON ii.invoice_id = i.id
    WHERE i.store_id = p_store_id
        AND i.status = 'completed'
        AND DATE(i.created_at) = p_date;

    -- Calculate total cost (COGS)
    SELECT COALESCE(SUM(ii.quantity * COALESCE(itm.cost_price, 0)), 0)
    INTO v_total_cost
    FROM public.invoice_items ii
    JOIN public.invoices i ON i.id = ii.invoice_id
    LEFT JOIN public.items itm ON itm.id = ii.item_id
    WHERE i.store_id = p_store_id
        AND i.status = 'completed'
        AND DATE(i.created_at) = p_date;

    -- Calculate profit and average
    v_gross_profit := v_net_sales - v_total_cost;
    v_average_order_value := CASE 
        WHEN v_total_invoices > 0 THEN v_net_sales / v_total_invoices 
        ELSE 0 
    END;

    -- Insert or update summary
    INSERT INTO public.daily_sales_summary (
        store_id,
        sale_date,
        total_invoices,
        total_items_sold,
        gross_sales,
        total_discounts,
        total_tax,
        net_sales,
        total_cost,
        gross_profit,
        average_order_value
    )
    VALUES (
        p_store_id,
        p_date,
        v_total_invoices,
        v_total_items_sold,
        v_gross_sales,
        v_total_discounts,
        v_total_tax,
        v_net_sales,
        v_total_cost,
        v_gross_profit,
        v_average_order_value
    )
    ON CONFLICT (store_id, sale_date)
    DO UPDATE SET
        total_invoices = EXCLUDED.total_invoices,
        total_items_sold = EXCLUDED.total_items_sold,
        gross_sales = EXCLUDED.gross_sales,
        total_discounts = EXCLUDED.total_discounts,
        total_tax = EXCLUDED.total_tax,
        net_sales = EXCLUDED.net_sales,
        total_cost = EXCLUDED.total_cost,
        gross_profit = EXCLUDED.gross_profit,
        average_order_value = EXCLUDED.average_order_value,
        updated_at = NOW();
END;
$$;

COMMENT ON FUNCTION public.aggregate_daily_sales IS 'Aggregates daily sales data for a store (run via cron job)';

-- ============================================================================
-- SECTION 7: CREATE TRIGGERS
-- ============================================================================

-- Trigger to track price changes
CREATE OR REPLACE FUNCTION public.track_item_price_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Only log if price or cost actually changed
    IF (OLD.price != NEW.price) OR (COALESCE(OLD.cost_price, 0) != COALESCE(NEW.cost_price, 0)) THEN
        INSERT INTO public.item_price_history (
            item_id,
            old_price,
            new_price,
            old_cost_price,
            new_cost_price,
            price_change_percent,
            changed_by
        )
        VALUES (
            NEW.id,
            OLD.price,
            NEW.price,
            OLD.cost_price,
            NEW.cost_price,
            ROUND(((NEW.price - OLD.price) / OLD.price * 100), 2),
            auth.uid()
        );
    END IF;

    -- Update profit margin
    NEW.profit_margin := public.calculate_profit_margin(NEW.price, NEW.cost_price);

    RETURN NEW;
END;
$$;

-- Create trigger
DROP TRIGGER IF EXISTS track_item_price_change_trigger ON public.items;
CREATE TRIGGER track_item_price_change_trigger
    BEFORE UPDATE OF price, cost_price ON public.items
    FOR EACH ROW
    EXECUTE FUNCTION public.track_item_price_change();

-- Trigger to auto-update last_restocked_at
CREATE OR REPLACE FUNCTION public.update_item_restock_timestamp()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    IF NEW.reason = 'purchase' AND NEW.quantity_change > 0 THEN
        UPDATE public.items
        SET last_restocked_at = NEW.created_at
        WHERE id = NEW.item_id;
    END IF;

    RETURN NEW;
END;
$$;

-- Create trigger
DROP TRIGGER IF EXISTS update_item_restock_timestamp_trigger ON public.stock_movements;
CREATE TRIGGER update_item_restock_timestamp_trigger
    AFTER INSERT ON public.stock_movements
    FOR EACH ROW
    EXECUTE FUNCTION public.update_item_restock_timestamp();

-- Trigger to auto-create low stock alerts
CREATE OR REPLACE FUNCTION public.auto_create_low_stock_alert()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    -- Check if stock is below reorder point
    IF NEW.stock <= NEW.reorder_point AND NEW.is_active = TRUE THEN
        PERFORM public.create_low_stock_alert(
            NEW.id,
            NEW.store_id,
            NEW.stock,
            NEW.reorder_point
        );
    ELSE
        -- Resolve any existing alerts if stock is above threshold
        UPDATE public.low_stock_alerts
        SET is_resolved = TRUE,
            resolved_at = NOW(),
            resolved_by = auth.uid()
        WHERE item_id = NEW.id
            AND is_resolved = FALSE;
    END IF;

    RETURN NEW;
END;
$$;

-- Create trigger
DROP TRIGGER IF EXISTS auto_create_low_stock_alert_trigger ON public.items;
CREATE TRIGGER auto_create_low_stock_alert_trigger
    AFTER UPDATE OF stock ON public.items
    FOR EACH ROW
    EXECUTE FUNCTION public.auto_create_low_stock_alert();

-- ============================================================================
-- SECTION 8: GRANT PERMISSIONS
-- ============================================================================

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.calculate_profit_margin TO authenticated;
GRANT EXECUTE ON FUNCTION public.check_low_stock_items TO authenticated;
GRANT EXECUTE ON FUNCTION public.aggregate_daily_sales TO authenticated;

-- ============================================================================
-- SECTION 9: DATA MIGRATION
-- ============================================================================

-- Update existing items with profit margins
SELECT public.update_item_profit_margins();

-- Create initial low stock alerts for existing items
DO $$
DECLARE
    store_record RECORD;
BEGIN
    FOR store_record IN SELECT id FROM public.stores WHERE is_active = TRUE
    LOOP
        PERFORM public.check_low_stock_items(store_record.id);
    END LOOP;
END;
$$;

-- Aggregate historical daily sales (for last 30 days)
DO $$
DECLARE
    store_record RECORD;
    date_record DATE;
BEGIN
    FOR store_record IN SELECT id FROM public.stores WHERE is_active = TRUE
    LOOP
        FOR date_record IN 
            SELECT DISTINCT DATE(created_at) as sale_date
            FROM public.invoices
            WHERE store_id = store_record.id
                AND created_at >= CURRENT_DATE - INTERVAL '30 days'
        LOOP
            PERFORM public.aggregate_daily_sales(store_record.id, date_record);
        END LOOP;
    END LOOP;
END;
$$;

-- ============================================================================
-- ROLLBACK SCRIPT (Keep for reference, do not execute)
-- ============================================================================

/*
-- To rollback this migration, execute:

-- Drop triggers
DROP TRIGGER IF EXISTS auto_create_low_stock_alert_trigger ON public.items;
DROP TRIGGER IF EXISTS update_item_restock_timestamp_trigger ON public.stock_movements;
DROP TRIGGER IF EXISTS track_item_price_change_trigger ON public.items;

-- Drop functions
DROP FUNCTION IF EXISTS public.auto_create_low_stock_alert CASCADE;
DROP FUNCTION IF EXISTS public.update_item_restock_timestamp CASCADE;
DROP FUNCTION IF EXISTS public.track_item_price_change CASCADE;
DROP FUNCTION IF EXISTS public.aggregate_daily_sales CASCADE;
DROP FUNCTION IF EXISTS public.check_low_stock_items CASCADE;
DROP FUNCTION IF EXISTS public.create_low_stock_alert CASCADE;
DROP FUNCTION IF EXISTS public.update_item_profit_margins CASCADE;
DROP FUNCTION IF EXISTS public.calculate_profit_margin CASCADE;

-- Drop tables
DROP TABLE IF EXISTS public.daily_sales_summary CASCADE;
DROP TABLE IF EXISTS public.low_stock_alerts CASCADE;
DROP TABLE IF EXISTS public.item_price_history CASCADE;

-- Remove columns from items
ALTER TABLE public.items DROP COLUMN IF EXISTS last_restocked_at;
ALTER TABLE public.items DROP COLUMN IF EXISTS reorder_quantity;
ALTER TABLE public.items DROP COLUMN IF EXISTS reorder_point;
ALTER TABLE public.items DROP COLUMN IF EXISTS is_perishable;
ALTER TABLE public.items DROP COLUMN IF EXISTS profit_margin;
ALTER TABLE public.items DROP COLUMN IF EXISTS cost_price;

-- Remove columns from stock_movements
ALTER TABLE public.stock_movements DROP COLUMN IF EXISTS movement_value;
ALTER TABLE public.stock_movements DROP COLUMN IF EXISTS expiry_date;
ALTER TABLE public.stock_movements DROP COLUMN IF EXISTS batch_number;
ALTER TABLE public.stock_movements DROP COLUMN IF EXISTS total_cost;
ALTER TABLE public.stock_movements DROP COLUMN IF EXISTS unit_cost;
*/

-- ============================================================================
-- END OF MIGRATION
-- ============================================================================