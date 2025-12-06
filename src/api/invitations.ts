/**
 * Invitations API Service
 *
 * Handles all invitation-related operations including:
 * - Creating staff invitations (via Edge Function)
 * - Fetching pending invitations
 * - Accepting invitations
 * - Canceling invitations
 * - Resending invitations
 */

import { supabase } from '@/lib/supabaseClient';
import type {
  StoreInvite,
  InviteStaffPayload,
  InviteStaffResult,
  InviteDetails,
  AcceptInviteResult,
  StoreRole,
} from '@/types/staff';

// Edge Function URL for sending invitation emails
const getEdgeFunctionUrl = () => {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  return `${supabaseUrl}/functions/v1/invite-staff`;
};

export const invitationsAPI = {
  /**
   * Invite a staff member
   * This calls the Edge Function which:
   * 1. Creates the invite record via RPC
   * 2. Sends the invitation email via Resend
   */
  async inviteStaff(
    storeId: string,
    storeName: string,
    payload: InviteStaffPayload
  ): Promise<InviteStaffResult> {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      throw new Error('Not authenticated');
    }

    const response = await fetch(getEdgeFunctionUrl(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({
        email: payload.email,
        role: payload.role,
        storeId: storeId,
        storeName: storeName,
        firstName: payload.firstName,
        lastName: payload.lastName,
        phone: payload.phone,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Failed to send invitation');
    }

    return data as InviteStaffResult;
  },

  /**
   * Invite staff directly via RPC (without email)
   * Useful for testing or when email is handled separately
   */
  async inviteStaffDirect(
    storeId: string,
    payload: InviteStaffPayload
  ): Promise<InviteStaffResult> {
    const { data, error } = await supabase.rpc('invite_staff', {
      p_store_id: storeId,
      p_email: payload.email,
      p_role: payload.role,
      p_first_name: payload.firstName || null,
      p_last_name: payload.lastName || null,
      p_phone: payload.phone || null,
    });

    if (error) {
      console.error('[invitationsAPI.inviteStaffDirect] Error:', error);
      throw new Error(error.message);
    }

    if (!data.success) {
      throw new Error(data.error || 'Failed to create invitation');
    }

    return data as InviteStaffResult;
  },

  /**
   * Get all pending invitations for a store
   * Only accessible by owners and managers
   */
  async getPendingInvites(storeId: string): Promise<StoreInvite[]> {
    // Fetch invites without FK join (profiles FK may not exist)
    const { data, error } = await supabase
      .from('store_invites')
      .select(
        `
        id,
        store_id,
        email,
        role,
        status,
        first_name,
        last_name,
        phone,
        expires_at,
        created_by,
        created_at,
        updated_at
      `
      )
      .eq('store_id', storeId)
      .eq('status', 'pending')
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[invitationsAPI.getPendingInvites] Error:', error);
      throw new Error(error.message);
    }

    // Return invites without inviter profile (can be fetched separately if needed)
    return (data || []).map((invite) => ({
      ...invite,
      inviter: null, // Profile fetch not available without FK
    })) as StoreInvite[];
  },

  /**
   * Get all invitations for a store (including accepted, expired, cancelled)
   * Useful for audit/history purposes
   */
  async getAllInvites(storeId: string): Promise<StoreInvite[]> {
    // Fetch invites without FK join (profiles FK may not exist)
    const { data, error } = await supabase
      .from('store_invites')
      .select(
        `
        id,
        store_id,
        email,
        role,
        status,
        first_name,
        last_name,
        phone,
        expires_at,
        created_by,
        created_at,
        updated_at,
        accepted_at,
        accepted_by
      `
      )
      .eq('store_id', storeId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[invitationsAPI.getAllInvites] Error:', error);
      throw new Error(error.message);
    }

    // Return invites without inviter profile (can be fetched separately if needed)
    return (data || []).map((invite) => ({
      ...invite,
      inviter: null,
    })) as StoreInvite[];
  },

  /**
   * Get invitation details by token
   * Public function - used for the invitation acceptance page
   */
  async getInviteByToken(token: string): Promise<InviteDetails> {
    const { data, error } = await supabase.rpc('get_invite_details', {
      invite_token: token,
    });

    if (error) {
      console.error('[invitationsAPI.getInviteByToken] Error:', error);
      throw new Error(error.message);
    }

    if (!data.valid) {
      return {
        valid: false,
        error: data.error || 'Invalid invitation',
      };
    }

    return data as InviteDetails;
  },

  /**
   * Accept an invitation
   * Creates store membership and marks invite as accepted
   */
  async acceptInvite(token: string): Promise<AcceptInviteResult> {
    const { data, error } = await supabase.rpc('accept_invite', {
      invite_token: token,
    });

    if (error) {
      console.error('[invitationsAPI.acceptInvite] Error:', error);
      throw new Error(error.message);
    }

    if (!data.success) {
      return {
        success: false,
        error: data.error || 'Failed to accept invitation',
      };
    }

    return data as AcceptInviteResult;
  },

  /**
   * Cancel a pending invitation
   * Only owners and managers can cancel invites
   */
  async cancelInvite(inviteId: string): Promise<void> {
    const { error } = await supabase
      .from('store_invites')
      .update({ status: 'cancelled' })
      .eq('id', inviteId)
      .eq('status', 'pending');

    if (error) {
      console.error('[invitationsAPI.cancelInvite] Error:', error);
      throw new Error(error.message);
    }
  },

  /**
   * Resend an invitation
   * Updates expiry and triggers email resend via Edge Function
   */
  async resendInvite(inviteId: string, storeName: string): Promise<void> {
    // First, get the invite details
    const { data: invite, error: fetchError } = await supabase
      .from('store_invites')
      .select('*')
      .eq('id', inviteId)
      .eq('status', 'pending')
      .single();

    if (fetchError || !invite) {
      throw new Error('Invitation not found or already processed');
    }

    // Update expiry date
    const newExpiry = new Date();
    newExpiry.setDate(newExpiry.getDate() + 7);

    const { error: updateError } = await supabase
      .from('store_invites')
      .update({
        expires_at: newExpiry.toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', inviteId);

    if (updateError) {
      console.error('[invitationsAPI.resendInvite] Update error:', updateError);
      throw new Error(updateError.message);
    }

    // Resend email via Edge Function
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      throw new Error('Not authenticated');
    }

    const response = await fetch(getEdgeFunctionUrl(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({
        email: invite.email,
        role: invite.role,
        storeId: invite.store_id,
        storeName: storeName,
        firstName: invite.first_name,
        lastName: invite.last_name,
        phone: invite.phone,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.warn('[invitationsAPI.resendInvite] Email resend failed:', errorData);
      // Don't throw - invite was updated, just email failed
    }
  },

  /**
   * Check if an email has a pending invite for a store
   */
  async checkPendingInvite(storeId: string, email: string): Promise<StoreInvite | null> {
    const { data, error } = await supabase
      .from('store_invites')
      .select('*')
      .eq('store_id', storeId)
      .ilike('email', email)
      .eq('status', 'pending')
      .gt('expires_at', new Date().toISOString())
      .maybeSingle();

    if (error) {
      console.error('[invitationsAPI.checkPendingInvite] Error:', error);
      return null;
    }

    return data as StoreInvite | null;
  },

  /**
   * Get count of pending invitations for a store
   */
  async getPendingInviteCount(storeId: string): Promise<number> {
    const { count, error } = await supabase
      .from('store_invites')
      .select('id', { count: 'exact', head: true })
      .eq('store_id', storeId)
      .eq('status', 'pending')
      .gt('expires_at', new Date().toISOString());

    if (error) {
      console.error('[invitationsAPI.getPendingInviteCount] Error:', error);
      return 0;
    }

    return count ?? 0;
  },

  /**
   * Check if user has a pending invitation for any store
   * Used during login to detect and prompt for invitation acceptance
   */
  async checkUserPendingInvites(email: string): Promise<InviteDetails[]> {
    // First fetch invites without FK join
    const { data: invites, error } = await supabase
      .from('store_invites')
      .select(
        `
        id,
        store_id,
        email,
        role,
        token,
        expires_at
      `
      )
      .ilike('email', email)
      .eq('status', 'pending')
      .gt('expires_at', new Date().toISOString());

    if (error) {
      console.error('[invitationsAPI.checkUserPendingInvites] Error:', error);
      return [];
    }

    if (!invites || invites.length === 0) {
      return [];
    }

    // Fetch store details separately
    const storeIds = [...new Set(invites.map((inv) => inv.store_id))];
    const { data: stores, error: storesError } = await supabase
      .from('stores')
      .select('id, name, logo_url, type')
      .in('id', storeIds);

    if (storesError) {
      console.error('[invitationsAPI.checkUserPendingInvites] Stores fetch error:', storesError);
    }

    const storeMap = new Map((stores || []).map((s) => [s.id, s]));

    return invites.map((invite) => ({
      valid: true,
      invite: {
        id: invite.id,
        email: invite.email,
        role: invite.role as StoreRole,
        first_name: null,
        last_name: null,
        expires_at: invite.expires_at,
      },
      store: storeMap.get(invite.store_id) || null,
    })) as InviteDetails[];
  },
};

export default invitationsAPI;
