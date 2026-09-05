import { NextRequest, NextResponse } from 'next/server';
import { getValidGoogleClient } from '@/lib/google/auth';
import { getEffectiveUserId } from '@/lib/google/auth-user';
import { listUserGoogleSpreadsheets } from '@/lib/google/sheets-adapter';

export async function GET(request: NextRequest) {
  try {
    const userId = await getEffectiveUserId();
    const { drive } = await getValidGoogleClient(userId);

    const query = request.nextUrl.searchParams.get('q') || undefined;
    const spreadsheets = await listUserGoogleSpreadsheets(drive, query);

    return NextResponse.json({ spreadsheets });
  } catch (err: any) {
    console.error('List Google Spreadsheets API error:', err);
    return NextResponse.json({ error: err.message || 'Failed to list spreadsheets' }, { status: 500 });
  }
}
