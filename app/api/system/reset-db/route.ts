import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';

export async function POST() {
  try {
    const rootDir = process.cwd();

    // 1. Reset in-memory global caches
    global.__synapse_workspaces = [];
    global.__synapse_notes = [];
    global.__synapse_blocks = [];
    global.__synapse_databases = [];
    global.__synapse_members = [];
    global.__synapse_evictions = [];
    global.__synapse_deleted_workspaces = [];
    if (global.__synapse_shares) global.__synapse_shares.clear();
    if (global.__synapse_invites) global.__synapse_invites.clear();

    // 2. Reset local disk stores
    const dataDir = path.join(rootDir, '.synapse-data');
    if (fs.existsSync(dataDir)) {
      fs.writeFileSync(path.join(dataDir, 'notes.json'), '[]', 'utf-8');
      fs.writeFileSync(path.join(dataDir, 'blocks.json'), '[]', 'utf-8');
      fs.writeFileSync(path.join(dataDir, 'workspaces.json'), '[]', 'utf-8');
      fs.writeFileSync(path.join(dataDir, 'members.json'), '[]', 'utf-8');
      fs.writeFileSync(path.join(dataDir, 'databases.json'), '[]', 'utf-8');
      fs.writeFileSync(path.join(dataDir, 'evictions.json'), '[]', 'utf-8');
      fs.writeFileSync(path.join(dataDir, 'deleted_workspaces.json'), '[]', 'utf-8');
    }

    const invitesDir = path.join(rootDir, '.synapse-invites');
    if (fs.existsSync(invitesDir)) {
      const files = fs.readdirSync(invitesDir);
      files.forEach((f) => {
        try {
          fs.unlinkSync(path.join(invitesDir, f));
        } catch {}
      });
    }

    const sharesDir = path.join(rootDir, '.synapse-shares');
    if (fs.existsSync(sharesDir)) {
      const files = fs.readdirSync(sharesDir);
      files.forEach((f) => {
        try {
          fs.unlinkSync(path.join(sharesDir, f));
        } catch {}
      });
    }

    // 3. Clear Supabase online database
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://pdzeubayvgpgoufcaajm.supabase.co';
    const supabaseKey =
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
      'sb_publishable_fwABY4pe_cPZxWBg1jJz_w_Ebh2oqmU';

    const supabase = createClient(supabaseUrl, supabaseKey);
    const tables = [
      'views',
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
        await supabase
          .from(table)
          .delete()
          .neq('id', '00000000-0000-0000-0000-000000000000');
      } catch {}
    }

    return NextResponse.json({
      success: true,
      message: 'All databases (online Supabase, server store, disk caches) have been cleared.',
    });
  } catch (err: any) {
    console.error('[reset-db] Error:', err);
    return NextResponse.json(
      { success: false, error: err.message || 'Failed to reset database' },
      { status: 500 }
    );
  }
}
