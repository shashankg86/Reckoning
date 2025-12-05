/**
 * useStaffMembers Hook
 *
 * React Query hook for fetching and managing staff members.
 * Provides data fetching, caching, and mutations for team management.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { staffAPI } from '@/api/staff';
import { invitationsAPI } from '@/api/invitations';
import { useStoreContext } from '@/contexts/StoreContext';
import type { StoreMember, StoreInvite, StoreRole, InviteStaffPayload } from '@/types/staff';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';

// Query keys
export const staffKeys = {
  all: ['staff'] as const,
  members: (storeId: string) => [...staffKeys.all, 'members', storeId] as const,
  invites: (storeId: string) => [...staffKeys.all, 'invites', storeId] as const,
  memberDetail: (memberId: string) => [...staffKeys.all, 'member', memberId] as const,
};

/**
 * Hook to fetch all team members for the current store
 * @param overrideStoreId - Optional store ID to override the current store
 */
export function useStoreMembers(overrideStoreId?: string) {
  const { currentStore } = useStoreContext();
  const storeId = overrideStoreId ?? currentStore?.id;

  return useQuery({
    queryKey: staffKeys.members(storeId ?? ''),
    queryFn: () => staffAPI.getStoreMembers(storeId!),
    enabled: !!storeId,
    staleTime: 30 * 1000, // 30 seconds
    gcTime: 5 * 60 * 1000, // 5 minutes (formerly cacheTime)
  });
}

// Alias for backwards compatibility
export const useStaffMembers = useStoreMembers;

/**
 * Hook to fetch pending invitations for the current store
 * @param overrideStoreId - Optional store ID to override the current store
 */
export function usePendingInvites(overrideStoreId?: string) {
  const { currentStore } = useStoreContext();
  const storeId = overrideStoreId ?? currentStore?.id;

  return useQuery({
    queryKey: staffKeys.invites(storeId ?? ''),
    queryFn: () => invitationsAPI.getPendingInvites(storeId!),
    enabled: !!storeId,
    staleTime: 30 * 1000,
    gcTime: 5 * 60 * 1000,
  });
}

/**
 * Hook to invite a new staff member
 */
export function useInviteStaff() {
  const queryClient = useQueryClient();
  const { currentStore } = useStoreContext();
  const { t } = useTranslation();

  return useMutation({
    mutationFn: async (payload: InviteStaffPayload) => {
      if (!currentStore) throw new Error('No store selected');
      return invitationsAPI.inviteStaff(currentStore.id, currentStore.name, payload);
    },
    onSuccess: () => {
      // Invalidate invites list
      if (currentStore) {
        queryClient.invalidateQueries({ queryKey: staffKeys.invites(currentStore.id) });
      }
      toast.success(t('staff.invite.success', 'Invitation sent successfully'));
    },
    onError: (error: Error) => {
      toast.error(error.message || t('staff.invite.error', 'Failed to send invitation'));
    },
  });
}

/**
 * Hook to update a member's role
 */
export function useUpdateMemberRole() {
  const queryClient = useQueryClient();
  const { currentStore } = useStoreContext();
  const { t } = useTranslation();

  return useMutation({
    mutationFn: async ({ memberId, newRole }: { memberId: string; newRole: StoreRole }) => {
      return staffAPI.updateMemberRole(memberId, newRole);
    },
    onSuccess: () => {
      if (currentStore) {
        queryClient.invalidateQueries({ queryKey: staffKeys.members(currentStore.id) });
      }
      toast.success(t('staff.roleUpdated', 'Role updated successfully'));
    },
    onError: (error: Error) => {
      toast.error(error.message || t('staff.roleUpdateError', 'Failed to update role'));
    },
  });
}

/**
 * Hook to deactivate a member
 */
export function useDeactivateMember() {
  const queryClient = useQueryClient();
  const { currentStore } = useStoreContext();
  const { t } = useTranslation();

  return useMutation({
    mutationFn: async (memberId: string) => {
      return staffAPI.deactivateMember(memberId);
    },
    onSuccess: () => {
      if (currentStore) {
        queryClient.invalidateQueries({ queryKey: staffKeys.members(currentStore.id) });
      }
      toast.success(t('staff.memberDeactivated', 'Team member deactivated'));
    },
    onError: (error: Error) => {
      toast.error(error.message || t('staff.deactivateError', 'Failed to deactivate member'));
    },
  });
}

