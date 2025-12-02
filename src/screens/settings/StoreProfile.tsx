import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../contexts/AuthContext';
import { Button } from '../../components/ui/Button';
import { ImageUpload } from '../../components/ui/ImageUpload';
import { BuildingStorefrontIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

export function StoreProfile() {
    const { t } = useTranslation();
    const { state, updateStoreSettings } = useAuth();
    const store = state.user?.store;

    const [storeName, setStoreName] = useState(store?.name || '');
    const [logoFile, setLogoFile] = useState<File | null>(null);
    const [isSaving, setIsSaving] = useState(false);

    const hasChanges = storeName !== store?.name || logoFile !== null;

    const handleSave = async () => {
        if (!store) return;

        setIsSaving(true);
        try {
            const updates: any = {};

            // Add store name if changed
            if (storeName !== store.name) {
                updates.name = storeName;
            }

            // Handle logo upload if new file selected
            if (logoFile) {
                // Upload logo and get URL
                // For now, we'll use URL.createObjectURL for preview
                // In production, you'd upload to Supabase Storage
                const logoUrl = URL.createObjectURL(logoFile);
                updates.logo_url = logoUrl;
            }

            await updateStoreSettings(updates);
            toast.success(t('settings.changesSaved'));
        } catch (error) {
            console.error('Failed to update store settings:', error);
            toast.error(t('settings.saveFailed'));
        } finally {
            setIsSaving(false);
        }
    };

    if (!store) {
        return (
            <div className="text-center py-12">
                <p className="text-gray-500 dark:text-gray-400">
                    {t('settings.noStoreData')}
                </p>
            </div>
        );
    }

    return (
        <div className="space-y-8">
            {/* Section Header */}
            <div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                    {t('settings.storeProfile')}
                </h2>
                <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                    {t('settings.storeProfileSubtitle')}
                </p>
            </div>

            {/* Store Logo */}
            <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                    {t('settings.storeLogo')}
                </label>
                <div className="flex items-start gap-6">
                    {/* Current Logo Preview */}
                    <div className="flex-shrink-0">
                        {store.logo_url || store.logoURL ? (
                            <img
                                src={store.logo_url || store.logoURL}
                                alt={store.name}
                                className="h-24 w-24 rounded-lg object-cover border-2 border-gray-200 dark:border-gray-700"
                            />
                        ) : (
                            <div className="h-24 w-24 rounded-lg bg-orange-100 dark:bg-orange-900/20 flex items-center justify-center border-2 border-gray-200 dark:border-gray-700">
                                <BuildingStorefrontIcon className="h-12 w-12 text-orange-500" />
                            </div>
                        )}
                    </div>

                    {/* Logo Upload */}
                    <div className="flex-1">
                        <ImageUpload
                            value={logoFile}
                            onChange={setLogoFile}
                            onError={(error) => toast.error(error)}
                            placeholder={t('settings.uploadNewLogo')}
                            maxSizeMB={5}
                        />
                        <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                            {t('settings.logoHint')}
                        </p>
                    </div>
                </div>
            </div>

            {/* Store Name - Editable */}
            <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    {t('settings.storeName')} *
                </label>
                <input
                    type="text"
                    value={storeName}
                    onChange={(e) => setStoreName(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    placeholder={t('onboarding.form.enterStoreName')}
                />
            </div>

            {/* Store Type - Read Only */}
            <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    {t('settings.storeType')}
                </label>
                <div className="px-4 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-700 dark:text-gray-300 capitalize">
                    {store.type}
                </div>
            </div>

            {/* Address Section - Read Only */}
            <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                    {t('settings.addressDetails')}
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            {t('onboarding.form.address')}
                        </label>
                        <div className="px-4 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-700 dark:text-gray-300">
                            {store.address || '-'}
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            {t('onboarding.form.city')}
                        </label>
                        <div className="px-4 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-700 dark:text-gray-300">
                            {store.city || '-'}
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            {t('onboarding.form.state')}
                        </label>
                        <div className="px-4 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-700 dark:text-gray-300">
                            {store.state || '-'}
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            {t('onboarding.form.country')}
                        </label>
                        <div className="px-4 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-700 dark:text-gray-300">
                            {store.country || '-'}
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            {t('onboarding.form.pincode')}
                        </label>
                        <div className="px-4 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-700 dark:text-gray-300">
                            {store.pincode || '-'}
                        </div>
                    </div>
                </div>
            </div>

            {/* Contact Information - Read Only */}
            <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                    {t('settings.contactInfo')}
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            {t('onboarding.form.primaryPhone')}
                        </label>
                        <div className="px-4 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-700 dark:text-gray-300">
                            {store.phone || '-'}
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            {t('onboarding.form.secondaryPhone')}
                        </label>
                        <div className="px-4 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-700 dark:text-gray-300">
                            {store.secondary_phone || '-'}
                        </div>
                    </div>

                    <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            {t('onboarding.form.email')}
                        </label>
                        <div className="px-4 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-700 dark:text-gray-300">
                            {store.email || state.user?.email || '-'}
                        </div>
                    </div>
                </div>
            </div>

            {/* Tax Information - Read Only */}
            {store.gst_number && (
                <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                        {t('settings.taxInfo')}
                    </h3>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            {t('onboarding.form.gstNumber')}
                        </label>
                        <div className="px-4 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-700 dark:text-gray-300">
                            {store.gst_number}
                        </div>
                    </div>
                </div>
            )}

            {/* Save Button */}
            <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
                <div className="flex items-center justify-between">
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                        {hasChanges ? t('settings.unsavedChanges') : t('settings.allChangesSaved')}
                    </p>
                    <Button
                        onClick={handleSave}
                        disabled={!hasChanges || isSaving}
                        className="min-w-32"
                    >
                        {isSaving ? t('settings.saving') : t('settings.saveChanges')}
                    </Button>
                </div>
            </div>
        </div>
    );
}
