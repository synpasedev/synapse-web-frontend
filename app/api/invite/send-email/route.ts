import { NextRequest, NextResponse } from 'next/server';
import { sendInviteEmail, EmailSendResult } from '@/lib/email/nodemailer';
import { serverInvites, StoredServerInvite } from '@/lib/server-invites';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      to,
      recipients,
      inviteCode,
      inviteCodes,
      workspaceName,
      workspaceId,
      workspaceIcon,
      role = 'editor',
      invites,
    } = body;

    const emailList: string[] = [];
    if (Array.isArray(recipients) && recipients.length > 0) {
      emailList.push(...recipients);
    } else if (typeof to === 'string' && to.trim()) {
      emailList.push(to.trim());
    }

    if (emailList.length === 0) {
      return NextResponse.json(
        { error: 'No recipient email addresses provided.' },
        { status: 400 }
      );
    }

    // Persist all invites on server so they can be resolved from any client/browser
    const invitesToPersist: StoredServerInvite[] = [];
    const now = new Date().toISOString();
    const oneWeekLater = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

    if (Array.isArray(invites) && invites.length > 0) {
      invitesToPersist.push(...invites);
    } else {
      for (const email of emailList) {
        const code = inviteCodes?.[email.toLowerCase()] || inviteCode;
        if (code) {
          invitesToPersist.push({
            id: `inv-${code.replace(/^syn-/, '')}`,
            workspace_id: workspaceId || 'ws-default-synapse',
            workspace_name: workspaceName || 'Workspace',
            workspace_icon: workspaceIcon || '👥',
            email: email.toLowerCase().trim(),
            role,
            invite_code: code,
            created_by: 'system',
            created_at: now,
            expires_at: oneWeekLater,
            status: 'pending',
          });
        }
      }
    }

    if (invitesToPersist.length > 0) {
      await serverInvites.saveInvites(invitesToPersist);
    }

    // Check if SMTP environment variables are defined
    const hasSmtpCreds = Boolean(
      (process.env.SMTP_USER || process.env.GMAIL_USER || process.env.EMAIL_USER) &&
      (process.env.SMTP_PASS || process.env.GMAIL_APP_PASSWORD || process.env.EMAIL_PASS)
    );

    if (!hasSmtpCreds) {
      return NextResponse.json(
        {
          error:
            'Nodemailer SMTP credentials are not configured on the server. Please define SMTP_USER and SMTP_PASS (or GMAIL_USER and GMAIL_APP_PASSWORD) in your environment variables.',
          missingConfig: true,
        },
        { status: 400 }
      );
    }

    const results: EmailSendResult[] = [];
    for (const email of emailList) {
      const code = inviteCodes?.[email.toLowerCase()] || inviteCode;
      const res = await sendInviteEmail({
        to: email,
        inviteCode: code,
        workspaceName,
        workspaceId,
        workspaceIcon,
        role,
      });
      results.push(res);
    }

    const sentCount = results.filter((r) => r.success).length;
    const failedCount = results.filter((r) => !r.success).length;

    if (sentCount === 0) {
      const firstError = results.find((r) => !r.success)?.error || 'Failed to deliver email via SMTP.';
      return NextResponse.json(
        {
          error: firstError,
          success: false,
          results,
          summary: {
            total: emailList.length,
            sent: 0,
            failed: failedCount,
          },
        },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      results,
      summary: {
        total: emailList.length,
        sent: sentCount,
        failed: failedCount,
      },
    });

  } catch (error: any) {
    console.error('Error in send-invite API route:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to send invite email(s) via Nodemailer.' },
      { status: 500 }
    );
  }
}
