import { NextRequest, NextResponse } from 'next/server';
import { serverInvites, StoredServerInvite } from '@/lib/server-invites';

/**
 * POST /api/invite
 * Persists one or more workspace invites on the server
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { invite, invites } = body;

    const listToSave: StoredServerInvite[] = [];

    if (Array.isArray(invites) && invites.length > 0) {
      listToSave.push(...invites);
    } else if (invite && invite.invite_code) {
      listToSave.push(invite);
    }

    if (listToSave.length === 0) {
      return NextResponse.json(
        { error: 'No valid invite data provided in request body.' },
        { status: 400 }
      );
    }

    const saved = await serverInvites.saveInvites(listToSave);

    return NextResponse.json({
      success: true,
      count: saved.length,
      invites: saved,
    });
  } catch (error: any) {
    console.error('Error in POST /api/invite:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to save invite(s)' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/invite?code=syn-xxx
 * Retrieve an invite by code
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const code = searchParams.get('code');

    if (!code) {
      return NextResponse.json(
        { error: 'Missing required query parameter "code"' },
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
    return NextResponse.json(
      { error: error.message || 'Failed to fetch invite' },
      { status: 500 }
    );
  }
}
