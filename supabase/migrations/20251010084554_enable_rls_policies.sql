/*
  # Enable Row Level Security Policies
  
  1. Enable RLS on all tables
  2. Create policies for role-based access control
  3. Ensure data isolation between stores
*/

-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE stores ENABLE ROW LEVEL SECURITY;
ALTER TABLE store_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE items ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_movements ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- PROFILES POLICIES
-- =====================================================

CREATE POLICY "Users can view own profile"
ON profiles FOR SELECT
USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
ON profiles FOR UPDATE
USING (auth.uid() = id);

-- =====================================================
-- STORES POLICIES
-- =====================================================

CREATE POLICY "Users can view member stores"
ON stores FOR SELECT
USING (
  id IN (
    SELECT store_id FROM store_members
    WHERE user_id = auth.uid() AND is_active = true
  )
);

CREATE POLICY "Owners can update stores"
ON stores FOR UPDATE
USING (
  id IN (
    SELECT store_id FROM store_members
    WHERE user_id = auth.uid() AND role = 'owner' AND is_active = true
  )
);

CREATE POLICY "Users can create stores"
ON stores FOR INSERT
WITH CHECK (owner_id = auth.uid());

-- =====================================================
-- STORE_MEMBERS POLICIES
-- =====================================================

CREATE POLICY "Users can view store members"
ON store_members FOR SELECT
USING (
  store_id IN (
    SELECT store_id FROM store_members
    WHERE user_id = auth.uid() AND is_active = true
  )
);

CREATE POLICY "Owners can add members"
ON store_members FOR INSERT
WITH CHECK (
  store_id IN (
    SELECT store_id FROM store_members
    WHERE user_id = auth.uid() AND role = 'owner' AND is_active = true
  )
);

CREATE POLICY "Owners can manage members"
ON store_members FOR UPDATE
USING (
  store_id IN (
    SELECT store_id FROM store_members
    WHERE user_id = auth.uid() AND role = 'owner' AND is_active = true
  )
);

-- =====================================================
-- ITEMS POLICIES
-- =====================================================

CREATE POLICY "Store members can view items"
ON items FOR SELECT
USING (
  store_id IN (
    SELECT store_id FROM store_members
    WHERE user_id = auth.uid() AND is_active = true
  )
);

CREATE POLICY "Owners and managers can add items"
ON items FOR INSERT
WITH CHECK (
  store_id IN (
    SELECT store_id FROM store_members
    WHERE user_id = auth.uid() 
      AND role IN ('owner', 'manager')
      AND is_active = true
  )
);

CREATE POLICY "Owners and managers can update items"
ON items FOR UPDATE
USING (
  store_id IN (
    SELECT store_id FROM store_members
    WHERE user_id = auth.uid() 
      AND role IN ('owner', 'manager')
      AND is_active = true
  )
);

CREATE POLICY "Owners can delete items"
ON items FOR DELETE
USING (
  store_id IN (
    SELECT store_id FROM store_members
    WHERE user_id = auth.uid() AND role = 'owner' AND is_active = true
  )
);

-- =====================================================
-- CUSTOMERS POLICIES
-- =====================================================

CREATE POLICY "Store members can view customers"
ON customers FOR SELECT
USING (
  store_id IN (
    SELECT store_id FROM store_members
    WHERE user_id = auth.uid() AND is_active = true
  )
);

CREATE POLICY "Store members can add customers"
ON customers FOR INSERT
WITH CHECK (
  store_id IN (
    SELECT store_id FROM store_members
    WHERE user_id = auth.uid() AND is_active = true
  )
);

CREATE POLICY "Owners and managers can update customers"
ON customers FOR UPDATE
USING (
  store_id IN (
    SELECT store_id FROM store_members
    WHERE user_id = auth.uid() 
      AND role IN ('owner', 'manager')
      AND is_active = true
  )
);

-- =====================================================
-- INVOICES POLICIES
-- =====================================================

CREATE POLICY "Store members can view invoices"
ON invoices FOR SELECT
USING (
  store_id IN (
    SELECT sm.store_id FROM store_members sm
    WHERE sm.user_id = auth.uid() AND sm.is_active = true
      AND (
        sm.role IN ('owner', 'manager')
        OR
        (sm.role = 'cashier' AND created_at >= CURRENT_DATE)
      )
  )
);

CREATE POLICY "Store members can create invoices"
ON invoices FOR INSERT
WITH CHECK (
  store_id IN (
    SELECT store_id FROM store_members
    WHERE user_id = auth.uid() AND is_active = true
  )
  AND created_by = auth.uid()
);

CREATE POLICY "Owners and managers can update invoices"
ON invoices FOR UPDATE
USING (
  store_id IN (
    SELECT store_id FROM store_members
    WHERE user_id = auth.uid() 
      AND role IN ('owner', 'manager')
      AND is_active = true
  )
);

CREATE POLICY "Owners can delete invoices"
ON invoices FOR DELETE
USING (
  store_id IN (
    SELECT store_id FROM store_members
    WHERE user_id = auth.uid() AND role = 'owner' AND is_active = true
  )
);

-- =====================================================
-- INVOICE_ITEMS POLICIES
-- =====================================================

CREATE POLICY "Access invoice items via invoice"
ON invoice_items FOR ALL
USING (
  invoice_id IN (
    SELECT i.id FROM invoices i
    JOIN store_members sm ON sm.store_id = i.store_id
    WHERE sm.user_id = auth.uid() AND sm.is_active = true
  )
);

-- =====================================================
-- STOCK_MOVEMENTS POLICIES
-- =====================================================

CREATE POLICY "Owners and managers can view stock movements"
ON stock_movements FOR SELECT
USING (
  store_id IN (
    SELECT store_id FROM store_members
    WHERE user_id = auth.uid() 
      AND role IN ('owner', 'manager')
      AND is_active = true
  )
);

CREATE POLICY "Owners and managers can record stock movements"
ON stock_movements FOR INSERT
WITH CHECK (
  store_id IN (
    SELECT store_id FROM store_members
    WHERE user_id = auth.uid() 
      AND role IN ('owner', 'manager')
      AND is_active = true
  )
  AND created_by = auth.uid()
);
