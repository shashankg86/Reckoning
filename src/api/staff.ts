/**
 * Staff Management API Service
 *
 * Handles all staff-related operations including:
 * - Fetching store team members
 * - User memberships across stores
 * - Role management
 * - Member activation/deactivation
 */

import { supabase } from '@/lib/supabaseClient';
import type { StoreMember, StoreMembership, StoreRole } from '@/types/staff';

export const staffAPI = {
  /**
   * Get all team members for a specific store
   * Includes profile information for each member
   */
  async getStoreMembers(storeId: string): Promise<StoreMember[]> {
    const { data, error } = await supabase
      .from('store_members')
      .select(
        `
        id,
        store_id,
        user_id,
        role,
        is_active,
        invited_by,
        joined_at,
        created_at,
        updated_at,
        profile:profiles!user_id (
          id,
          name,
          email,
          phone,
          photo_url
        )
      `
      )
      .eq('store_id', storeId)
      .eq('is_active', true)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('[staffAPI.getStoreMembers] Error:', error);
      throw new Error(error.message);
    }

    // Transform the data to match our StoreMember interface
    return (data || []).map((member) => ({
      ...member,
      profile: Array.isArray(member.profile) ? member.profile[0] : member.profile,
    })) as StoreMember[];
  },

  /**
   * Get all store memberships for the current user
   * Used for store switcher and determining user's stores
   */
  async getUserMemberships(): Promise<StoreMembership[]> {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      throw new Error('Not authenticated');
    }

    const { data, error } = await supabase
      .from('store_members')
      .select(
        `
        id,
        store_id,
        role,
        is_active,
        joined_at,
        store:stores!store_id (
          id,
          name,
          logo_url,
          type
        )
      `
      )
      .eq('user_id', user.id)
      .eq('is_active', true)
      .order('joined_at', { ascending: true });

    if (error) {
      console.error('[staffAPI.getUserMemberships] Error:', error);
      throw new Error(error.message);
    }

    // Transform the data to match our StoreMembership interface
    return (data || []).map((membership) => ({
      ...membership,
      store: Array.isArray(membership.store) ? membership.store[0] : membership.store,
    })) as StoreMembership[];
  },

  /**
   * Get a specific member's details
   */
  async getMemberById(memberId: string): Promise<StoreMember | null> {
    const { data, error } = await supabase
      .from('store_members')
      .select(
        `
        id,
        store_id,
        user_id,
        role,
        is_active,
        invited_by,
        joined_at,
        created_at,
        updated_at,
        profile:profiles!user_id (
          id,
          name,
          email,
          phone,
          photo_url
        )
      `
      )
      .eq('id', memberId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null; // Not found
      console.error('[staffAPI.getMemberById] Error:', error);
      throw new Error(error.message);
    }

    return {
      ...data,
      profile: Array.isArray(data.profile) ? data.profile[0] : data.profile,
    } as StoreMember;
  },

  /**
   * Update a member's role
   * Only owners can change roles
   */
  async updateMemberRole(memberId: string, newRole: StoreRole): Promise<void> {
    if (newRole === 'owner') {
      throw new Error('Cannot assign owner role via this method');
    }

    const { error } = await supabase
      .from('store_members')
      .update({ role: newRole })
      .eq('id', memberId);

    if (error) {
      console.error('[staffAPI.updateMemberRole] Error:', error);
      throw new Error(error.message);
    }
  },

  /**
   * Deactivate a member (soft delete)
   * Member can be reactivated later
   */
  async deactivateMember(memberId: string): Promise<void> {
    const { error } = await supabase
      .from('store_members')
      .update({ is_active: false })
      .eq('id', memberId);

    if (error) {
      console.error('[staffAPI.deactivateMember] Error:', error);
      throw new Error(error.message);
    }
  },

  /**
   * Reactivate a previously deactivated member
   */
  async reactivateMember(memberId: string): Promise<void> {
    const { error } = await supabase
      .from('store_members')
      .update({ is_active: true })
      .eq('id', memberId);

    if (error) {
      console.error('[staffAPI.reactivateMember] Error:', error);
      throw new Error(error.message);
    }
  },

  /**
   * Remove a member permanently
   * Only owners can remove members
   */
  async removeMember(memberId: string): Promise<void> {
    const { error } = await supabase.from('store_members').delete().eq('id', memberId);

    if (error) {
      console.error('[staffAPI.removeMember] Error:', error);
      throw new Error(error.message);
    }
  },

  /**
   * Check if user owns any store
   * Used to determine if store switcher should be shown
   */
  async userOwnsAnyStore(): Promise<boolean> {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return false;

    const { data, error } = await supabase
      .from('store_members')
      .select('id')
      .eq('user_id', user.id)
      .eq('role', 'owner')
      .eq('is_active', true)
      .limit(1);

    if (error) {
      console.error('[staffAPI.userOwnsAnyStore] Error:', error);
      return false;
    }

    return (data?.length ?? 0) > 0;
  },

  /**
   * Get user's role in a specific store
   */
  async getUserRoleInStore(storeId: string): Promise<StoreRole | null> {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return null;

    const { data, error } = await supabase
      .from('store_members')
      .select('role')
      .eq('store_id', storeId)
      .eq('user_id', user.id)
      .eq('is_active', true)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null; // Not found
      console.error('[staffAPI.getUserRoleInStore] Error:', error);
      return null;
    }

    return data?.role as StoreRole;
  },

  /**
   * Get count of team members in a store
   */
  async getTeamCount(storeId: string): Promise<number> {
    const { count, error } = await supabase
      .from('store_members')
      .select('id', { count: 'exact', head: true })
      .eq('store_id', storeId)
      .eq('is_active', true);

    if (error) {
      console.error('[staffAPI.getTeamCount] Error:', error);
      return 0;
    }

    return count ?? 0;
  },

  /**
   * Get inactive/deactivated members for a store
   * Useful for showing removed members that can be reactivated
   */
  async getInactiveMembers(storeId: string): Promise<StoreMember[]> {
    const { data, error } = await supabase
      .from('store_members')
      .select(
        `
        id,
        store_id,
        user_id,
        role,
        is_active,
        invited_by,
        joined_at,
        created_at,
        updated_at,
        profile:profiles!user_id (
          id,
          name,
          email,
          phone,
          photo_url
        )
      `
      )
      .eq('store_id', storeId)
      .eq('is_active', false)
      .order('updated_at', { ascending: false });

    if (error) {
      console.error('[staffAPI.getInactiveMembers] Error:', error);
      throw new Error(error.message);
    }

    return (data || []).map((member) => ({
      ...member,
      profile: Array.isArray(member.profile) ? member.profile[0] : member.profile,
    })) as StoreMember[];
  },
};

export default staffAPI;
