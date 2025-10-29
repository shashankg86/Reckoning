import { supabase } from '../lib/supabaseClient';
import { BRAND } from '../constants/branding';

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
  logoURL?: string;
}

export const storesAPI = {
  async createStore(storeData: StoreData) {
    try {
      const user = await supabase.auth.getUser();
      if (!user.data.user) throw new Error('Not authenticated');

      const logo_url = storeData.logoURL || BRAND.LOGO_URL;

      const { data: store, error: storeError } = await supabase
        .from('stores')
        .insert({
          name: storeData.name,
          type: storeData.type,
          language: storeData.language ?? 'en',
          currency: storeData.currency ?? 'INR',
          theme: storeData.theme ?? 'light',
          address: storeData.address,
          city: storeData.city,
          state: storeData.state,
          country: storeData.country,
          pincode: storeData.pincode,
          gst_number: storeData.gst_number,
          phone: storeData.phone,
          email: storeData.email,
          logo_url,
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
};
