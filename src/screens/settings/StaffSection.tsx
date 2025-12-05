/**
 * Staff Section Component
 *
 * Displays team members and pending invitations for the current store.
 * Provides invite, edit role, and remove capabilities based on permissions.
 */

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  PlusIcon,
  EnvelopeIcon,
  UserCircleIcon,
  ClockIcon,
  EllipsisVerticalIcon,
  PencilIcon,
  TrashIcon,
  ArrowPathIcon,
  XMarkIcon,
  UsersIcon,
} from '@heroicons/react/24/outline';
import { useAuth } from '@/contexts/AuthContext';
import { useStoreContext } from '@/contexts/StoreContext';
import { usePermissions } from '@/hooks/usePermissions';
import { useStoreMembers, usePendingInvites } from '@/hooks/useStaffMembers';
import { InviteStaffModal } from '@/components/staff/InviteStaffModal';
import { EditMemberModal } from '@/components/staff/EditMemberModal';
import { RemoveMemberModal } from '@/components/staff/RemoveMemberModal';
import type { StoreMember, StoreInvite, StoreRole } from '@/types/staff';

// Role badge colors
const ROLE_COLORS: Record<StoreRole, { bg: string; text: string }> = {
  owner: { bg: 'bg-purple-100 dark:bg-purple-900/30', text: 'text-purple-700 dark:text-purple-400' },
  manager: { bg: 'bg-blue-100 dark:bg-blue-900/30', text: 'text-blue-700 dark:text-blue-400' },
  cashier: { bg: 'bg-green-100 dark:bg-green-900/30', text: 'text-green-700 dark:text-green-400' },
  waiter: { bg: 'bg-orange-100 dark:bg-orange-900/30', text: 'text-orange-700 dark:text-orange-400' },
};

