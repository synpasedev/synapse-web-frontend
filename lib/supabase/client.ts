import { createBrowserClient as createSupabaseBrowserClient } from '@supabase/ssr';

export function createBrowserClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://pdzeubayvgpgoufcaajm.supabase.co';
  const supabaseAnonKey =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    'sb_publishable_fwABY4pe_cPZxWBg1jJz_w_Ebh2oqmU';

  return createSupabaseBrowserClient(supabaseUrl, supabaseAnonKey);
}
