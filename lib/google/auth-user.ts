import { cookies } from 'next/headers';
import { createServerSupabaseClient } from '@/lib/supabase/server';

/**
 * Resolves the effective user ID for Google integration features.
 * Supports:
 * 1. Logged in Supabase Auth user (returns user.id)
 * 2. Local-first / guest user (returns persistent cookie id or 'usr-local')
 */
export async function getEffectiveUserId(): Promise<string> {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (user?.id) {
      return user.id;
    }
  } catch (err) {
    // Non-fatal, fallback to local identifier
  }

  try {
    const cookieStore = await cookies();
    const guestCookie = cookieStore.get('synapse_guest_user_id')?.value;
    if (guestCookie) {
      return guestCookie;
    }
  } catch (err) {
    // Non-fatal
  }

  return 'usr-local';
}
