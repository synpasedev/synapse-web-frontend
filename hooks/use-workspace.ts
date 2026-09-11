import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { localDb } from '@/lib/dexie/db';
import { ensureSeedData } from '@/lib/dexie/seed';
import { Workspace, WorkspaceMember, WorkspaceInvite, WorkspaceRole, WorkspaceType, Note } from '@/types/domain';

export function useWorkspace(workspaceId: string) {
  return useQuery({
    queryKey: ['workspace', workspaceId],
    queryFn: async (): Promise<Workspace | null> => {
      await ensureSeedData();
      const ws = await localDb.workspaces.get(workspaceId);
      if (!ws) return null;

      const membersCount = await localDb.workspace_members
        .where('workspace_id')
        .equals(workspaceId)
        .count();

      return {
        ...ws,
        type: ws.type || 'private',
        role: ws.role || 'owner',
        members_count: Math.max(1, membersCount),
      };
    },
    enabled: Boolean(workspaceId),
  });
}

export function useWorkspaces() {
  return useQuery({
    queryKey: ['workspaces'],
    queryFn: async (): Promise<Workspace[]> => {
      await ensureSeedData();
      const allWorkspaces = await localDb.workspaces.toArray();

      const enriched = await Promise.all(
        allWorkspaces.map(async (ws) => {
          const membersCount = await localDb.workspace_members
            .where('workspace_id')
            .equals(ws.id)
            .count();
          return {
            ...ws,
            type: ws.type || 'private',
            role: ws.role || 'owner',
            members_count: Math.max(1, membersCount),
          };
        })
      );

      return enriched;
    },
  });
}

function getCurrentUserEmailAndName(): { email: string; name: string; id: string } {
  if (typeof window !== 'undefined') {
    const cachedEmail = localStorage.getItem('synapse_current_user_email');
    const cachedName = localStorage.getItem('synapse_current_user_name');
    if (cachedEmail && cachedEmail !== 'user@synapse.local' && cachedEmail !== 'guest@synapse.local') {
      return {
        email: cachedEmail,
        name: cachedName || cachedEmail.split('@')[0],
        id: 'usr-current',
      };
    }

    try {
      const stored = localStorage.getItem('synapse_local_user');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed?.email && parsed.email !== 'user@synapse.local' && parsed.email !== 'guest@synapse.local') {
          return {
            email: parsed.email,
            name: parsed.name || parsed.email.split('@')[0],
            id: parsed.id || 'usr-local',
          };
        }
      }
    } catch {}
  }
  return {
    email: 'user@synapse.local',
    name: 'Workspace Owner',
    id: 'local-user-1',
  };
}

