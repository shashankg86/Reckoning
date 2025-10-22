import { supabase } from '../lib/supabaseClient';

export interface StoreData {
  name: string;
  type: 'restaurant' | 'cafe' | 'retail' | 'salon' | 'pharmacy' | 'other';
  language?: string;
  currency?: string;
  theme?: 'light' | 'dark';
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  pincode?: string;
  gst_number?: string;
  phone?: string;
  email?: string;
}

export const storesAPI = {
  async createStore(storeData: StoreData) {
    try {
      const user = await supabase.auth.getUser();
      if (!user.data.user) throw new Error('Not authenticated');

      const { data: store, error: storeError } = await supabase
        .from('stores')
        .insert({
          ...storeData,
          owner_id: user.data.user.id,
        })
        .select()
        .single();

      if (storeError) throw storeError;

      const { error: memberError } = await supabase.from('store_members').insert({
        store_id: store.id,
        user_id: user.data.user.id,
        role: 'owner',
        is_active: true,
      });

      if (memberError) throw memberError;

      return store;
    } catch (error: any) {
      console.error('Create store error:', error);
      throw new Error(error.message || 'Failed to create store');
    }
  },

  /**
   * Safe 2-step fetch to avoid RLS policy recursion between stores and store_members
   */
  async getUserStores() {
    try {
      const user = await supabase.auth.getUser();
      if (!user.data.user) throw new Error('Not authenticated');

      // Step 1: fetch memberships for current user only
      const { data: memberships, error: memErr } = await supabase
        .from('store_members')
        .select('store_id, role, is_active')
        .eq('user_id', user.data.user.id)
        .eq('is_active', true);

      if (memErr) throw memErr;
      if (!memberships || memberships.length === 0) return [];

      const activeStoreIds = memberships.map((m) => m.store_id);

      // Step 2: fetch stores by id list (no join)
      const { data: stores, error: storesErr } = await supabase
        .from('stores')
        .select('*')
        .in('id', activeStoreIds)
        .eq('is_active', true);

      if (storesErr) throw storesErr;

      // Merge membership role into stores result
      const roleByStore: Record<string, any> = {};
      memberships.forEach((m: any) => (roleByStore[m.store_id] = { role: m.role, is_active: m.is_active }));

      return (stores || []).map((s: any) => ({ ...s, membership: roleByStore[s.id] }));
    } catch (error: any) {
      console.error('Get user stores error:', error);
      // Return empty rather than throw to avoid blocking auth flow
      return [] as any[];
    }
  },

  async getStore(storeId: string) {
    try {
      const { data, error } = await supabase
        .from('stores')
        .select('*')
        .eq('id', storeId)
        .single();

      if (error) throw error;
      return data;
    } catch (error: any) {
      console.error('Get store error:', error);
      throw new Error(error.message || 'Failed to get store');
    }
  },

  /**
   * Safe multi-step variant to avoid nested policy recursion
   */
  async getStoreWithMembers(storeId: string) {
    try {
      // Store
      const { data: store, error: storeErr } = await supabase
        .from('stores')
        .select('*')
        .eq('id', storeId)
        .single();
      if (storeErr) throw storeErr;

      // Members
      const { data: members, error: memErr } = await supabase
        .from('store_members')
        .select('id, role, is_active, joined_at, user_id')
        .eq('store_id', storeId)
        .eq('is_active', true);
      if (memErr) throw memErr;

      // Profiles for member user_ids
      const userIds = (members || []).map((m: any) => m.user_id);
      let profiles: any[] = [];
      if (userIds.length > 0) {
        const { data: profs, error: profErr } = await supabase
          .from('profiles')
          .select('id, name, email, phone, photo_url')
          .in('id', userIds);
        if (profErr) throw profErr;
        profiles = profs || [];
      }

      const profilesById: Record<string, any> = {};
      profiles.forEach((p) => (profilesById[p.id] = p));

      const membersWithProfiles = (members || []).map((m: any) => ({
        ...m,
        profile: profilesById[m.user_id] || null,
      }));

      return { ...store, store_members: membersWithProfiles };
    } catch (error: any) {
      console.error('Get store with members error:', error);
      throw new Error(error.message || 'Failed to get store details');
    }
  },

  async updateStore(storeId: string, updates: Partial<StoreData>) {
    try {
      const { data, error } = await supabase
        .from('stores')
        .update(updates)
        .eq('id', storeId)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error: any) {
      console.error('Update store error:', error);
      throw new Error(error.message || 'Failed to update store');
    }
  },
};
