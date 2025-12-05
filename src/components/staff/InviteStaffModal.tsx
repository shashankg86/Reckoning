/**
 * Invite Staff Modal
 *
 * Modal for inviting new team members to the store.
 * Includes form validation and role selection based on inviter's permissions.
 */

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { XMarkIcon, EnvelopeIcon, UserIcon, PhoneIcon } from '@heroicons/react/24/outline';
import { useInviteStaff } from '@/hooks/useStaffMembers';
import { usePermissions } from '@/hooks/usePermissions';
import type { StoreRole, InviteStaffPayload } from '@/types/staff';

interface InviteStaffModalProps {
  storeId: string;
  storeName: string;
  onClose: () => void;
  onSuccess: () => void;
}

// Role descriptions for selection
const ROLE_INFO: Record<Exclude<StoreRole, 'owner'>, { descriptionKey: string }> = {
  manager: { descriptionKey: 'roles.managerDescription' },
  cashier: { descriptionKey: 'roles.cashierDescription' },
  waiter: { descriptionKey: 'roles.waiterDescription' },
};

export function InviteStaffModal({
  storeId,
  storeName,
  onClose,
  onSuccess,
}: InviteStaffModalProps) {
  const { t } = useTranslation();
  const { invitableRoles } = usePermissions();
  const inviteStaffMutation = useInviteStaff();

  // Form state
  const [email, setEmail] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState<StoreRole>(
    invitableRoles.length > 0 ? invitableRoles[0] : 'cashier'
  );

  // Validation
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    // Email validation
    if (!email.trim()) {
      newErrors.email = t('validation.emailRequired');
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      newErrors.email = t('validation.emailInvalid');
    }

    // Role validation
    if (!role) {
      newErrors.role = t('validation.roleRequired');
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    const payload: InviteStaffPayload = {
      email: email.trim().toLowerCase(),
      role,
      firstName: firstName.trim() || undefined,
      lastName: lastName.trim() || undefined,
      phone: phone.trim() || undefined,
    };

    try {
      await inviteStaffMutation.mutateAsync(payload);
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
              {t('staff.inviteTeamMember')}
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
              {/* Store Info */}
              <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-3 text-sm text-gray-600 dark:text-gray-400">
                {t('staff.invitingTo', { storeName })}
              </div>

              {/* Email (Required) */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t('staff.email')} *
                </label>
                <div className="relative">
                  <EnvelopeIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder={t('staff.emailPlaceholder')}
                    className={`
                      w-full pl-10 pr-4 py-2 border rounded-lg
                      bg-white dark:bg-gray-700
                      text-gray-900 dark:text-white
                      placeholder-gray-400 dark:placeholder-gray-500
                      focus:ring-2 focus:ring-orange-500 focus:border-transparent
                      ${errors.email
                        ? 'border-red-500 dark:border-red-500'
                        : 'border-gray-300 dark:border-gray-600'
                      }
                    `}
                  />
                </div>
                {errors.email && (
                  <p className="mt-1 text-sm text-red-500">{errors.email}</p>
                )}
              </div>

              {/* Role Selection (Required) */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t('staff.role')} *
                </label>
                <div className="space-y-2">
                  {invitableRoles.filter((r) => r !== 'owner').map((roleOption) => (
                    <label
                      key={roleOption}
                      className={`
                        flex items-center p-3 border rounded-lg cursor-pointer transition-colors
                        ${role === roleOption
                          ? 'border-orange-500 bg-orange-50 dark:bg-orange-900/20'
                          : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                        }
                      `}
                    >
                      <input
                        type="radio"
                        name="role"
                        value={roleOption}
                        checked={role === roleOption}
                        onChange={() => setRole(roleOption)}
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
                          ${role === roleOption
                            ? 'border-orange-500 bg-orange-500'
                            : 'border-gray-300 dark:border-gray-600'
                          }
                        `}
                      >
                        {role === roleOption && (
                          <div className="h-2 w-2 rounded-full bg-white" />
                        )}
                      </div>
                    </label>
                  ))}
                </div>
                {errors.role && (
                  <p className="mt-1 text-sm text-red-500">{errors.role}</p>
                )}
              </div>

              {/* Optional Fields */}
              <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">
                  {t('staff.optionalDetails')}
                </p>

                {/* First Name */}
                <div className="grid grid-cols-2 gap-3 mb-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      {t('staff.firstName')}
                    </label>
                    <div className="relative">
                      <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                      <input
                        type="text"
                        value={firstName}
                        onChange={(e) => setFirstName(e.target.value)}
                        placeholder={t('staff.firstNamePlaceholder')}
                        className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                      />
                    </div>
                  </div>

                  {/* Last Name */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      {t('staff.lastName')}
                    </label>
                    <input
                      type="text"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      placeholder={t('staff.lastNamePlaceholder')}
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    />
                  </div>
                </div>

                {/* Phone */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {t('staff.phone')}
                  </label>
                  <div className="relative">
                    <PhoneIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder={t('staff.phonePlaceholder')}
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    />
                  </div>
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
                disabled={inviteStaffMutation.isPending}
                className="px-4 py-2 bg-orange-500 hover:bg-orange-600 disabled:bg-orange-400 text-white rounded-lg transition-colors flex items-center gap-2"
              >
                {inviteStaffMutation.isPending ? (
                  <>
                    <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    {t('staff.sendingInvite')}
                  </>
                ) : (
                  <>
                    <EnvelopeIcon className="h-5 w-5" />
                    {t('staff.sendInvite')}
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

export default InviteStaffModal;
