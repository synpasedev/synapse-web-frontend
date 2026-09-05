import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/supabase/config';
import { serverStore } from '@/lib/server-store';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const workspaceId = searchParams.get('workspaceId') || 'ws-default-synapse';

  if (isSupabaseConfigured()) {
    try {
      const supabase = await createServerSupabaseClient();
      const { data, error } = await supabase
        .from('databases')
        .select('*')
        .eq('workspace_id', workspaceId);

      if (!error && data && data.length > 0) {
        return NextResponse.json({ data, total: data.length });
      }
    } catch (err) {
      // Fallback
    }
  }

  const databases = serverStore.getDatabases().filter((d) => d.workspace_id === workspaceId);
  return NextResponse.json({ data: databases, total: databases.length });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { workspaceId = 'ws-default-synapse', title = 'New Database', properties = [] } = body;

    const newDb = {
      id: `db-${crypto.randomUUID().slice(0, 8)}`,
      workspace_id: workspaceId,
      title,
      properties: properties.length ? properties : [
        { id: 'p-title', name: 'Task Name', type: 'text' },
        { id: 'p-status', name: 'Status', type: 'select' },
      ],
      rows: [],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    if (isSupabaseConfigured()) {
      try {
        const supabase = await createServerSupabaseClient();
        const { data, error } = await supabase.from('databases').insert(newDb).select().single();
        if (!error && data) {
          return NextResponse.json({ data: newDb, message: 'Database created successfully' }, { status: 201 });
        }
      } catch (err) {
        // Fallback
      }
    }

    serverStore.getDatabases().push(newDb);
    return NextResponse.json({ data: newDb, message: 'Database created successfully' }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}
