import { IStorageProvider } from '../storage/provider.interface';
import { LADSpaceManifest, LADGraphNode } from '../standard/types';

export interface SendInviteEmailParams {
  toEmail: string;
  invitedName?: string;
  spaceName: string;
  spaceId: string;
  inviterName: string;
  inviterEmail: string;
  role: 'editor' | 'viewer';
  joinUrl: string;
}

export interface DriveShareResult {
  success: boolean;
  permissionId?: string;
  error?: string;
}

export interface GmailDispatchResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

export interface SpaceInviteVerificationResult {
  isValid: boolean;
  manifest?: LADSpaceManifest;
  role?: string;
  invitedEmail?: string;
  invitedName?: string;
  inviterName?: string;
  invitationId?: string;
  error?: 'MANIFEST_NOT_FOUND' | 'IDENTITY_MISMATCH' | 'SPACE_UNAVAILABLE' | string;
}

/**
 * Generates the canonical shareable join URL respecting GitHub Pages repository paths
 */
export function getShareableJoinUrl(spaceId: string): string {
  if (typeof window === 'undefined') return `https://ladboard.app/?join=${spaceId}`;
  const origin = window.location.origin;
  const pathname = window.location.pathname.replace(/\/+$/, '');
  return `${origin}${pathname}/?join=${spaceId}`;
}

/**
 * Step 3: Shares the Space's Google Drive folder with the invited Google account
 */
export async function shareSpaceDriveFolder(
  accessToken: string,
  folderId: string,
  targetEmail: string,
  role: 'editor' | 'viewer' = 'editor'
): Promise<DriveShareResult> {
  try {
    const driveRole = role === 'editor' ? 'writer' : 'reader';
    const url = `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(
      folderId
    )}/permissions?sendNotificationEmail=false&supportsAllDrives=true`;

    const res = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        role: driveRole,
        type: 'user',
        emailAddress: targetEmail.trim(),
      }),
    });

    if (!res.ok) {
      const errJson = await res.json().catch(() => ({}));
      return {
        success: false,
        error: errJson.error?.message || `Google Drive permission error: ${res.statusText}`,
      };
    }

    const data = await res.json();
    return {
      success: true,
      permissionId: data.id,
    };
  } catch (err: any) {
    return {
      success: false,
      error: err.message || 'Failed to share Google Drive folder',
    };
  }
}

/**
 * Helper to encode string to RFC 4648 Base64URL
 */
