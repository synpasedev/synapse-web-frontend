import { NextRequest, NextResponse } from 'next/server';
import { serverInvites, checkRateLimit } from '@/lib/server-invites';
import { serverStore } from '@/lib/server-store';

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

    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'anon';
    if (!checkRateLimit(`invite_get_${ip}`, 60, 60000)) {
      return NextResponse.json(
        { error: 'Too many requests. Please try again in a moment.' },
        { status: 429 }
      );
    }

    const invite = await serverInvites.getInvite(code);
    if (!invite) {
      return NextResponse.json(
        { error: 'Invitation link is invalid or has expired.' },
        { status: 404 }
      );
    }

    if (serverStore.isWorkspaceDeleted(invite.workspace_id)) {
      return NextResponse.json(
        { error: 'This workspace has been deleted by its owner.', deleted: true, workspaceDeleted: true },
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

    if (invite.status === 'consumed') {
      return NextResponse.json(
        { error: 'This invitation has already been accepted and cannot be reused.', consumed: true },
        { status: 409 }
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
