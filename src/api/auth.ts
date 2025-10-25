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

      if (error) {
        console.error('Error ensuring profile:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Error in ensureProfile:', error);
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
        },
      });

      if (error) {
        if (error.message.includes('already registered')) {
          throw new Error('This email is already registered. Please log in instead.');
        }
        throw error;
      }

      // Immediately create profile after successful signup
      if (data.user) {
        await this.ensureProfile(data.user.id, email, name, phone);
      }

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

      // Ensure profile exists and update last login
      if (data.user) {
        const name = data.user.user_metadata?.name || data.user.email?.split('@')[0];
        const phone = data.user.user_metadata?.phone || '';
        await this.ensureProfile(data.user.id, data.user.email, name, phone);
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