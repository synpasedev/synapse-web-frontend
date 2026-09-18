import { createClient } from '@supabase/supabase-js';

const url = 'https://pdzeubayvgpgoufcaajm.supabase.co';
const key = 'sb_publishable_fwABY4pe_cPZxWBg1jJz_w_Ebh2oqmU';
const supabase = createClient(url, key);

async function checkSupabase() {
  const tables = [
    'workspace_invites',
    'google_sheets_sync_history',
    'google_drive_sync_logs',
    'google_drive_sync_tokens',
    'sync_queue',
    'views',
    'database_rows',
    'database_properties',
    'databases',
    'relations',
    'templates',
    'links',
    'blocks',
    'notes',
    'memberships',
    'workspaces',
    'profiles',
  ];

  for (const table of tables) {
    try {
      const { data, count, error } = await supabase.from(table).select('*', { count: 'exact' });
      if (error) {
        console.log(`Table ${table}: error ->`, error.message);
      } else {
        console.log(`Table ${table}: count = ${count ?? data?.length ?? 0}`);
      }
    } catch (e) {
      console.log(`Table ${table}: exception ->`, e.message);
    }
  }
}

checkSupabase();
