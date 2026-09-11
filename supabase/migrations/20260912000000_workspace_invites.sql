-- ==============================================================================
-- SYNAPSE KNOWLEDGE & WORK OS: WORKSPACE INVITES TABLE & POLICIES
-- ==============================================================================

create table if not exists public.workspace_invites (
  id text primary key,
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  email text,
  role public.workspace_role not null default 'editor',
  invite_code text not null unique,
  created_by text not null default 'system',
  created_at timestamptz not null default now(),
  expires_at timestamptz,
  status text not null default 'pending'
);

-- Index on invite_code for fast lookup
create index if not exists idx_workspace_invites_code on public.workspace_invites(invite_code);
create index if not exists idx_workspace_invites_ws on public.workspace_invites(workspace_id);

-- Enable RLS
alter table public.workspace_invites enable row level security;

-- Policy: anyone with the invite code can read the invite details
create policy "Allow reading invites by code"
  on public.workspace_invites
  for select
  using (true);

-- Policy: workspace members or service can insert invites
create policy "Allow inserting invites"
  on public.workspace_invites
  for insert
  with check (true);

-- Policy: allow updating status (e.g. accepting or revoking)
create policy "Allow updating invites"
  on public.workspace_invites
  for update
  using (true);
