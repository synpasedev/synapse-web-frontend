import { NextRequest, NextResponse } from 'next/server';
import { serverInvites } from '@/lib/server-invites';

/**
 * POST /api/invite/[code]/accept
 * Accept an invite on the server
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    const { code } = await params;
    const body = await req.json().catch(() => ({}));
    const { userEmail, userName } = body;

    if (!code) {
      return NextResponse.json(
        { error: 'Invite code parameter is required.' },
        { status: 400 }
      );
    }

    const accepted = await serverInvites.acceptInvite(code, userEmail, userName);
    if (!accepted) {
      return NextResponse.json(
        { error: 'Invitation link is invalid or has expired.' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      workspaceId: accepted.workspace_id,
      role: accepted.role,
      workspace: {
        id: accepted.workspace_id,
        name: accepted.workspace_name || 'Workspace',
        icon: accepted.workspace_icon || '👥',
      },
    });
  } catch (error: any) {
    console.error('Error in POST /api/invite/[code]/accept:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to accept invitation.' },
      { status: 500 }
    );
  }
}