/**
 * Hook to remove a member permanently
 */
export function useRemoveMember() {
  const queryClient = useQueryClient();
  const { currentStore } = useStoreContext();
  const { t } = useTranslation();

  return useMutation({
    mutationFn: async (memberId: string) => {
      return staffAPI.removeMember(memberId);
    },
    onSuccess: () => {
      if (currentStore) {
        queryClient.invalidateQueries({ queryKey: staffKeys.members(currentStore.id) });
      }
      toast.success(t('staff.memberRemoved', 'Team member removed'));
    },
    onError: (error: Error) => {
      toast.error(error.message || t('staff.removeError', 'Failed to remove member'));
    },
  });
}

/**
 * Hook to cancel an invitation
 */
export function useCancelInvite() {
  const queryClient = useQueryClient();
  const { currentStore } = useStoreContext();
  const { t } = useTranslation();

  return useMutation({
    mutationFn: async (inviteId: string) => {
      return invitationsAPI.cancelInvite(inviteId);
    },
    onSuccess: () => {
      if (currentStore) {
        queryClient.invalidateQueries({ queryKey: staffKeys.invites(currentStore.id) });
      }
      toast.success(t('staff.inviteCancelled', 'Invitation cancelled'));
    },
    onError: (error: Error) => {
      toast.error(error.message || t('staff.cancelError', 'Failed to cancel invitation'));
    },
  });
}

/**
 * Hook to resend an invitation
 */
export function useResendInvite() {
  const queryClient = useQueryClient();
  const { currentStore } = useStoreContext();
  const { t } = useTranslation();

  return useMutation({
    mutationFn: async (inviteId: string) => {
      if (!currentStore) throw new Error('No store selected');
      return invitationsAPI.resendInvite(inviteId, currentStore.name);
    },
    onSuccess: () => {
      if (currentStore) {
        queryClient.invalidateQueries({ queryKey: staffKeys.invites(currentStore.id) });
      }
      toast.success(t('staff.inviteResent', 'Invitation resent'));
    },
    onError: (error: Error) => {
      toast.error(error.message || t('staff.resendError', 'Failed to resend invitation'));
    },
  });
}

/**
 * Combined hook for staff management with all operations
 */
export function useStaffManagement() {
  const membersQuery = useStaffMembers();
  const invitesQuery = usePendingInvites();
  const inviteStaff = useInviteStaff();
  const updateRole = useUpdateMemberRole();
  const deactivate = useDeactivateMember();
  const remove = useRemoveMember();
  const cancelInvite = useCancelInvite();
  const resendInvite = useResendInvite();

  return {
    // Data
    members: membersQuery.data ?? [],
    pendingInvites: invitesQuery.data ?? [],

    // Loading states
    isLoadingMembers: membersQuery.isLoading,
    isLoadingInvites: invitesQuery.isLoading,
    isLoading: membersQuery.isLoading || invitesQuery.isLoading,

    // Error states
    membersError: membersQuery.error,
    invitesError: invitesQuery.error,

    // Refetch
    refetchMembers: membersQuery.refetch,
    refetchInvites: invitesQuery.refetch,
    refetchAll: () => {
      membersQuery.refetch();
      invitesQuery.refetch();
    },

    // Mutations
    inviteStaff: inviteStaff.mutateAsync,
    isInviting: inviteStaff.isPending,

    updateRole: updateRole.mutateAsync,
    isUpdatingRole: updateRole.isPending,

    deactivateMember: deactivate.mutateAsync,
    isDeactivating: deactivate.isPending,

    removeMember: remove.mutateAsync,
    isRemoving: remove.isPending,

    cancelInvite: cancelInvite.mutateAsync,
    isCancellingInvite: cancelInvite.isPending,

    resendInvite: resendInvite.mutateAsync,
    isResendingInvite: resendInvite.isPending,
  };
}

export default useStaffMembers;
