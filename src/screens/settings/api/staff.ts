import { supabase } from '../../../lib/supabaseClient';
import { StoreMember } from '../../../types';

export interface StaffMember extends StoreMember {
    profile: {
        name: string;
        email: string;
        phone?: string;
        photo_url?: string;
    };
}

export const staffAPI = {
    async getStaff(storeId: string): Promise<StaffMember[]> {
        const { data, error } = await supabase
            .from('store_members')
            .select(`
        *,
        profile:profiles (
          name,
          email,
          phone,
          photo_url
        )
      `)
            .eq('store_id', storeId)
            .eq('is_active', true);

        if (error) throw error;
        return data as unknown as StaffMember[];
    },

    async updateRole(memberId: string, role: 'admin' | 'manager' | 'cashier') {
        const { error } = await supabase
            .from('store_members')
            .update({ role })
            .eq('id', memberId);

        if (error) throw error;
    },

    async updatePermissions(memberId: string, permissions: Record<string, boolean>) {
        const { error } = await supabase
            .from('store_members')
            .update({ permissions })
            .eq('id', memberId);

        if (error) throw error;
    },

    async removeStaff(memberId: string) {
        const { error } = await supabase
            .from('store_members')
            .update({ is_active: false })
            .eq('id', memberId);

        if (error) throw error;
    },

    async inviteStaff(email: string, role: 'manager' | 'cashier', storeId: string) {
        // This is a placeholder for the actual invitation logic.
        // In a real app, this would trigger a Supabase Edge Function to send an email
        // or create a pending invitation record.
        // For now, we'll just check if the user exists and add them directly if they do,
        // or throw an error saying "User must be registered first".

        const { data: profile } = await supabase
            .from('profiles')
            .select('id')
            .eq('email', email)
            .single();

        if (!profile) {
            throw new Error('User not found. Please ask them to sign up first.');
        }

        const { error } = await supabase
            .from('store_members')
            .insert({
                store_id: storeId,
                user_id: profile.id,
                role,
                is_active: true,
                permissions: {}
            });

        if (error) {
            if (error.code === '23505') { // Unique violation
                throw new Error('User is already a member of this store.');
            }
            throw error;
        }
    }
};
