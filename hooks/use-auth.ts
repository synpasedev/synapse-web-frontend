'use client';

import { useState, useEffect } from 'react';
import { createBrowserClient } from '@/lib/supabase/client';
import { isSupabaseConfigured } from '@/lib/supabase/config';
import { localDb } from '@/lib/dexie/db';
import { DEFAULT_WORKSPACE_ID } from '@/lib/dexie/seed';

export interface LocalUser {
  id: string;
  email: string;
  name: string;
}

export function getCurrentUserInfo(): { id?: string; name: string; email: string } {
  if (typeof window === 'undefined') return { name: 'Synapse User', email: 'user@synapse.local' };
  try {
    const email = localStorage.getItem('synapse_current_user_email');
    const name = localStorage.getItem('synapse_current_user_name');
    const localUserStr = localStorage.getItem('synapse_local_user');
    const localUser = localUserStr ? JSON.parse(localUserStr) : null;
    return {
      id: localUser?.id || 'usr-local',
      name: name || localUser?.name || 'Synapse User',
      email: email || localUser?.email || 'user@synapse.local',
    };
  } catch {
    return { name: 'Synapse User', email: 'user@synapse.local' };
  }
}

export function useAuth() {
  const [user, setUser] = useState<{ id: string; email: string; name: string } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isSupabaseConfigured()) {
      // Local Mode: read from localStorage
      try {
        const stored = localStorage.getItem('synapse_local_user');
        if (stored) {
          setUser(JSON.parse(stored));
        } else {
          setUser(null);
        }
      } catch (e) {
        setUser(null);
      } finally {
        setLoading(false);
      }
      return;
    }

    // Cloud Mode with Supabase
    const supabase = createBrowserClient();

    async function getUser() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const email = user.email || '';
          const name = user.user_metadata?.full_name || user.email?.split('@')[0] || 'User';
          setUser({
            id: user.id,
            email,
            name,
          });
          syncOwnerEmail(email, name);
        } else {
          setUser(null);
        }
      } catch (err) {
        setUser(null);
      } finally {
        setLoading(false);
      }
    }

    getUser();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        const email = session.user.email || '';
        const name = session.user.user_metadata?.full_name || session.user.email?.split('@')[0] || 'User';
        setUser({
          id: session.user.id,
          email,
          name,
        });
        syncOwnerEmail(email, name);
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const syncOwnerEmail = async (email: string, name?: string) => {
    if (!email || email === 'user@synapse.local') return;
    try {
      localStorage.setItem('synapse_current_user_email', email);
      if (name) localStorage.setItem('synapse_current_user_name', name);

      // Find any workspace owner members that still have the default placeholder email
      const placeholderOwners = await localDb.workspace_members
        .filter((m) => m.role === 'owner' && (!m.email || m.email === 'user@synapse.local' || m.email === 'guest@synapse.local'))
        .toArray();

      for (const owner of placeholderOwners) {
        await localDb.workspace_members.update(owner.id, {
          email,
          name: name || owner.name || email.split('@')[0],
        });
      }
    } catch (e) {
      console.error('Failed to sync owner email:', e);
    }
  };

  const loginLocal = async (name: string, email: string) => {
    const localUser: LocalUser = {
      id: 'usr-local',
      email: email || 'local@synapse.io',
      name: name || 'Subhadeep',
    };
    try {
      localStorage.setItem('synapse_local_user', JSON.stringify(localUser));
      localStorage.setItem('synapse_current_user_email', localUser.email);
      localStorage.setItem('synapse_current_user_name', localUser.name);
      // Update local workspace name
      await localDb.workspaces.update(DEFAULT_WORKSPACE_ID, {
        name: `${localUser.name}'s Brain`,
      });
      syncOwnerEmail(localUser.email, localUser.name);
      setUser(localUser);
    } catch (e) {
      console.error(e);
    }
  };

  const signOut = async () => {
    if (isSupabaseConfigured()) {
      const supabase = createBrowserClient();
      await supabase.auth.signOut();
    } else {
      localStorage.removeItem('synapse_local_user');
    }
    setUser(null);
  };

  return { user, loading, loginLocal, signOut, isCloud: isSupabaseConfigured() };
}