export function useWorkspaceMembers(workspaceId: string) {
  return useQuery({
    queryKey: ['workspace_members', workspaceId],
    queryFn: async (): Promise<WorkspaceMember[]> => {
      await ensureSeedData();
      if (!workspaceId) return [];

      // Fetch shared remote members from server / Supabase
      try {
        const currentUser = getCurrentUserEmailAndName();
        const emailQuery =
          currentUser.email &&
          currentUser.email !== 'user@synapse.local' &&
          currentUser.email !== 'guest@synapse.local'
            ? `?email=${encodeURIComponent(currentUser.email.trim().toLowerCase())}`
            : '';

        const res = await fetch(`/api/workspaces/${encodeURIComponent(workspaceId)}/members${emailQuery}`);
        if (res.ok) {
          const json = await res.json();
          const remoteMembers: WorkspaceMember[] = json.data || [];

          // 1. Eviction detection: ONLY trigger if server authoritatively confirms caller is on eviction denylist
          if (json.isEvicted) {
            await localDb.transaction(
              'rw',
              [localDb.workspaces, localDb.workspace_members, localDb.notes, localDb.blocks],
              async () => {
                await localDb.workspace_members.where('workspace_id').equals(workspaceId).delete();
                await localDb.workspaces.delete(workspaceId);
                await localDb.notes.where('workspace_id').equals(workspaceId).delete();
                await localDb.blocks.where('workspace_id').equals(workspaceId).delete();
              }
            );

            if (typeof window !== 'undefined' && window.location.pathname.includes(workspaceId)) {
              const remaining = await localDb.workspaces.toArray();
              if (remaining.length > 0) {
                window.location.href = `/${remaining[0].id}/notes?evicted=true`;
              } else {
                window.location.href = '/';
              }
            }
            return [];
          }

          // 2. Add or update remote members
          for (const rm of remoteMembers) {
            if (!rm.email) continue;
            const existing = await localDb.workspace_members
              .where('workspace_id')
              .equals(workspaceId)
              .toArray();
            const match = existing.find(
              (m) => m.email?.trim().toLowerCase() === rm.email.trim().toLowerCase()
            );
            if (!match) {
              await localDb.workspace_members.put({
                id: rm.id || `mem-${crypto.randomUUID().slice(0, 8)}`,
                workspace_id: workspaceId,
                user_id: rm.user_id || `usr-${Math.random().toString(36).substring(2, 7)}`,
                name: rm.name,
                email: rm.email,
                role: rm.role || 'editor',
                avatar_url: rm.avatar_url,
                joined_at: rm.joined_at || rm.created_at,
                created_at: rm.created_at || new Date().toISOString(),
                updated_at: rm.updated_at || new Date().toISOString(),
              });
            }
          }

          // 3. Purge non-owner members locally that were removed on server
          if (remoteMembers.length > 0) {
            const remoteEmails = new Set(remoteMembers.map((m) => m.email?.trim().toLowerCase()).filter(Boolean));
            const localExisting = await localDb.workspace_members.where('workspace_id').equals(workspaceId).toArray();
            const toPurgeLocal = localExisting
              .filter((m) => m.role !== 'owner' && m.email && !remoteEmails.has(m.email.trim().toLowerCase()))
              .map((m) => m.id);
            if (toPurgeLocal.length > 0) {
              await localDb.workspace_members.bulkDelete(toPurgeLocal);
            }
          }
        }
      } catch (e) {
        // Fallback to local
      }

      const members = await localDb.workspace_members
        .where('workspace_id')
        .equals(workspaceId)
        .toArray();

      // Auto-heal owner email if it was previously set to 'user@synapse.local'
      const currentUser = getCurrentUserEmailAndName();
      if (currentUser.email && currentUser.email !== 'user@synapse.local') {
        for (const member of members) {
          if (
            member.role === 'owner' &&
            (!member.email || member.email === 'user@synapse.local' || member.email === 'guest@synapse.local')
          ) {
            member.email = currentUser.email;
            member.name = currentUser.name;
            await localDb.workspace_members.update(member.id, {
              email: currentUser.email,
              name: currentUser.name,
            });
          }
        }
      }

      // Auto-deduplicate non-owner members by email
      const seenMemberEmails = new Set<string>();
      const duplicateMemberIds: string[] = [];
      const uniqueMembers: WorkspaceMember[] = [];
      for (const m of members) {
        const key = m.email ? m.email.trim().toLowerCase() : m.id;
        if (m.role !== 'owner' && seenMemberEmails.has(key)) {
          duplicateMemberIds.push(m.id);
        } else {
          seenMemberEmails.add(key);
          uniqueMembers.push(m);
        }
      }
      if (duplicateMemberIds.length > 0) {
        await localDb.workspace_members.bulkDelete(duplicateMemberIds);
      }

      return uniqueMembers;
    },
    enabled: Boolean(workspaceId),
    refetchInterval: 5000,
    refetchOnWindowFocus: true,
  });
}

