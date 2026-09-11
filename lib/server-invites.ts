import fs from 'fs';
import path from 'path';
import { WorkspaceInvite, WorkspaceRole } from '@/types/domain';
import { isSupabaseConfigured } from '@/lib/supabase/config';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export interface StoredServerInvite extends WorkspaceInvite {
  workspace_name?: string;
  workspace_icon?: string;
  workspace_slug?: string;
}

// Global in-memory cache to survive across module reloads in Node
declare global {
  var __synapse_invites: Map<string, StoredServerInvite> | undefined;
}

if (!global.__synapse_invites) {
  global.__synapse_invites = new Map();
}

function isServerlessReadOnly(): boolean {
  return Boolean(
    process.env.VERCEL ||
    process.env.AWS_LAMBDA_FUNCTION_NAME ||
    (typeof process !== 'undefined' && process.cwd && process.cwd().startsWith('/var/task'))
  );
}

// Disk persistence directory (safe for both local dev and serverless /tmp)
function getInvitesDir(): string {
  if (isServerlessReadOnly()) {
    return path.join('/tmp', '.synapse-invites');
  }
  return path.join(process.cwd(), '.synapse-invites');
}

function ensureInvitesDir(): string | null {
  const primaryDir = getInvitesDir();
  try {
    if (!fs.existsSync(primaryDir)) {
      fs.mkdirSync(primaryDir, { recursive: true });
    }
    return primaryDir;
  } catch {
    // If primary directory fails (e.g. read-only filesystem), fallback to /tmp
    try {
      const tmpDir = path.join('/tmp', '.synapse-invites');
      if (!fs.existsSync(tmpDir)) {
        fs.mkdirSync(tmpDir, { recursive: true });
      }
      return tmpDir;
    } catch {
      return null;
    }
  }
}

function inviteFilePath(code: string, baseDir?: string): string {
  const dir = baseDir || getInvitesDir();
  const safeCode = code.toLowerCase().trim().replace(/[^a-z0-9_-]/g, '_');
  return path.join(dir, `${safeCode}.json`);
}

function readInviteFromDisk(code: string): StoredServerInvite | null {
  // 1. Check primary directory
  const primaryPath = inviteFilePath(code, getInvitesDir());
  try {
    if (fs.existsSync(primaryPath)) {
      const data = fs.readFileSync(primaryPath, 'utf-8');
      return JSON.parse(data) as StoredServerInvite;
    }
  } catch {}

  // 2. Check /tmp fallback
  const tmpPath = inviteFilePath(code, path.join('/tmp', '.synapse-invites'));
  try {
    if (fs.existsSync(tmpPath)) {
      const data = fs.readFileSync(tmpPath, 'utf-8');
      return JSON.parse(data) as StoredServerInvite;
    }
  } catch {}

  return null;
}

function writeInviteToDisk(invite: StoredServerInvite): void {
  try {
    const dir = ensureInvitesDir();
    if (!dir) return;
    const safeCode = invite.invite_code.toLowerCase().trim().replace(/[^a-z0-9_-]/g, '_');
    const filePath = path.join(dir, `${safeCode}.json`);
    fs.writeFileSync(filePath, JSON.stringify(invite, null, 2), 'utf-8');
  } catch (err: any) {
    console.warn('[server-invites] Could not write invite to disk (memory cache active):', err.message);
  }
}

export const serverInvites = {
  /**
   * Save or update an invite in server memory, disk, and Supabase (if available)
   */
  async saveInvite(invite: StoredServerInvite): Promise<StoredServerInvite> {
    const cleanCode = invite.invite_code.toLowerCase().trim();
    const normalizedInvite: StoredServerInvite = {
      ...invite,
      invite_code: cleanCode,
      status: invite.status || 'pending',
    };

    // 1. Memory cache
    global.__synapse_invites!.set(cleanCode, normalizedInvite);

    // 2. Disk persistence
    writeInviteToDisk(normalizedInvite);

    // 3. Supabase persistence (optional / best-effort)
    if (isSupabaseConfigured()) {
      try {
        const supabase = await createServerSupabaseClient();
        await supabase.from('workspace_invites').upsert({
          id: normalizedInvite.id,
          workspace_id: normalizedInvite.workspace_id,
          email: normalizedInvite.email || null,
          role: normalizedInvite.role,
          invite_code: normalizedInvite.invite_code,
          created_by: normalizedInvite.created_by,
          created_at: normalizedInvite.created_at,
          expires_at: normalizedInvite.expires_at || null,
          status: normalizedInvite.status,
        });
      } catch (sbErr) {
        // Table may not exist yet in schema cache — silently fallback to disk & memory
      }
    }

    return normalizedInvite;
  },

  /**
   * Save multiple invites in batch
   */
  async saveInvites(invites: StoredServerInvite[]): Promise<StoredServerInvite[]> {
    const saved: StoredServerInvite[] = [];
    for (const inv of invites) {
      saved.push(await this.saveInvite(inv));
    }
    return saved;
  },

  /**
   * Retrieve an invite by code
   */
  async getInvite(code: string): Promise<StoredServerInvite | null> {
    if (!code) return null;
    const cleanCode = code.toLowerCase().trim();

    // 1. Memory cache
    if (global.__synapse_invites?.has(cleanCode)) {
      return global.__synapse_invites.get(cleanCode)!;
    }

    // 2. Disk cache
    const fromDisk = readInviteFromDisk(cleanCode);
    if (fromDisk) {
      global.__synapse_invites!.set(cleanCode, fromDisk);
      return fromDisk;
    }

    // 3. Supabase lookup (if available)
    if (isSupabaseConfigured()) {
      try {
        const supabase = await createServerSupabaseClient();
        const { data, error } = await supabase
          .from('workspace_invites')
          .select('*, workspaces(name, icon, slug)')
          .ilike('invite_code', cleanCode)
          .maybeSingle();

        if (!error && data) {
          const loaded: StoredServerInvite = {
            id: data.id,
            workspace_id: data.workspace_id,
            email: data.email,
            role: data.role as WorkspaceRole,
            invite_code: data.invite_code,
            created_by: data.created_by,
            created_at: data.created_at,
            expires_at: data.expires_at,
            status: data.status || 'pending',
            workspace_name: data.workspaces?.name,
            workspace_icon: data.workspaces?.icon,
            workspace_slug: data.workspaces?.slug,
          };
          global.__synapse_invites!.set(cleanCode, loaded);
          writeInviteToDisk(loaded);
          return loaded;
        }
      } catch {
        // Ignore schema error
      }
    }

    return null;
  },

  /**
   * Mark an invite as accepted
   */
  async acceptInvite(
    code: string,
    userEmail?: string,
    userName?: string
  ): Promise<StoredServerInvite | null> {
    const invite = await this.getInvite(code);
    if (!invite) return null;

    invite.status = 'accepted';
    await this.saveInvite(invite);

    // Optional Supabase membership creation
    if (isSupabaseConfigured()) {
      try {
        const supabase = await createServerSupabaseClient();
        const { data: userData } = await supabase.auth.getUser();
        if (userData?.user) {
          await supabase.from('memberships').upsert({
            workspace_id: invite.workspace_id,
            user_id: userData.user.id,
            role: invite.role,
          });
        }
      } catch {
        // Fallback silently
      }
    }

    return invite;
  },

  /**
   * Revoke an invite
   */
  async revokeInvite(code: string): Promise<boolean> {
    const invite = await this.getInvite(code);
    if (!invite) return false;

    invite.status = 'revoked';
    await this.saveInvite(invite);
    return true;
  },
};
