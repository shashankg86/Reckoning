/**
 * Store Context
 *
 * Manages the current store selection and multi-store functionality.
 * Provides role-based permission checking for the active store.
 *
 * This context works alongside AuthContext:
 * - AuthContext handles authentication and user profile
 * - StoreContext handles store selection and permissions
 */

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
  type ReactNode,
} from 'react';
import { useAuth } from './AuthContext';
import { staffAPI } from '@/api/staff';
import type {
  StoreMembership,
  StoreRole,
  Permission,
} from '@/types/staff';
import { ROLE_PERMISSIONS, roleHasPermission, canInviteRole, getInvitableRoles } from '@/types/staff';
import type { Store } from '@/types';

// ============================================
// CONTEXT TYPES
// ============================================

interface StoreContextValue {
  // Current store (from AuthContext initially, then from selection)
  currentStore: Store | null;
  currentRole: StoreRole | null;

  // All store memberships for the user
  memberships: StoreMembership[];

  // Loading state
  isLoading: boolean;

  // Computed properties
  isOwner: boolean;
  isManager: boolean;
  isCashier: boolean;
  isWaiter: boolean;

  // Show store switcher only if user owns at least one store AND has multiple memberships
  showStoreSwitcher: boolean;

  // Actions
  switchStore: (storeId: string) => Promise<void>;
  refreshMemberships: () => Promise<void>;

  // Permission helpers
  hasPermission: (permission: Permission) => boolean;
  hasAnyPermission: (permissions: Permission[]) => boolean;
  hasAllPermissions: (permissions: Permission[]) => boolean;
  canInvite: (targetRole: StoreRole) => boolean;
  getInvitableRoles: () => StoreRole[];
}

const StoreContext = createContext<StoreContextValue | null>(null);

// ============================================
// PROVIDER COMPONENT
// ============================================

interface StoreProviderProps {
  children: ReactNode;
}

