import { supabase } from '../lib/supabaseClient';

export const authAPI = {
  /**
   * Check if email already exists in the system
   */
  async checkEmailExists(email: string): Promise<boolean> {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id')
        .eq('email', email.toLowerCase())
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        console.error('Error checking email:', error);
        return false;
      }

      return !!data;
    } catch (error) {
      console.error('Error checking email existence:', error);
      return false;
    }
  },

  /**
   * Ensure user profile exists (create or update)
   * Critical for both email signup and OAuth flows
   */
  async ensureProfile(userId: string, email: string | null, name?: string, phone?: string) {
    console.log('[ensureProfile] ===== FUNCTION CALLED =====');
    console.log('[ensureProfile] userId:', userId);
    console.log('[ensureProfile] email:', email);
    console.log('[ensureProfile] name:', name);
    console.log('[ensureProfile] phone:', phone);

    try {
      console.log('[ensureProfile] Calling secure upsert_user_profile function...');

      // Use SECURITY DEFINER function to bypass RLS policy timing issues
      const { data, error } = await supabase.rpc('upsert_user_profile', {
        p_user_id: userId,
        p_email: email,
        p_name: name,
        p_phone: phone
      });

      console.log('[ensureProfile] ===== RPC COMPLETED =====');
      console.log('[ensureProfile] Success:', !!data);
      console.log('[ensureProfile] Error:', error);
      console.log('[ensureProfile] Returned data:', data);

      if (error) {
        console.error('[ensureProfile] ===== ERROR DETAILS =====');
        console.error('[ensureProfile] Error code:', error.code);
        console.error('[ensureProfile] Error message:', error.message);
        console.error('[ensureProfile] Error details:', JSON.stringify(error, null, 2));
        return null;
      }

      console.log('[ensureProfile] ===== SUCCESS - RETURNING PROFILE =====');
      // RPC returns jsonb, convert to profile object
      return data as any;
    } catch (error) {
      console.error('[ensureProfile] ===== EXCEPTION CAUGHT =====');
      console.error('[ensureProfile] Exception:', error);
      console.error('[ensureProfile] Exception type:', typeof error);
      console.error('[ensureProfile] Exception stack:', (error as Error).stack);
      return null;
    }
  },

  async signUpWithEmail(email: string, password: string, name: string, phone: string) {
    try {
      // Check if email already exists
      const emailExists = await this.checkEmailExists(email);

      if (emailExists) {
        throw new Error(
          'This email is already registered. Please log in instead, or use "Sign in with Google" if you previously signed up with Google.'
        );
      }

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            name,
            phone,
          },
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      if (error) {
        if (error.message.includes('already registered')) {
          throw new Error('This email is already registered. Please log in instead.');
        }
        throw error;
      }

      // Only create profile after email is verified
      // Profile will be created when user completes email verification

      return {
        user: data.user,
        session: data.session,
      };
    } catch (error: any) {
      console.error('Sign up error:', error);
      throw error; // Re-throw to preserve error details
    }
  },

  async loginWithEmail(email: string, password: string) {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        if (error.message.includes('Invalid login credentials')) {
          throw new Error('Invalid email or password. Please try again.');
        }
        if (error.message.includes('Email not confirmed')) {
          throw new Error('Please verify your email before logging in.');
        }
        throw error;
      }

      // CRITICAL: Check if user has a profile (must have signed up through app)
      if (data.user) {
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('id')
          .eq('id', data.user.id)
          .maybeSingle();

        if (profileError) {
          console.error('Error checking profile during login:', profileError);
          await supabase.auth.signOut();
          throw new Error('Failed to verify account. Please try again.');
        }

        if (!profile) {
          // User exists in Supabase auth but not in profiles table = never signed up through app
          await supabase.auth.signOut();
          throw new Error('No account found. Please sign up first.');
        }

        // Profile exists - just update last login timestamp (DO NOT create)
        await supabase
          .from('profiles')
          .update({ last_login_at: new Date().toISOString() })
          .eq('id', data.user.id);
      }

      return {
        user: data.user,
        session: data.session,
      };
    } catch (error: any) {
      console.error('Login error:', error);
      throw error; // Re-throw to preserve error details
    }
  },

  async loginWithGoogle() {
    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/dashboard`,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          },
        },
      });

      if (error) throw error;
      return data;
    } catch (error: any) {
      console.error('Google login error:', error);
      throw new Error(error.message || 'Failed to login with Google');
    }
  },

  async logout() {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
    } catch (error: any) {
      console.error('Logout error:', error);
      throw new Error(error.message || 'Failed to logout');
    }
  },

  async getCurrentUser() {
    try {
      const {
        data: { user },
        error,
      } = await supabase.auth.getUser();
      if (error) throw error;
      return user;
    } catch (error: any) {
      console.error('Get user error:', error);
      return null;
    }
  },

  async getSession() {
    try {
      const {
        data: { session },
        error,
      } = await supabase.auth.getSession();
      if (error) throw error;
      return session;
    } catch (error: any) {
      console.error('Get session error:', error);
      return null;
    }
  },

  async resendVerificationEmail(email: string) {
    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });
      if (error) throw error;
    } catch (error: any) {
      console.error('Resend verification error:', error);
      throw new Error(error.message || 'Failed to resend verification email');
    }
  },

  async resetPassword(email: string) {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) throw error;
    } catch (error: any) {
      console.error('Reset password error:', error);
      throw new Error(error.message || 'Failed to send reset email');
    }
  },

  async updatePassword(newPassword: string) {
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });
      if (error) throw error;
    } catch (error: any) {
      console.error('Update password error:', error);
      throw new Error(error.message || 'Failed to update password');
    }
  },
};