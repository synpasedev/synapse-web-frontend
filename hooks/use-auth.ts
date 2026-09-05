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
          setUser({
            id: user.id,
            email: user.email || '',
            name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'User',
          });
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
        setUser({
          id: session.user.id,
          email: session.user.email || '',
          name: session.user.user_metadata?.full_name || session.user.email?.split('@')[0] || 'User',
        });
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const loginLocal = async (name: string, email: string) => {
    const localUser: LocalUser = {
      id: 'usr-local',
      email: email || 'local@synapse.io',
      name: name || 'Subhadeep',
    };
    try {
      localStorage.setItem('synapse_local_user', JSON.stringify(localUser));
      // Update local workspace name
      await localDb.workspaces.update(DEFAULT_WORKSPACE_ID, {
        name: `${localUser.name}'s Brain`,
      });
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
