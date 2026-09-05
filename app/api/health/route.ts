import { NextResponse } from 'next/server';
import { isSupabaseConfigured } from '@/lib/supabase/config';

export async function GET() {
  const isCloud = isSupabaseConfigured();
  const uptime = process.uptime();

  return NextResponse.json({
    status: 'healthy',
    service: 'Synapse Knowledge & Work OS',
    version: '0.1.0',
    mode: isCloud ? 'Cloud Sync (Supabase PostgreSQL)' : 'Local-First (IndexedDB)',
    timestamp: new Date().toISOString(),
    uptimeSeconds: Math.floor(uptime),
    features: {
      blockEditor: 'TipTap 2.0 (Headings, Lists, Callouts, Code, WikiLinks)',
      graphEngine: 'D3.js Force 2D Simulation',
      databases: 'Relational Tables & Kanban Boards',
      templates: 'Dynamic Blueprint Interpolator',
      aiEngines: ['Local Ollama', 'Groq Llama-3', 'Offline Heuristic Engine'],
      auth: isCloud ? 'Supabase Auth' : 'Local-First Profile',
    },
  });
}
