import { supabase } from '../lib/supabaseClient';
import { onboardingAPI } from './onboardingProgress';

export const authAPI = {
  async checkEmailExists(email: string): Promise<boolean> {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id')
        .eq('email', email.toLowerCase())
        .maybeSingle();
      if (error && error.code !== 'PGRST116') return false;
      return !!data;
    } catch {
      return false;
    }
  },

  async ensureProfile(userId: string, email: string | null, name?: string, phone?: string) {
    try {
      const profileData = {
        id: userId,
        email: email?.toLowerCase() || null,
        name: name || email?.split('@')[0] || 'User',
        phone: phone || '',
        last_login_at: new Date().toISOString(),
      };
      const { data, error } = await supabase
        .from('profiles')
        .upsert(profileData, { onConflict: 'id' })
        .select()
        .single();
      if (error) return null;
      return data;
    } catch {
      return null;
    }
  },

  async signUpWithEmail(email: string, password: string, name: string, phone: string) {
    const emailExists = await this.checkEmailExists(email);
    if (emailExists) throw new Error('This email is already registered. Please log in instead.');

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { name, phone } },
    });
    if (error) throw error;

    if (data.user) await this.ensureProfile(data.user.id, email, name, phone);

    // Post-auth init: fetch profile + onboarding progress, return to caller
    const sessionRes = await supabase.auth.getSession();
    const user = sessionRes.data.session?.user;
    const profile = user ? await this.ensureProfile(user.id, user.email ?? null, name, phone) : null;
    const progress = user ? await onboardingAPI.get(user.id) : null;

    return { user: data.user, session: data.session, profile, progress } as const;
  },

  async loginWithEmail(email: string, password: string) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;

    if (data.user) {
      const { data: profileRow, error: profileError } = await supabase
        .from('profiles')
        .select('id, email, phone, name')
        .eq('id', data.user.id)
        .maybeSingle();
      if (profileError) {
        await supabase.auth.signOut();
        throw new Error('Failed to verify account. Please try again.');
      }
      if (!profileRow) {
        await supabase.auth.signOut();
        throw new Error('No account found. Please sign up first.');
      }
      await supabase
        .from('profiles')
        .update({ last_login_at: new Date().toISOString() })
        .eq('id', data.user.id);
    }

    // Post-auth init: gather profile and onboarding progress
    const sessionRes = await supabase.auth.getSession();
    const user = sessionRes.data.session?.user;
    let profile = null as any;
    if (user) {
      const { data: p } = await supabase
        .from('profiles')
        .select('id, email, phone, name')
        .eq('id', user.id)
        .single();
      profile = p;
    }
    const progress = user ? await onboardingAPI.get(user.id) : null;

    return { user: data.user, session: data.session, profile, progress } as const;
  },

  async loginWithGoogle() {
    // Keep existing OAuth start; the callback screen should perform the same post-auth init
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/onboarding`,
        queryParams: { access_type: 'offline', prompt: 'consent' },
      },
    });
    if (error) throw error;
    return data;
  },

  async logout() {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  },

  async getCurrentUser() {
    const { data, error } = await supabase.auth.getUser();
    if (error) return null;
    return data.user;
  },

  async getSession() {
    const { data, error } = await supabase.auth.getSession();
    if (error) return null;
    return data.session;
  },

  async resetPassword(email: string) {
    const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${window.location.origin}/reset-password` });
    if (error) throw error;
  },

  async updatePassword(newPassword: string) {
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) throw error;
  },
};
