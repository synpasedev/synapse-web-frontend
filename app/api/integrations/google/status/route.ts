import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { getEffectiveUserId } from '@/lib/google/auth-user';

export async function GET(request: NextRequest) {
  const userId = await getEffectiveUserId();
  const supabase = await createServerSupabaseClient();

  let { data: integration } = await supabase
    .from('google_integrations')
    .select('id, google_email, updated_at')
    .eq('user_id', userId)
    .maybeSingle();

  if (!integration) {
    const { data: fallbackIntegration } = await supabase
      .from('google_integrations')
      .select('id, google_email, updated_at')
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (fallbackIntegration) {
      integration = fallbackIntegration;
    }
  }

  return NextResponse.json({
    connected: Boolean(integration),
    email: integration?.google_email || null,
  });
}
