import { NextRequest, NextResponse } from 'next/server';
import { getValidGoogleClient } from '@/lib/google/auth';
import { getEffectiveUserId } from '@/lib/google/auth-user';

export async function GET(request: NextRequest) {
  const userId = await getEffectiveUserId();
  const query = request.nextUrl.searchParams.get('q') || '';

  try {
    const { drive } = await getValidGoogleClient(userId);

    const qFilter = [
      "mimeType='application/vnd.google-apps.document'",
      'trashed=false',
      query ? `name contains '${query.replace(/'/g, "\\'")}'` : '',
    ]
      .filter(Boolean)
      .join(' and ');

    const res = await drive.files.list({
      q: qFilter,
      fields: 'files(id, name, modifiedTime, webViewLink, iconLink)',
      pageSize: 20,
      orderBy: 'modifiedTime desc',
    });

    return NextResponse.json({ docs: res.data.files || [] });
  } catch (err: any) {
    console.error('Failed to list Google Docs:', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
