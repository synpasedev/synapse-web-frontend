-- ==============================================================================
-- GOOGLE SHEETS TWO-WAY SYNC MIGRATION
-- ==============================================================================

create table if not exists public.google_sheet_links (
  id uuid primary key default gen_random_uuid(),
  workspace_id text not null,
  database_id text,
  note_id text,
  integration_id uuid not null references public.google_integrations(id) on delete cascade,
  
  google_spreadsheet_id text not null,
  google_sheet_title text not null,
  google_sheet_url text,
  
  status text not null default 'synced',
  error_message text,
  
  last_synced_at timestamptz not null default now(),
  last_sync_source text not null default 'synapse',
  last_synced_content_hash text,
  last_synced_snapshot jsonb,
  
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Unique indexes: one active Google Sheet per database, and one per note
create unique index if not exists uq_google_sheet_links_database on public.google_sheet_links(database_id) where database_id is not null;
create unique index if not exists uq_google_sheet_links_note on public.google_sheet_links(note_id) where note_id is not null;
create index if not exists idx_google_sheet_links_spreadsheet on public.google_sheet_links(google_spreadsheet_id);

-- Enable RLS
alter table public.google_sheet_links enable row level security;

-- Permissive policy for server API endpoints
create policy "Allow server api access to google_sheet_links"
  on public.google_sheet_links
  for all
  using (true)
  with check (true);