export function useWorkspaceInvites(workspaceId: string) {
  return useQuery({
    queryKey: ['workspace_invites', workspaceId],
    queryFn: async (): Promise<WorkspaceInvite[]> => {
      await ensureSeedData();
      if (!workspaceId) return [];
      const invites = await localDb.workspace_invites
        .where('workspace_id')
        .equals(workspaceId)
        .toArray();

      // Automatically deduplicate invites by email & invite_code
      // Keep the freshest invite for each email and delete older duplicate rows from IndexedDB
      const seen = new Set<string>();
      const toDelete: string[] = [];
      const uniqueInvites: WorkspaceInvite[] = [];

      // Sort newest first
      const sorted = [...invites].sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );

      for (const inv of sorted) {
        const key = inv.email ? inv.email.trim().toLowerCase() : inv.invite_code;
        if (seen.has(key)) {
          toDelete.push(inv.id);
        } else {
          seen.add(key);
          uniqueInvites.push(inv);
        }
      }

      if (toDelete.length > 0) {
        await localDb.workspace_invites.bulkDelete(toDelete);
      }

      return uniqueInvites;
    },
    enabled: Boolean(workspaceId),
  });
}

export function useCreateWorkspace() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      name,
      icon = '🚀',
      type = 'shared',
    }: {
      name: string;
      icon?: string;
      type: WorkspaceType;
    }): Promise<Workspace> => {
      await ensureSeedData();
      const now = new Date().toISOString();
      const newWsId = `ws-${crypto.randomUUID().slice(0, 8)}`;
      const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || 'workspace';

      const currentUser = getCurrentUserEmailAndName();
      const ownerEmail = currentUser.email !== 'user@synapse.local' ? currentUser.email : 'user@synapse.local';

      const newWorkspace: Workspace = {
        id: newWsId,
        name,
        slug,
        icon,
        owner_id: currentUser.id,
        created_at: now,
        updated_at: now,
        type,
        role: 'owner',
        members_count: 1,
      };

      const ownerMember: WorkspaceMember = {
        id: `mem-${newWsId}-owner`,
        workspace_id: newWsId,
        user_id: currentUser.id,
        name: currentUser.name,
        role: 'owner',
        email: ownerEmail,
        created_at: now,
        updated_at: now,
      };

      // Create an initial welcome note so the new workspace is functional
      const welcomeNote: Note = {
        id: `note-${crypto.randomUUID().slice(0, 8)}`,
        workspace_id: newWsId,
        parent_id: null,
        title: `${name} Home ⚡`,
        icon: icon || '📝',
        cover_url: null,
        is_favorite: true,
        is_archived: false,
        is_public: false,
        created_by: 'local-user-1',
        updated_by: 'local-user-1',
        created_at: now,
        updated_at: now,
        version: 1,
      };

      await localDb.transaction('rw', [localDb.workspaces, localDb.workspace_members, localDb.notes], async () => {
        await localDb.workspaces.put(newWorkspace);
        await localDb.workspace_members.put(ownerMember);
        await localDb.notes.put(welcomeNote);
      });

      return newWorkspace;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workspaces'] });
    },
  });
}

