import { NextRequest, NextResponse } from 'next/server';
import { serverInvites } from '@/lib/server-invites';

/**
 * GET /api/invite/[code]
 * Retrieve an invite by code directly from the path parameter
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    const { code } = await params;

    if (!code) {
      return NextResponse.json(
        { error: 'Invite code parameter is required.' },
        { status: 400 }
      );
    }

    const invite = await serverInvites.getInvite(code);
    if (!invite) {
      return NextResponse.json(
        { error: 'Invitation link is invalid or has expired.' },
        { status: 404 }
      );
    }

    if (invite.expires_at && new Date(invite.expires_at) < new Date()) {
      return NextResponse.json(
        { error: 'This invitation has expired.', expired: true },
        { status: 410 }
      );
    }

    if (invite.status === 'revoked') {
      return NextResponse.json(
        { error: 'This invitation has been revoked.', revoked: true },
        { status: 410 }
      );
    }

    return NextResponse.json({
      success: true,
      invite,
      workspace: {
        id: invite.workspace_id,
        name: invite.workspace_name || 'Workspace',
        icon: invite.workspace_icon || '👥',
        slug: invite.workspace_slug || 'workspace',
      },
    });
  } catch (error: any) {
    console.error('Error in GET /api/invite/[code]:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch invite.' },
      { status: 500 }
    );
  }
}
