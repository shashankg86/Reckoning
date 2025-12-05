/**
 * Remove Member Modal
 *
 * Confirmation modal for removing a team member from the store.
 * Includes safety checks and clear messaging.
 */

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  XMarkIcon,
  ExclamationTriangleIcon,
  UserCircleIcon,
} from '@heroicons/react/24/outline';
import { useRemoveMember } from '@/hooks/useStaffMembers';
import type { StoreMember } from '@/types/staff';

interface RemoveMemberModalProps {
  member: StoreMember;
  onClose: () => void;
  onSuccess: () => void;
}

export function RemoveMemberModal({
  member,
  onClose,
  onSuccess,
}: RemoveMemberModalProps) {
  const { t } = useTranslation();
  const removeMutation = useRemoveMember();

  const [confirmText, setConfirmText] = useState('');

  const displayName = member.user?.name || member.user?.email || t('staff.unknownUser');
  const confirmationWord = 'REMOVE';
  const isConfirmed = confirmText.toUpperCase() === confirmationWord;

  const handleRemove = async () => {
    if (!isConfirmed) return;

    try {
      await removeMutation.mutateAsync(member.id);
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
            <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
              <ExclamationTriangleIcon className="h-6 w-6" />
              <h2 className="text-lg font-semibold">
                {t('staff.removeTeamMember')}
              </h2>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              <XMarkIcon className="h-6 w-6" />
            </button>
          </div>

          {/* Content */}
          <div className="px-6 py-4 space-y-4">
            {/* Warning */}
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
              <p className="text-sm text-red-700 dark:text-red-300">
                {t('staff.removeWarning')}
              </p>
            </div>

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
                  {member.user?.email} • {t(`roles.${member.role}`)}
                </p>
              </div>
            </div>

            {/* Consequences */}
            <div className="text-sm text-gray-600 dark:text-gray-400 space-y-2">
              <p className="font-medium text-gray-900 dark:text-white">
                {t('staff.removeConsequencesTitle')}
              </p>
              <ul className="list-disc list-inside space-y-1">
                <li>{t('staff.removeConsequence1')}</li>
                <li>{t('staff.removeConsequence2')}</li>
                <li>{t('staff.removeConsequence3')}</li>
              </ul>
            </div>

            {/* Confirmation Input */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {t('staff.typeToConfirm', { word: confirmationWord })}
              </label>
              <input
                type="text"
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                placeholder={confirmationWord}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-red-500 focus:border-transparent"
              />
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
              onClick={handleRemove}
              disabled={!isConfirmed || removeMutation.isPending}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-red-400 disabled:cursor-not-allowed text-white rounded-lg transition-colors flex items-center gap-2"
            >
              {removeMutation.isPending ? (
                <>
                  <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  {t('staff.removing')}
                </>
              ) : (
                t('staff.removeFromTeam')
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default RemoveMemberModal;
