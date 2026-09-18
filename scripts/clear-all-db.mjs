import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';

const rootDir = process.cwd();

// 1. Clear Supabase Online Database
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://pdzeubayvgpgoufcaajm.supabase.co';
const supabaseKey =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  'sb_publishable_fwABY4pe_cPZxWBg1jJz_w_Ebh2oqmU';

const supabase = createClient(supabaseUrl, supabaseKey);

async function clearSupabase() {
  console.log('[1/4] Clearing Supabase online database...');
  const tables = [
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
    'workspace_invites',
    'google_sheets_sync_history',
    'google_drive_sync_logs',
    'google_drive_sync_tokens',
  ];

  for (const table of tables) {
    try {
      // Delete rows matching not-null id or neq dummy
      const { error, count } = await supabase
        .from(table)
        .delete({ count: 'exact' })
        .neq('id', '00000000-0000-0000-0000-000000000000');
      if (error) {
        // If id is text or table doesn't exist, try alternative
        if (error.message.includes('schema cache') || error.message.includes('relation') || error.message.includes('does not exist')) {
          // Table doesn't exist in schema cache
        } else {
          console.log(`  Table ${table}: ${error.message}`);
        }
      } else {
        console.log(`  Table ${table}: cleared (${count ?? 0} rows removed)`);
      }
    } catch (err) {
      console.log(`  Table ${table} error:`, err.message);
    }
  }
}

// 2. Clear Local Disk Store (.synapse-data, .synapse-invites, .synapse-shares)
function clearLocalDiskStore() {
  console.log('[2/4] Clearing local disk store...');

  // .synapse-data
  const dataDir = path.join(rootDir, '.synapse-data');
  if (fs.existsSync(dataDir)) {
    const files = fs.readdirSync(dataDir);
    for (const f of files) {
      try {
        fs.unlinkSync(path.join(dataDir, f));
        console.log(`  Deleted .synapse-data/${f}`);
      } catch (e) {}
    }
    // Write fresh empty arrays
    fs.writeFileSync(path.join(dataDir, 'notes.json'), '[]', 'utf-8');
    fs.writeFileSync(path.join(dataDir, 'blocks.json'), '[]', 'utf-8');
    fs.writeFileSync(path.join(dataDir, 'workspaces.json'), '[]', 'utf-8');
    fs.writeFileSync(path.join(dataDir, 'members.json'), '[]', 'utf-8');
    fs.writeFileSync(path.join(dataDir, 'databases.json'), '[]', 'utf-8');
    fs.writeFileSync(path.join(dataDir, 'evictions.json'), '[]', 'utf-8');
    fs.writeFileSync(path.join(dataDir, 'deleted_workspaces.json'), '[]', 'utf-8');
    console.log('  Reset .synapse-data json files to empty arrays.');
  }

  // .synapse-invites
  const invitesDir = path.join(rootDir, '.synapse-invites');
  if (fs.existsSync(invitesDir)) {
    const files = fs.readdirSync(invitesDir);
    for (const f of files) {
      try {
        fs.unlinkSync(path.join(invitesDir, f));
        console.log(`  Deleted .synapse-invites/${f}`);
      } catch (e) {}
    }
  }

  // .synapse-shares
  const sharesDir = path.join(rootDir, '.synapse-shares');
  if (fs.existsSync(sharesDir)) {
    const files = fs.readdirSync(sharesDir);
    for (const f of files) {
      try {
        fs.unlinkSync(path.join(sharesDir, f));
        console.log(`  Deleted .synapse-shares/${f}`);
      } catch (e) {}
    }
  }
}

async function main() {
  await clearSupabase();
  clearLocalDiskStore();
  console.log('[3/4] Server & online DB cleared successfully!');
}

main().catch((err) => {
  console.error('Clear DB failed:', err);
  process.exit(1);
});
