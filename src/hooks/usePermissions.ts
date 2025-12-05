/**
 * usePermissions Hook
 *
 * Provides convenient access to permission checking for the current user
 * in the active store context.
 *
 * Usage:
 * ```tsx
 * const { hasPermission, isOwner, canEditCatalog } = usePermissions();
 *
 * if (hasPermission(PERMISSIONS.CATALOG_EDIT)) {
 *   // Show edit button
 * }
 * ```
 */

import { useMemo } from 'react';
import { useStoreContext } from '@/contexts/StoreContext';
import {
  PERMISSIONS,
  type Permission,
  type StoreRole,
} from '@/types/staff';

export interface UsePermissionsReturn {
  // Current role
  role: StoreRole | null;

  // Role checks
  isOwner: boolean;
  isManager: boolean;
  isCashier: boolean;
  isWaiter: boolean;
  isStaff: boolean; // Any non-owner role

  // Permission checks
  hasPermission: (permission: Permission) => boolean;
  hasAnyPermission: (permissions: Permission[]) => boolean;
  hasAllPermissions: (permissions: Permission[]) => boolean;

  // Common permission shortcuts
  canViewStore: boolean;
  canEditStore: boolean;
  canDeleteStore: boolean;
  canConfigureTax: boolean;

  canViewStaff: boolean;
  canInviteStaff: boolean;
  canRemoveStaff: boolean;
  canChangeRoles: boolean;

  canViewCatalog: boolean;
  canCreateCatalog: boolean;
  canEditCatalog: boolean;
  canDeleteCatalog: boolean;
  canImportCatalog: boolean;

  canViewBilling: boolean;
  canCreateBilling: boolean;
  canApplyDiscount: boolean;
  canProcessRefund: boolean;
  canVoidOrder: boolean;

  canViewTables: boolean;
  canManageTables: boolean;
  canCreateOrders: boolean;

  canViewReports: boolean;
  canExportReports: boolean;
  canViewDashboard: boolean;

  canImportOCR: boolean;
  canSetupMenu: boolean;

  // Invite permissions
  canInvite: (targetRole: StoreRole) => boolean;
  invitableRoles: StoreRole[];
}

export function usePermissions(): UsePermissionsReturn {
  const {
    currentRole,
    isOwner,
    isManager,
    isCashier,
    isWaiter,
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    canInvite,
    getInvitableRoles,
  } = useStoreContext();

  return useMemo(
    () => ({
      // Current role
      role: currentRole,

      // Role checks
      isOwner,
      isManager,
      isCashier,
      isWaiter,
      isStaff: !isOwner && currentRole !== null,

      // Permission checks
      hasPermission,
      hasAnyPermission,
      hasAllPermissions,

      // Store permissions
      canViewStore: hasPermission(PERMISSIONS.STORE_VIEW),
      canEditStore: hasPermission(PERMISSIONS.STORE_EDIT),
      canDeleteStore: hasPermission(PERMISSIONS.STORE_DELETE),
      canConfigureTax: hasPermission(PERMISSIONS.TAX_CONFIG),

      // Staff permissions
      canViewStaff: hasPermission(PERMISSIONS.STAFF_VIEW),
      canInviteStaff: hasPermission(PERMISSIONS.STAFF_INVITE),
      canRemoveStaff: hasPermission(PERMISSIONS.STAFF_REMOVE),
      canChangeRoles: hasPermission(PERMISSIONS.STAFF_ROLE_CHANGE),

      // Catalog permissions
      canViewCatalog: hasPermission(PERMISSIONS.CATALOG_VIEW),
      canCreateCatalog: hasPermission(PERMISSIONS.CATALOG_CREATE),
      canEditCatalog: hasPermission(PERMISSIONS.CATALOG_EDIT),
      canDeleteCatalog: hasPermission(PERMISSIONS.CATALOG_DELETE),
      canImportCatalog: hasPermission(PERMISSIONS.CATALOG_IMPORT),

      // Billing permissions
      canViewBilling: hasPermission(PERMISSIONS.BILLING_VIEW),
      canCreateBilling: hasPermission(PERMISSIONS.BILLING_CREATE),
      canApplyDiscount: hasPermission(PERMISSIONS.BILLING_DISCOUNT),
      canProcessRefund: hasPermission(PERMISSIONS.BILLING_REFUND),
      canVoidOrder: hasPermission(PERMISSIONS.BILLING_VOID),

      // Table permissions
      canViewTables: hasPermission(PERMISSIONS.TABLES_VIEW),
      canManageTables: hasPermission(PERMISSIONS.TABLES_MANAGE),
      canCreateOrders: hasPermission(PERMISSIONS.TABLES_ORDER),

      // Report permissions
      canViewReports: hasPermission(PERMISSIONS.REPORTS_VIEW),
      canExportReports: hasPermission(PERMISSIONS.REPORTS_EXPORT),
      canViewDashboard: hasPermission(PERMISSIONS.DASHBOARD_VIEW),

      // Other permissions
      canImportOCR: hasPermission(PERMISSIONS.OCR_IMPORT),
      canSetupMenu: hasPermission(PERMISSIONS.MENU_SETUP),

      // Invite permissions
      canInvite,
      invitableRoles: getInvitableRoles(),
    }),
    [
      currentRole,
      isOwner,
      isManager,
      isCashier,
      isWaiter,
      hasPermission,
      hasAnyPermission,
      hasAllPermissions,
      canInvite,
      getInvitableRoles,
    ]
  );
}

/**
 * Hook to check a single permission
 * More lightweight than full usePermissions hook
 */
export function useHasPermission(permission: Permission): boolean {
  const { hasPermission } = useStoreContext();
  return hasPermission(permission);
}

/**
 * Hook to check if user can access a specific feature
 * Returns loading state and permission
 */
export function useFeatureAccess(permission: Permission): {
  isLoading: boolean;
  hasAccess: boolean;
} {
  const { hasPermission, isLoading } = useStoreContext();

  return useMemo(
    () => ({
      isLoading,
      hasAccess: !isLoading && hasPermission(permission),
    }),
    [isLoading, hasPermission, permission]
  );
}

export default usePermissions;
