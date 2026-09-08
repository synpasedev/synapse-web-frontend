import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { getRequestOrigin } from '@/lib/url';
import { DEFAULT_WORKSPACE_ID } from '@/lib/dexie/seed';
import { cookies } from 'next/headers';

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const origin = getRequestOrigin(request);

  // Read stored cookie if query param wasn't in the clean callback URL
  const cookieStore = await cookies();
  const cookieRedirect = cookieStore.get('synapse_redirect')?.value;

  // Extract query parameters (support both 'next' and 'redirect' keys, then cookie)
  const code = requestUrl.searchParams.get('code');
  const nextParam =
    requestUrl.searchParams.get('next') ||
    requestUrl.searchParams.get('redirect') ||
    (cookieRedirect ? decodeURIComponent(cookieRedirect) : null) ||
    `/${DEFAULT_WORKSPACE_ID}/notes`;
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

  // Resolve target path safely:
  // If nextParam was an absolute URL (e.g. from local testing http://localhost:3000/share/note/1),
  // extract only the pathname + search + hash and anchor it onto the current origin (e.g. Vercel domain)
  let targetPath = nextParam;
  try {
    if (nextParam.startsWith('http://') || nextParam.startsWith('https://')) {
      const parsed = new URL(nextParam);
      targetPath = `${parsed.pathname}${parsed.search}${parsed.hash}`;
    }
  } catch {
    targetPath = `/${DEFAULT_WORKSPACE_ID}/notes`;
  }

  const safeTarget = targetPath.startsWith('/') ? targetPath : `/${targetPath}`;
  return NextResponse.redirect(new URL(safeTarget, origin));
}
