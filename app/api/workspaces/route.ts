import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/supabase/config';
import { serverStore, StoredWorkspace } from '@/lib/server-store';

export async function GET() {
  const wsMap = new Map<string, StoredWorkspace>();

  // 1. Get from serverStore
  const localList = serverStore.getWorkspaces();
  for (const w of localList) {
    wsMap.set(w.id, w);
  }

  // 2. Fetch from Supabase if configured
  if (isSupabaseConfigured()) {
    try {
      const supabase = await createServerSupabaseClient();
      const { data, error } = await supabase.from('workspaces').select('*');
      if (!error && data && data.length > 0) {
        for (const item of data) {
          if (!serverStore.isWorkspaceDeleted(item.id)) {
            wsMap.set(item.id, {
              id: item.id,
              name: item.name,
              slug: item.slug || 'workspace',
              icon: item.icon || '🧠',
              owner_id: item.owner_id || 'local-user-1',
              type: item.type || 'shared',
              created_at: item.created_at,
              updated_at: item.updated_at || item.created_at,
            });
          }
        }
      }
    } catch (err) {
      // Fallback silently
    }
  }

  const list = Array.from(wsMap.values());
  return NextResponse.json({
    data: list.length > 0 ? list : [
      {
        id: 'ws-default-synapse',
        name: 'Personal Workspace',
        slug: 'personal',
        icon: '🧠',
        owner_id: 'local-user-1',
        type: 'private',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ],
  });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const wsData = body.workspace || body;

    if (!wsData.id || !wsData.name) {
      return NextResponse.json({ error: 'Workspace id and name are required' }, { status: 400 });
    }

    const now = new Date().toISOString();
    const workspaceToSave: StoredWorkspace = {
      id: wsData.id,
      name: wsData.name,
      slug: wsData.slug || wsData.name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
      icon: wsData.icon || '🧠',
      owner_id: wsData.owner_id || wsData.ownerId || 'local-user-1',
      type: wsData.type || 'shared',
      created_at: wsData.created_at || now,
      updated_at: now,
    };

    const saved = serverStore.saveWorkspace(workspaceToSave);

    if (isSupabaseConfigured()) {
      try {
        const supabase = await createServerSupabaseClient();
        await supabase.from('workspaces').upsert({
          id: saved.id,
          name: saved.name,
          slug: saved.slug,
          icon: saved.icon,
          owner_id: saved.owner_id,
          type: saved.type,
          created_at: saved.created_at,
          updated_at: saved.updated_at,
        });
      } catch {}
    }

    return NextResponse.json({ success: true, workspace: saved }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to save workspace' }, { status: 500 });
  }
}

