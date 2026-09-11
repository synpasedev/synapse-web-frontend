import { NextRequest, NextResponse } from 'next/server';
import { serverStore } from '@/lib/server-store';
import { isSupabaseConfigured } from '@/lib/supabase/config';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ workspaceId: string }> }
) {
  try {
    const { workspaceId } = await params;
    if (!workspaceId) {
      return NextResponse.json({ error: 'workspaceId is required' }, { status: 400 });
    }

    serverStore.markWorkspaceDeleted(workspaceId);

    if (isSupabaseConfigured()) {
      try {
        const supabase = await createServerSupabaseClient();
        await supabase.from('workspaces').delete().eq('id', workspaceId);
      } catch {}
    }

    return NextResponse.json({ success: true, message: 'Workspace marked as deleted', workspaceId });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