export function useInviteMember() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      workspaceId,
      email,
      role = 'editor',
    }: {
      workspaceId: string;
      email?: string;
      role: WorkspaceRole;
    }): Promise<{ invite: WorkspaceInvite; member?: WorkspaceMember }> => {
      await ensureSeedData();
      const now = new Date().toISOString();
      const inviteCode = `syn-${crypto.randomUUID().replace(/-/g, '').substring(0, 16)}`;

      const newInvite: WorkspaceInvite = {
        id: `inv-${crypto.randomUUID().slice(0, 8)}`,
        workspace_id: workspaceId,
        email: email || undefined,
        role,
        invite_code: inviteCode,
        created_by: 'local-user-1',
        created_at: now,
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        is_public_link: !email,
      };

      let newMember: WorkspaceMember | undefined;

      if (email && email.trim()) {
        const normalizedEmail = email.trim().toLowerCase();

        // 1. Check if owner is inviting themselves (EC-3.3)
        const currentUser = getCurrentUserEmailAndName();
        const existingMembers = await localDb.workspace_members
          .where('workspace_id')
          .equals(workspaceId)
          .toArray();

        const isOwner =
          (currentUser.email && currentUser.email.toLowerCase() === normalizedEmail) ||
          existingMembers.some(
            (m) => m.role === 'owner' && m.email && m.email.trim().toLowerCase() === normalizedEmail
          );
        if (isOwner) {
          throw new Error('You cannot invite yourself to your own workspace.');
        }

        // 2. Check if user is already an existing member of this workspace
        const alreadyMember = existingMembers.find(
          (m) => m.email && m.email.trim().toLowerCase() === normalizedEmail
        );
        if (alreadyMember) {
          throw new Error(
            `"${email.trim()}" is already a member of this workspace (${alreadyMember.role}).`
          );
        }

        // 3. Check if an active invite has already been sent to this user
        const existingInvites = await localDb.workspace_invites
          .where('workspace_id')
          .equals(workspaceId)
          .toArray();

        const alreadyInvited = existingInvites.find(
          (i) =>
            i.email &&
            i.email.trim().toLowerCase() === normalizedEmail &&
            (!i.expires_at || new Date(i.expires_at) > new Date()) &&
            i.status !== 'revoked' &&
            i.status !== 'consumed'
        );
        if (alreadyInvited) {
          throw new Error(
            `An invite has already been sent to "${email.trim()}" (Code: ${alreadyInvited.invite_code}).`
          );
        }

        const memberId = `mem-${crypto.randomUUID().slice(0, 8)}`;
        newMember = {
          id: memberId,
          workspace_id: workspaceId,
          user_id: `usr-${Math.random().toString(36).substring(2, 7)}`,
          role,
          email: email.trim(),
          created_at: now,
          updated_at: now,
        };
      }

      await localDb.transaction('rw', [localDb.workspace_invites, localDb.workspace_members], async () => {
        await localDb.workspace_invites.put(newInvite);
        if (newMember) {
          await localDb.workspace_members.put(newMember);
        }
      });

      // Also register invite and member with server store asynchronously
      try {
        const ws = await localDb.workspaces.get(workspaceId);
        fetch('/api/invite', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            invite: {
              ...newInvite,
              workspace_name: ws?.name || 'Workspace',
              workspace_icon: ws?.icon || '👥',
              workspace_slug: ws?.slug,
            },
          }),
        }).catch((e) => console.warn('[useInviteMember] Server sync notice:', e.message));

        if (newMember) {
          fetch(`/api/workspaces/${encodeURIComponent(workspaceId)}/members`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ member: newMember }),
          }).catch(() => {});
        }
      } catch {}

      return { invite: newInvite, member: newMember };
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['workspace_members', variables.workspaceId] });
      queryClient.invalidateQueries({ queryKey: ['workspace_invites', variables.workspaceId] });
      queryClient.invalidateQueries({ queryKey: ['workspace', variables.workspaceId] });
      queryClient.invalidateQueries({ queryKey: ['workspaces'] });
    },
  });
}

export function useUpdateMemberRole() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      memberId,
      role,
      workspaceId,
    }: {
      memberId: string;
      role: WorkspaceRole;
      workspaceId: string;
    }) => {
      const now = new Date().toISOString();
      await localDb.workspace_members.update(memberId, {
        role,
        updated_at: now,
      });
      return { memberId, role };
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['workspace_members', variables.workspaceId] });
    },
  });
}

