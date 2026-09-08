'use client';

import React, { useState, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { createBrowserClient } from '@/lib/supabase/client';
import { isSupabaseConfigured } from '@/lib/supabase/config';
import { useAuth } from '@/hooks/use-auth';
import { Loader2, Mail, Lock, ShieldCheck, AlertCircle } from 'lucide-react';
import { DEFAULT_WORKSPACE_ID } from '@/lib/dexie/seed';
import { getURL } from '@/lib/url';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectUrl = searchParams.get('redirect') || `/${DEFAULT_WORKSPACE_ID}/notes`;

  const { loginLocal } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    // 1. If running in Local Mode
    if (!isSupabaseConfigured()) {
      await loginLocal(email.split('@')[0] || 'User', email);
      router.push(redirectUrl);
      setLoading(false);
      return;
    }

    // 2. If running with Supabase Cloud
    try {
      const supabase = createBrowserClient();
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;
      router.push(redirectUrl);
    } catch (err: any) {
      setError(err.message || 'Login failed. If Supabase is not configured, use Offline Mode below.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    if (!isSupabaseConfigured()) {
      await loginLocal('Google User', 'user@gmail.com');
      router.push(redirectUrl);
      return;
    }

    try {
      const supabase = createBrowserClient();

      // Store intended destination in cookie so callback can retrieve it
      // without needing query strings in redirectTo (which break Supabase OAuth redirect matching)
      if (typeof document !== 'undefined') {
        document.cookie = `synapse_redirect=${encodeURIComponent(redirectUrl)}; path=/; max-age=600; SameSite=Lax`;
        try {
          sessionStorage.setItem('synapse_redirect', redirectUrl);
        } catch {}
      }

      // Clean callback URL with NO query strings so it exactly matches Supabase Redirect URLs
      const callbackUrl = getURL('/api/auth/callback');

      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: callbackUrl,
        },
      });
      if (error) throw error;
    } catch (err: any) {
      setError(err.message || 'OAuth not configured. Use Local/Offline mode.');
    }
  };

  return (
    <div className="p-7 rounded-2xl border border-border/80 bg-card/70 backdrop-blur-xl shadow-2xl">
      <div className="mb-6 text-center">
        <h1 className="text-xl font-bold text-foreground">Welcome back</h1>
        <p className="text-xs text-muted-foreground mt-1">
          Sign in to access your notes and shared documents
        </p>
      </div>

      {error && (
        <div className="p-3 mb-4 rounded-xl bg-destructive/10 border border-destructive/20 text-xs text-destructive flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleLogin} className="space-y-3.5">
        <div>
          <label className="text-xs font-medium text-muted-foreground block mb-1">Email</label>
          <div className="relative">
            <Mail className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="w-full bg-secondary/60 border border-border/60 rounded-xl pl-9 pr-3 py-2 text-xs text-foreground outline-none focus:border-primary transition-colors"
            />
          </div>
        </div>

        <div>
          <label className="text-xs font-medium text-muted-foreground block mb-1">Password</label>
          <div className="relative">
            <Lock className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full bg-secondary/60 border border-border/60 rounded-xl pl-9 pr-3 py-2 text-xs text-foreground outline-none focus:border-primary transition-colors"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full py-2.5 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-xs shadow-md shadow-primary/20 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 mt-4"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <span>Sign In</span>}
        </button>
      </form>

      <div className="relative my-5">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-border/50" />
        </div>
        <div className="relative flex justify-center text-[10px] uppercase">
          <span className="bg-card px-2 text-muted-foreground">or</span>
        </div>
      </div>

      {/* Google OAuth Button */}
      <button
        type="button"
        onClick={handleGoogleLogin}
        className="w-full py-2.5 rounded-xl bg-secondary hover:bg-secondary/80 text-foreground font-medium text-xs border border-border/60 transition-colors flex items-center justify-center gap-2 cursor-pointer mb-3"
      >
        <svg className="w-4 h-4" viewBox="0 0 24 24">
          <path
            fill="#4285F4"
            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
          />
          <path
            fill="#34A853"
            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
          />
          <path
            fill="#FBBC05"
            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
          />
          <path
            fill="#EA4335"
            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
          />
        </svg>
        <span>Continue with Google</span>
      </button>

      {/* Guest / Offline Mode Fallback */}
      <button
        type="button"
        onClick={() => {
          loginLocal('Guest Collaborator', 'guest@synapse.local');
          router.push(redirectUrl);
        }}
        className="w-full py-2 rounded-xl bg-secondary/40 hover:bg-secondary/70 text-muted-foreground hover:text-foreground text-[11px] font-medium transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
      >
        <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
        <span>Continue in Local-First / Guest Mode</span>
      </button>

      <div className="mt-5 text-center text-xs text-muted-foreground">
        Don't have an account?{' '}
        <Link
          href={`/signup${searchParams.get('redirect') ? `?redirect=${encodeURIComponent(searchParams.get('redirect')!)}` : ''}`}
          className="text-primary hover:underline font-medium"
        >
          Sign up
        </Link>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="p-8 text-center bg-card rounded-2xl border border-border">
          <Loader2 className="w-6 h-6 animate-spin mx-auto text-indigo-400" />
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
