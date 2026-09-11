import nodemailer from 'nodemailer';
import { getPublicSiteUrl } from '@/lib/url';

export interface SendInviteEmailParams {
  to: string | string[];
  inviteCode?: string;
  workspaceName?: string;
  senderName?: string;
  workspaceId?: string;
  workspaceIcon?: string;
  role?: string;
}

export interface EmailSendResult {
  recipient: string;
  success: boolean;
  messageId?: string;
  error?: string;
}

/**
 * Helper to construct an enriched, self-healing invite URL with embedded workspace metadata.
 */
export function buildInviteUrl({
  inviteCode,
  workspaceId,
  workspaceName,
  workspaceIcon,
  role,
  email,
}: {
  inviteCode: string;
  workspaceId?: string;
  workspaceName?: string;
  workspaceIcon?: string;
  role?: string;
  email?: string;
}): string {
  const siteUrl = getPublicSiteUrl();
  const params = new URLSearchParams();
  if (workspaceId) params.set('ws', workspaceId);
  if (workspaceName) params.set('name', workspaceName);
  if (workspaceIcon) params.set('icon', workspaceIcon);
  if (role) params.set('role', role);
  if (email) params.set('email', email);
  const qs = params.toString();
  return `${siteUrl}/invite/${inviteCode}${qs ? `?${qs}` : ''}`;
}

/**
 * Creates and returns a configured Nodemailer transporter.
 * Supports Gmail or any generic SMTP provider (Resend SMTP, SendGrid, Amazon SES, Mailgun, Brevo, etc.).
 */
export function getMailTransporter() {
  const host = process.env.SMTP_HOST || process.env.EMAIL_HOST;
  const port = parseInt(process.env.SMTP_PORT || process.env.EMAIL_PORT || '587', 10);
  const secure = process.env.SMTP_SECURE === 'true' || port === 465;
  const user = process.env.SMTP_USER || process.env.GMAIL_USER || process.env.EMAIL_USER;
  const rawPass = process.env.SMTP_PASS || process.env.GMAIL_APP_PASSWORD || process.env.EMAIL_PASS;
  const pass = rawPass?.trim().replace(/\s+/g, '');
  const service = process.env.SMTP_SERVICE || (!host && user?.endsWith('@gmail.com') ? 'gmail' : undefined);

  if (!user || !pass) {
    throw new Error(
      'SMTP credentials missing. Please set SMTP_USER and SMTP_PASS (or GMAIL_USER and GMAIL_APP_PASSWORD) in your environment variables.'
    );
  }

  if (service) {
    return nodemailer.createTransport({
      service,
      auth: { user, pass },
    });
  }

  return nodemailer.createTransport({
    host: host || 'smtp.gmail.com',
    port,
    secure,
    auth: { user, pass },
  });

}

export function getRecipientName(email: string): string {
  const localPart = email.split('@')[0] || '';
  const clean = localPart.replace(/[0-9]+$/g, '').replace(/[._-]+/g, ' ').trim();
  if (!clean) return 'there';
  return clean
    .split(' ')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ');
}