export function useRemoveMember() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      memberId,
      workspaceId,
    }: {
      memberId: string;
      workspaceId: string;
    }) => {
      const member = await localDb.workspace_members.get(memberId);
      await localDb.workspace_members.delete(memberId);

      // Record eviction and remove on server (EC-1.1 & EC-1.2)
      if (member?.email) {
        fetch(
          `/api/workspaces/${encodeURIComponent(workspaceId)}/members?email=${encodeURIComponent(member.email)}&memberId=${encodeURIComponent(memberId)}`,
          { method: 'DELETE' }
        ).catch(() => {});
      }
      return { memberId };
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['workspace_members', variables.workspaceId] });
      queryClient.invalidateQueries({ queryKey: ['workspace', variables.workspaceId] });
      queryClient.invalidateQueries({ queryKey: ['workspaces'] });
    },
  });
}

export function useRemoveMultipleMembers() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      memberIds,
      workspaceId,
    }: {
      memberIds: string[];
      workspaceId: string;
    }) => {
      const members = await localDb.workspace_members.bulkGet(memberIds);
      const nonOwnerIds = members
        .filter((m): m is WorkspaceMember => Boolean(m && m.role !== 'owner'))
        .map((m) => m.id);

      await localDb.workspace_members.bulkDelete(nonOwnerIds);

      // Record evictions on server for each removed member (EC-1.1)
      for (const m of members) {
        if (m && m.role !== 'owner' && m.email) {
          fetch(
            `/api/workspaces/${encodeURIComponent(workspaceId)}/members?email=${encodeURIComponent(m.email)}&memberId=${encodeURIComponent(m.id)}`,
            { method: 'DELETE' }
          ).catch(() => {});
        }
      }

      return { removedCount: nonOwnerIds.length };
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['workspace_members', variables.workspaceId] });
      queryClient.invalidateQueries({ queryKey: ['workspace', variables.workspaceId] });
      queryClient.invalidateQueries({ queryKey: ['workspaces'] });
    },
  });
}

export function useUpdateMultipleMemberRoles() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      memberIds,
      role,
      workspaceId,
    }: {
      memberIds: string[];
      role: WorkspaceRole;
      workspaceId: string;
    }) => {
      const now = new Date().toISOString();
      const members = await localDb.workspace_members.bulkGet(memberIds);
      const nonOwners = members.filter((m): m is WorkspaceMember => Boolean(m && m.role !== 'owner'));

      for (const m of nonOwners) {
        await localDb.workspace_members.update(m.id, { role, updated_at: now });
      }
      return { updatedCount: nonOwners.length, role };
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['workspace_members', variables.workspaceId] });
    },
  });
}

