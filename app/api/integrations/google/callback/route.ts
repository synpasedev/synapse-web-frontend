import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { encrypt } from '@/lib/crypto';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get('code');
  const stateRaw = searchParams.get('state');
  const error = searchParams.get('error');

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

  if (error || !code || !stateRaw) {
    console.error('Google OAuth callback error:', error);
    return NextResponse.redirect(`${siteUrl}/?error=google_auth_failed`);
  }

  let stateData: { userId: string; returnUrl: string };
  try {
    stateData = JSON.parse(Buffer.from(stateRaw, 'base64url').toString('utf8'));
  } catch (err) {
    return NextResponse.redirect(`${siteUrl}/?error=invalid_state`);
  }

  const redirectUri = `${siteUrl}/api/integrations/google/callback`;

  // 1. Exchange authorization code for tokens
  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      redirect_uri: redirectUri,
      grant_type: 'authorization_code',
    }),
  });

  const tokens = await tokenRes.json();
  if (!tokenRes.ok) {
    console.error('Google token exchange error:', tokens);
    return NextResponse.redirect(`${siteUrl}/?error=token_exchange_failed`);
  }

  // 2. Fetch Google profile info
  const userRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
    headers: { Authorization: `Bearer ${tokens.access_token}` },
  });
  const googleUser = await userRes.json();

  // 3. Encrypt access & refresh tokens
  const encAccess = encrypt(tokens.access_token);
  const encRefresh = encrypt(tokens.refresh_token);
  const expiresAt = new Date(Date.now() + tokens.expires_in * 1000).toISOString();

  // 4. Save into Supabase
  const supabase = await createServerSupabaseClient();
  const { error: dbError } = await supabase.from('google_integrations').upsert(
    {
      user_id: stateData.userId,
      google_user_id: googleUser.id,
      google_email: googleUser.email,
      encrypted_access_token: encAccess.packed,
      encrypted_refresh_token: encRefresh.packed,
      token_iv: encAccess.iv,
      token_auth_tag: encAccess.authTag,
      token_expires_at: expiresAt,
      scopes: tokens.scope ? tokens.scope.split(' ') : [],
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_id, google_user_id' }
  );

  if (dbError) {
    console.error('Failed to store Google integration in DB:', dbError);
    return NextResponse.redirect(`${siteUrl}/?error=db_error`);
  }

  const destination = stateData.returnUrl.startsWith('/')
    ? `${siteUrl}${stateData.returnUrl}`
    : stateData.returnUrl;

  const url = new URL(destination);
  url.searchParams.set('google_connected', 'true');
  return NextResponse.redirect(url.toString());
}
