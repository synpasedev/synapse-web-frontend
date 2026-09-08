import { NextRequest, NextResponse } from 'next/server';
import { getEffectiveUserId } from '@/lib/google/auth-user';
import { getRequestOrigin } from '@/lib/url';

export async function GET(request: NextRequest) {
  const userId = await getEffectiveUserId();

  const returnUrl = request.nextUrl.searchParams.get('returnUrl') || '/';

  const state = Buffer.from(
    JSON.stringify({
      userId,
      returnUrl,
    })
  ).toString('base64url');

  const origin = getRequestOrigin(request);
  const redirectUri = `${origin}/api/integrations/google/callback`;

  const params = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID!,
    redirect_uri: redirectUri,
    response_type: 'code',
    access_type: 'offline',
    prompt: 'consent',
    scope: [
      'https://www.googleapis.com/auth/documents',
      'https://www.googleapis.com/auth/spreadsheets',
      'https://www.googleapis.com/auth/drive.file',
      'https://www.googleapis.com/auth/userinfo.email',
      'openid',
    ].join(' '),
    state,
  });

  return NextResponse.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`);
}