export function useBatchInviteMembers() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      workspaceId,
      emails,
      role = 'editor',
    }: {
      workspaceId: string;
      emails: string[];
      role: WorkspaceRole;
    }): Promise<{
      added: Array<{ email: string; inviteCode: string; memberId: string }>;
      skippedAlreadyMember: string[];
      skippedAlreadyInvited: string[];
    }> => {
      await ensureSeedData();
      const now = new Date().toISOString();
      const currentUser = getCurrentUserEmailAndName();

      const existingMembers = await localDb.workspace_members
        .where('workspace_id')
        .equals(workspaceId)
        .toArray();
      const existingMemberEmails = new Set(
        existingMembers.map((m) => m.email?.toLowerCase().trim()).filter(Boolean)
      );

      const existingInvites = await localDb.workspace_invites
        .where('workspace_id')
        .equals(workspaceId)
        .toArray();
      const existingInviteEmails = new Set(
        existingInvites
          .filter((i) => (!i.expires_at || new Date(i.expires_at) > new Date()) && i.status !== 'revoked' && i.status !== 'consumed')
          .map((i) => i.email?.toLowerCase().trim())
          .filter(Boolean)
      );

      const added: Array<{ email: string; inviteCode: string; memberId: string }> = [];
      const skippedAlreadyMember: string[] = [];
      const skippedAlreadyInvited: string[] = [];

      const newInvites: WorkspaceInvite[] = [];
      const newMembers: WorkspaceMember[] = [];

      for (const rawEmail of emails) {
        const cleanEmail = rawEmail.trim().toLowerCase();
        if (!cleanEmail || !cleanEmail.includes('@')) continue;

        // Skip self-invite (EC-3.3)
        const isOwner =
          (currentUser.email && currentUser.email.toLowerCase() === cleanEmail) ||
          existingMembers.some(
            (m) => m.role === 'owner' && m.email && m.email.trim().toLowerCase() === cleanEmail
          );
        if (isOwner) {
          skippedAlreadyMember.push(`${cleanEmail} (Workspace Owner)`);
          continue;
        }

        if (existingMemberEmails.has(cleanEmail)) {
          skippedAlreadyMember.push(cleanEmail);
          continue;
        }

        if (existingInviteEmails.has(cleanEmail)) {
          skippedAlreadyInvited.push(cleanEmail);
          continue;
        }

        const inviteCode = `syn-${crypto.randomUUID().replace(/-/g, '').substring(0, 16)}`;
        const memberId = `mem-${crypto.randomUUID().slice(0, 8)}`;
        const inviteId = `inv-${crypto.randomUUID().slice(0, 8)}`;

        newInvites.push({
          id: inviteId,
          workspace_id: workspaceId,
          email: cleanEmail,
          role,
          invite_code: inviteCode,
          created_by: 'local-user-1',
          created_at: now,
          expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          is_public_link: false,
        });

        newMembers.push({
          id: memberId,
          workspace_id: workspaceId,
          user_id: `usr-${Math.random().toString(36).substring(2, 7)}`,
          role,
          email: cleanEmail,
          created_at: now,
          updated_at: now,
        });

        added.push({ email: cleanEmail, inviteCode, memberId });
        existingMemberEmails.add(cleanEmail);
        existingInviteEmails.add(cleanEmail);
      }

      await localDb.transaction('rw', [localDb.workspace_invites, localDb.workspace_members], async () => {
        if (newInvites.length > 0) await localDb.workspace_invites.bulkPut(newInvites);
        if (newMembers.length > 0) await localDb.workspace_members.bulkPut(newMembers);
      });

      // Also register batch invites with server store asynchronously
      if (newInvites.length > 0) {
        try {
          const ws = await localDb.workspaces.get(workspaceId);
          const enrichedBatch = newInvites.map((inv) => ({
            ...inv,
            workspace_name: ws?.name || 'Workspace',
            workspace_icon: ws?.icon || '👥',
            workspace_slug: ws?.slug,
          }));
          fetch('/api/invite', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ invites: enrichedBatch }),
          }).catch((e) => console.warn('[useBatchInviteMembers] Server sync notice:', e.message));

          for (const nm of newMembers) {
            fetch(`/api/workspaces/${encodeURIComponent(workspaceId)}/members`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ member: nm }),
            }).catch(() => {});
          }
        } catch {}
      }

      return { added, skippedAlreadyMember, skippedAlreadyInvited };
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['workspace_members', variables.workspaceId] });
      queryClient.invalidateQueries({ queryKey: ['workspace_invites', variables.workspaceId] });
      queryClient.invalidateQueries({ queryKey: ['workspace', variables.workspaceId] });
      queryClient.invalidateQueries({ queryKey: ['workspaces'] });
    },
  });
}

export function useRevokeInvite() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      inviteId,
      workspaceId,
    }: {
      inviteId: string;
      workspaceId: string;
    }) => {
      await localDb.workspace_invites.delete(inviteId);
      return { inviteId };
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['workspace_invites', variables.workspaceId] });
    },
  });
}

