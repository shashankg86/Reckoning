import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../contexts/AuthContext';
import { usePermissions } from '../../hooks/usePermissions';
import { staffAPI, StaffMember } from './api/staff';
import { PermissionsModal } from './components/PermissionsModal';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { PlusIcon, TrashIcon, ShieldCheckIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

export function StaffSettings() {
    const { t } = useTranslation();
    const { state } = useAuth();
    const { canManageStaff, isAdmin } = usePermissions();

    const [staff, setStaff] = useState<StaffMember[]>([]);
    const [loading, setLoading] = useState(true);
    const [showAddModal, setShowAddModal] = useState(false);
    const [selectedMember, setSelectedMember] = useState<StaffMember | null>(null);

    // Add Staff Form State
    const [inviteEmail, setInviteEmail] = useState('');
    const [inviteRole, setInviteRole] = useState<'manager' | 'cashier'>('cashier');
    const [isInviting, setIsInviting] = useState(false);

    const fetchStaff = async () => {
        if (!state.user?.store?.id) return;
        try {
            setLoading(true);
            const data = await staffAPI.getStaff(state.user.store.id);
            setStaff(data);
        } catch (error) {
            console.error('Error fetching staff:', error);
            toast.error('Failed to load staff list');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchStaff();
    }, [state.user?.store?.id]);

    const handleInvite = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!state.user?.store?.id) return;

        try {
            setIsInviting(true);
            await staffAPI.inviteStaff(inviteEmail, inviteRole, state.user.store.id);
            toast.success('Staff member added successfully');
            setShowAddModal(false);
            setInviteEmail('');
            fetchStaff();
        } catch (error: any) {
            console.error('Invite error:', error);
            toast.error(error.message || 'Failed to add staff member');
        } finally {
            setIsInviting(false);
        }
    };

    const handleRoleChange = async (memberId: string, newRole: 'admin' | 'manager' | 'cashier') => {
        try {
            await staffAPI.updateRole(memberId, newRole);
            toast.success('Role updated successfully');
            fetchStaff();
        } catch (error) {
            toast.error('Failed to update role');
        }
    };

    const handleRemove = async (memberId: string) => {
        if (!window.confirm('Are you sure you want to remove this staff member?')) return;
        try {
            await staffAPI.removeStaff(memberId);
            toast.success('Staff member removed');
            fetchStaff();
        } catch (error) {
            toast.error('Failed to remove staff member');
        }
    };

    const handleSavePermissions = async (memberId: string, permissions: Record<string, boolean>) => {
        try {
            await staffAPI.updatePermissions(memberId, permissions);
            toast.success('Permissions updated');
            fetchStaff();
        } catch (error) {
            toast.error('Failed to update permissions');
            throw error;
        }
    };

    if (!canManageStaff && !isAdmin) {
        return (
            <div className="text-center py-12">
                <p className="text-gray-500">You do not have permission to view this page.</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-lg font-medium text-gray-900 dark:text-white">
                        {t('settings.staff')}
                    </h2>
                    <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                        Manage your team members and their permissions
                    </p>
                </div>
                <Button onClick={() => setShowAddModal(true)}>
                    <PlusIcon className="h-5 w-5 mr-2" />
                    {t('settings.addStaff')}
                </Button>
            </div>

            <div className="bg-white dark:bg-gray-800 shadow overflow-hidden sm:rounded-md">
                <ul className="divide-y divide-gray-200 dark:divide-gray-700">
                    {staff.map((member) => (
                        <li key={member.id} className="px-6 py-4">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center">
                                    <div className="flex-shrink-0 h-10 w-10">
                                        {member.profile.photo_url ? (
                                            <img className="h-10 w-10 rounded-full" src={member.profile.photo_url} alt="" />
                                        ) : (
                                            <span className="inline-flex items-center justify-center h-10 w-10 rounded-full bg-gray-500">
                                                <span className="text-sm font-medium leading-none text-white">
                                                    {member.profile.name.charAt(0)}
                                                </span>
                                            </span>
                                        )}
                                    </div>
                                    <div className="ml-4">
                                        <div className="text-sm font-medium text-gray-900 dark:text-white">
                                            {member.profile.name}
                                        </div>
                                        <div className="text-sm text-gray-500 dark:text-gray-400">
                                            {member.profile.email}
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-center space-x-4">
                                    <select
                                        value={member.role}
                                        onChange={(e) => handleRoleChange(member.id, e.target.value as any)}
                                        disabled={member.role === 'admin' && member.user_id === state.user?.uid} // Can't change own role if admin
                                        className="block w-32 pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-orange-500 focus:border-orange-500 sm:text-sm rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                                    >
                                        <option value="admin">Admin</option>
                                        <option value="manager">Manager</option>
                                        <option value="cashier">Cashier</option>
                                    </select>

                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => setSelectedMember(member)}
                                        title="Manage Permissions"
                                    >
                                        <ShieldCheckIcon className="h-5 w-5 text-gray-400 hover:text-orange-500" />
                                    </Button>

                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => handleRemove(member.id)}
                                        disabled={member.role === 'admin' && member.user_id === state.user?.uid}
                                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                    >
                                        <TrashIcon className="h-5 w-5" />
                                    </Button>
                                </div>
                            </div>
                        </li>
                    ))}
                    {staff.length === 0 && !loading && (
                        <li className="px-6 py-12 text-center text-gray-500">
                            No staff members found. Invite someone to get started.
                        </li>
                    )}
                </ul>
            </div>

            {/* Add Staff Modal */}
            {showAddModal && (
                <div className="fixed inset-0 z-50 overflow-y-auto">
                    <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
                        <div className="fixed inset-0 transition-opacity" aria-hidden="true">
                            <div className="absolute inset-0 bg-gray-500 opacity-75"></div>
                        </div>
                        <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
                        <div className="inline-block align-bottom bg-white dark:bg-gray-800 rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
                            <form onSubmit={handleInvite} className="p-6">
                                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                                    Add Staff Member
                                </h3>
                                <div className="space-y-4">
                                    <Input
                                        label="Email Address"
                                        type="email"
                                        value={inviteEmail}
                                        onChange={(e) => setInviteEmail(e.target.value)}
                                        required
                                        placeholder="Enter email address"
                                    />
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                            Role
                                        </label>
                                        <select
                                            value={inviteRole}
                                            onChange={(e) => setInviteRole(e.target.value as any)}
                                            className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-orange-500 focus:border-orange-500 sm:text-sm rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                                        >
                                            <option value="manager">Manager</option>
                                            <option value="cashier">Cashier</option>
                                        </select>
                                        <p className="mt-1 text-xs text-gray-500">
                                            {inviteRole === 'manager'
                                                ? 'Managers can manage tables, menu, and view reports.'
                                                : 'Cashiers can process sales and view basic order history.'}
                                        </p>
                                    </div>
                                </div>
                                <div className="mt-6 flex justify-end space-x-3">
                                    <Button variant="outline" onClick={() => setShowAddModal(false)} type="button">
                                        Cancel
                                    </Button>
                                    <Button type="submit" isLoading={isInviting}>
                                        Add Member
                                    </Button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}

            <PermissionsModal
                isOpen={!!selectedMember}
                onClose={() => setSelectedMember(null)}
                member={selectedMember}
                onSave={handleSavePermissions}
            />
        </div>
    );
}
