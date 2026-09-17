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
  console.log(`[LAD:Invitation] 🤝 Sharing Google Drive folder ${folderId} with ${targetEmail} as ${role}...`);
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
      const errorMsg = errJson.error?.message || `Google Drive permission error: ${res.statusText}`;
      console.error(`[LAD:Invitation] ❌ Failed to share folder with ${targetEmail}:`, errorMsg);
      return {
        success: false,
        error: errorMsg,
      };
    }

    const data = await res.json();
    console.log(`[LAD:Invitation] ✅ Successfully granted Google Drive permission ${data.id} to ${targetEmail}`);
    return {
      success: true,
      permissionId: data.id,
    };
  } catch (err: any) {
    console.error(`[LAD:Invitation] ❌ Exception in shareSpaceDriveFolder:`, err);
    return {
      success: false,
      error: err.message || 'Failed to share Google Drive folder',
    };
  }
}

/**
 * Revokes Google Drive folder permissions for a user by email
 */
export async function revokeSpaceDrivePermission(
  accessToken: string,
  folderId: string,
  targetEmail: string
): Promise<{ success: boolean; error?: string }> {
  console.log(`[LAD:Sharing] 🚫 Revoking Google Drive folder ${folderId} permission for ${targetEmail}...`);
  try {
    const listUrl = `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(
      folderId
    )}/permissions?fields=permissions(id,emailAddress,role)&supportsAllDrives=true`;

    const listRes = await fetch(listUrl, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!listRes.ok) {
      const errJson = await listRes.json().catch(() => ({}));
      const errorMsg = errJson.error?.message || `Google Drive list permissions error: ${listRes.statusText}`;
      console.warn(`[LAD:Sharing] Could not list permissions for folder ${folderId}:`, errorMsg);
      return { success: false, error: errorMsg };
    }

    const data = await listRes.json();
    const permissions: Array<{ id: string; emailAddress?: string }> = data.permissions || [];
    const targetPerm = permissions.find(
      (p) => (p.emailAddress || '').toLowerCase().trim() === targetEmail.toLowerCase().trim()
    );

    if (!targetPerm) {
      console.log(`[LAD:Sharing] No active Drive permission found for ${targetEmail}`);
      return { success: true };
    }

    const deleteUrl = `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(
      folderId
    )}/permissions/${encodeURIComponent(targetPerm.id)}?supportsAllDrives=true`;

    const delRes = await fetch(deleteUrl, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!delRes.ok && delRes.status !== 204 && delRes.status !== 404) {
      const errJson = await delRes.json().catch(() => ({}));
      const errorMsg = errJson.error?.message || `Google Drive revoke permission error: ${delRes.statusText}`;
      console.warn(`[LAD:Sharing] Failed to delete permission ${targetPerm.id}:`, errorMsg);
      return { success: false, error: errorMsg };
    }

    console.log(`[LAD:Sharing] ✅ Successfully revoked Google Drive permission for ${targetEmail}`);
    return { success: true };
  } catch (err: any) {
    console.error(`[LAD:Sharing] ❌ Exception in revokeSpaceDrivePermission:`, err);
    return { success: false, error: err.message || 'Failed to revoke Google Drive permission' };
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

    console.log(`[LAD:Invitation] 📧 Sending invitation email via Gmail API to ${params.toEmail}...`);

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
      const errorMsg = errData.error?.message || `Gmail API error: ${res.statusText}`;
      console.warn(`[LAD:Invitation] ⚠️ Gmail API send failed for ${params.toEmail}:`, errorMsg);
      return {
        success: false,
        error: errorMsg,
      };
    }

    const data = await res.json();
    console.log(`[LAD:Invitation] ✅ Gmail invitation successfully sent to ${params.toEmail} (messageId: ${data.id})`);
    return {
      success: true,
      messageId: data.id,
    };
  } catch (err: any) {
    console.warn(`[LAD:Invitation] ⚠️ Gmail dispatch error:`, err);
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
  console.log(`[LAD:Invitation] 🔍 Validating space access for spaceId: "${spaceId}", userEmail: "${userEmail}" using ${storage.name}...`);
  try {
    // 1. Read space manifest
    const manifestPath = `LAD/${spaceId}/manifest.json`;
    console.log(`[LAD:Invitation] Checking manifest at "${manifestPath}"...`);
    const manifest = await storage.readFile<LADSpaceManifest>(manifestPath);
    if (!manifest) {
      console.warn(`[LAD:Invitation] ❌ Space manifest NOT found at "${manifestPath}"`);
      return {
        isValid: false,
        error: 'MANIFEST_NOT_FOUND',
      };
    }
    console.log(`[LAD:Invitation] ✅ Found manifest for "${manifest.space_name}" (${manifest.space_id})`);

    // 2. Read graph nodes to locate user membership or invitation
    const nodesPath = `LAD/${spaceId}/graph/nodes.json`;
    console.log(`[LAD:Invitation] Reading graph nodes at "${nodesPath}"...`);
    const nodes = (await storage.readFile<LADGraphNode[]>(nodesPath)) || [];
    console.log(`[LAD:Invitation] Found ${nodes.length} graph nodes`);

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

      console.warn(`[LAD:Invitation] ❌ Identity mismatch: currentUser="${normalizedEmail}", invited=${JSON.stringify(invitedEmails)}`);

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

    console.log(`[LAD:Invitation] ✅ Space access validated successfully! Role: ${role}, invitedName: ${invitedName}`);

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
    console.error(`[LAD:Invitation] ❌ Exception during validateSpaceAccessAndInvitation:`, err);
    return {
      isValid: false,
      error: err.message || 'SPACE_UNAVAILABLE',
    };
  }
}

