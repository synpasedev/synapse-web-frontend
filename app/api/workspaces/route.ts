import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/supabase/config';

export async function GET() {
  if (isSupabaseConfigured()) {
    try {
      const supabase = await createServerSupabaseClient();
      const { data, error } = await supabase.from('workspaces').select('*');
      if (!error && data && data.length > 0) {
        return NextResponse.json({ data });
      }
    } catch (err) {
      // Fallback
    }
  }

  return NextResponse.json({
    data: [
      {
        id: 'ws-default-synapse',
        name: 'Personal Workspace',
        slug: 'personal',
        icon: '🧠',
        created_at: new Date().toISOString(),
      }
    ]
  });
}