function base64UrlEncode(str: string): string {
  const bytes = new TextEncoder().encode(str);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

/**
 * Step 4: Dispatches a formatted invitation email to User B via the Gmail API
 */
export async function sendGmailInvitation(
  accessToken: string,
  params: SendInviteEmailParams
): Promise<GmailDispatchResult> {
  try {
    const subject = `Invitation to join "${params.spaceName}" on LAD Board`;
    const greetingName = params.invitedName ? params.invitedName : params.toEmail.split('@')[0];

    const emailBodyLines = [
      `From: ${params.inviterName} <${params.inviterEmail}>`,
      `To: ${params.toEmail}`,
      `Subject: =?utf-8?B?${btoa(unescape(encodeURIComponent(subject)))}?=`,
      'MIME-Version: 1.0',
      'Content-Type: text/html; charset=UTF-8',
      '',
      `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; color: #1e293b; padding: 24px; }
    .container { max-width: 560px; margin: 0 auto; background: #ffffff; border-radius: 20px; border: 1px solid #e2e8f0; padding: 32px; box-shadow: 0 4px 20px rgba(0,0,0,0.05); }
    .logo { display: inline-block; background: #2563eb; color: #ffffff; font-weight: 900; font-size: 14px; padding: 6px 12px; border-radius: 10px; margin-bottom: 20px; }
    h1 { font-size: 22px; font-weight: 800; color: #0f172a; margin-top: 0; }
    p { font-size: 14px; line-height: 1.6; color: #475569; }
    .card { background: #f1f5f9; border-radius: 14px; padding: 18px; margin: 24px 0; border: 1px solid #e2e8f0; }
    .card-row { display: flex; justify-content: space-between; margin-bottom: 8px; font-size: 13px; }
    .card-label { color: #64748b; font-weight: 600; }
    .card-val { color: #0f172a; font-weight: 700; }
    .btn { display: inline-block; background: #2563eb; color: #ffffff !important; font-weight: 700; font-size: 14px; padding: 12px 28px; border-radius: 12px; text-decoration: none; margin: 16px 0; }
    .footer { font-size: 11px; color: #94a3b8; margin-top: 24px; border-top: 1px solid #f1f5f9; padding-top: 16px; }
    .highlight { background: #eff6ff; color: #1d4ed8; padding: 2px 6px; border-radius: 6px; font-weight: 600; }
  </style>
</head>
<body>
  <div class="container">
    <div class="logo">LAD Board</div>
    <h1>You've been invited to join a Space</h1>
    <p>Hi <strong>${greetingName}</strong>,</p>
    <p><strong>${params.inviterName}</strong> (${params.inviterEmail}) has invited you to collaborate in the <strong>${params.spaceName}</strong> space on LAD Board.</p>
    
    <div class="card">
      <div class="card-row"><span class="card-label">Space Name:</span> <span class="card-val">${params.spaceName}</span></div>
      <div class="card-row"><span class="card-label">Space ID:</span> <span class="card-val" style="font-family: monospace;">${params.spaceId}</span></div>
      <div class="card-row"><span class="card-label">Assigned Role:</span> <span class="card-val">${params.role.toUpperCase()}</span></div>
      <div class="card-row"><span class="card-label">Invited Google Account:</span> <span class="card-val">${params.toEmail}</span></div>
    </div>

    <p style="font-size: 13px; color: #64748b;">
      ⚠️ <strong>Security Notice:</strong> To access this space, please ensure you sign into LAD Board using your invited Google account (<span class="highlight">${params.toEmail}</span>).
    </p>

    <div style="text-align: center; margin: 28px 0;">
      <a href="${params.joinUrl}" class="btn" target="_blank">Accept Invitation & Open LAD Board</a>
    </div>

    <p style="font-size: 12px; color: #94a3b8; word-break: break-all;">
      Or copy and paste this link into your browser:<br/>
      <a href="${params.joinUrl}" style="color: #2563eb;">${params.joinUrl}</a>
    </p>

    <div class="footer">
      LAD Board • Living Active Dynamic Board • LAD Standard 1.0
    </div>
  </div>
</body>
</html>`,
    ];

    const rawMessage = emailBodyLines.join('\r\n');
    const encoded = base64UrlEncode(rawMessage);

    const res = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ raw: encoded }),
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      return {
        success: false,
        error: errData.error?.message || `Gmail API error: ${res.statusText}`,
      };
    }

    const data = await res.json();
    return {
      success: true,
      messageId: data.id,
    };
  } catch (err: any) {
    return {
      success: false,
      error: err.message || 'Failed to dispatch Gmail invitation',
    };
  }
}

/**
 * Step 7-9: Strictly verifies user identity, space manifest, and invitation state
 */
export async function validateSpaceAccessAndInvitation(
  storage: IStorageProvider,
  spaceId: string,
  userEmail: string
): Promise<SpaceInviteVerificationResult> {
  try {
    // 1. Read space manifest
    const manifest = await storage.readFile<LADSpaceManifest>(`LAD/${spaceId}/manifest.json`);
    if (!manifest) {
      return {
        isValid: false,
        error: 'MANIFEST_NOT_FOUND',
      };
    }

    // 2. Read graph nodes to locate user membership or invitation
    const nodes = (await storage.readFile<LADGraphNode[]>(`LAD/${spaceId}/graph/nodes.json`)) || [];
    const normalizedEmail = userEmail.trim().toLowerCase();

    // Check for matching node
    const matchingNode = nodes.find((n) => {
      const nodeEmail = (n.metadata?.email || (n.label.includes('@') ? n.label : '')).trim().toLowerCase();
      return nodeEmail === normalizedEmail;
    });

    // Check if creator matches
    const isCreator = manifest.created_by && manifest.created_by.toLowerCase() === normalizedEmail;

    if (!matchingNode && !isCreator) {
      const invitedEmails = nodes
        .filter((n) => n.type === 'user' && n.metadata?.status === 'invited')
        .map((n) => n.metadata?.email)
        .filter(Boolean);

      return {
        isValid: false,
        manifest,
        invitedEmail: invitedEmails[0],
        error: 'IDENTITY_MISMATCH',
      };
    }

    const role = (matchingNode?.metadata?.role as string) || (isCreator ? 'owner' : 'editor');
    const invitedName = matchingNode?.metadata?.name || matchingNode?.label;
    const inviterNode = nodes.find((n) => n.metadata?.role === 'owner');

    return {
      isValid: true,
      manifest,
      role,
      invitedEmail: normalizedEmail,
      invitedName,
      inviterName: inviterNode?.metadata?.name || inviterNode?.label || 'Space Owner',
      invitationId: matchingNode?.metadata?.invitation_id,
    };
  } catch (err: any) {
    return {
      isValid: false,
      error: err.message || 'SPACE_UNAVAILABLE',
    };
  }
}

