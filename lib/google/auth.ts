import { docs, docs_v1 } from '@googleapis/docs';
import { drive, drive_v3 } from '@googleapis/drive';
import { sheets, sheets_v4 } from '@googleapis/sheets';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { decrypt, encrypt } from '@/lib/crypto';

export interface GoogleClients {
  docs: docs_v1.Docs;
  drive: drive_v3.Drive;
  sheets: sheets_v4.Sheets;
  accessToken: string;
  integrationId: string;
}

export async function getValidGoogleClient(userId: string): Promise<GoogleClients> {
  const supabase = await createServerSupabaseClient();

  let { data: integration } = await supabase
    .from('google_integrations')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();

  if (!integration) {
    // Fallback for local development if user session ID switched
    const { data: fallbackIntegration } = await supabase
      .from('google_integrations')
      .select('*')
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (fallbackIntegration) {
      integration = fallbackIntegration;
    }
  }

  if (!integration) {
    throw new Error('Google Integration not connected. Please connect Google Docs in Settings.');
  }

  let accessToken: string;
  try {
    accessToken = decrypt(
      integration.encrypted_access_token,
      integration.token_iv,
      integration.token_auth_tag
    );
  } catch (err) {
    // Clean up corrupted or mismatched legacy token record
    await supabase.from('google_integrations').delete().eq('id', integration.id);
    throw new Error('Google credentials need to be refreshed. Please click Connect Google Account.');
  }

  const expiresAt = new Date(integration.token_expires_at).getTime();
  const isExpiringSoon = Date.now() > expiresAt - 5 * 60 * 1000; // 5 min safety buffer

  if (isExpiringSoon) {
    let refreshToken: string;
    try {
      refreshToken = decrypt(
        integration.encrypted_refresh_token,
        integration.token_iv,
        integration.token_auth_tag
      );
    } catch (err) {
      await supabase.from('google_integrations').delete().eq('id', integration.id);
      throw new Error('Google refresh token needs to be renewed. Please click Connect Google Account.');
    }

    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: process.env.GOOGLE_CLIENT_ID!,
        client_secret: process.env.GOOGLE_CLIENT_SECRET!,
        refresh_token: refreshToken,
        grant_type: 'refresh_token',
      }),
    });

    const newTokens = await tokenRes.json();
    if (!tokenRes.ok) {
      if (newTokens.error === 'invalid_grant') {
        // User revoked access from their Google Account
        await supabase.from('google_integrations').delete().eq('id', integration.id);
        throw new Error('Google access was revoked. Please reconnect your Google account.');
      }
      throw new Error(`Token refresh failed: ${newTokens.error_description || newTokens.error}`);
    }

    accessToken = newTokens.access_token;
    const encAccess = encrypt(accessToken);
    const newExpiresAt = new Date(Date.now() + newTokens.expires_in * 1000).toISOString();

    await supabase
      .from('google_integrations')
      .update({
        encrypted_access_token: encAccess.packed,
        token_expires_at: newExpiresAt,
        updated_at: new Date().toISOString(),
      })
      .eq('id', integration.id);
  }

  // Create Google API clients
  const docsClient = docs({
    version: 'v1',
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  const driveClient = drive({
    version: 'v3',
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  const sheetsClient = sheets({
    version: 'v4',
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  return {
    docs: docsClient,
    drive: driveClient,
    sheets: sheetsClient,
    accessToken,
    integrationId: integration.id,
  };
}
