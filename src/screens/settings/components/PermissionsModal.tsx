import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { Button } from '../../../components/ui/Button';
import { PERMISSIONS } from '../../../hooks/usePermissions';
import { StaffMember } from '../api/staff';

interface PermissionsModalProps {
    isOpen: boolean;
    onClose: () => void;
    member: StaffMember | null;
    onSave: (memberId: string, permissions: Record<string, boolean>) => Promise<void>;
}

export function PermissionsModal({ isOpen, onClose, member, onSave }: PermissionsModalProps) {
    const { t } = useTranslation();
    const [permissions, setPermissions] = useState<Record<string, boolean>>({});
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        if (member) {
            setPermissions(member.permissions || {});
        }
    }, [member]);

    const handleToggle = (key: string) => {
        setPermissions(prev => ({
            ...prev,
            [key]: !prev[key]
        }));
    };

    const handleSave = async () => {
        if (!member) return;
        try {
            setIsSaving(true);
            await onSave(member.id, permissions);
            onClose();
        } catch (error) {
            console.error('Failed to save permissions:', error);
        } finally {
            setIsSaving(false);
        }
    };

    if (!isOpen || !member) return null;

    const adminPermissions = [
        { key: PERMISSIONS.MANAGE_SETTINGS, label: 'Manage Store Settings' },
        { key: PERMISSIONS.MANAGE_STAFF, label: 'Manage Staff' },
        { key: PERMISSIONS.VIEW_REPORTS, label: 'View Reports' },
    ];

    const operationalPermissions = [
        { key: PERMISSIONS.MANAGE_MENU, label: 'Manage Menu (Add/Edit Items)' },
        { key: PERMISSIONS.MANAGE_TABLES, label: 'Manage Tables' },
        { key: PERMISSIONS.VOID_ORDER, label: 'Void Orders' },
        { key: PERMISSIONS.APPLY_DISCOUNT, label: 'Apply Discounts' },
        { key: PERMISSIONS.REFUND_ORDER, label: 'Process Refunds' },
    ];

    return (
        <div className="fixed inset-0 z-50 overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
            <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
                {/* Background overlay */}
                <div
                    className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"
                    aria-hidden="true"
                    onClick={onClose}
                ></div>

                {/* Modal panel */}
                <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
                <div className="inline-block align-bottom bg-white dark:bg-gray-800 rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-md sm:w-full">
                    <div className="bg-white dark:bg-gray-800 px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-white" id="modal-title">
                                Permissions: {member.profile.name}
                            </h3>
                            <button onClick={onClose} className="text-gray-400 hover:text-gray-500">
                                <XMarkIcon className="h-6 w-6" />
                            </button>
                        </div>

                        <div className="space-y-6">
                            <div>
                                <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">
                                    Administrative
                                </h4>
                                <div className="space-y-3">
                                    {adminPermissions.map(({ key, label }) => (
                                        <label key={key} className="flex items-center space-x-3 cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={!!permissions[key]}
                                                onChange={() => handleToggle(key)}
                                                className="h-4 w-4 rounded border-gray-300 text-orange-600 focus:ring-orange-500"
                                            />
                                            <span className="text-sm text-gray-700 dark:text-gray-300">{label}</span>
                                        </label>
                                    ))}
                                </div>
                            </div>

                            <div>
                                <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">
                                    Operational
                                </h4>
                                <div className="space-y-3">
                                    {operationalPermissions.map(({ key, label }) => (
                                        <label key={key} className="flex items-center space-x-3 cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={!!permissions[key]}
                                                onChange={() => handleToggle(key)}
                                                className="h-4 w-4 rounded border-gray-300 text-orange-600 focus:ring-orange-500"
                                            />
                                            <span className="text-sm text-gray-700 dark:text-gray-300">{label}</span>
                                        </label>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="bg-gray-50 dark:bg-gray-700 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                        <Button onClick={handleSave} isLoading={isSaving} className="w-full sm:w-auto sm:ml-3">
                            Save Permissions
                        </Button>
                        <Button variant="outline" onClick={onClose} className="mt-3 w-full sm:mt-0 sm:w-auto">
                            Cancel
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
}
