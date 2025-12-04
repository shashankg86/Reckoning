# Reckoning POS - Staff Management & Authentication System Plan

> **Version:** 1.0
> **Date:** December 2024
> **Status:** Planning Phase
> **Author:** Software Engineering Team

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Market Research & Industry Standards](#2-market-research--industry-standards)
3. [Current System Analysis](#3-current-system-analysis)
4. [Role Hierarchy & Permissions](#4-role-hierarchy--permissions)
5. [Authentication & Onboarding Flows](#5-authentication--onboarding-flows)
6. [Settings Screen Architecture](#6-settings-screen-architecture)
7. [Multi-Store Logic](#7-multi-store-logic)
8. [Database Schema Changes](#8-database-schema-changes)
9. [API Design](#9-api-design)
10. [Frontend Components](#10-frontend-components)
11. [Internationalization (i18n)](#11-internationalization-i18n)
12. [Security Considerations](#12-security-considerations)
13. [Implementation Phases](#13-implementation-phases)
14. [Future Enhancements](#14-future-enhancements)

---

## 1. Executive Summary

### Project Goal
Build an enterprise-grade staff management system for Reckoning POS that enables:
- Store owners to invite and manage team members
- Role-based access control (RBAC) with granular permissions
- Seamless onboarding for both owners and invited staff
- Multi-store support for users who are staff at one store and owners of another
- Multi-language support with automatic location detection

### Key Decisions
| Decision | Choice | Rationale |
|----------|--------|-----------|
| Multi-store switcher | Only show if user has own store | Clean UX - no unnecessary UI for single-store staff |
| Settings hub | Single settings screen for all management | Follows enterprise POS patterns (Toast, Square) |
| Verification | Email now, SMS/OTP in production | Phased rollout for development efficiency |
| Role model | Hierarchical with granular permissions | Industry standard (Lightspeed, TouchBistro) |

---

## 2. Market Research & Industry Standards

### Competitive Analysis

| Feature | Toast | Square | Clover | Lightspeed | **Reckoning** |
|---------|-------|--------|--------|------------|---------------|
| Role-based access | ✅ | ✅ | ✅ | ✅ | ✅ Planned |
| Custom roles | ✅ | Limited | ✅ | ✅ | ✅ Planned |
| Staff scheduling | ✅ | Via 7shifts | ✅ | ✅ | 🔮 Future |
| Time tracking | ✅ | ✅ | ✅ | ✅ | 🔮 Future |
| Manager approval | ✅ | ✅ | ✅ | ✅ | ✅ Planned |
| Multi-location | ✅ | ✅ | ✅ | ✅ | ✅ Planned |
| PIN-based login | ✅ | ✅ | ✅ | ✅ | 🔮 Future |
| Audit trails | ✅ | ✅ | ✅ | ✅ | ✅ Planned |

### Industry Best Practices (From Research)

1. **Permission Categories** (Lightspeed model):
   - Basic: POS access, view catalog
   - Advanced: Modify catalog, void orders
   - Back Office: Reports, analytics
   - Payments: Refunds, discounts
   - Admin: Staff management, settings

2. **Manager Authorization Required For**:
   - Voids and cancellations
   - Discounts above threshold
   - Refunds
   - Cash drawer access
   - End-of-day reports

3. **Security Standards**:
   - Role-based access reduces internal breaches by 20%
   - Unique PINs link actions to specific staff
   - Audit trails for all sensitive operations

### Sources
- [TouchBistro - Staff Permissions Guide](https://www.touchbistro.com/blog/how-to-decide-on-staff-permissions-settings-in-your-pos/)
- [Lightspeed - Managing User Permissions](https://o-series-support.lightspeedhq.com/hc/en-us/articles/31329418175003-Managing-User-Permissions)
- [Final POS - Employee Management](https://finalpos.com/smarter-employee-management-with-your-pos-system/)

---

## 3. Current System Analysis

### Existing Database Tables

```
✅ profiles          - User accounts (id, email, phone, name, photo_url)
✅ stores            - Store information (owner_id, name, type, settings)
✅ store_members     - Staff memberships (store_id, user_id, role, is_active)
✅ store_invites     - Invitation system (email, role, token, expires_at)
```

### Existing Functions

```
✅ invite_staff()        - Creates invitation records
✅ accept_invite()       - Handles invitation acceptance
✅ get_invite_details()  - Retrieves invite by token
```

### Existing RLS Policies

| Table | Policy | Roles |
|-------|--------|-------|
| store_members | View own memberships | All authenticated |
| store_members | Insert with owner role | Self only |
| store_members | Update members | Owner only |
| store_invites | Create invites | Owner, Manager |
| store_invites | View invites | Owner, Manager |
| store_invites | Delete invites | Owner, Manager |
| items | Insert/Update/Delete | Owner, Manager |
| items | View | All store members |
| invoices | Create | All store members |
| invoices | Update | Owner, Manager |

### What's Missing

| Component | Status | Priority |
|-----------|--------|----------|
| Frontend staff management UI | ❌ Missing | P0 |
| Invitation acceptance flow | ❌ Missing | P0 |
| Staff onboarding screens | ❌ Missing | P0 |
| Role management UI | ❌ Missing | P0 |
| Settings screen restructure | ❌ Missing | P0 |
| Multi-store context switching | ❌ Missing | P1 |
| Permission-based UI hiding | ❌ Missing | P1 |
| TypeScript types for staff | ❌ Missing | P0 |
| Invitation email templates | ❌ Missing | P1 |

---

## 4. Role Hierarchy & Permissions

### Role Definitions

```
┌─────────────────────────────────────────────────────────────────────────┐
│                          ROLE HIERARCHY                                  │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  👑 OWNER (Store Creator)                                                │
│  │   • Full access to everything                                         │
│  │   • Store settings, tax config, delete store                          │
│  │   • Manage all staff (invite, remove, change roles)                   │
│  │   • View all reports and analytics                                    │
│  │   • Cannot be removed (must transfer ownership)                       │
│  │                                                                       │
│  ├── 👔 MANAGER                                                          │
│  │   │   • Invite staff (cashier, waiter only - not other managers)      │
│  │   │   • View and manage team list                                     │
│  │   │   • Full catalog management (categories, items)                   │
│  │   │   • View and update invoices                                      │
│  │   │   • Access reports and analytics                                  │
│  │   │   • Approve voids, discounts, refunds                             │
│  │   │   • Manage tables                                                 │
│  │   │                                                                   │
│  │   ├── 💵 CASHIER                                                      │
│  │   │   │   • Create invoices/bills                                     │
│  │   │   │   • Process payments                                          │
│  │   │   │   • View catalog (read-only)                                  │
│  │   │   │   • View own transactions only                                │
│  │   │   │   • Request manager approval for voids/discounts              │
│  │   │   │                                                               │
│  │   │   └── 🍽️ WAITER/STAFF                                             │
│  │   │           • View catalog (read-only)                              │
│  │   │           • Create orders (table orders)                          │
│  │   │           • View and manage assigned tables                       │
│  │   │           • Cannot process payments                               │
│  │                                                                       │
└─────────────────────────────────────────────────────────────────────────┘
```

### Permission Matrix

| Permission | Owner | Manager | Cashier | Waiter |
|------------|:-----:|:-------:|:-------:|:------:|
| **Store Settings** |
| View store profile | ✅ | ✅ | ❌ | ❌ |
| Edit store profile | ✅ | ❌ | ❌ | ❌ |
| Tax configuration | ✅ | ❌ | ❌ | ❌ |
| Delete store | ✅ | ❌ | ❌ | ❌ |
| **Staff Management** |
| View team list | ✅ | ✅ | ❌ | ❌ |
| Invite staff | ✅ | ✅* | ❌ | ❌ |
| Remove staff | ✅ | ❌ | ❌ | ❌ |
| Change roles | ✅ | ❌ | ❌ | ❌ |
| **Catalog** |
| View categories/items | ✅ | ✅ | ✅ | ✅ |
| Create/edit categories | ✅ | ✅ | ❌ | ❌ |
| Create/edit items | ✅ | ✅ | ❌ | ❌ |
| Delete items | ✅ | ✅ | ❌ | ❌ |
| Bulk import | ✅ | ✅ | ❌ | ❌ |
| **Billing** |
| View billing screen | ✅ | ✅ | ✅ | ❌ |
| Create invoices | ✅ | ✅ | ✅ | ❌ |
| Apply discounts | ✅ | ✅ | 🔒** | ❌ |
| Process refunds | ✅ | ✅ | ❌ | ❌ |
| Void orders | ✅ | ✅ | 🔒** | ❌ |
| **Tables** |
| View tables | ✅ | ✅ | ✅ | ✅ |
| Manage tables | ✅ | ✅ | ❌ | ❌ |
| Create orders | ✅ | ✅ | ✅ | ✅ |
| **Reports** |
| View dashboard | ✅ | ✅ | ❌ | ❌ |
| View reports | ✅ | ✅ | ❌ | ❌ |
| Export data | ✅ | ✅ | ❌ | ❌ |
| **Other** |
| OCR import | ✅ | ✅ | ❌ | ❌ |
| Menu setup | ✅ | ✅ | ❌ | ❌ |

> *Manager can only invite Cashier and Waiter roles
> **Requires manager approval (future feature)

### Permission Constants (TypeScript)

```typescript
export type StoreRole = 'owner' | 'manager' | 'cashier' | 'waiter';

export const ROLE_HIERARCHY: Record<StoreRole, number> = {
  owner: 100,
  manager: 75,
  cashier: 50,
  waiter: 25,
};

export const PERMISSIONS = {
  // Store
  STORE_VIEW: 'store:view',
  STORE_EDIT: 'store:edit',
  STORE_DELETE: 'store:delete',
  TAX_CONFIG: 'store:tax',

  // Staff
  STAFF_VIEW: 'staff:view',
  STAFF_INVITE: 'staff:invite',
  STAFF_REMOVE: 'staff:remove',
  STAFF_ROLE_CHANGE: 'staff:role',

  // Catalog
  CATALOG_VIEW: 'catalog:view',
  CATALOG_CREATE: 'catalog:create',
  CATALOG_EDIT: 'catalog:edit',
  CATALOG_DELETE: 'catalog:delete',
  CATALOG_IMPORT: 'catalog:import',

  // Billing
  BILLING_VIEW: 'billing:view',
  BILLING_CREATE: 'billing:create',
  BILLING_DISCOUNT: 'billing:discount',
  BILLING_REFUND: 'billing:refund',
  BILLING_VOID: 'billing:void',

  // Tables
  TABLES_VIEW: 'tables:view',
  TABLES_MANAGE: 'tables:manage',
  TABLES_ORDER: 'tables:order',

  // Reports
  REPORTS_VIEW: 'reports:view',
  REPORTS_EXPORT: 'reports:export',
  DASHBOARD_VIEW: 'dashboard:view',

  // Other
  OCR_IMPORT: 'ocr:import',
  MENU_SETUP: 'menu:setup',
} as const;

export const ROLE_PERMISSIONS: Record<StoreRole, string[]> = {
  owner: ['*'], // All permissions

  manager: [
    PERMISSIONS.STORE_VIEW,
    PERMISSIONS.STAFF_VIEW,
    PERMISSIONS.STAFF_INVITE,
    PERMISSIONS.CATALOG_VIEW,
    PERMISSIONS.CATALOG_CREATE,
    PERMISSIONS.CATALOG_EDIT,
    PERMISSIONS.CATALOG_DELETE,
    PERMISSIONS.CATALOG_IMPORT,
    PERMISSIONS.BILLING_VIEW,
    PERMISSIONS.BILLING_CREATE,
    PERMISSIONS.BILLING_DISCOUNT,
    PERMISSIONS.BILLING_REFUND,
    PERMISSIONS.BILLING_VOID,
    PERMISSIONS.TABLES_VIEW,
    PERMISSIONS.TABLES_MANAGE,
    PERMISSIONS.TABLES_ORDER,
    PERMISSIONS.REPORTS_VIEW,
    PERMISSIONS.REPORTS_EXPORT,
    PERMISSIONS.DASHBOARD_VIEW,
    PERMISSIONS.OCR_IMPORT,
    PERMISSIONS.MENU_SETUP,
  ],

  cashier: [
    PERMISSIONS.CATALOG_VIEW,
    PERMISSIONS.BILLING_VIEW,
    PERMISSIONS.BILLING_CREATE,
    PERMISSIONS.TABLES_VIEW,
    PERMISSIONS.TABLES_ORDER,
  ],

  waiter: [
    PERMISSIONS.CATALOG_VIEW,
    PERMISSIONS.TABLES_VIEW,
    PERMISSIONS.TABLES_ORDER,
  ],
};
```

---

## 5. Authentication & Onboarding Flows

### Flow Diagram

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    AUTHENTICATION FLOW MATRIX                            │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌─────────────────────────────────────────────────────────────────┐    │
│  │  SCENARIO A: New Store Owner                                     │    │
│  ├─────────────────────────────────────────────────────────────────┤    │
│  │                                                                  │    │
│  │  1. Landing Page → Click "Get Started"                           │    │
│  │           ↓                                                      │    │
│  │  2. Signup (Email/Password or Google OAuth)                      │    │
│  │           ↓                                                      │    │
│  │  3. Email Verification (Dev) / SMS OTP (Production)              │    │
│  │           ↓                                                      │    │
│  │  4. Profile Setup                                                │    │
│  │      • Full Name                                                 │    │
│  │      • Phone Number                                              │    │
│  │      • Profile Photo (optional)                                  │    │
│  │           ↓                                                      │    │
│  │  5. Store Setup (Onboarding Wizard)                              │    │
│  │      Step 1: Store Basics                                        │    │
│  │        • Store Name                                              │    │
│  │        • Store Type (Restaurant/Cafe/Retail/Salon/Pharmacy)      │    │
│  │        • Logo Upload                                             │    │
│  │      Step 2: Location                                            │    │
│  │        • Country → State → City (Auto-detect from IP)            │    │
│  │        • Address, Pincode                                        │    │
│  │        • Tax Number (GSTIN/TRN based on country)                 │    │
│  │      Step 3: Preferences                                         │    │
│  │        • Language (Auto-detect, can override)                    │    │
│  │        • Currency (Based on country)                             │    │
│  │        • Theme (Light/Dark)                                      │    │
│  │           ↓                                                      │    │
│  │  6. Menu Setup (Optional - Can Skip)                             │    │
│  │      • Add Categories                                            │    │
│  │      • Add Items                                                 │    │
│  │      • Or Import via Excel/OCR                                   │    │
│  │           ↓                                                      │    │
│  │  7. Invite Team (Optional - Can Skip)                            │    │
│  │      • Quick invite form                                         │    │
│  │      • "Do this later" option                                    │    │
│  │           ↓                                                      │    │
│  │  8. → Dashboard (Full Owner Access)                              │    │
│  │                                                                  │    │
│  └─────────────────────────────────────────────────────────────────┘    │
│                                                                          │
│  ┌─────────────────────────────────────────────────────────────────┐    │
│  │  SCENARIO B: Invited Staff (New to Platform)                     │    │
│  ├─────────────────────────────────────────────────────────────────┤    │
│  │                                                                  │    │
│  │  1. Receives Invitation Email                                    │    │
│  │      • Store name, inviter name, assigned role                   │    │
│  │      • "Accept Invitation" button                                │    │
│  │           ↓                                                      │    │
│  │  2. Clicks Link → /invite/accept?token=xxx                       │    │
│  │           ↓                                                      │    │
│  │  3. Invitation Details Screen                                    │    │
│  │      • Shows: Store name, logo, role, inviter                    │    │
│  │      • Options: "Create Account" or "Sign in with Google"        │    │
│  │      • Email field pre-filled and LOCKED                         │    │
│  │           ↓                                                      │    │
│  │  4. Signup (Email locked to invitation email)                    │    │
│  │           ↓                                                      │    │
│  │  5. Email Verification (Dev) / SMS OTP (Production)              │    │
│  │           ↓                                                      │    │
│  │  6. Profile Setup (Simplified)                                   │    │
│  │      • Full Name (pre-filled from invite if provided)            │    │
│  │      • Phone Number                                              │    │
│  │           ↓                                                      │    │
│  │  7. Auto-Accept Invitation                                       │    │
│  │      • store_members entry created                               │    │
│  │      • store_invites status → 'accepted'                         │    │
│  │           ↓                                                      │    │
│  │  8. → Dashboard (Role-Based Limited Access)                      │    │
│  │      • No store switcher (only one store)                        │    │
│  │      • Navigation limited by role                                │    │
│  │                                                                  │    │
│  └─────────────────────────────────────────────────────────────────┘    │
│                                                                          │
│  ┌─────────────────────────────────────────────────────────────────┐    │
│  │  SCENARIO C: Invited Staff (Already Has Account)                 │    │
│  ├─────────────────────────────────────────────────────────────────┤    │
│  │                                                                  │    │
│  │  1. Receives Invitation Email                                    │    │
│  │           ↓                                                      │    │
│  │  2. Clicks Link → /invite/accept?token=xxx                       │    │
│  │           ↓                                                      │    │
│  │  3. Invitation Details Screen                                    │    │
│  │      Case A: Already Logged In                                   │    │
│  │        • Shows invitation details                                │    │
│  │        • "Accept Invitation" button                              │    │
│  │        • One-click acceptance                                    │    │
│  │                                                                  │    │
│  │      Case B: Not Logged In                                       │    │
│  │        • "Login to Accept" button                                │    │
│  │        • Login → Redirect back → Accept                          │    │
│  │           ↓                                                      │    │
│  │  4. Accept Invitation                                            │    │
│  │      • store_members entry created                               │    │
│  │      • Added to user's store list                                │    │
│  │           ↓                                                      │    │
│  │  5. → Dashboard                                                  │    │
│  │      • If user has own store: Store switcher appears             │    │
│  │      • If only staff: No store switcher                          │    │
│  │                                                                  │    │
│  └─────────────────────────────────────────────────────────────────┘    │
│                                                                          │
│  ┌─────────────────────────────────────────────────────────────────┐    │
│  │  SCENARIO D: Staff Who Creates Own Store Later                   │    │
│  ├─────────────────────────────────────────────────────────────────┤    │
│  │                                                                  │    │
│  │  1. Staff is working at Store A                                  │    │
│  │           ↓                                                      │    │
│  │  2. Goes to Settings → "Create Your Own Store"                   │    │
│  │           ↓                                                      │    │
│  │  3. Store Setup Wizard (Same as owner onboarding)                │    │
│  │           ↓                                                      │    │
│  │  4. New store created, user is owner                             │    │
│  │           ↓                                                      │    │
│  │  5. Store Switcher Now Shows:                                    │    │
│  │      • "My Store" (Owner) ← NEW                                  │    │
│  │      • "Store A" (Cashier/Manager/etc.)                          │    │
│  │                                                                  │    │
│  └─────────────────────────────────────────────────────────────────┘    │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

### Route Configuration

```typescript
// Public Routes (No Auth Required)
const PUBLIC_ROUTES = [
  '/login',
  '/signup',
  '/forgot-password',
  '/invite/:token',          // NEW: View invitation details
];

// Auth Callback Routes
const CALLBACK_ROUTES = [
  '/auth/callback',          // OAuth callback
  '/auth/confirm',           // Email confirmation
  '/auth/reset-password',    // Password reset
];

// Verification Routes (Auth Required, Not Verified)
const VERIFICATION_ROUTES = [
  '/verify-email',
  '/phone-verification',     // Future: OTP verification
];

// Onboarding Routes (Verified, Not Onboarded)
const ONBOARDING_ROUTES = [
  '/get-started',            // Profile setup
  '/onboarding',             // Store setup
  '/menu-setup',             // Menu setup
];

// Staff Onboarding (Invited Staff)
const STAFF_ONBOARDING_ROUTES = [
  '/staff/profile-setup',    // NEW: Simplified profile setup
  '/staff/welcome',          // NEW: Welcome + store info
];

// Protected Routes (Auth + Verified + Onboarded/Staff)
const PROTECTED_ROUTES = [
  '/dashboard',              // All roles
  '/billing',                // Owner, Manager, Cashier
  '/catalog',                // Owner, Manager (edit), All (view)
  '/reports',                // Owner, Manager
  '/settings',               // Role-based sections
  '/settings/profile',       // All roles
  '/settings/store',         // Owner only
  '/settings/staff',         // Owner, Manager
  '/settings/menu',          // Owner, Manager
];
```

---

## 6. Settings Screen Architecture

### Settings Screen Structure

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         SETTINGS SCREEN                                  │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌─────────────────────────────────────────────────────────────────┐    │
│  │  Profile Section (All Roles)                                     │    │
│  ├─────────────────────────────────────────────────────────────────┤    │
│  │  • Profile photo                                                 │    │
│  │  • Full name                                                     │    │
│  │  • Email (read-only)                                             │    │
│  │  • Phone number                                                  │    │
│  │  • Change password                                               │    │
│  │  • Language preference                                           │    │
│  │  • Theme preference (Light/Dark)                                 │    │
│  └─────────────────────────────────────────────────────────────────┘    │
│                                                                          │
│  ┌─────────────────────────────────────────────────────────────────┐    │
│  │  Store Profile (Owner Only)                                      │    │
│  ├─────────────────────────────────────────────────────────────────┤    │
│  │  • Store name                                                    │    │
│  │  • Store type                                                    │    │
│  │  • Logo                                                          │    │
│  │  • Address                                                       │    │
│  │  • Contact details                                               │    │
│  │  • Tax number (GSTIN/TRN)                                        │    │
│  │  • Currency                                                      │    │
│  │  • Tax rate                                                      │    │
│  │  • Invoice settings (header, footer)                             │    │
│  └─────────────────────────────────────────────────────────────────┘    │
│                                                                          │
│  ┌─────────────────────────────────────────────────────────────────┐    │
│  │  Staff Management (Owner, Manager)                               │    │
│  ├─────────────────────────────────────────────────────────────────┤    │
│  │                                                                  │    │
│  │  [+ Invite Staff Button]                                         │    │
│  │                                                                  │    │
│  │  Team Members Tab:                                               │    │
│  │  ┌─────────────────────────────────────────────────────────┐    │    │
│  │  │ 👤 John Doe          │ Manager │ Active   │ [⋮]        │    │    │
│  │  │ 👤 Jane Smith        │ Cashier │ Active   │ [⋮]        │    │    │
│  │  │ 👤 Bob Wilson        │ Waiter  │ Active   │ [⋮]        │    │    │
│  │  └─────────────────────────────────────────────────────────┘    │    │
│  │                                                                  │    │
│  │  Pending Invites Tab:                                            │    │
│  │  ┌─────────────────────────────────────────────────────────┐    │    │
│  │  │ ✉️ mike@email.com    │ Cashier │ Expires 5d │ [Resend][X]│    │    │
│  │  └─────────────────────────────────────────────────────────┘    │    │
│  │                                                                  │    │
│  │  [⋮] Menu Options (Owner Only):                                  │    │
│  │    • Change Role                                                 │    │
│  │    • Deactivate                                                  │    │
│  │    • Remove from Store                                           │    │
│  │                                                                  │    │
│  └─────────────────────────────────────────────────────────────────┘    │
│                                                                          │
│  ┌─────────────────────────────────────────────────────────────────┐    │
│  │  Menu Management (Owner, Manager)                                │    │
│  ├─────────────────────────────────────────────────────────────────┤    │
│  │  • Categories overview                                           │    │
│  │  • Items count                                                   │    │
│  │  • Quick actions: Add, Import, Export                            │    │
│  │  • Link to full Catalog screen                                   │    │
│  └─────────────────────────────────────────────────────────────────┘    │
│                                                                          │
│  ┌─────────────────────────────────────────────────────────────────┐    │
│  │  Tax Configuration (Owner Only)                                  │    │
│  ├─────────────────────────────────────────────────────────────────┤    │
│  │  • Tax type (GST/VAT/Sales Tax)                                  │    │
│  │  • Tax rates configuration                                       │    │
│  │  • Tax components (CGST, SGST, etc.)                             │    │
│  └─────────────────────────────────────────────────────────────────┘    │
│                                                                          │
│  ┌─────────────────────────────────────────────────────────────────┐    │
│  │  Danger Zone (Owner Only)                                        │    │
│  ├─────────────────────────────────────────────────────────────────┤    │
│  │  • Transfer ownership                                            │    │
│  │  • Deactivate store                                              │    │
│  │  • Delete store (with confirmation)                              │    │
│  └─────────────────────────────────────────────────────────────────┘    │
│                                                                          │
│  ┌─────────────────────────────────────────────────────────────────┐    │
│  │  Create Your Own Store (Staff who don't own a store)             │    │
│  ├─────────────────────────────────────────────────────────────────┤    │
│  │  "Want to create your own store?"                                │    │
│  │  [Create Store] → Opens owner onboarding flow                    │    │
│  └─────────────────────────────────────────────────────────────────┘    │
│                                                                          │
│  ┌─────────────────────────────────────────────────────────────────┐    │
│  │  Logout                                                          │    │
│  └─────────────────────────────────────────────────────────────────┘    │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

### Section Visibility by Role

| Section | Owner | Manager | Cashier | Waiter |
|---------|:-----:|:-------:|:-------:|:------:|
| Profile | ✅ | ✅ | ✅ | ✅ |
| Store Profile | ✅ | ❌ | ❌ | ❌ |
| Staff Management | ✅ | ✅ (view+invite) | ❌ | ❌ |
| Menu Management | ✅ | ✅ | ❌ | ❌ |
| Tax Configuration | ✅ | ❌ | ❌ | ❌ |
| Danger Zone | ✅ | ❌ | ❌ | ❌ |
| Create Own Store | ❌ | ✅ | ✅ | ✅ |
| Logout | ✅ | ✅ | ✅ | ✅ |

---

## 7. Multi-Store Logic

### Store Switcher Display Rules

```typescript
// Logic for showing store switcher
const shouldShowStoreSwitcher = (user: User, memberships: StoreMember[]) => {
  // Count stores where user is OWNER
  const ownedStores = memberships.filter(m => m.role === 'owner');

  // Rule: Only show switcher if user OWNS at least one store
  // AND has membership in more than one store
  return ownedStores.length > 0 && memberships.length > 1;
};

// Examples:
// User is cashier at 1 store → NO SWITCHER
// User is cashier at 2 stores → NO SWITCHER (doesn't own any)
// User owns 1 store → NO SWITCHER (only 1 store)
// User owns 1 store + cashier at another → SHOW SWITCHER
// User owns 2 stores → SHOW SWITCHER
```

### Store Context Provider

```typescript
interface StoreContextValue {
  // Current active store
  currentStore: Store | null;
  currentMembership: StoreMember | null;

  // All user's stores
  allMemberships: StoreMember[];

  // Derived states
  isOwner: boolean;
  isManager: boolean;
  canManageStaff: boolean;
  canEditCatalog: boolean;
  canViewReports: boolean;
  showStoreSwitcher: boolean;

  // Actions
  switchStore: (storeId: string) => Promise<void>;
  refreshMemberships: () => Promise<void>;

  // Permission checker
  hasPermission: (permission: string) => boolean;
}
```

### Store Switcher UI

```
┌─────────────────────────────────────────────┐
│  Store Switcher (in TopBar, next to logo)   │
├─────────────────────────────────────────────┤
│                                             │
│  Only shows if user owns a store AND        │
│  has multiple store memberships             │
│                                             │
│  ┌───────────────────────────────────┐     │
│  │ 🏪 My Restaurant        ▼         │     │
│  └───────────────────────────────────┘     │
│           ↓ (dropdown)                      │
│  ┌───────────────────────────────────┐     │
│  │ ✓ My Restaurant      👑 Owner     │     │
│  │   Coffee Shop        💼 Manager   │     │
│  │   Pizza Place        💵 Cashier   │     │
│  └───────────────────────────────────┘     │
│                                             │
└─────────────────────────────────────────────┘
```

---

## 8. Database Schema Changes

### 8.1 Verify/Update store_members Table

```sql
-- Check current schema and add missing columns
ALTER TABLE store_members
ADD COLUMN IF NOT EXISTS invited_by UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS joined_at TIMESTAMPTZ DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Ensure role constraint exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'store_members_role_check'
  ) THEN
    ALTER TABLE store_members
    ADD CONSTRAINT store_members_role_check
    CHECK (role IN ('owner', 'manager', 'cashier', 'waiter'));
  END IF;
END $$;

-- Update trigger for updated_at
CREATE OR REPLACE FUNCTION update_store_members_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS store_members_updated_at ON store_members;
CREATE TRIGGER store_members_updated_at
  BEFORE UPDATE ON store_members
  FOR EACH ROW
  EXECUTE FUNCTION update_store_members_updated_at();
```

### 8.2 Update store_invites Table

```sql
-- Add status tracking
ALTER TABLE store_invites
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending'
  CHECK (status IN ('pending', 'accepted', 'expired', 'cancelled')),
ADD COLUMN IF NOT EXISTS accepted_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS accepted_by UUID REFERENCES auth.users(id);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_store_invites_status
ON store_invites(status) WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS idx_store_invites_email_pending
ON store_invites(email) WHERE status = 'pending';

-- Function to auto-expire old invites
CREATE OR REPLACE FUNCTION expire_old_invites()
RETURNS void AS $$
BEGIN
  UPDATE store_invites
  SET status = 'expired'
  WHERE status = 'pending'
    AND expires_at < NOW();
END;
$$ LANGUAGE plpgsql;
```

### 8.3 Update profiles Table

```sql
-- Add columns for multi-store support
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS default_store_id UUID REFERENCES stores(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS preferred_language TEXT DEFAULT 'en',
ADD COLUMN IF NOT EXISTS detected_country TEXT;

-- Index for language-based queries
CREATE INDEX IF NOT EXISTS idx_profiles_language
ON profiles(preferred_language);
```

### 8.4 New/Updated RLS Policies

```sql
-- Drop existing restrictive policy
DROP POLICY IF EXISTS "Users can view store members" ON store_members;

-- Allow all store members to view team
CREATE POLICY "Team members can view store team"
ON store_members FOR SELECT
USING (
  store_id IN (
    SELECT sm.store_id
    FROM store_members sm
    WHERE sm.user_id = auth.uid()
      AND sm.is_active = true
  )
);

-- Allow system to insert members (via accept_invite function)
CREATE POLICY "System can insert members via invitation"
ON store_members FOR INSERT
WITH CHECK (
  -- Either creating own owner membership
  (user_id = auth.uid() AND role = 'owner')
  OR
  -- Or being added via valid invitation
  EXISTS (
    SELECT 1 FROM store_invites
    WHERE store_invites.store_id = store_members.store_id
      AND store_invites.status = 'pending'
      AND store_invites.email = (
        SELECT email FROM profiles WHERE id = store_members.user_id
      )
  )
);

-- Allow owners to update member roles
CREATE POLICY "Owners can update member roles"
ON store_members FOR UPDATE
USING (
  store_id IN (
    SELECT sm.store_id
    FROM store_members sm
    WHERE sm.user_id = auth.uid()
      AND sm.role = 'owner'
      AND sm.is_active = true
  )
)
WITH CHECK (
  -- Cannot change owner's own role
  user_id != auth.uid()
  -- Cannot promote to owner
  AND role != 'owner'
);

-- Allow owners to delete (remove) members
CREATE POLICY "Owners can remove members"
ON store_members FOR DELETE
USING (
  store_id IN (
    SELECT sm.store_id
    FROM store_members sm
    WHERE sm.user_id = auth.uid()
      AND sm.role = 'owner'
      AND sm.is_active = true
  )
  -- Cannot remove self
  AND user_id != auth.uid()
);

-- Profiles: Allow viewing team members' basic info
CREATE POLICY "Can view team member profiles"
ON profiles FOR SELECT
USING (
  id = auth.uid()
  OR
  id IN (
    SELECT sm2.user_id
    FROM store_members sm1
    JOIN store_members sm2 ON sm1.store_id = sm2.store_id
    WHERE sm1.user_id = auth.uid()
      AND sm1.is_active = true
      AND sm2.is_active = true
  )
);
```

### 8.5 Updated Database Functions

```sql
-- Enhanced accept_invite function
CREATE OR REPLACE FUNCTION accept_invite(invite_token TEXT)
RETURNS JSONB AS $$
DECLARE
  v_invite RECORD;
  v_user_id UUID;
  v_user_email TEXT;
  v_member_id UUID;
  v_result JSONB;
BEGIN
  -- Get current user
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  -- Get user email
  SELECT email INTO v_user_email FROM profiles WHERE id = v_user_id;

  -- Get and validate invite
  SELECT * INTO v_invite
  FROM store_invites
  WHERE token = invite_token
    AND status = 'pending'
    AND expires_at > NOW()
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid or expired invitation');
  END IF;

  -- Verify email matches
  IF LOWER(v_invite.email) != LOWER(v_user_email) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Email does not match invitation');
  END IF;

  -- Check if already a member
  IF EXISTS (
    SELECT 1 FROM store_members
    WHERE store_id = v_invite.store_id AND user_id = v_user_id
  ) THEN
    -- Update existing membership
    UPDATE store_members
    SET is_active = true, role = v_invite.role, updated_at = NOW()
    WHERE store_id = v_invite.store_id AND user_id = v_user_id
    RETURNING id INTO v_member_id;
  ELSE
    -- Create new membership
    INSERT INTO store_members (store_id, user_id, role, is_active, invited_by, joined_at)
    VALUES (v_invite.store_id, v_user_id, v_invite.role, true, v_invite.created_by, NOW())
    RETURNING id INTO v_member_id;
  END IF;

  -- Update invite status
  UPDATE store_invites
  SET status = 'accepted', accepted_at = NOW(), accepted_by = v_user_id
  WHERE id = v_invite.id;

  -- Return success with details
  SELECT jsonb_build_object(
    'success', true,
    'member_id', v_member_id,
    'store_id', v_invite.store_id,
    'role', v_invite.role,
    'store', (SELECT jsonb_build_object('id', id, 'name', name, 'logo_url', logo_url) FROM stores WHERE id = v_invite.store_id)
  ) INTO v_result;

  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get invite details (public function for invite acceptance page)
CREATE OR REPLACE FUNCTION get_invite_details(invite_token TEXT)
RETURNS JSONB AS $$
DECLARE
  v_invite RECORD;
  v_store RECORD;
  v_inviter RECORD;
BEGIN
  -- Get invite
  SELECT * INTO v_invite
  FROM store_invites
  WHERE token = invite_token;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('valid', false, 'error', 'Invitation not found');
  END IF;

  -- Check status
  IF v_invite.status = 'accepted' THEN
    RETURN jsonb_build_object('valid', false, 'error', 'Invitation already accepted');
  END IF;

  IF v_invite.status = 'cancelled' THEN
    RETURN jsonb_build_object('valid', false, 'error', 'Invitation was cancelled');
  END IF;

  IF v_invite.status = 'expired' OR v_invite.expires_at < NOW() THEN
    RETURN jsonb_build_object('valid', false, 'error', 'Invitation has expired');
  END IF;

  -- Get store details
  SELECT id, name, logo_url, type INTO v_store
  FROM stores WHERE id = v_invite.store_id;

  -- Get inviter details
  SELECT name, email INTO v_inviter
  FROM profiles WHERE id = v_invite.created_by;

  RETURN jsonb_build_object(
    'valid', true,
    'invite', jsonb_build_object(
      'id', v_invite.id,
      'email', v_invite.email,
      'role', v_invite.role,
      'first_name', v_invite.first_name,
      'last_name', v_invite.last_name,
      'expires_at', v_invite.expires_at
    ),
    'store', jsonb_build_object(
      'id', v_store.id,
      'name', v_store.name,
      'logo_url', v_store.logo_url,
      'type', v_store.type
    ),
    'inviter', jsonb_build_object(
      'name', v_inviter.name,
      'email', v_inviter.email
    )
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Enhanced invite_staff function
CREATE OR REPLACE FUNCTION invite_staff(
  p_store_id UUID,
  p_email TEXT,
  p_role TEXT,
  p_first_name TEXT DEFAULT NULL,
  p_last_name TEXT DEFAULT NULL,
  p_phone TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
  v_user_id UUID;
  v_user_role TEXT;
  v_token TEXT;
  v_invite_id UUID;
  v_existing_member RECORD;
  v_existing_invite RECORD;
BEGIN
  v_user_id := auth.uid();

  -- Check permission
  SELECT role INTO v_user_role
  FROM store_members
  WHERE store_id = p_store_id
    AND user_id = v_user_id
    AND is_active = true;

  IF v_user_role IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not a member of this store');
  END IF;

  IF v_user_role NOT IN ('owner', 'manager') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Insufficient permissions');
  END IF;

  -- Managers cannot invite managers
  IF v_user_role = 'manager' AND p_role = 'manager' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Managers cannot invite other managers');
  END IF;

  -- Validate role
  IF p_role NOT IN ('manager', 'cashier', 'waiter') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid role');
  END IF;

  -- Check if already a member
  SELECT sm.*, p.email as profile_email INTO v_existing_member
  FROM store_members sm
  JOIN profiles p ON p.id = sm.user_id
  WHERE sm.store_id = p_store_id AND LOWER(p.email) = LOWER(p_email);

  IF v_existing_member.id IS NOT NULL THEN
    IF v_existing_member.is_active THEN
      RETURN jsonb_build_object('success', false, 'error', 'User is already a member of this store');
    ELSE
      -- Reactivate with new role
      UPDATE store_members
      SET is_active = true, role = p_role, updated_at = NOW()
      WHERE id = v_existing_member.id;
      RETURN jsonb_build_object('success', true, 'message', 'Member reactivated', 'member_id', v_existing_member.id);
    END IF;
  END IF;

  -- Check for existing pending invite
  SELECT * INTO v_existing_invite
  FROM store_invites
  WHERE store_id = p_store_id
    AND LOWER(email) = LOWER(p_email)
    AND status = 'pending';

  IF v_existing_invite.id IS NOT NULL THEN
    -- Update existing invite
    UPDATE store_invites
    SET role = p_role,
        first_name = COALESCE(p_first_name, first_name),
        last_name = COALESCE(p_last_name, last_name),
        phone = COALESCE(p_phone, phone),
        expires_at = NOW() + INTERVAL '7 days',
        updated_at = NOW()
    WHERE id = v_existing_invite.id;

    RETURN jsonb_build_object(
      'success', true,
      'message', 'Invitation updated',
      'invite_id', v_existing_invite.id,
      'token', v_existing_invite.token
    );
  END IF;

  -- Generate unique token
  v_token := encode(gen_random_bytes(32), 'hex');

  -- Create new invite
  INSERT INTO store_invites (store_id, email, role, token, first_name, last_name, phone, created_by)
  VALUES (p_store_id, LOWER(p_email), p_role, v_token, p_first_name, p_last_name, p_phone, v_user_id)
  RETURNING id INTO v_invite_id;

  RETURN jsonb_build_object(
    'success', true,
    'message', 'Invitation created',
    'invite_id', v_invite_id,
    'token', v_token
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

---

## 9. API Design

### 9.1 Staff API (`src/api/staff.ts`)

```typescript
import { supabase } from '@/lib/supabaseClient';
import type { StoreMember, StoreRole } from '@/types/staff';

export const staffAPI = {
  /**
   * Get all team members for a store
   */
  async getStoreMembers(storeId: string): Promise<StoreMember[]> {
    const { data, error } = await supabase
      .from('store_members')
      .select(`
        id,
        store_id,
        user_id,
        role,
        is_active,
        invited_by,
        joined_at,
        created_at,
        profile:profiles(id, name, email, phone, photo_url)
      `)
      .eq('store_id', storeId)
      .eq('is_active', true)
      .order('created_at', { ascending: true });

    if (error) throw error;
    return data as StoreMember[];
  },

  /**
   * Get all memberships for current user
   */
  async getUserMemberships(): Promise<StoreMember[]> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data, error } = await supabase
      .from('store_members')
      .select(`
        id,
        store_id,
        user_id,
        role,
        is_active,
        joined_at,
        store:stores(id, name, logo_url, type)
      `)
      .eq('user_id', user.id)
      .eq('is_active', true);

    if (error) throw error;
    return data as StoreMember[];
  },

  /**
   * Update member role (Owner only)
   */
  async updateMemberRole(memberId: string, newRole: StoreRole): Promise<void> {
    const { error } = await supabase
      .from('store_members')
      .update({ role: newRole })
      .eq('id', memberId);

    if (error) throw error;
  },

  /**
   * Deactivate member (soft delete)
   */
  async deactivateMember(memberId: string): Promise<void> {
    const { error } = await supabase
      .from('store_members')
      .update({ is_active: false })
      .eq('id', memberId);

    if (error) throw error;
  },

  /**
   * Remove member permanently (Owner only)
   */
  async removeMember(memberId: string): Promise<void> {
    const { error } = await supabase
      .from('store_members')
      .delete()
      .eq('id', memberId);

    if (error) throw error;
  },

  /**
   * Check if user owns any store
   */
  async userOwnsAnyStore(): Promise<boolean> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;

    const { data, error } = await supabase
      .from('store_members')
      .select('id')
      .eq('user_id', user.id)
      .eq('role', 'owner')
      .eq('is_active', true)
      .limit(1);

    if (error) return false;
    return data.length > 0;
  },
};
```

### 9.2 Invitations API (`src/api/invitations.ts`)

```typescript
import { supabase } from '@/lib/supabaseClient';
import type { StoreInvite, InviteStaffPayload, InviteDetails } from '@/types/staff';

export const invitationsAPI = {
  /**
   * Invite a staff member
   */
  async inviteStaff(storeId: string, payload: InviteStaffPayload): Promise<{ inviteId: string; token: string }> {
    const { data, error } = await supabase.rpc('invite_staff', {
      p_store_id: storeId,
      p_email: payload.email,
      p_role: payload.role,
      p_first_name: payload.firstName || null,
      p_last_name: payload.lastName || null,
      p_phone: payload.phone || null,
    });

    if (error) throw error;
    if (!data.success) throw new Error(data.error);

    return { inviteId: data.invite_id, token: data.token };
  },

  /**
   * Get pending invitations for a store
   */
  async getPendingInvites(storeId: string): Promise<StoreInvite[]> {
    const { data, error } = await supabase
      .from('store_invites')
      .select(`
        id,
        store_id,
        email,
        role,
        first_name,
        last_name,
        phone,
        status,
        expires_at,
        created_at,
        created_by,
        inviter:profiles!created_by(name, email)
      `)
      .eq('store_id', storeId)
      .eq('status', 'pending')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data as StoreInvite[];
  },

  /**
   * Get invitation details by token (public - for acceptance page)
   */
  async getInviteByToken(token: string): Promise<InviteDetails> {
    const { data, error } = await supabase.rpc('get_invite_details', {
      invite_token: token,
    });

    if (error) throw error;
    if (!data.valid) throw new Error(data.error);

    return data as InviteDetails;
  },

  /**
   * Accept an invitation
   */
  async acceptInvite(token: string): Promise<{ storeId: string; role: string }> {
    const { data, error } = await supabase.rpc('accept_invite', {
      invite_token: token,
    });

    if (error) throw error;
    if (!data.success) throw new Error(data.error);

    return { storeId: data.store_id, role: data.role };
  },

  /**
   * Cancel an invitation
   */
  async cancelInvite(inviteId: string): Promise<void> {
    const { error } = await supabase
      .from('store_invites')
      .update({ status: 'cancelled' })
      .eq('id', inviteId);

    if (error) throw error;
  },

  /**
   * Resend invitation (updates expiry)
   */
  async resendInvite(inviteId: string): Promise<void> {
    const { error } = await supabase
      .from('store_invites')
      .update({
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', inviteId);

    if (error) throw error;

    // TODO: Trigger email resend via Edge Function
  },

  /**
   * Check if email has pending invite for store
   */
  async checkPendingInvite(storeId: string, email: string): Promise<StoreInvite | null> {
    const { data, error } = await supabase
      .from('store_invites')
      .select('*')
      .eq('store_id', storeId)
      .ilike('email', email)
      .eq('status', 'pending')
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    return data;
  },
};
```

---

## 10. Frontend Components

### 10.1 File Structure

```
src/
├── screens/
│   ├── settings/
│   │   ├── SettingsScreen.tsx           # Main settings hub
│   │   ├── sections/
│   │   │   ├── ProfileSection.tsx       # User profile settings
│   │   │   ├── StoreProfileSection.tsx  # Store settings (owner)
│   │   │   ├── StaffSection.tsx         # Team management
│   │   │   ├── MenuSection.tsx          # Menu quick actions
│   │   │   ├── TaxSection.tsx           # Tax config (owner)
│   │   │   └── DangerZoneSection.tsx    # Delete store, etc.
│   │   └── modals/
│   │       ├── InviteStaffModal.tsx     # Invite form modal
│   │       ├── EditMemberModal.tsx      # Change role modal
│   │       └── RemoveMemberModal.tsx    # Confirm removal
│   │
│   ├── invite/
│   │   ├── AcceptInviteScreen.tsx       # Public invite page
│   │   ├── InviteExpiredScreen.tsx      # Expired invite
│   │   └── InviteAcceptedScreen.tsx     # Success page
│   │
│   └── auth/
│       └── StaffOnboardingScreen.tsx    # Simplified onboarding
│
├── components/
│   ├── staff/
│   │   ├── StaffList.tsx                # Team members list
│   │   ├── StaffCard.tsx                # Individual member card
│   │   ├── PendingInvitesList.tsx       # Pending invites
│   │   ├── InviteCard.tsx               # Individual invite card
│   │   ├── RoleBadge.tsx                # Role display badge
│   │   └── RoleSelector.tsx             # Role dropdown
│   │
│   └── layout/
│       ├── StoreSwitcher.tsx            # Multi-store dropdown
│       └── RoleBasedView.tsx            # Permission wrapper
│
├── contexts/
│   └── StoreContext.tsx                 # Store & permission context
│
├── hooks/
│   ├── useStaffMembers.ts               # Staff data hook
│   ├── useInvitations.ts                # Invitations hook
│   ├── useStoreContext.ts               # Store context hook
│   └── usePermissions.ts                # Permission checker
│
└── types/
    └── staff.ts                         # Staff-related types
```

### 10.2 TypeScript Types (`src/types/staff.ts`)

```typescript
// ============================================
// ROLE TYPES
// ============================================

export type StoreRole = 'owner' | 'manager' | 'cashier' | 'waiter';

export const ROLE_LABELS: Record<StoreRole, string> = {
  owner: 'Owner',
  manager: 'Manager',
  cashier: 'Cashier',
  waiter: 'Waiter',
};

export const ROLE_COLORS: Record<StoreRole, string> = {
  owner: 'bg-purple-100 text-purple-800',
  manager: 'bg-blue-100 text-blue-800',
  cashier: 'bg-green-100 text-green-800',
  waiter: 'bg-orange-100 text-orange-800',
};

// ============================================
// STORE MEMBER TYPES
// ============================================

export interface StoreMember {
  id: string;
  store_id: string;
  user_id: string;
  role: StoreRole;
  is_active: boolean;
  invited_by?: string;
  joined_at: string;
  created_at: string;

  // Joined profile data
  profile?: {
    id: string;
    name: string;
    email: string;
    phone?: string;
    photo_url?: string;
  };

  // Joined store data (for user memberships)
  store?: {
    id: string;
    name: string;
    logo_url?: string;
    type: string;
  };
}

// ============================================
// INVITATION TYPES
// ============================================

export type InviteStatus = 'pending' | 'accepted' | 'expired' | 'cancelled';

export interface StoreInvite {
  id: string;
  store_id: string;
  email: string;
  role: StoreRole;
  token?: string; // Only visible to creators
  status: InviteStatus;
  first_name?: string;
  last_name?: string;
  phone?: string;
  expires_at: string;
  created_by: string;
  created_at: string;
  accepted_at?: string;
  accepted_by?: string;

  // Joined data
  inviter?: {
    name: string;
    email: string;
  };
}

export interface InviteStaffPayload {
  email: string;
  role: Exclude<StoreRole, 'owner'>; // Cannot invite as owner
  firstName?: string;
  lastName?: string;
  phone?: string;
}

export interface InviteDetails {
  valid: boolean;
  error?: string;
  invite?: {
    id: string;
    email: string;
    role: StoreRole;
    first_name?: string;
    last_name?: string;
    expires_at: string;
  };
  store?: {
    id: string;
    name: string;
    logo_url?: string;
    type: string;
  };
  inviter?: {
    name: string;
    email: string;
  };
}

// ============================================
// PERMISSION TYPES
// ============================================

export const PERMISSIONS = {
  // Store
  STORE_VIEW: 'store:view',
  STORE_EDIT: 'store:edit',
  STORE_DELETE: 'store:delete',
  TAX_CONFIG: 'store:tax',

  // Staff
  STAFF_VIEW: 'staff:view',
  STAFF_INVITE: 'staff:invite',
  STAFF_REMOVE: 'staff:remove',
  STAFF_ROLE_CHANGE: 'staff:role',

  // Catalog
  CATALOG_VIEW: 'catalog:view',
  CATALOG_EDIT: 'catalog:edit',
  CATALOG_DELETE: 'catalog:delete',
  CATALOG_IMPORT: 'catalog:import',

  // Billing
  BILLING_VIEW: 'billing:view',
  BILLING_CREATE: 'billing:create',
  BILLING_DISCOUNT: 'billing:discount',
  BILLING_REFUND: 'billing:refund',
  BILLING_VOID: 'billing:void',

  // Reports
  REPORTS_VIEW: 'reports:view',
  DASHBOARD_VIEW: 'dashboard:view',
} as const;

export type Permission = typeof PERMISSIONS[keyof typeof PERMISSIONS];

export const ROLE_PERMISSIONS: Record<StoreRole, Permission[] | ['*']> = {
  owner: ['*'],
  manager: [
    PERMISSIONS.STORE_VIEW,
    PERMISSIONS.STAFF_VIEW,
    PERMISSIONS.STAFF_INVITE,
    PERMISSIONS.CATALOG_VIEW,
    PERMISSIONS.CATALOG_EDIT,
    PERMISSIONS.CATALOG_DELETE,
    PERMISSIONS.CATALOG_IMPORT,
    PERMISSIONS.BILLING_VIEW,
    PERMISSIONS.BILLING_CREATE,
    PERMISSIONS.BILLING_DISCOUNT,
    PERMISSIONS.BILLING_REFUND,
    PERMISSIONS.BILLING_VOID,
    PERMISSIONS.REPORTS_VIEW,
    PERMISSIONS.DASHBOARD_VIEW,
  ],
  cashier: [
    PERMISSIONS.CATALOG_VIEW,
    PERMISSIONS.BILLING_VIEW,
    PERMISSIONS.BILLING_CREATE,
  ],
  waiter: [
    PERMISSIONS.CATALOG_VIEW,
    PERMISSIONS.BILLING_VIEW,
  ],
};

// ============================================
// STORE CONTEXT TYPES
// ============================================

export interface StoreContextValue {
  // Current store
  currentStore: Store | null;
  currentMembership: StoreMember | null;

  // All memberships
  allMemberships: StoreMember[];

  // Computed
  isOwner: boolean;
  isManager: boolean;
  role: StoreRole | null;
  showStoreSwitcher: boolean;

  // Loading states
  isLoading: boolean;

  // Actions
  switchStore: (storeId: string) => Promise<void>;
  refreshMemberships: () => Promise<void>;

  // Permission helpers
  hasPermission: (permission: Permission) => boolean;
  hasAnyPermission: (permissions: Permission[]) => boolean;
  canInviteRole: (role: StoreRole) => boolean;
}
```

### 10.3 Permission Hook (`src/hooks/usePermissions.ts`)

```typescript
import { useCallback } from 'react';
import { useStoreContext } from '@/contexts/StoreContext';
import { ROLE_PERMISSIONS, type Permission, type StoreRole } from '@/types/staff';

export function usePermissions() {
  const { role, currentMembership } = useStoreContext();

  const hasPermission = useCallback((permission: Permission): boolean => {
    if (!role) return false;

    const permissions = ROLE_PERMISSIONS[role];
    if (permissions[0] === '*') return true; // Owner has all

    return permissions.includes(permission);
  }, [role]);

  const hasAnyPermission = useCallback((permissions: Permission[]): boolean => {
    return permissions.some(p => hasPermission(p));
  }, [hasPermission]);

  const canInviteRole = useCallback((targetRole: StoreRole): boolean => {
    if (!role) return false;
    if (role === 'owner') return true;
    if (role === 'manager') {
      return targetRole === 'cashier' || targetRole === 'waiter';
    }
    return false;
  }, [role]);

  return {
    hasPermission,
    hasAnyPermission,
    canInviteRole,
    isOwner: role === 'owner',
    isManager: role === 'manager',
    isCashier: role === 'cashier',
    isWaiter: role === 'waiter',
    role,
  };
}
```

### 10.4 Role-Based View Component (`src/components/layout/RoleBasedView.tsx`)

```typescript
import { type ReactNode } from 'react';
import { usePermissions } from '@/hooks/usePermissions';
import type { Permission } from '@/types/staff';

interface RoleBasedViewProps {
  children: ReactNode;
  permission?: Permission;
  permissions?: Permission[];
  requireAll?: boolean; // If true, requires all permissions
  fallback?: ReactNode;
}

export function RoleBasedView({
  children,
  permission,
  permissions,
  requireAll = false,
  fallback = null,
}: RoleBasedViewProps) {
  const { hasPermission, hasAnyPermission } = usePermissions();

  let hasAccess = false;

  if (permission) {
    hasAccess = hasPermission(permission);
  } else if (permissions) {
    hasAccess = requireAll
      ? permissions.every(p => hasPermission(p))
      : hasAnyPermission(permissions);
  } else {
    hasAccess = true; // No permission required
  }

  if (!hasAccess) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}

// Usage example:
// <RoleBasedView permission={PERMISSIONS.STAFF_INVITE}>
//   <InviteButton />
// </RoleBasedView>
```

---

## 11. Internationalization (i18n)

### 11.1 Language Detection Strategy

```typescript
// src/lib/i18n.ts

import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

// Import translations
import en from '@/locales/en.json';
import hi from '@/locales/hi.json';
import ar from '@/locales/ar.json';
import mr from '@/locales/mr.json';

// Supported languages with metadata
export const SUPPORTED_LANGUAGES = {
  en: { name: 'English', nativeName: 'English', dir: 'ltr' },
  hi: { name: 'Hindi', nativeName: 'हिन्दी', dir: 'ltr' },
  ar: { name: 'Arabic', nativeName: 'العربية', dir: 'rtl' },
  mr: { name: 'Marathi', nativeName: 'मराठी', dir: 'ltr' },
} as const;

export type SupportedLanguage = keyof typeof SUPPORTED_LANGUAGES;

// Country to language mapping
const COUNTRY_LANGUAGE_MAP: Record<string, SupportedLanguage> = {
  IN: 'en', // India - default to English, user can change to Hindi/Marathi
  AE: 'ar', // UAE
  SA: 'ar', // Saudi Arabia
  US: 'en',
  GB: 'en',
  // Add more as needed
};

// Detect country from various sources
async function detectCountry(): Promise<string | null> {
  try {
    // Try IP geolocation API
    const response = await fetch('https://ipapi.co/json/');
    const data = await response.json();
    return data.country_code;
  } catch {
    return null;
  }
}

// Custom language detector
const customDetector = {
  name: 'customDetector',
  async: true,
  detect: async (callback: (lng: string) => void) => {
    // 1. Check localStorage for user preference
    const stored = localStorage.getItem('i18nextLng');
    if (stored && stored in SUPPORTED_LANGUAGES) {
      callback(stored);
      return;
    }

    // 2. Check profile preference (if logged in)
    // This will be handled by AuthContext on login

    // 3. Detect from country
    const country = await detectCountry();
    if (country && COUNTRY_LANGUAGE_MAP[country]) {
      callback(COUNTRY_LANGUAGE_MAP[country]);
      return;
    }

    // 4. Fall back to browser language
    const browserLang = navigator.language.split('-')[0];
    if (browserLang in SUPPORTED_LANGUAGES) {
      callback(browserLang);
      return;
    }

    // 5. Default to English
    callback('en');
  },
};

i18n
  .use(initReactI18next)
  .use(LanguageDetector)
  .init({
    resources: {
      en: { translation: en },
      hi: { translation: hi },
      ar: { translation: ar },
      mr: { translation: mr },
    },
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false,
    },
    detection: {
      order: ['customDetector', 'localStorage', 'navigator'],
      caches: ['localStorage'],
    },
  });

// Helper to set language and update profile
export async function setLanguage(
  lang: SupportedLanguage,
  updateProfile = true
): Promise<void> {
  await i18n.changeLanguage(lang);
  localStorage.setItem('i18nextLng', lang);

  // Update document direction for RTL
  document.documentElement.dir = SUPPORTED_LANGUAGES[lang].dir;
  document.documentElement.lang = lang;

  if (updateProfile) {
    // Update user profile preference
    // This will be called from settings
  }
}

export default i18n;
```

### 11.2 New Translation Keys for Staff Management

```json
// Add to src/locales/en.json
{
  "staff": {
    "title": "Team Management",
    "members": "Team Members",
    "pendingInvites": "Pending Invites",
    "inviteStaff": "Invite Staff",
    "noMembers": "No team members yet",
    "noPendingInvites": "No pending invitations",
    "memberSince": "Member since {{date}}",
    "invitedBy": "Invited by {{name}}",
    "expiresIn": "Expires in {{days}} days",
    "expired": "Expired",

    "roles": {
      "owner": "Owner",
      "manager": "Manager",
      "cashier": "Cashier",
      "waiter": "Waiter"
    },

    "actions": {
      "changeRole": "Change Role",
      "deactivate": "Deactivate",
      "remove": "Remove from Store",
      "resendInvite": "Resend Invite",
      "cancelInvite": "Cancel Invite"
    },

    "invite": {
      "title": "Invite Team Member",
      "subtitle": "Send an invitation to join your store",
      "emailLabel": "Email Address",
      "emailPlaceholder": "colleague@example.com",
      "roleLabel": "Role",
      "rolePlaceholder": "Select a role",
      "firstNameLabel": "First Name (Optional)",
      "lastNameLabel": "Last Name (Optional)",
      "phoneLabel": "Phone (Optional)",
      "submitButton": "Send Invitation",
      "success": "Invitation sent successfully",
      "error": "Failed to send invitation"
    },

    "accept": {
      "title": "You've Been Invited!",
      "subtitle": "{{inviter}} has invited you to join {{store}} as {{role}}",
      "createAccount": "Create Account",
      "signInGoogle": "Sign in with Google",
      "alreadyHaveAccount": "Already have an account?",
      "signIn": "Sign In",
      "acceptButton": "Accept Invitation",
      "success": "Welcome to {{store}}!",
      "expired": "This invitation has expired",
      "invalid": "Invalid invitation link"
    },

    "confirmRemove": {
      "title": "Remove Team Member",
      "message": "Are you sure you want to remove {{name}} from your store? They will lose access immediately.",
      "confirm": "Remove",
      "cancel": "Cancel"
    }
  },

  "settings": {
    "title": "Settings",
    "sections": {
      "profile": "Profile",
      "store": "Store Profile",
      "staff": "Team",
      "menu": "Menu",
      "tax": "Tax Configuration",
      "danger": "Danger Zone"
    },
    "createStore": {
      "title": "Create Your Own Store",
      "description": "Want to start your own business? Create your own store and become an owner.",
      "button": "Create Store"
    }
  },

  "storeSwitcher": {
    "label": "Switch Store",
    "currentStore": "Current Store"
  }
}
```

---

## 12. Security Considerations

### 12.1 Authentication Security

| Concern | Current (Dev) | Production | Implementation |
|---------|--------------|------------|----------------|
| Email Verification | ✅ Supabase email | ✅ Same | Supabase magic link |
| Phone Verification | ❌ Not implemented | ✅ SMS OTP | MSG91 integration |
| OAuth | ✅ Google PKCE | ✅ Same | Supabase OAuth |
| Session Management | ✅ 15min timeout | ✅ Same | sessionManager.ts |
| Token Storage | ✅ Encrypted localStorage | ✅ Same | secureStorage.ts |

### 12.2 Future OTP Implementation

```typescript
// src/api/otp.ts (Future Implementation)

import { MSG91Service } from '@/services/msg91';

export const otpAPI = {
  /**
   * Send OTP to phone number
   */
  async sendOTP(phone: string): Promise<{ requestId: string }> {
    // Rate limiting: Max 3 OTPs per phone per hour
    const rateKey = `otp_rate_${phone}`;
    const attempts = parseInt(localStorage.getItem(rateKey) || '0');

    if (attempts >= 3) {
      throw new Error('Too many OTP requests. Please try again later.');
    }

    const requestId = await MSG91Service.sendOTP(phone);

    // Increment rate limit counter
    localStorage.setItem(rateKey, String(attempts + 1));
    setTimeout(() => localStorage.removeItem(rateKey), 60 * 60 * 1000);

    return { requestId };
  },

  /**
   * Verify OTP
   */
  async verifyOTP(phone: string, otp: string, requestId: string): Promise<boolean> {
    return MSG91Service.verifyOTP(phone, otp, requestId);
  },
};
```

### 12.3 Invitation Security

| Security Measure | Implementation |
|-----------------|----------------|
| Token Generation | 32-byte random hex (256-bit entropy) |
| Token Expiry | 7 days default |
| Single Use | Token invalidated after acceptance |
| Email Matching | Invite email must match account email |
| Rate Limiting | Max 5 pending invites per email per store |

### 12.4 Permission Enforcement

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    PERMISSION ENFORCEMENT LAYERS                         │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  Layer 1: Database (RLS Policies)                                        │
│  ├── All queries filtered by user's store memberships                    │
│  ├── Role-based write restrictions                                       │
│  └── Cannot bypass even if frontend compromised                          │
│                                                                          │
│  Layer 2: API Functions (SECURITY DEFINER)                               │
│  ├── Business logic validation                                           │
│  ├── Role hierarchy enforcement                                          │
│  └── Audit logging                                                       │
│                                                                          │
│  Layer 3: Frontend (UX only)                                             │
│  ├── Hide unauthorized UI elements                                       │
│  ├── Disable unauthorized actions                                        │
│  └── NOT a security layer (defense in depth only)                        │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 13. Implementation Phases

### Phase 1: Foundation (Week 1-2)
**Goal:** Database schema and core APIs

- [ ] Verify/update `store_members` table schema
- [ ] Add status tracking to `store_invites`
- [ ] Update RLS policies for team visibility
- [ ] Test and fix `accept_invite` function
- [ ] Test and fix `invite_staff` function
- [ ] Create TypeScript types (`src/types/staff.ts`)
- [ ] Implement `staffAPI` service
- [ ] Implement `invitationsAPI` service
- [ ] Create `StoreContext` provider
- [ ] Create `usePermissions` hook

### Phase 2: Staff Management UI (Week 3-4)
**Goal:** Settings screen with staff management

- [ ] Restructure Settings screen with sections
- [ ] Implement `ProfileSection` component
- [ ] Implement `StoreProfileSection` (owner only)
- [ ] Implement `StaffSection` with tabs:
  - [ ] Team Members list
  - [ ] Pending Invites list
- [ ] Implement `InviteStaffModal`
- [ ] Implement `EditMemberModal` (change role)
- [ ] Implement `RemoveMemberModal` (confirmation)
- [ ] Add role badges and permission-based UI hiding

### Phase 3: Invitation Flow (Week 5-6)
**Goal:** Complete invitation acceptance flow

- [ ] Create `/invite/:token` route (public)
- [ ] Implement `AcceptInviteScreen`
  - [ ] Show invitation details
  - [ ] Handle new user signup
  - [ ] Handle existing user login
  - [ ] Auto-accept after auth
- [ ] Implement `InviteExpiredScreen`
- [ ] Update `AuthContext` to detect pending invites
- [ ] Implement staff-specific onboarding flow
- [ ] Add invitation email template (Supabase Edge Function)

### Phase 4: Multi-Store & Navigation (Week 7-8)
**Goal:** Store switching and role-based navigation

- [ ] Implement `StoreSwitcher` component
- [ ] Add store switcher to TopBar (conditional)
- [ ] Update `Navigation` for role-based menu items
- [ ] Update all screens for role-based access
- [ ] Implement "Create Your Own Store" flow for staff
- [ ] Update dashboard for role-appropriate data
- [ ] Test all permission scenarios

### Phase 5: Polish & Production Prep (Week 9-10)
**Goal:** Final testing and production readiness

- [ ] Add all translation keys (en, hi, ar, mr)
- [ ] Implement location-based language detection
- [ ] Add invitation email templates
- [ ] Add notification for invite acceptance
- [ ] Comprehensive testing:
  - [ ] Owner invites manager
  - [ ] Manager invites cashier
  - [ ] New user accepts invite
  - [ ] Existing user accepts invite
  - [ ] Staff creates own store
  - [ ] Multi-store switching
- [ ] Security audit
- [ ] Performance optimization

### Future Phases

**Phase 6: OTP Verification (Production)**
- [ ] Integrate MSG91 for SMS OTP
- [ ] Add phone verification to signup flow
- [ ] Add phone verification to staff onboarding

**Phase 7: Advanced Features**
- [ ] Manager approval for discounts/voids
- [ ] PIN-based quick login for staff
- [ ] Staff shift scheduling
- [ ] Time tracking
- [ ] Performance analytics per staff

---

## 14. Future Enhancements

### 14.1 Planned Features

| Feature | Priority | Phase |
|---------|----------|-------|
| OTP/SMS verification | P0 | Production |
| Manager approval workflow | P1 | Phase 7 |
| Staff PIN login | P1 | Phase 7 |
| Shift scheduling | P2 | Phase 7 |
| Time tracking | P2 | Phase 7 |
| Performance metrics | P2 | Phase 7 |
| Payroll integration | P3 | Future |
| Multiple owners | P3 | Future |

### 14.2 Manager Approval Workflow (Concept)

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    MANAGER APPROVAL WORKFLOW                             │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  Cashier attempts discount > 10%                                         │
│           ↓                                                              │
│  System shows: "Manager approval required"                               │
│           ↓                                                              │
│  Options:                                                                │
│    A. Call manager to enter PIN                                          │
│    B. Send approval request (manager gets notification)                  │
│           ↓                                                              │
│  Manager approves/rejects                                                │
│           ↓                                                              │
│  Action logged with approver details                                     │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

### 14.3 Staff PIN Login (Concept)

```typescript
// Future: Quick staff switching without full logout
interface StaffPIN {
  user_id: string;
  store_id: string;
  pin_hash: string; // bcrypt hashed 4-6 digit PIN
  created_at: string;
}

// Flow:
// 1. Owner/Manager assigns PIN to staff
// 2. Staff can "lock" screen (not logout)
// 3. Any staff can enter PIN to switch to their session
// 4. Full session maintained in background
```

---

## Appendix A: Quick Reference Commands

### Database Commands (Supabase SQL Editor)

```sql
-- Check current store_members schema
SELECT column_name, data_type, column_default, is_nullable
FROM information_schema.columns
WHERE table_name = 'store_members';

-- View all pending invites
SELECT si.*, s.name as store_name, p.name as inviter_name
FROM store_invites si
JOIN stores s ON s.id = si.store_id
LEFT JOIN profiles p ON p.id = si.created_by
WHERE si.status = 'pending';

-- View team for a specific store
SELECT sm.*, p.name, p.email, p.phone
FROM store_members sm
JOIN profiles p ON p.id = sm.user_id
WHERE sm.store_id = 'YOUR_STORE_ID'
AND sm.is_active = true;

-- Manually expire old invites
SELECT expire_old_invites();
```

### Development Commands

```bash
# Start development server
npm run dev

# Run type checking
npm run typecheck

# Build for production
npm run build

# Run linting
npm run lint
```

---

## Appendix B: Environment Variables

```env
# Supabase (Required)
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key

# SMS/OTP (Production)
VITE_MSG91_AUTH_KEY=your-msg91-key
VITE_MSG91_TEMPLATE_ID=your-template-id
VITE_MSG91_SENDER=RECKNG

# Email (For invitation emails via Edge Functions)
RESEND_API_KEY=your-resend-key

# Feature Flags
VITE_ENABLE_SMS_OTP=false  # Set to true in production
```

---

## Appendix C: Testing Checklist

### Staff Invitation Flow
- [ ] Owner can invite manager
- [ ] Owner can invite cashier
- [ ] Owner can invite waiter
- [ ] Manager can invite cashier
- [ ] Manager can invite waiter
- [ ] Manager CANNOT invite manager
- [ ] Cashier CANNOT invite anyone
- [ ] Waiter CANNOT invite anyone
- [ ] Duplicate email shows error
- [ ] Existing member shows error
- [ ] Resend invite works
- [ ] Cancel invite works

### Invitation Acceptance
- [ ] New user can create account and accept
- [ ] New user email is locked to invite email
- [ ] Google OAuth with matching email works
- [ ] Google OAuth with different email fails
- [ ] Existing user (logged in) can accept
- [ ] Existing user (not logged in) can login and accept
- [ ] Expired invite shows error
- [ ] Invalid token shows error
- [ ] Cancelled invite shows error

### Role-Based Access
- [ ] Owner sees all settings sections
- [ ] Manager sees limited sections
- [ ] Cashier sees only profile
- [ ] Waiter sees only profile
- [ ] Owner can access all routes
- [ ] Cashier cannot access /reports
- [ ] Waiter cannot access /billing
- [ ] Direct URL access is blocked

### Multi-Store
- [ ] Staff with no owned store: no switcher
- [ ] Staff with owned store: switcher shows
- [ ] Store switch updates context
- [ ] Store switch updates navigation
- [ ] Each store shows correct role

---

**Document Version:** 1.0
**Last Updated:** December 2024
**Next Review:** After Phase 2 completion