export function useClearWorkspaceInvites() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      workspaceId,
      onlyDuplicates = false,
    }: {
      workspaceId: string;
      onlyDuplicates?: boolean;
    }) => {
      if (!onlyDuplicates) {
        await localDb.workspace_invites
          .where('workspace_id')
          .equals(workspaceId)
          .delete();
      } else {
        const invites = await localDb.workspace_invites
          .where('workspace_id')
          .equals(workspaceId)
          .toArray();
        const seen = new Set<string>();
        const toDelete: string[] = [];
        const sorted = [...invites].sort(
          (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
        for (const inv of sorted) {
          const key = inv.email ? inv.email.trim().toLowerCase() : inv.invite_code;
          if (seen.has(key)) {
            toDelete.push(inv.id);
          } else {
            seen.add(key);
          }
        }
        if (toDelete.length > 0) {
          await localDb.workspace_invites.bulkDelete(toDelete);
        }
      }
      return { workspaceId };
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['workspace_invites', variables.workspaceId] });
    },
  });
}

export function useUpdateWorkspace() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      workspaceId,
      name,
      icon,
      type,
    }: {
      workspaceId: string;
      name?: string;
      icon?: string;
      type?: WorkspaceType;
    }) => {
      const updates: Partial<Workspace> = {
        updated_at: new Date().toISOString(),
      };
      if (name !== undefined) {
        updates.name = name;
        updates.slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
      }
      if (icon !== undefined) updates.icon = icon;
      if (type !== undefined) updates.type = type;

      await localDb.workspaces.update(workspaceId, updates);
      return { workspaceId, ...updates };
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['workspace', variables.workspaceId] });
      queryClient.invalidateQueries({ queryKey: ['workspaces'] });
    },
  });
}

export function useDeleteWorkspace() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ workspaceId }: { workspaceId: string }) => {
      await localDb.transaction(
        'rw',
        [
          localDb.workspaces,
          localDb.workspace_members,
          localDb.workspace_invites,
          localDb.notes,
          localDb.blocks,
          localDb.whiteboards,
        ],
        async () => {
          await localDb.workspaces.delete(workspaceId);
          await localDb.workspace_members.where('workspace_id').equals(workspaceId).delete();
          await localDb.workspace_invites.where('workspace_id').equals(workspaceId).delete();
          await localDb.notes.where('workspace_id').equals(workspaceId).delete();
          await localDb.blocks.where('workspace_id').equals(workspaceId).delete();
          await localDb.whiteboards.where('workspace_id').equals(workspaceId).delete();
        }
      );

      // 2. Notify server so it registers workspace deletion and rejects pending invites (EC-6.1)
      try {
        await fetch(`/api/workspaces/${encodeURIComponent(workspaceId)}`, {
          method: 'DELETE',
        });
      } catch (err) {
        console.warn('Failed to notify server of workspace deletion:', err);
      }

      return { workspaceId };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workspaces'] });
    },
  });
}

