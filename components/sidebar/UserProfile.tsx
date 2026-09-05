'use client';

import React from 'react';
import Link from 'next/link';
import { useAuth } from '@/hooks/use-auth';
import { User, LogIn, LogOut } from 'lucide-react';

export const UserProfile: React.FC = () => {
  const { user, signOut, loading } = useAuth();

  if (loading) return null;

  if (!user) {
    return (
      <Link
        href="/login"
        className="flex items-center justify-between p-2 rounded-xl bg-secondary/40 hover:bg-secondary border border-border/50 text-xs text-muted-foreground hover:text-foreground transition-all"
      >
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-indigo-500/10 flex items-center justify-center text-indigo-400">
            <User className="w-3.5 h-3.5" />
          </div>
          <span className="font-medium text-[11px]">Guest (Local Mode)</span>
        </div>
        <span className="text-[10px] text-primary font-semibold flex items-center gap-1">
          Sign In <LogIn className="w-3 h-3" />
        </span>
      </Link>
    );
  }

  const email = user.email || 'local@synapse.io';
  const name = user.name || email.split('@')[0] || 'User';

  return (
    <div className="flex items-center justify-between p-2 rounded-xl bg-secondary/40 border border-border/50 text-xs">
      <div className="flex items-center gap-2 min-w-0">
        <div className="w-6 h-6 rounded-lg bg-primary/20 flex items-center justify-center text-primary font-bold text-xs shrink-0">
          {name.charAt(0).toUpperCase()}
        </div>
        <div className="min-w-0">
          <div className="font-semibold text-foreground truncate text-[11px]">{name}</div>
          <div className="text-[10px] text-muted-foreground truncate">{email}</div>
        </div>
      </div>

      <button
        type="button"
        onClick={signOut}
        className="p-1 rounded hover:bg-secondary text-muted-foreground hover:text-destructive transition-colors cursor-pointer"
        title="Sign Out"
      >
        <LogOut className="w-3.5 h-3.5" />
      </button>
    </div>
  );
};
