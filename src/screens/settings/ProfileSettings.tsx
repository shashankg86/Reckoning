import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../contexts/AuthContext';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Card } from '../../components/ui/Card';
import { storageService, STORAGE_PATHS } from '../../lib/storage';
import toast from 'react-hot-toast';
import { Store } from '../../types';
import { CameraIcon, PhotoIcon, PencilIcon } from '@heroicons/react/24/outline';
import { usePermissions } from '../../hooks/usePermissions';

export function ProfileSettings() {
    const { t } = useTranslation();
    const { state, updateStoreSettings } = useAuth();
    const { canManageSettings } = usePermissions();
    const [isSaving, setIsSaving] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Initial form state from user store
    const [formData, setFormData] = useState<Partial<Store>>({
        name: '',
        address: '',
        phone: '',
        email: '',
        city: '',
        state: '',
        country: '',
        pincode: '',
        gst_number: '',
        currency: '',
        type: 'retail',
        logo_url: '',
    });

    const isDirty =
        formData.gst_number !== (state.user?.store?.gst_number || '') ||
        formData.logo_url !== (state.user?.store?.logo_url || '');

    const handleCancel = () => {
        setIsEditing(false);
        if (state.user?.store) {
            setFormData({
                ...state.user.store,
                logo_url: state.user.store.logo_url || ''
            });
        }
    };

    useEffect(() => {
        if (state.user?.store) {
            setFormData({
                ...state.user.store,
                logo_url: state.user.store.logo_url || ''
            });
        }
    }, [state.user?.store]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (!state.user?.store?.id) {
            toast.error('Store ID not found');
            return;
        }

        try {
            setIsUploading(true);
            const { url } = await storageService.uploadImage(
                file,
                STORAGE_PATHS.STORES,
                `store_${state.user.store.id}_logo`
            );

            // Update local state only
            setFormData(prev => ({
                ...prev,
                logo_url: url
            }));

            // Mark as editing so save button becomes active if not already
            setIsEditing(true);

        } catch (error) {
            console.error('Logo upload error:', error);
            toast.error(t('settings.logoUploadFailed'));
        } finally {
            setIsUploading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!canManageSettings) return;

        try {
            setIsSaving(true);
            // Only submit editable fields to avoid sending read-only data or non-existent columns like 'membership'
            await updateStoreSettings({
                gst_number: formData.gst_number,
                logo_url: formData.logo_url
            });
            toast.success(t('settings.profileUpdated'));
            setIsEditing(false);
        } catch (error) {
            console.error('Profile update error:', error);
            toast.error(t('settings.profileUpdateFailed'));
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-lg font-medium text-gray-900 dark:text-white">
                        {t('settings.profile')}
                    </h2>
                    <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                        {t('settings.profileDescription')}
                    </p>
                </div>
                {!isEditing && canManageSettings && (
                    <Button variant="outline" onClick={() => setIsEditing(true)}>
                        <PencilIcon className="h-4 w-4 mr-2" />
                        {t('common.edit')}
                    </Button>
                )}
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
                {/* Branding Section */}
                <Card className="p-6">
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                        {t('settings.branding')}
                    </h3>
                    <div className="flex items-center space-x-6">
                        <div className="relative">
                            <div className="h-24 w-24 rounded-full overflow-hidden bg-gray-100 dark:bg-gray-700 border-2 border-gray-200 dark:border-gray-600 flex items-center justify-center">
                                {formData.logo_url ? (
                                    <img
                                        src={formData.logo_url}
                                        alt="Store Logo"
                                        className="h-full w-full object-cover"
                                    />
                                ) : (
                                    <PhotoIcon className="h-12 w-12 text-gray-400" />
                                )}
                            </div>
                            {isEditing && canManageSettings && (
                                <button
                                    type="button"
                                    onClick={() => fileInputRef.current?.click()}
                                    className="absolute bottom-0 right-0 p-1.5 rounded-full bg-orange-500 text-white hover:bg-orange-600 shadow-sm"
                                >
                                    <CameraIcon className="h-4 w-4" />
                                </button>
                            )}
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept="image/*"
                                className="hidden"
                                onChange={handleLogoUpload}
                                disabled={!isEditing || !canManageSettings || isUploading}
                            />
                        </div>
                        <div>
                            <h4 className="text-sm font-medium text-gray-900 dark:text-white">
                                {t('settings.storeLogo')}
                            </h4>
                            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                                {t('settings.logoDescription')}
                            </p>
                        </div>
                    </div>
                </Card>

                {/* Basic Info Section */}
                <Card className="p-6">
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                        {t('settings.basicInfo')}
                    </h3>
                    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                        <Input
                            label={t('settings.storeName')}
                            name="name"
                            value={formData.name}
                            onChange={handleChange}
                            disabled={true}
                            required
                        />
                        <Input
                            label={t('settings.storeType')}
                            name="type"
                            value={formData.type}
                            onChange={handleChange}
                            disabled={true}
                        />
                        <Input
                            label={t('settings.storePhone')}
                            name="phone"
                            value={formData.phone}
                            onChange={handleChange}
                            disabled={true}
                        />
                        <Input
                            label={t('settings.storeEmail')}
                            name="email"
                            value={formData.email || ''}
                            onChange={handleChange}
                            disabled={true}
                        />
                    </div>
                </Card>

                {/* Location Section */}
                <Card className="p-6">
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                        {t('settings.location')}
                    </h3>
                    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                        <div className="sm:col-span-2">
                            <Input
                                label={t('settings.storeAddress')}
                                name="address"
                                value={formData.address}
                                onChange={handleChange}
                                disabled={true}
                            />
                        </div>
                        <Input
                            label={t('settings.city')}
                            name="city"
                            value={formData.city || ''}
                            onChange={handleChange}
                            disabled={true}
                        />
                        <Input
                            label={t('settings.state')}
                            name="state"
                            value={formData.state || ''}
                            onChange={handleChange}
                            disabled={true}
                        />
                        <Input
                            label={t('settings.country')}
                            name="country"
                            value={formData.country || ''}
                            onChange={handleChange}
                            disabled={true}
                        />
                        <Input
                            label={t('settings.pincode')}
                            name="pincode"
                            value={formData.pincode || ''}
                            onChange={handleChange}
                            disabled={true}
                        />
                    </div>
                </Card>

                {/* Regional Settings */}
                <Card className="p-6">
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                        {t('settings.regional')}
                    </h3>
                    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                        <Input
                            label={t('settings.currency')}
                            name="currency"
                            value={formData.currency || ''}
                            onChange={handleChange}
                            disabled={true}
                        />
                        <Input
                            label={t('settings.gstin')}
                            name="gst_number"
                            value={formData.gst_number || ''}
                            onChange={handleChange}
                            disabled={!isEditing || !canManageSettings}
                        />
                    </div>
                </Card>

                {isEditing && canManageSettings && (
                    <div className="flex justify-end space-x-3">
                        <Button variant="ghost" onClick={handleCancel} type="button">
                            {t('common.cancel')}
                        </Button>
                        <Button
                            type="submit"
                            isLoading={isSaving}
                            disabled={isSaving || !isDirty}
                        >
                            {t('common.save')}
                        </Button>
                    </div>
                )}
            </form>
        </div>
    );
}
