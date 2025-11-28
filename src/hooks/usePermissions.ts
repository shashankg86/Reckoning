import { useAuth } from '../contexts/AuthContext';
import { StoreMember } from '../types';

export const PERMISSIONS = {
    // Administrative
    MANAGE_SETTINGS: 'manage_settings',
    MANAGE_STAFF: 'manage_staff',
    VIEW_REPORTS: 'view_reports',

    // Operational
    MANAGE_MENU: 'manage_menu',
    MANAGE_TABLES: 'manage_tables',
    VOID_ORDER: 'void_order',
    APPLY_DISCOUNT: 'apply_discount',
    REFUND_ORDER: 'refund_order',
} as const;

export type Permission = typeof PERMISSIONS[keyof typeof PERMISSIONS];

export function usePermissions() {
    const { state } = useAuth();
    const user = state.user;

    // Check role from store membership first, fallback to user.role (if exists)
    const role = user?.store?.membership?.role || user?.role;
    const isAdmin = role === 'admin' || role === 'owner';

    const hasPermission = (permission: Permission): boolean => {
        if (!user) return false;
        if (isAdmin) return true;

        // Check explicit permissions from membership
        const permissions = user.store?.membership?.permissions;

        if (permissions && typeof permissions[permission] === 'boolean') {
            return permissions[permission];
        }

        // Fallback defaults based on role
        if (role === 'manager') {
            const managerPermissions: Permission[] = [
                PERMISSIONS.MANAGE_MENU,
                PERMISSIONS.MANAGE_TABLES,
                PERMISSIONS.VIEW_REPORTS,
                PERMISSIONS.VOID_ORDER,
                PERMISSIONS.APPLY_DISCOUNT,
                PERMISSIONS.REFUND_ORDER
            ];
            return managerPermissions.includes(permission);
        }

        if (role === 'cashier') {
            const cashierPermissions: Permission[] = [
                PERMISSIONS.VOID_ORDER // Maybe restricted by default?
            ];
            return cashierPermissions.includes(permission);
        }

        return false;
    };

    return {
        isAdmin,
        hasPermission,
        canManageSettings: hasPermission(PERMISSIONS.MANAGE_SETTINGS),
        canManageStaff: hasPermission(PERMISSIONS.MANAGE_STAFF),
        canViewReports: hasPermission(PERMISSIONS.VIEW_REPORTS),
        canManageMenu: hasPermission(PERMISSIONS.MANAGE_MENU),
        canManageTables: hasPermission(PERMISSIONS.MANAGE_TABLES),
    };
}
