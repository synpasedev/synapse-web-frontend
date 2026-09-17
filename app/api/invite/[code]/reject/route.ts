import { NextRequest, NextResponse } from 'next/server';
import { serverInvites } from '@/lib/server-invites';

/**
 * POST /api/invite/[code]/reject
 * Reject / decline an invite on the server
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    const { code } = await params;
    const body = await req.json().catch(() => ({}));
    const { userEmail } = body;

    if (!code) {
      return NextResponse.json(
        { error: 'Invite code parameter is required.' },
        { status: 400 }
      );
    }

    const rejected = await serverInvites.rejectInvite(code, userEmail);
    if (!rejected) {
      return NextResponse.json(
        { error: 'Invitation link is invalid or has expired.' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Invitation declined successfully',
      invite: rejected,
    });
  } catch (error: any) {
    console.error('Error in POST /api/invite/[code]/reject:', error);
    const statusCode = error.statusCode || 400;
    return NextResponse.json(
      { error: error.message || 'Failed to decline invitation.' },
      { status: statusCode }
    );
  }
}
