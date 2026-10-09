/**
 * Board People Resolution Utility
 * Gathers and deduplicates all individuals involved in a space/board:
 * - Graph user nodes (space owner, collaborators, invited members, person nodes)
 * - Space manifest creator/members
 * - Authenticated/current user identity
 * - Existing assignees from cards in this board
 */

import { LADGraphNode, LADObject, LADUserRegistry, LADSpaceManifest } from '../standard/types';

export interface BoardPerson {
  id: string;
  name: string;
  email?: string;
  role?: 'owner' | 'editor' | 'viewer' | 'collaborator' | 'member' | string;
  isCurrentUser?: boolean;
  nodeId?: string;
}

export function formatNameFromEmail(email: string): string {
  if (!email || !email.includes('@')) return email;
  const prefix = email.split('@')[0];
  const parts = prefix.split(/[._-]/).filter(Boolean);
  if (parts.length > 0) {
    return parts.map((p) => p.charAt(0).toUpperCase() + p.slice(1)).join(' ');
  }
  return prefix;
}

export function getPeopleInBoard(params: {
  nodes?: LADGraphNode[];
  objects?: LADObject[];
  userRegistry?: LADUserRegistry | null;
  activeManifest?: LADSpaceManifest | null;
  currentUserEmail?: string;
}): BoardPerson[] {
  const { nodes = [], objects = [], userRegistry, activeManifest, currentUserEmail } = params;

  const peopleMap = new Map<string, BoardPerson>();

  // 1. Current User Identity
  const localIdentity = userRegistry?.identities?.[0];
  const localEmail = currentUserEmail || localIdentity?.email;
  const localName =
    localIdentity?.display_name && localIdentity.display_name !== 'LAD User'
      ? localIdentity.display_name
      : localEmail
      ? formatNameFromEmail(localEmail)
      : 'You';

  const currentUserId = userRegistry?.user_id;

  // 2. Process Graph User Nodes
  const userNodes = nodes.filter((n) => n.type === 'user');

  for (const node of userNodes) {
    let email: string | undefined = node.metadata?.email;
    if (!email && node.label.includes('@') && !node.label.endsWith('@ladboard.local')) {
      email = node.label.trim();
    }
    if (email === 'user@ladboard.local') {
      email = undefined;
    }

    const isCurrent =
      Boolean(
        (currentUserId &&
          (node.ref_id === currentUserId ||
            node.node_id === currentUserId ||
            node.node_id === `node_${currentUserId}`)) ||
          (localEmail && email && email.toLowerCase() === localEmail.toLowerCase())
      );

    const isOwner = Boolean(
      (activeManifest?.created_by &&
        (node.ref_id === activeManifest.created_by ||
          node.node_id === activeManifest.created_by ||
          node.node_id === `node_${activeManifest.created_by}`)) ||
        node.metadata?.role === 'owner'
    );

    let role = node.metadata?.role || (isOwner ? 'owner' : undefined);

    let displayName: string;
    if (isCurrent) {
      displayName = localName;
    } else {
      const candidate =
        node.metadata?.display_name ||
        node.metadata?.name ||
        node.metadata?.invited_name ||
        (!node.label.includes('@') && node.label !== 'Current User' && node.label !== 'Owner'
          ? node.label
          : undefined);

      if (candidate && candidate.trim()) {
        displayName = candidate.trim();
      } else if (email) {
        displayName = formatNameFromEmail(email);
      } else {
        displayName = node.label || 'Collaborator';
      }
    }

    const normalizedKey = (email ? email.toLowerCase() : displayName.toLowerCase()).trim();

    if (!peopleMap.has(normalizedKey)) {
      peopleMap.set(normalizedKey, {
        id: node.node_id,
        name: displayName,
        email,
        role: role || (isOwner ? 'owner' : 'member'),
        isCurrentUser: isCurrent,
        nodeId: node.node_id,
      });
    } else {
      // Merge node ID and role if existing record lacked them
      const existing = peopleMap.get(normalizedKey)!;
      if (!existing.nodeId) existing.nodeId = node.node_id;
      if (!existing.role && role) existing.role = role;
      if (!existing.email && email) existing.email = email;
    }
  }

  // 3. Ensure Current User is present
  const currentKey = (localEmail ? localEmail.toLowerCase() : localName.toLowerCase()).trim();
  if (!peopleMap.has(currentKey)) {
    peopleMap.set(currentKey, {
      id: currentUserId || 'usr_current',
      name: localName,
      email: localEmail,
      role: activeManifest?.created_by === currentUserId ? 'owner' : 'member',
      isCurrentUser: true,
      nodeId: currentUserId ? `node_${currentUserId}` : undefined,
    });
  }

  // 4. Ensure Space Manifest Owner is represented
  if (activeManifest?.created_by) {
    const ownerNode = nodes.find(
      (n) =>
        n.type === 'user' &&
        (n.ref_id === activeManifest.created_by ||
          n.node_id === activeManifest.created_by ||
          n.node_id === `node_${activeManifest.created_by}`)
    );
    if (!ownerNode && activeManifest.created_by !== currentUserId) {
      const ownerKey = activeManifest.created_by.toLowerCase();
      if (!peopleMap.has(ownerKey)) {
        peopleMap.set(ownerKey, {
          id: activeManifest.created_by,
          name: 'Space Owner',
          role: 'owner',
          isCurrentUser: false,
        });
      }
    }
  }

  // 5. Distinct Assignees from existing cards
  for (const obj of objects) {
    const assignee = obj.assigned_to?.trim();
    if (assignee) {
      const normalized = assignee.toLowerCase();
      // Check if already captured by name or email
      const alreadyCaptured = Array.from(peopleMap.values()).some(
        (p) =>
          p.name.toLowerCase() === normalized ||
          (p.email && p.email.toLowerCase() === normalized) ||
          p.id === assignee ||
          p.nodeId === assignee
      );

      if (!alreadyCaptured) {
        peopleMap.set(`assignee_${normalized}`, {
          id: `assignee_${normalized}`,
          name: assignee,
          role: 'member',
          isCurrentUser: false,
        });
      }
    }

    // Also check patient field if present in medical cards
    const patient = obj.attributes?.patient?.trim();
    if (patient && patient !== 'Me') {
      const normalized = patient.toLowerCase();
      const alreadyCaptured = Array.from(peopleMap.values()).some(
        (p) => p.name.toLowerCase() === normalized || p.id === patient
      );
      if (!alreadyCaptured) {
        peopleMap.set(`assignee_${normalized}`, {
          id: `assignee_${normalized}`,
          name: patient,
          role: 'member',
          isCurrentUser: false,
        });
      }
    }
  }

  // Convert to array and sort:
  // - Other collaborators / members first, then current user, or current user then others
  // Let's place current user at top if available, followed by other members sorted alphabetically by name
  const list = Array.from(peopleMap.values());
  return list.sort((a, b) => {
    if (a.isCurrentUser && !b.isCurrentUser) return -1;
    if (!a.isCurrentUser && b.isCurrentUser) return 1;
    return a.name.localeCompare(b.name, undefined, { sensitivity: 'base' });
  });
}
