import { supabase } from '../lib/supabaseClient';

export type OnboardingProgress = {
  user_id: string;
  current_step: 'basics' | 'contacts' | 'review';
  data: Record<string, any>;
  updated_at: string;
};

export const onboardingAPI = {
  async get(userId: string): Promise<OnboardingProgress | null> {
    const { data, error } = await supabase
      .from('onboarding_progress')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();
    if (error) throw error;
    return data as any;
  },
  async save(userId: string, step: OnboardingProgress['current_step'], payload: Record<string, any>) {
    const { data, error } = await supabase
      .from('onboarding_progress')
      .upsert({ user_id: userId, current_step: step, data: payload }, { onConflict: 'user_id' })
      .select()
      .single();
    if (error) throw error;
    return data as any;
  },
  async clear(userId: string) {
    await supabase.from('onboarding_progress').delete().eq('user_id', userId);
  }
};
