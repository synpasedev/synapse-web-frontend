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
        className="flex items-center justify-between px-2 py-1.5 rounded-lg hover:bg-neutral-200/60 dark:hover:bg-white/[0.06] text-xs text-muted-foreground hover:text-foreground transition-colors group"
      >
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 rounded-md bg-secondary flex items-center justify-center text-muted-foreground group-hover:text-foreground">
            <User className="w-3 h-3" />
          </div>
          <span className="font-medium text-xs">Guest (Local Mode)</span>
        </div>
        <span className="text-[11px] text-muted-foreground/70 group-hover:text-foreground font-medium flex items-center gap-1">
          Sign In <LogIn className="w-3 h-3" />
        </span>
      </Link>
    );
  }

  const email = user.email || 'local@synapse.io';
  const name = user.name || email.split('@')[0] || 'User';

  return (
    <div className="flex items-center justify-between px-2 py-1.5 rounded-lg hover:bg-neutral-200/60 dark:hover:bg-white/[0.06] text-xs transition-colors group">
      <div className="flex items-center gap-2 min-w-0">
        <div className="w-5 h-5 rounded-md bg-primary/20 flex items-center justify-center text-primary font-bold text-xs shrink-0">
          {name.charAt(0).toUpperCase()}
        </div>
        <div className="min-w-0">
          <div className="font-medium text-foreground truncate text-xs">{name}</div>
          <div className="text-[10px] text-muted-foreground truncate">{email}</div>
        </div>
      </div>

      <button
        type="button"
        onClick={signOut}
        className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-secondary text-muted-foreground hover:text-destructive transition-all cursor-pointer"
        title="Sign Out"
      >
        <LogOut className="w-3 h-3" />
      </button>
    </div>
  );
};