function RoleBadge({ role }: { role: StoreRole }) {
  const { t } = useTranslation();
  const colors = ROLE_COLORS[role];

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${colors.bg} ${colors.text}`}>
      {t(`roles.${role}`)}
    </span>
  );
}

function MemberCard({
  member,
  isCurrentUser,
  canEdit,
  canRemove,
  onEdit,
  onRemove,
}: {
  member: StoreMember;
  isCurrentUser: boolean;
  canEdit: boolean;
  canRemove: boolean;
  onEdit: () => void;
  onRemove: () => void;
}) {
  const { t } = useTranslation();
  const [showMenu, setShowMenu] = useState(false);

  const displayName = member.user?.name || member.user?.email || t('staff.unknownUser');
  const isOwner = member.role === 'owner';

  return (
    <div className="flex items-center justify-between p-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg hover:shadow-sm transition-shadow">
      <div className="flex items-center gap-3">
        {/* Avatar */}
        {member.user?.avatar_url ? (
          <img
            src={member.user.avatar_url}
            alt={displayName}
            className="h-10 w-10 rounded-full object-cover"
          />
        ) : (
          <div className="h-10 w-10 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
            <UserCircleIcon className="h-6 w-6 text-gray-500 dark:text-gray-400" />
          </div>
        )}

        {/* Info */}
        <div>
          <div className="flex items-center gap-2">
            <span className="font-medium text-gray-900 dark:text-white">
              {displayName}
            </span>
            {isCurrentUser && (
              <span className="text-xs text-gray-500 dark:text-gray-400">
                ({t('staff.you')})
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-sm text-gray-500 dark:text-gray-400">
              {member.user?.email}
            </span>
            <RoleBadge role={member.role} />
          </div>
        </div>
      </div>

      {/* Actions - Don't show for owners or current user */}
      {!isOwner && !isCurrentUser && (canEdit || canRemove) && (
        <div className="relative">
          <button
            onClick={() => setShowMenu(!showMenu)}
            className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            <EllipsisVerticalIcon className="h-5 w-5" />
          </button>

          {showMenu && (
            <>
              <div
                className="fixed inset-0 z-10"
                onClick={() => setShowMenu(false)}
              />
              <div className="absolute right-0 top-full mt-1 w-48 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-20 py-1">
                {canEdit && (
                  <button
                    onClick={() => {
                      setShowMenu(false);
                      onEdit();
                    }}
                    className="w-full flex items-center gap-2 px-4 py-2 text-left text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                  >
                    <PencilIcon className="h-4 w-4" />
                    {t('staff.changeRole')}
                  </button>
                )}
                {canRemove && (
                  <button
                    onClick={() => {
                      setShowMenu(false);
                      onRemove();
                    }}
                    className="w-full flex items-center gap-2 px-4 py-2 text-left text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20"
                  >
                    <TrashIcon className="h-4 w-4" />
                    {t('staff.remove')}
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

function InviteCard({
  invite,
  canCancel,
  canResend,
  onCancel,
  onResend,
  isResending,
}: {
  invite: StoreInvite;
  canCancel: boolean;
  canResend: boolean;
  onCancel: () => void;
  onResend: () => void;
  isResending: boolean;
}) {
  const { t } = useTranslation();
  const [showMenu, setShowMenu] = useState(false);

  const displayName = invite.first_name
    ? `${invite.first_name} ${invite.last_name || ''}`
    : invite.email;

  const expiresAt = new Date(invite.expires_at);
  const now = new Date();
  const daysLeft = Math.ceil((expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

  return (
    <div className="flex items-center justify-between p-4 bg-yellow-50 dark:bg-yellow-900/10 border border-yellow-200 dark:border-yellow-800/30 rounded-lg">
      <div className="flex items-center gap-3">
        {/* Envelope icon for pending */}
        <div className="h-10 w-10 rounded-full bg-yellow-100 dark:bg-yellow-900/30 flex items-center justify-center">
          <EnvelopeIcon className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
        </div>

        {/* Info */}
        <div>
          <div className="flex items-center gap-2">
            <span className="font-medium text-gray-900 dark:text-white">
              {displayName}
            </span>
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400">
              {t('staff.pending')}
            </span>
          </div>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-sm text-gray-500 dark:text-gray-400">
              {invite.email}
            </span>
            <RoleBadge role={invite.role} />
            <span className="flex items-center text-xs text-gray-400 dark:text-gray-500">
              <ClockIcon className="h-3 w-3 mr-1" />
              {daysLeft > 0 ? t('staff.expiresInDays', { days: daysLeft }) : t('staff.expiringToday')}
            </span>
          </div>
        </div>
      </div>

      {/* Actions */}
      {(canCancel || canResend) && (
        <div className="relative">
          <button
            onClick={() => setShowMenu(!showMenu)}
            className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 rounded-lg hover:bg-yellow-100 dark:hover:bg-yellow-900/30"
          >
            <EllipsisVerticalIcon className="h-5 w-5" />
          </button>

          {showMenu && (
            <>
              <div
                className="fixed inset-0 z-10"
                onClick={() => setShowMenu(false)}
              />
              <div className="absolute right-0 top-full mt-1 w-48 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-20 py-1">
                {canResend && (
                  <button
                    onClick={() => {
                      setShowMenu(false);
                      onResend();
                    }}
                    disabled={isResending}
                    className="w-full flex items-center gap-2 px-4 py-2 text-left text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50"
                  >
                    <ArrowPathIcon className={`h-4 w-4 ${isResending ? 'animate-spin' : ''}`} />
                    {isResending ? t('staff.resending') : t('staff.resendInvite')}
                  </button>
                )}
                {canCancel && (
                  <button
                    onClick={() => {
                      setShowMenu(false);
                      onCancel();
                    }}
                    className="w-full flex items-center gap-2 px-4 py-2 text-left text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20"
                  >
                    <XMarkIcon className="h-4 w-4" />
                    {t('staff.cancelInvite')}
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

export function StaffSection() {
  const { t } = useTranslation();
  const { currentStore } = useStoreContext();
  const { canInviteStaff, canChangeRoles, canRemoveStaff } = usePermissions();

  // Modals state
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [editingMember, setEditingMember] = useState<StoreMember | null>(null);
  const [removingMember, setRemovingMember] = useState<StoreMember | null>(null);

  // Data fetching
  const {
    data: members = [],
    isLoading: isLoadingMembers,
    refetch: refetchMembers,
  } = useStoreMembers(currentStore?.id);

  const {
    data: pendingInvites = [],
    isLoading: isLoadingInvites,
    refetch: refetchInvites,
  } = usePendingInvites(currentStore?.id);

  // Resend tracking
  const [resendingId, setResendingId] = useState<string | null>(null);

  // Get current user ID (for highlighting)
  const { state: authState } = useAuth();
  const currentUserId = authState.user?.uid;

  const handleResendInvite = async (inviteId: string) => {
    if (!currentStore) return;

    setResendingId(inviteId);
    try {
      const { invitationsAPI } = await import('@/api/invitations');
      await invitationsAPI.resendInvite(inviteId, currentStore.name);
      refetchInvites();
    } catch (error) {
      console.error('Failed to resend invite:', error);
    } finally {
      setResendingId(null);
    }
  };

  const handleCancelInvite = async (inviteId: string) => {
    try {
      const { invitationsAPI } = await import('@/api/invitations');
      await invitationsAPI.cancelInvite(inviteId);
      refetchInvites();
    } catch (error) {
      console.error('Failed to cancel invite:', error);
    }
  };

  const handleInviteSuccess = () => {
    setShowInviteModal(false);
    refetchInvites();
  };

  const handleEditSuccess = () => {
    setEditingMember(null);
    refetchMembers();
  };

  const handleRemoveSuccess = () => {
    setRemovingMember(null);
    refetchMembers();
  };

  if (!currentStore) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500 dark:text-gray-400">
          {t('staff.noStoreSelected')}
        </p>
      </div>
    );
  }

  const isLoading = isLoadingMembers || isLoadingInvites;

  // Separate owner from other members for display
  const owner = members.find((m) => m.role === 'owner');
  const staffMembers = members.filter((m) => m.role !== 'owner');

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            {t('settings.staff')}
          </h2>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
            {t('staff.sectionSubtitle')}
          </p>
        </div>

        {canInviteStaff && (
          <button
            onClick={() => setShowInviteModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg transition-colors"
          >
            <PlusIcon className="h-5 w-5" />
            {t('staff.inviteStaff')}
          </button>
        )}
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500" />
        </div>
      )}

      {/* Content */}
      {!isLoading && (
        <div className="space-y-6">
          {/* Owner Section */}
          {owner && (
            <div>
              <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-3">
                {t('staff.owner')}
              </h3>
              <MemberCard
                member={owner}
                isCurrentUser={owner.user_id === currentUserId}
                canEdit={false}
                canRemove={false}
                onEdit={() => {}}
                onRemove={() => {}}
              />
            </div>
          )}

          {/* Staff Members */}
          {staffMembers.length > 0 && (
            <div>
              <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-3">
                {t('staff.teamMembers')} ({staffMembers.length})
              </h3>
              <div className="space-y-3">
                {staffMembers.map((member) => (
                  <MemberCard
                    key={member.id}
                    member={member}
                    isCurrentUser={member.user_id === currentUserId}
                    canEdit={canChangeRoles}
                    canRemove={canRemoveStaff}
                    onEdit={() => setEditingMember(member)}
                    onRemove={() => setRemovingMember(member)}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Pending Invitations */}
          {pendingInvites.length > 0 && (
            <div>
              <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-3">
                {t('staff.pendingInvitations')} ({pendingInvites.length})
              </h3>
              <div className="space-y-3">
                {pendingInvites.map((invite) => (
                  <InviteCard
                    key={invite.id}
                    invite={invite}
                    canCancel={canInviteStaff}
                    canResend={canInviteStaff}
                    onCancel={() => handleCancelInvite(invite.id)}
                    onResend={() => handleResendInvite(invite.id)}
                    isResending={resendingId === invite.id}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Empty State */}
          {staffMembers.length === 0 && pendingInvites.length === 0 && (
            <div className="text-center py-12 border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-lg">
              <UsersIcon className="h-12 w-12 mx-auto text-gray-400 dark:text-gray-500 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                {t('staff.noTeamMembers')}
              </h3>
              <p className="text-gray-500 dark:text-gray-400 mb-4">
                {t('staff.noTeamMembersDescription')}
              </p>
              {canInviteStaff && (
                <button
                  onClick={() => setShowInviteModal(true)}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg transition-colors"
                >
                  <PlusIcon className="h-5 w-5" />
                  {t('staff.inviteYourFirstTeamMember')}
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* Modals */}
      {showInviteModal && (
        <InviteStaffModal
          storeId={currentStore.id}
          storeName={currentStore.name}
          onClose={() => setShowInviteModal(false)}
          onSuccess={handleInviteSuccess}
        />
      )}

      {editingMember && (
        <EditMemberModal
          member={editingMember}
          onClose={() => setEditingMember(null)}
          onSuccess={handleEditSuccess}
        />
      )}

      {removingMember && (
        <RemoveMemberModal
          member={removingMember}
          onClose={() => setRemovingMember(null)}
          onSuccess={handleRemoveSuccess}
        />
      )}
    </div>
  );
}

export default StaffSection;
