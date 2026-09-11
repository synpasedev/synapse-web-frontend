import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/supabase/config';
import { serverStore, StoredWorkspaceMember } from '@/lib/server-store';

/**
 * GET /api/workspaces/[workspaceId]/members
 * Returns all members belonging to this workspace
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ workspaceId: string }> }
) {
  try {
    const { workspaceId } = await params;
    if (!workspaceId) {
      return NextResponse.json({ error: 'workspaceId is required' }, { status: 400 });
    }

    const membersMap = new Map<string, StoredWorkspaceMember>();

    // 1. Check in-memory / disk store
    const localStoreMembers = serverStore.getWorkspaceMembers(workspaceId);
    localStoreMembers.forEach((m) => {
      membersMap.set(m.email.toLowerCase(), m);
    });

    // 2. Check Supabase (if configured)
    if (isSupabaseConfigured()) {
      try {
        const supabase = await createServerSupabaseClient();
        const { data: dbMembers, error } = await supabase
          .from('memberships')
          .select('*, profiles(email, full_name, avatar_url)')
          .eq('workspace_id', workspaceId);

        if (!error && dbMembers) {
          dbMembers.forEach((item: any) => {
            const email = item.profiles?.email || item.email;
            if (email) {
              const cleanEmail = email.toLowerCase();
              if (!membersMap.has(cleanEmail)) {
                membersMap.set(cleanEmail, {
                  id: item.id,
                  workspace_id: workspaceId,
                  user_id: item.user_id,
                  name: item.profiles?.full_name || item.name,
                  email: cleanEmail,
                  role: item.role || 'editor',
                  avatar_url: item.profiles?.avatar_url,
                  created_at: item.created_at,
                  updated_at: item.updated_at || item.created_at,
                });
              }
            }
          });
        }
      } catch (err) {
        // Fallback silently to serverStore members
      }
    }

    const members = Array.from(membersMap.values());
    return NextResponse.json({ data: members, total: members.length });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to fetch members' }, { status: 500 });
  }
}

/**
 * POST /api/workspaces/[workspaceId]/members
 * Adds or updates a member in the workspace
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ workspaceId: string }> }
) {
  try {
    const { workspaceId } = await params;
    const body = await request.json();
    const memberData = body.member || body;
    const email = memberData.email;
    const name = memberData.name;
    const role = memberData.role || 'editor';
    const userId = memberData.userId || memberData.user_id;

    if (!workspaceId || !email) {
      return NextResponse.json({ error: 'workspaceId and email are required' }, { status: 400 });
    }

    const now = new Date().toISOString();
    const newMember: StoredWorkspaceMember = {
      id: memberData.id || `mem-${crypto.randomUUID().slice(0, 8)}`,
      workspace_id: workspaceId,
      user_id: userId || `usr-${crypto.randomUUID().slice(0, 8)}`,
      name: name || email.split('@')[0],
      email: email.trim().toLowerCase(),
      role,
      avatar_url: memberData.avatar_url,
      created_at: now,
      updated_at: now,
    };

    // Save to server store
    const saved = serverStore.saveWorkspaceMember(newMember);

    // Also attempt Supabase upsert
    if (isSupabaseConfigured()) {
      try {
        const supabase = await createServerSupabaseClient();
        await supabase.from('memberships').upsert({
          workspace_id: workspaceId,
          user_id: newMember.user_id,
          role: newMember.role,
        });
      } catch {}
    }

    return NextResponse.json({ success: true, member: saved }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to save member' }, { status: 500 });
  }
}