export function generateInviteEmailContent(
  email: string,
  inviteCode?: string,
  workspaceName?: string,
  workspaceId?: string,
  workspaceIcon?: string,
  role?: string
) {
  const username = getRecipientName(email);
  const siteUrl = getPublicSiteUrl();
  const loginUrl = `${siteUrl}/login`;
  const inviteUrl = inviteCode
    ? buildInviteUrl({ inviteCode, workspaceId, workspaceName, workspaceIcon, role, email })
    : loginUrl;


  const plainText = `Hey ${username}, hope you’re doing well!
I am Subhadeep and I’ve been working on an application called Synapse — a productivity and knowledge-management platform with combined features of tools like Notion, Obsidian, Evernote, and Trello, with a few additional features of its own.
It’s now live, and I’d love for you to have a look:
Synapse: ${loginUrl}${inviteCode ? `\nWorkspace Invite: ${inviteUrl}` : ''}
Feel free to explore it whenever you get a chance. And if you come across any bugs, things that could be improved, or simply have an idea that could make the product better, please feel free to reach out.
Would love to hear what you think!
Thanks,
Subhadeep`;

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Invitation to explore Synapse</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #0c0d12; color: #e2e8f0; line-height: 1.6;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #0c0d12; padding: 32px 16px;">
    <tr>
      <td align="center">
        <table width="100%" max-width="580" cellpadding="0" cellspacing="0" border="0" style="max-width: 580px; background: #13151f; border: 1px solid rgba(255, 255, 255, 0.08); border-radius: 16px; overflow: hidden; box-shadow: 0 20px 40px rgba(0,0,0,0.5);">
          <!-- Header Banner -->
          <tr>
            <td style="padding: 32px 32px 20px; background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%);">
              <table width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td>
                    <div style="font-size: 26px; font-weight: 800; color: #ffffff; letter-spacing: -0.5px;">⚡ Synapse</div>
                    <div style="font-size: 13px; color: rgba(255, 255, 255, 0.85); margin-top: 4px;">Knowledge & Work OS${workspaceName ? ` • ${workspaceName}` : ''}</div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Main Content -->
          <tr>
            <td style="padding: 32px; font-size: 15px; color: #cbd5e1;">
              <p style="margin-top: 0; font-size: 16px; font-weight: 600; color: #f8fafc;">
                Hey ${username}, hope you’re doing well!
              </p>

              <p style="margin: 16px 0; color: #cbd5e1;">
                I am <strong>Subhadeep</strong> and I’ve been working on an application called <strong>Synapse</strong> — a productivity and knowledge-management platform with combined features of tools like Notion, Obsidian, Evernote, and Trello, with a few additional features of its own.
              </p>

              <p style="margin: 16px 0; color: #cbd5e1;">
                It’s now live, and I’d love for you to have a look:
              </p>

              <!-- CTA Button -->
              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin: 28px 0;">
                <tr>
                  <td align="center">
                    <a href="${inviteUrl}" target="_blank" style="display: inline-block; padding: 14px 28px; background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); color: #ffffff; text-decoration: none; font-weight: 700; font-size: 15px; border-radius: 10px; box-shadow: 0 4px 14px rgba(99, 102, 241, 0.4); text-align: center;">
                      ${inviteCode ? 'Accept Workspace Invite 🚀' : 'Explore Synapse 🚀'}
                    </a>
                  </td>
                </tr>
              </table>

              <div style="background: rgba(255, 255, 255, 0.03); border: 1px solid rgba(255, 255, 255, 0.08); border-radius: 10px; padding: 16px; margin: 20px 0; font-size: 13px; color: #94a3b8;">
                <div style="margin-bottom: 4px;"><strong>Direct URL:</strong></div>
                <a href="${inviteUrl}" style="color: #818cf8; word-break: break-all; text-decoration: none;">${inviteUrl}</a>
                ${inviteCode ? `<div style="margin-top: 8px;"><strong>Invite Code:</strong> <code style="background: rgba(99, 102, 241, 0.15); padding: 2px 6px; border-radius: 4px; color: #a5b4fc;">${inviteCode}</code></div>` : ''}
              </div>

              <p style="margin: 16px 0; color: #cbd5e1;">
                Feel free to explore it whenever you get a chance. And if you come across any bugs, things that could be improved, or simply have an idea that could make the product better, please feel free to reach out.
              </p>

              <p style="margin: 20px 0 0; color: #f8fafc; font-weight: 500;">
                Would love to hear what you think!<br>
                <span style="display: inline-block; margin-top: 8px;">Thanks,<br><strong>Subhadeep</strong></span>
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 20px 32px; background: rgba(0, 0, 0, 0.25); border-top: 1px solid rgba(255, 255, 255, 0.06); text-align: center; font-size: 12px; color: #64748b;">
              Synapse Knowledge & Work OS • Built with modern web standards
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  return { plainText, html, subject: 'Invitation to explore Synapse' };
}

export async function sendInviteEmail({
  to,
  inviteCode,
  workspaceName,
  workspaceId,
  workspaceIcon,
  role,
}: SendInviteEmailParams): Promise<EmailSendResult> {
  const cleanTo = (Array.isArray(to) ? to[0] : to).trim().toLowerCase();
  try {
    const transporter = getMailTransporter();
    const user = process.env.SMTP_USER || process.env.GMAIL_USER || process.env.EMAIL_USER;
    const from = process.env.EMAIL_FROM || process.env.SMTP_FROM || `"Subhadeep via Synapse" <${user}>`;

    const { plainText, html, subject } = generateInviteEmailContent(
      cleanTo,
      inviteCode,
      workspaceName,
      workspaceId,
      workspaceIcon,
      role
    );

    const info = await transporter.sendMail({
      from,
      to: cleanTo,
      subject,
      text: plainText,
      html,
    });

    return {
      recipient: cleanTo,
      success: true,
      messageId: info.messageId,
    };
  } catch (error: any) {
    return {
      recipient: cleanTo,
      success: false,
      error: error.message || 'Unknown error while sending email',
    };
  }
}
