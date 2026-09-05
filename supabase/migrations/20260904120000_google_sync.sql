-- ==============================================================================
-- GOOGLE DOCS TWO-WAY SYNC MIGRATION
-- ==============================================================================

create extension if not exists "pgcrypto";

-- 1. Create Enums if not exist
do $$
begin
  if not exists (select 1 from pg_type where typname = 'google_sync_status') then
    create type public.google_sync_status as enum ('synced', 'syncing', 'conflict', 'error', 'paused');
  end if;
  if not exists (select 1 from pg_type where typname = 'google_sync_direction') then
    create type public.google_sync_direction as enum ('bidirectional', 'to_google_only', 'to_synapse_only');
  end if;
  if not exists (select 1 from pg_type where typname = 'google_last_source') then
    create type public.google_last_source as enum ('synapse', 'google_docs', 'system_merge');
  end if;
end$$;

-- 2. Drop existing RLS policies that reference user_id FIRST
drop policy if exists "Users manage their own Google integrations" on public.google_integrations;
drop policy if exists "Allow server api access to google_integrations" on public.google_integrations;
drop policy if exists "Users manage Google doc links in their workspaces" on public.google_doc_links;
drop policy if exists "Users manage Google doc links in their integrations" on public.google_doc_links;
drop policy if exists "Allow server api access to google_doc_links" on public.google_doc_links;

-- 3. Modify existing table or create clean if not existing
alter table if exists public.google_integrations drop constraint if exists google_integrations_user_id_fkey;
alter table if exists public.google_integrations alter column user_id type text;

create table if not exists public.google_integrations (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  google_user_id text not null,
  google_email text not null,
  encrypted_access_token text not null,
  encrypted_refresh_token text not null,
  token_iv text not null,
  token_auth_tag text not null,
  token_expires_at timestamptz not null,
  scopes text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint uq_google_user_integration unique (user_id, google_user_id)
);

create index if not exists idx_google_integrations_user on public.google_integrations(user_id);

-- 4. Google Doc Links Table
alter table if exists public.google_doc_links drop constraint if exists google_doc_links_note_id_fkey;
alter table if exists public.google_doc_links drop constraint if exists google_doc_links_workspace_id_fkey;
alter table if exists public.google_doc_links alter column note_id type text;
alter table if exists public.google_doc_links alter column workspace_id type text;

create table if not exists public.google_doc_links (
  id uuid primary key default gen_random_uuid(),
  workspace_id text not null,
  note_id text not null,
  integration_id uuid not null references public.google_integrations(id) on delete cascade,
  
  google_doc_id text not null,
  google_doc_title text not null,
  google_revision_id text,
  google_modified_time timestamptz,
  
  sync_direction public.google_sync_direction not null default 'bidirectional',
  status public.google_sync_status not null default 'synced',
  error_message text,
  
  last_synced_at timestamptz not null default now(),
  last_sync_source public.google_last_source not null default 'synapse',
  last_synced_content_hash text not null default '',
  last_synced_snapshot jsonb,
  
  webhook_channel_id text,
  webhook_resource_id text,
  webhook_expiration timestamptz,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  
  constraint uq_note_google_link unique (note_id),
  constraint uq_workspace_doc_link unique (workspace_id, google_doc_id)
);

create index if not exists idx_google_doc_links_lookup on public.google_doc_links(note_id, google_doc_id);
create index if not exists idx_google_doc_links_webhook on public.google_doc_links(webhook_channel_id);

-- 5. Enable Row Level Security (RLS) & Server Access Policies
alter table public.google_integrations enable row level security;
alter table public.google_doc_links enable row level security;

create policy "Allow server api access to google_integrations"
  on public.google_integrations for all
  using (true)
  with check (true);

create policy "Allow server api access to google_doc_links"
  on public.google_doc_links for all
  using (true)
  with check (true);



