import React from 'react';
import Link from 'next/link';
import { Sparkles } from 'lucide-react';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center p-6 bg-background text-foreground relative overflow-hidden">
      {/* Background ambient lighting */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-primary/10 rounded-full blur-3xl pointer-events-none" />

      {/* Header Branding */}
      <Link href="/" className="flex items-center gap-2.5 mb-8 group z-10">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-lg font-bold shadow-md shadow-indigo-500/20 group-hover:scale-105 transition-transform">
          🧠
        </div>
        <span className="text-xl font-bold text-foreground tracking-tight">Synapse</span>
      </Link>

      <div className="w-full max-w-md z-10">
        {children}
      </div>

      <div className="mt-8 text-xs text-muted-foreground z-10">
        Privacy-respecting • Local-first • Developer-friendly
      </div>
    </div>
  );
}