export function StoreProvider({ children }: StoreProviderProps) {
  const { state: authState } = useAuth();
  const { user, isAuthenticated, isOnboarded } = authState;

  // State
  const [memberships, setMemberships] = useState<StoreMembership[]>([]);
  const [currentStoreId, setCurrentStoreId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // ============================================
  // LOAD MEMBERSHIPS
  // ============================================

  const loadMemberships = useCallback(async () => {
    if (!isAuthenticated || !user) {
      setMemberships([]);
      setCurrentStoreId(null);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      const userMemberships = await staffAPI.getUserMemberships();
      setMemberships(userMemberships);

      // Set current store if not already set
      if (!currentStoreId && userMemberships.length > 0) {
        // Prefer the store from AuthContext if available
        const authStoreId = (user.store as any)?.id;
        if (authStoreId && userMemberships.some((m) => m.store_id === authStoreId)) {
          setCurrentStoreId(authStoreId);
        } else {
          // Default to first owned store, or first membership
          const ownedStore = userMemberships.find((m) => m.role === 'owner');
          setCurrentStoreId(ownedStore?.store_id ?? userMemberships[0]?.store_id ?? null);
        }
      }
    } catch (error) {
      console.error('[StoreContext] Failed to load memberships:', error);
      setMemberships([]);
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated, user, currentStoreId]);

  // Load memberships when auth state changes
  useEffect(() => {
    if (isAuthenticated && isOnboarded) {
      loadMemberships();
    } else {
      setMemberships([]);
      setCurrentStoreId(null);
      setIsLoading(false);
    }
  }, [isAuthenticated, isOnboarded, loadMemberships]);

  // ============================================
  // COMPUTED VALUES
  // ============================================

  const currentMembership = useMemo(() => {
    if (!currentStoreId) return null;
    return memberships.find((m) => m.store_id === currentStoreId) ?? null;
  }, [memberships, currentStoreId]);

  const currentStore = useMemo((): Store | null => {
    if (!currentMembership?.store) return null;
    // Convert StoreMemberStore to Store type
    return {
      id: currentMembership.store.id,
      name: currentMembership.store.name,
      logo_url: currentMembership.store.logo_url ?? undefined,
      type: currentMembership.store.type as any,
      currency: 'INR', // Default, should come from actual store data
    } as Store;
  }, [currentMembership]);

  const currentRole = useMemo((): StoreRole | null => {
    return currentMembership?.role ?? null;
  }, [currentMembership]);

  const isOwner = currentRole === 'owner';
  const isManager = currentRole === 'manager';
  const isCashier = currentRole === 'cashier';
  const isWaiter = currentRole === 'waiter';

  // Show store switcher only if:
  // 1. User owns at least one store
  // 2. User has more than one membership
  const showStoreSwitcher = useMemo(() => {
    const ownsAnyStore = memberships.some((m) => m.role === 'owner');
    const hasMultipleStores = memberships.length > 1;
    return ownsAnyStore && hasMultipleStores;
  }, [memberships]);

  // ============================================
  // ACTIONS
  // ============================================

  const switchStore = useCallback(async (storeId: string) => {
    const membership = memberships.find((m) => m.store_id === storeId);
    if (!membership) {
      console.error('[StoreContext] Cannot switch to store - not a member:', storeId);
      return;
    }
    setCurrentStoreId(storeId);

    // Optionally save to profile as default store
    // await supabase.from('profiles').update({ default_store_id: storeId }).eq('id', user?.uid);
  }, [memberships]);

  const refreshMemberships = useCallback(async () => {
    await loadMemberships();
  }, [loadMemberships]);

  // ============================================
  // PERMISSION HELPERS
  // ============================================

  const hasPermission = useCallback(
    (permission: Permission): boolean => {
      if (!currentRole) return false;
      return roleHasPermission(currentRole, permission);
    },
    [currentRole]
  );

  const hasAnyPermission = useCallback(
    (permissions: Permission[]): boolean => {
      return permissions.some((p) => hasPermission(p));
    },
    [hasPermission]
  );

  const hasAllPermissions = useCallback(
    (permissions: Permission[]): boolean => {
      return permissions.every((p) => hasPermission(p));
    },
    [hasPermission]
  );

  const canInvite = useCallback(
    (targetRole: StoreRole): boolean => {
      if (!currentRole) return false;
      return canInviteRole(currentRole, targetRole);
    },
    [currentRole]
  );

  const getInvitableRolesForUser = useCallback((): StoreRole[] => {
    if (!currentRole) return [];
    return getInvitableRoles(currentRole);
  }, [currentRole]);

  // ============================================
  // CONTEXT VALUE
  // ============================================

  const value = useMemo(
    (): StoreContextValue => ({
      currentStore,
      currentRole,
      memberships,
      isLoading,
      isOwner,
      isManager,
      isCashier,
      isWaiter,
      showStoreSwitcher,
      switchStore,
      refreshMemberships,
      hasPermission,
      hasAnyPermission,
      hasAllPermissions,
      canInvite,
      getInvitableRoles: getInvitableRolesForUser,
    }),
    [
      currentStore,
      currentRole,
      memberships,
      isLoading,
      isOwner,
      isManager,
      isCashier,
      isWaiter,
      showStoreSwitcher,
      switchStore,
      refreshMemberships,
      hasPermission,
      hasAnyPermission,
      hasAllPermissions,
      canInvite,
      getInvitableRolesForUser,
    ]
  );

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

// ============================================
// HOOK
// ============================================

export function useStoreContext() {
  const context = useContext(StoreContext);
  if (!context) {
    throw new Error('useStoreContext must be used within a StoreProvider');
  }
  return context;
}

// ============================================
// CONVENIENCE HOOKS
// ============================================

/**
 * Hook to check if user has a specific permission
 */
export function useHasPermission(permission: Permission): boolean {
  const { hasPermission } = useStoreContext();
  return hasPermission(permission);
}

/**
 * Hook to get current user's role in the active store
 */
export function useCurrentRole(): StoreRole | null {
  const { currentRole } = useStoreContext();
  return currentRole;
}

/**
 * Hook to check if user is owner of current store
 */
export function useIsOwner(): boolean {
  const { isOwner } = useStoreContext();
  return isOwner;
}

/**
 * Hook to check if user can manage staff (owner or manager)
 */
export function useCanManageStaff(): boolean {
  const { isOwner, isManager } = useStoreContext();
  return isOwner || isManager;
}

export default StoreContext;
