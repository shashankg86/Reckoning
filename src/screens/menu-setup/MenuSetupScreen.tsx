/**
 * MenuSetupScreen Component
 *
 * Main menu setup wizard that guides users through category creation
 * after onboarding. Enterprise-level implementation with step management.
 */

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabaseClient';
import { CategorySetupStep } from './CategorySetupStep';
import { ItemsSetupStep } from './ItemsSetupStep';
import { ReviewStep } from './ReviewStep';
import type { MenuSetupStep } from '../../types/menu';

export function MenuSetupScreen() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { state: authState } = useAuth();
  const storeId = (authState.user as any)?.store?.id;

  const [currentStep, setCurrentStep] = useState<MenuSetupStep>('categories');

  /**
   * Complete the menu setup process
   */
  const handleComplete = async () => {
    if (!storeId) {
      toast.error('Store not found');
      return;
    }

    try {
      // Mark menu setup as completed in the database
      const { error } = await supabase
        .from('stores')
        .update({
          menu_setup_completed: true,
          menu_setup_completed_at: new Date().toISOString(),
        })
        .eq('id', storeId);

      if (error) throw error;

      toast.success(t('menuSetup.setupCompleted'));

      // Navigate to dashboard
      navigate('/dashboard', { replace: true });
    } catch (error: any) {
      console.error('Complete menu setup error:', error);
      toast.error(error.message || 'Failed to complete setup');
      throw error;
    }
  };

  /**
   * Navigate to next step
   */
  const handleNextStep = () => {
    if (currentStep === 'categories') {
      setCurrentStep('items');
    } else if (currentStep === 'items') {
      setCurrentStep('review');
    }
  };

  /**
   * Navigate to previous step
   */
  const handlePreviousStep = () => {
    if (currentStep === 'items') {
      setCurrentStep('categories');
    } else if (currentStep === 'review') {
      setCurrentStep('items');
    }
  };

  /**
   * Get progress percentage
   */
  const getProgress = () => {
    switch (currentStep) {
      case 'categories':
        return 33;
      case 'items':
        return 66;
      case 'review':
        return 100;
      default:
        return 0;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        {/* Progress Bar */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <h1 className="text-xl font-semibold text-gray-900 dark:text-white">
              {t('menuSetup.title')}
            </h1>
            <span className="text-sm font-medium text-gray-500 dark:text-gray-400">
              {getProgress()}% {t('common.complete')}
            </span>
          </div>
          <div className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-orange-500 transition-all duration-300 ease-in-out"
              style={{ width: `${getProgress()}%` }}
            />
          </div>
        </div>

        {/* Step Content */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 sm:p-8">
          {currentStep === 'categories' && (
            <CategorySetupStep onNext={handleNextStep} />
          )}

          {currentStep === 'items' && (
            <ItemsSetupStep onBack={handlePreviousStep} onComplete={handleNextStep} />
          )}

          {currentStep === 'review' && (
            <ReviewStep
              onBack={handlePreviousStep}
              onComplete={handleComplete}
            />
          )}
        </div>

        {/* Help Text */}
        <div className="mt-6 text-center">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {t('menuSetup.helpText')}
          </p>
        </div>
      </div>
    </div>
  );
}
