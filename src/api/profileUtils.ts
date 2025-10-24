import { supabase } from '../lib/supabaseClient';

export async function ensureMinimalProfile(userId: string, email: string | null, name?: string | null, phone?: string | null) {
  const { data: profile } = await supabase.from('profiles').select('id').eq('id', userId).maybeSingle();
  if (profile) return;
  await supabase.from('profiles').upsert({ id: userId, email, name: name ?? (email ? email.split('@')[0] : null), phone: phone ?? null, last_login_at: new Date().toISOString() }, { onConflict: 'id' });
}
