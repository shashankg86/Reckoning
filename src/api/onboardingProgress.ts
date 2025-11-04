import { supabase } from '../lib/supabaseClient';

export type OnboardingData = {
  name?: string;
  type?: 'restaurant' | 'cafe' | 'retail' | 'salon' | 'pharmacy' | 'other';
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  pincode?: string;
  phone?: string;
  secondary_phone?: string;
  email?: string;
  gst_number?: string;
  customCity?: string;
  language?: 'en' | 'hi' | 'ar' | 'mr';
  currency?: 'INR' | 'USD' | 'EUR' | 'AED' | 'GBP';
  theme?: 'light' | 'dark';
  logoUrl?: string;
};

export type OnboardingProgress = {
  user_id: string;
  current_step: 'basics' | 'contacts' | 'review';
  data: OnboardingData;
  updated_at: string;
};

export const onboardingAPI = {
  /**
   * Get onboarding progress for a user
   */
  async get(userId: string): Promise<OnboardingProgress | null> {
    try {
      const { data, error } = await supabase
        .from('onboarding_progress')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching onboarding progress:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Error in onboardingAPI.get:', error);
      return null;
    }
  },

  /**
   * Save or update onboarding progress
   */
  async save(userId: string, step: OnboardingProgress['current_step'], payload: OnboardingData) {
    try {
      const { data, error } = await supabase
        .from('onboarding_progress')
        .upsert(
          {
            user_id: userId,
            current_step: step,
            data: payload,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'user_id' }
        )
        .select()
        .single();

      if (error) {
        console.error('Error saving onboarding progress:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Error in onboardingAPI.save:', error);
      return null;
    }
  },

  /**
   * Clear onboarding progress after completion
   */
  async clear(userId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('onboarding_progress')
        .delete()
        .eq('user_id', userId);

      if (error) {
        console.error('Error clearing onboarding progress:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error in onboardingAPI.clear:', error);
      return false;
    }
  },

  /**
   * Check if user has any saved onboarding progress
   */
  async hasProgress(userId: string): Promise<boolean> {
    try {
      const progress = await this.get(userId);
      return progress !== null && Object.keys(progress.data || {}).length > 0;
    } catch (error) {
      console.error('Error checking onboarding progress:', error);
      return false;
    }
  },
};