export function useAcceptInvite() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      code,
      userEmail = 'collaborator@synapse.io',
      userName = 'New Collaborator',
    }: {
      code: string;
      userEmail?: string;
      userName?: string;
    }) => {
      await ensureSeedData();
      const cleanCode = code.trim().toLowerCase();

      // 1. Authoritative verification: query server API first
      let invite: WorkspaceInvite | null = null;
      let serverWorkspaceData: any = null;

      try {
        const res = await fetch(`/api/invite/${encodeURIComponent(cleanCode)}`);
        if (res.ok) {
          const data = await res.json();
          if (data.invite) {
            invite = data.invite;
            serverWorkspaceData = data.workspace;
            await localDb.workspace_invites.put(invite!);
          }
        } else {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.error || 'Invalid or expired invitation link');
        }
      } catch (apiErr: any) {
        // Only fallback to local IndexedDB if offline network failure
        if (apiErr.message && !apiErr.message.includes('fetch')) {
          throw apiErr;
        }
        const allInvites = await localDb.workspace_invites.toArray();
        invite = allInvites.find((i) => i.invite_code.toLowerCase() === cleanCode) || null;
      }

      if (!invite) {
        throw new Error('Invalid or expired invitation link');
      }

      if (invite.status === 'consumed') {
        throw new Error('This invitation has already been accepted and cannot be reused.');
      }
      if (invite.status === 'revoked') {
        throw new Error('This invitation has been revoked by the workspace owner.');
      }
      if (invite.expires_at && new Date(invite.expires_at) < new Date()) {
        throw new Error('This invitation link has expired.');
      }

      return joinWorkspace(invite, userEmail, userName, serverWorkspaceData);

      async function joinWorkspace(
        targetInvite: WorkspaceInvite,
        email: string,
        name: string,
        wsData?: any
      ) {
        const now = new Date().toISOString();

        // 2. Await server acceptance (enforces eviction checks and single-use consumption)
        const acceptRes = await fetch(`/api/invite/${encodeURIComponent(cleanCode)}/accept`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userEmail: email, userName: name }),
        });

        if (!acceptRes.ok) {
          const errData = await acceptRes.json().catch(() => ({}));
          throw new Error(errData.error || 'Failed to accept invitation.');
        }

        const existingMembers = await localDb.workspace_members
          .where('workspace_id')
          .equals(targetInvite.workspace_id)
          .toArray();

        const alreadyJoined = existingMembers.find(
          (m) => m.email && m.email.toLowerCase() === email.toLowerCase()
        );

        if (!alreadyJoined) {
          const newMember: WorkspaceMember = {
            id: `mem-${crypto.randomUUID().slice(0, 8)}`,
            workspace_id: targetInvite.workspace_id,
            user_id: `usr-${Math.random().toString(36).substring(2, 7)}`,
            name: name || undefined,
            role: targetInvite.role,
            email,
            created_at: now,
            updated_at: now,
          };
          await localDb.workspace_members.put(newMember);

          fetch(`/api/workspaces/${encodeURIComponent(targetInvite.workspace_id)}/members`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ member: newMember }),
          }).catch(() => {});
        }

        let ws = await localDb.workspaces.get(targetInvite.workspace_id);

        // If workspace does not exist in local IndexedDB, create it so navigation works smoothly
        if (!ws) {
          const wsName = wsData?.name || (targetInvite as any).workspace_name || 'Collaborative Workspace';
          const wsIcon = wsData?.icon || (targetInvite as any).workspace_icon || '👥';
          ws = {
            id: targetInvite.workspace_id,
            name: wsName,
            slug: wsName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || 'workspace',
            icon: wsIcon,
            owner_id: targetInvite.created_by || 'local-user-1',
            type: 'shared',
            role: targetInvite.role,
            members_count: 2,
            created_at: now,
            updated_at: now,
          };
          await localDb.workspaces.put(ws);
        }

        // Ensure at least one welcome note exists for this workspace
        const notesCount = await localDb.notes
          .where('workspace_id')
          .equals(targetInvite.workspace_id)
          .count();

        if (notesCount === 0) {
          const starterNote: Note = {
            id: `note-${crypto.randomUUID().slice(0, 8)}`,
            workspace_id: targetInvite.workspace_id,
            parent_id: null,
            title: `Welcome to ${ws.name} ⚡`,
            icon: ws.icon || '📝',
            cover_url: null,
            is_favorite: true,
            is_archived: false,
            is_public: false,
            created_by: 'system',
            updated_by: 'system',
            created_at: now,
            updated_at: now,
            version: 1,
          };
          await localDb.notes.put(starterNote);
        }

        return { workspaceId: targetInvite.workspace_id, workspace: ws };
      }
    },
    onSuccess: (data) => {
      if (data?.workspaceId) {
        queryClient.invalidateQueries({ queryKey: ['workspace', data.workspaceId] });
        queryClient.invalidateQueries({ queryKey: ['workspace_members', data.workspaceId] });
        queryClient.invalidateQueries({ queryKey: ['notes', data.workspaceId] });
      }
      queryClient.invalidateQueries({ queryKey: ['workspaces'] });
    },
  });
}
