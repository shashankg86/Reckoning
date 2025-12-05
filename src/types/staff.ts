/**
 * Staff Management Types
 *
 * This file contains all TypeScript types related to staff management,
 * roles, permissions, and store memberships.
 */

// ============================================
// ROLE TYPES
// ============================================

export type StoreRole = 'owner' | 'manager' | 'cashier' | 'waiter';

export const ROLE_HIERARCHY: Record<StoreRole, number> = {
  owner: 100,
  manager: 75,
  cashier: 50,
  waiter: 25,
};

export const ROLE_LABELS: Record<StoreRole, string> = {
  owner: 'Owner',
  manager: 'Manager',
  cashier: 'Cashier',
  waiter: 'Waiter',
};

export const ROLE_LABELS_I18N: Record<StoreRole, string> = {
  owner: 'staff.roles.owner',
  manager: 'staff.roles.manager',
  cashier: 'staff.roles.cashier',
  waiter: 'staff.roles.waiter',
};

export const ROLE_COLORS: Record<StoreRole, { bg: string; text: string }> = {
  owner: { bg: 'bg-purple-100 dark:bg-purple-900/30', text: 'text-purple-800 dark:text-purple-300' },
  manager: { bg: 'bg-blue-100 dark:bg-blue-900/30', text: 'text-blue-800 dark:text-blue-300' },
  cashier: { bg: 'bg-green-100 dark:bg-green-900/30', text: 'text-green-800 dark:text-green-300' },
  waiter: { bg: 'bg-orange-100 dark:bg-orange-900/30', text: 'text-orange-800 dark:text-orange-300' },
};

// Roles that can be assigned via invitation (owner cannot be invited)
export const INVITABLE_ROLES: Exclude<StoreRole, 'owner'>[] = ['manager', 'cashier', 'waiter'];

// Roles that managers can invite (they cannot invite other managers)
export const MANAGER_INVITABLE_ROLES: Exclude<StoreRole, 'owner' | 'manager'>[] = ['cashier', 'waiter'];

// ============================================
// STORE MEMBER TYPES
// ============================================

export interface StoreMemberProfile {
  id: string;
  name: string | null;
  email: string;
  phone: string | null;
  photo_url: string | null;
}

export interface StoreMemberStore {
  id: string;
  name: string;
  logo_url: string | null;
  type: string;
}

export interface StoreMember {
  id: string;
  store_id: string;
  user_id: string;
  role: StoreRole;
  is_active: boolean;
  invited_by: string | null;
  joined_at: string;
  created_at: string;
  updated_at: string;

  // Joined profile data (when fetching team members)
  profile?: StoreMemberProfile;

  // Joined store data (when fetching user memberships)
  store?: StoreMemberStore;
}

export interface StoreMembership {
  id: string;
  store_id: string;
  role: StoreRole;
  is_active: boolean;
  joined_at: string;
  store: StoreMemberStore;
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
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
  expires_at: string;
  created_by: string;
  created_at: string;
  updated_at: string | null;
  accepted_at: string | null;
  accepted_by: string | null;

  // Joined data
  inviter?: {
    name: string | null;
    email: string;
  };
}

export interface InviteStaffPayload {
  email: string;
  role: Exclude<StoreRole, 'owner'>;
  firstName?: string;
  lastName?: string;
  phone?: string;
}

export interface InviteStaffResult {
  success: boolean;
  message?: string;
  error?: string;
  invite_id?: string;
  token?: string;
}

export interface InviteDetails {
  valid: boolean;
  error?: string;
  invite?: {
    id: string;
    email: string;
    role: StoreRole;
    first_name: string | null;
    last_name: string | null;
    expires_at: string;
  };
  store?: {
    id: string;
    name: string;
    logo_url: string | null;
    type: string;
  };
  inviter?: {
    name: string | null;
    email: string;
  };
}

export interface AcceptInviteResult {
  success: boolean;
  error?: string;
  member_id?: string;
  store_id?: string;
  role?: StoreRole;
  store?: {
    id: string;
    name: string;
    logo_url: string | null;
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
  SETTINGS_VIEW: 'settings:view',
} as const;

export type Permission = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

export const ROLE_PERMISSIONS: Record<StoreRole, Permission[] | ['*']> = {
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
    PERMISSIONS.SETTINGS_VIEW,
  ],

  cashier: [
    PERMISSIONS.CATALOG_VIEW,
    PERMISSIONS.BILLING_VIEW,
    PERMISSIONS.BILLING_CREATE,
    PERMISSIONS.TABLES_VIEW,
    PERMISSIONS.TABLES_ORDER,
    PERMISSIONS.SETTINGS_VIEW,
  ],

  waiter: [
    PERMISSIONS.CATALOG_VIEW,
    PERMISSIONS.BILLING_VIEW,
    PERMISSIONS.TABLES_VIEW,
    PERMISSIONS.TABLES_ORDER,
    PERMISSIONS.SETTINGS_VIEW,
  ],
};

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Check if a role has a specific permission
 */
export function roleHasPermission(role: StoreRole, permission: Permission): boolean {
  const permissions = ROLE_PERMISSIONS[role];
  if (permissions[0] === '*') return true;
  return (permissions as Permission[]).includes(permission);
}

/**
 * Check if a role can invite another role
 */
export function canInviteRole(inviterRole: StoreRole, targetRole: StoreRole): boolean {
  if (targetRole === 'owner') return false; // Nobody can invite owners
  if (inviterRole === 'owner') return true; // Owners can invite anyone
  if (inviterRole === 'manager') {
    return targetRole === 'cashier' || targetRole === 'waiter';
  }
  return false; // Cashiers and waiters cannot invite
}

/**
 * Get roles that a user can invite based on their role
 */
export function getInvitableRoles(role: StoreRole): StoreRole[] {
  if (role === 'owner') return [...INVITABLE_ROLES];
  if (role === 'manager') return [...MANAGER_INVITABLE_ROLES];
  return [];
}

/**
 * Check if role A is higher than role B in hierarchy
 */
export function isHigherRole(roleA: StoreRole, roleB: StoreRole): boolean {
  return ROLE_HIERARCHY[roleA] > ROLE_HIERARCHY[roleB];
}

/**
 * Format member name for display
 */
export function formatMemberName(member: StoreMember): string {
  if (member.profile?.name) return member.profile.name;
  if (member.profile?.email) return member.profile.email.split('@')[0];
  return 'Unknown';
}

/**
 * Get time until invitation expires
 */
export function getInviteExpiryText(expiresAt: string): string {
  const now = new Date();
  const expiry = new Date(expiresAt);
  const diffMs = expiry.getTime() - now.getTime();

  if (diffMs <= 0) return 'Expired';

  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));

  if (diffDays > 0) return `${diffDays} day${diffDays > 1 ? 's' : ''}`;
  if (diffHours > 0) return `${diffHours} hour${diffHours > 1 ? 's' : ''}`;
  return 'Less than an hour';
}
