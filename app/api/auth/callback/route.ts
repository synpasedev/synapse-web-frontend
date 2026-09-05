import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { getRequestOrigin, getURL } from '@/lib/url';
import { DEFAULT_WORKSPACE_ID } from '@/lib/dexie/seed';

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const origin = getRequestOrigin(request);

  // Extract query parameters
  const code = requestUrl.searchParams.get('code');
  const next = requestUrl.searchParams.get('next') || `/${DEFAULT_WORKSPACE_ID}/notes`;
  const error = requestUrl.searchParams.get('error');
  const errorDescription = requestUrl.searchParams.get('error_description');

  // Handle OAuth provider errors
  if (error) {
    console.error(`[OAuth Error] ${error}: ${errorDescription}`);
    const loginRedirect = new URL('/login', origin);
    loginRedirect.searchParams.set('error', errorDescription || error);
    return NextResponse.redirect(loginRedirect);
  }

  // Exchange auth code for session
  if (code) {
    try {
      const supabase = await createServerSupabaseClient();
      const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
      if (exchangeError) {
        console.error('[OAuth Session Exchange Error]', exchangeError.message);
        const loginRedirect = new URL('/login', origin);
        loginRedirect.searchParams.set('error', exchangeError.message);
        return NextResponse.redirect(loginRedirect);
      }
    } catch (err: any) {
      console.error('[OAuth Callback Exception]', err.message);
      const loginRedirect = new URL('/login', origin);
      loginRedirect.searchParams.set('error', 'Authentication failed during session exchange.');
      return NextResponse.redirect(loginRedirect);
    }
  }

  // Ensure redirect URL is safe and points to the canonical host
  const targetUrl = next.startsWith('/') ? `${origin}${next}` : next;
  return NextResponse.redirect(new URL(targetUrl, origin));
}
