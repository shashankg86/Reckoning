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
      });

      if (memberError) throw memberError;

      return store;
    } catch (error: any) {
      console.error('Create store error:', error);
      throw new Error(error.message || 'Failed to create store');
    }
  },

  async getUserStores() {
    try {
      const user = await supabase.auth.getUser();
      if (!user.data.user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('stores')
        .select(
          `
          *,
          store_members!inner(role, is_active)
        `
        )
        .eq('store_members.user_id', user.data.user.id)
        .eq('store_members.is_active', true)
        .eq('is_active', true);

      if (error) throw error;
      return data;
    } catch (error: any) {
      console.error('Get user stores error:', error);
      throw new Error(error.message || 'Failed to get stores');
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

  async getStoreWithMembers(storeId: string) {
    try {
      const { data, error } = await supabase
        .from('stores')
        .select(
          `
          *,
          store_members(
            id,
            role,
            is_active,
            joined_at,
            profiles(id, name, email, phone, photo_url)
          )
        `
        )
        .eq('id', storeId)
        .single();

      if (error) throw error;
      return data;
    } catch (error: any) {
      console.error('Get store with members error:', error);
      throw new Error(error.message || 'Failed to get store details');
    }
  },
};
