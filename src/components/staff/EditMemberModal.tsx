/**
 * Edit Member Modal
 *
 * Modal for changing a team member's role.
 * Only shows roles that the current user can assign.
 */

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { XMarkIcon, UserCircleIcon } from '@heroicons/react/24/outline';
import { useUpdateMemberRole } from '@/hooks/useStaffMembers';
import { usePermissions } from '@/hooks/usePermissions';
import type { StoreMember, StoreRole } from '@/types/staff';

interface EditMemberModalProps {
  member: StoreMember;
  onClose: () => void;
  onSuccess: () => void;
}

// Role descriptions for selection
const ROLE_INFO: Record<Exclude<StoreRole, 'owner'>, { descriptionKey: string }> = {
  manager: { descriptionKey: 'roles.managerDescription' },
  cashier: { descriptionKey: 'roles.cashierDescription' },
  waiter: { descriptionKey: 'roles.waiterDescription' },
};

export function EditMemberModal({
  member,
  onClose,
  onSuccess,
}: EditMemberModalProps) {
  const { t } = useTranslation();
  const { invitableRoles } = usePermissions();
  const updateRoleMutation = useUpdateMemberRole();

  // Filter out owner role and get assignable roles
  const assignableRoles = invitableRoles.filter((r) => r !== 'owner');

  // Form state
  const [selectedRole, setSelectedRole] = useState<StoreRole>(member.role);

  const displayName = member.user?.name || member.user?.email || t('staff.unknownUser');
  const hasChanged = selectedRole !== member.role;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!hasChanged) {
      onClose();
      return;
    }

    try {
      await updateRoleMutation.mutateAsync({
        memberId: member.id,
        newRole: selectedRole,
      });
      onSuccess();
    } catch {
      // Error is handled by the mutation hook
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 transition-opacity"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative w-full max-w-md transform overflow-hidden rounded-lg bg-white dark:bg-gray-800 shadow-xl transition-all">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-gray-200 dark:border-gray-700 px-6 py-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              {t('staff.changeRole')}
            </h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              <XMarkIcon className="h-6 w-6" />
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit}>
            <div className="px-6 py-4 space-y-4">
              {/* Member Info */}
              <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-900/50 rounded-lg">
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
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">
                    {displayName}
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {member.user?.email}
                  </p>
                </div>
              </div>

              {/* Current Role Info */}
              <div className="text-sm text-gray-600 dark:text-gray-400">
                {t('staff.currentRole')}:{' '}
                <span className="font-medium text-gray-900 dark:text-white">
                  {t(`roles.${member.role}`)}
                </span>
              </div>

              {/* Role Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {t('staff.newRole')}
                </label>
                <div className="space-y-2">
                  {assignableRoles.map((roleOption) => (
                    <label
                      key={roleOption}
                      className={`
                        flex items-center p-3 border rounded-lg cursor-pointer transition-colors
                        ${selectedRole === roleOption
                          ? 'border-orange-500 bg-orange-50 dark:bg-orange-900/20'
                          : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                        }
                      `}
                    >
                      <input
                        type="radio"
                        name="role"
                        value={roleOption}
                        checked={selectedRole === roleOption}
                        onChange={() => setSelectedRole(roleOption)}
                        className="sr-only"
                      />
                      <div className="flex-1">
                        <span className="font-medium text-gray-900 dark:text-white">
                          {t(`roles.${roleOption}`)}
                        </span>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          {t(ROLE_INFO[roleOption as keyof typeof ROLE_INFO]?.descriptionKey || '')}
                        </p>
                      </div>
                      <div
                        className={`
                          h-5 w-5 rounded-full border-2 flex items-center justify-center
                          ${selectedRole === roleOption
                            ? 'border-orange-500 bg-orange-500'
                            : 'border-gray-300 dark:border-gray-600'
                          }
                        `}
                      >
                        {selectedRole === roleOption && (
                          <div className="h-2 w-2 rounded-full bg-white" />
                        )}
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-3 border-t border-gray-200 dark:border-gray-700 px-6 py-4">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                {t('common.cancel')}
              </button>
              <button
                type="submit"
                disabled={!hasChanged || updateRoleMutation.isPending}
                className="px-4 py-2 bg-orange-500 hover:bg-orange-600 disabled:bg-orange-400 disabled:cursor-not-allowed text-white rounded-lg transition-colors flex items-center gap-2"
              >
                {updateRoleMutation.isPending ? (
                  <>
                    <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    {t('common.saving')}
                  </>
                ) : (
                  t('staff.updateRole')
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

export default EditMemberModal;
