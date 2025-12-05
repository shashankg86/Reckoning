/**
 * RoleBasedView Component
 *
 * A wrapper component that conditionally renders children based on
 * the current user's permissions in the active store.
 *
 * Usage:
 * ```tsx
 * <RoleBasedView permission={PERMISSIONS.STAFF_INVITE}>
 *   <InviteButton />
 * </RoleBasedView>
 *
 * <RoleBasedView permissions={[PERMISSIONS.CATALOG_EDIT, PERMISSIONS.CATALOG_DELETE]}>
 *   <EditControls />
 * </RoleBasedView>
 *
 * <RoleBasedView ownerOnly>
 *   <DangerZone />
 * </RoleBasedView>
 * ```
 */

import { type ReactNode } from 'react';
import { usePermissions } from '@/hooks/usePermissions';
import type { Permission, StoreRole } from '@/types/staff';

interface RoleBasedViewProps {
  children: ReactNode;

  // Single permission check
  permission?: Permission;

  // Multiple permissions check
  permissions?: Permission[];

  // If true, requires ALL permissions (default: false = ANY permission)
  requireAll?: boolean;

  // Role-based checks
  ownerOnly?: boolean;
  managerOrAbove?: boolean;
  role?: StoreRole;
  roles?: StoreRole[];

  // Fallback content when access is denied
  fallback?: ReactNode;

  // If true, shows nothing instead of fallback when denied
  hideOnDeny?: boolean;
}

export function RoleBasedView({
  children,
  permission,
  permissions,
  requireAll = false,
  ownerOnly = false,
  managerOrAbove = false,
  role,
  roles,
  fallback = null,
  hideOnDeny = false,
}: RoleBasedViewProps) {
  const {
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    isOwner,
    isManager,
    role: currentRole,
  } = usePermissions();

  let hasAccess = true;

  // Check owner-only
  if (ownerOnly) {
    hasAccess = isOwner;
  }

  // Check manager or above (owner, manager)
  if (managerOrAbove && hasAccess) {
    hasAccess = isOwner || isManager;
  }

  // Check specific role
  if (role && hasAccess) {
    hasAccess = currentRole === role;
  }

  // Check multiple roles
  if (roles && roles.length > 0 && hasAccess) {
    hasAccess = currentRole !== null && roles.includes(currentRole);
  }

  // Check single permission
  if (permission && hasAccess) {
    hasAccess = hasPermission(permission);
  }

  // Check multiple permissions
  if (permissions && permissions.length > 0 && hasAccess) {
    hasAccess = requireAll
      ? hasAllPermissions(permissions)
      : hasAnyPermission(permissions);
  }

  if (!hasAccess) {
    if (hideOnDeny) return null;
    return <>{fallback}</>;
  }

  return <>{children}</>;
}

/**
 * Owner-only content wrapper
 */
export function OwnerOnly({
  children,
  fallback,
}: {
  children: ReactNode;
  fallback?: ReactNode;
}) {
  return (
    <RoleBasedView ownerOnly fallback={fallback}>
      {children}
    </RoleBasedView>
  );
}

/**
 * Manager or above content wrapper
 */
export function ManagerOrAbove({
  children,
  fallback,
}: {
  children: ReactNode;
  fallback?: ReactNode;
}) {
  return (
    <RoleBasedView managerOrAbove fallback={fallback}>
      {children}
    </RoleBasedView>
  );
}

/**
 * Permission-based content wrapper
 */
export function RequirePermission({
  permission,
  children,
  fallback,
}: {
  permission: Permission;
  children: ReactNode;
  fallback?: ReactNode;
}) {
  return (
    <RoleBasedView permission={permission} fallback={fallback}>
      {children}
    </RoleBasedView>
  );
}

/**
 * Access denied message component
 */
export function AccessDenied({
  message = 'You do not have permission to view this content.',
}: {
  message?: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center p-8 text-center">
      <div className="w-16 h-16 mb-4 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
        <svg
          className="w-8 h-8 text-red-600 dark:text-red-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
          />
        </svg>
      </div>
      <p className="text-gray-600 dark:text-gray-400">{message}</p>
    </div>
  );
}

export default RoleBasedView;
