-- ==============================================================================
-- SYNAPSE KNOWLEDGE & WORK OS: CLEAN IDEMPOTENT DATABASE INITIALIZATION
-- ==============================================================================

-- 1. Enable necessary extensions
create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";

-- 2. Drop existing triggers & functions first
drop trigger if exists on_auth_user_created on auth.users;
drop function if exists public.handle_new_user cascade;
drop function if exists public.is_workspace_member cascade;
drop function if exists public.is_workspace_editor cascade;

-- 3. Drop all existing tables with CASCADE (Clean Slate)
drop table if exists public.sync_queue cascade;
drop table if exists public.views cascade;
drop table if exists public.database_rows cascade;
drop table if exists public.database_properties cascade;
drop table if exists public.databases cascade;
drop table if exists public.relations cascade;
drop table if exists public.templates cascade;
drop table if exists public.links cascade;
drop table if exists public.blocks cascade;
drop table if exists public.notes cascade;
drop table if exists public.memberships cascade;
drop table if exists public.workspaces cascade;
drop table if exists public.profiles cascade;

-- 4. Drop all custom enum types
drop type if exists public.workspace_role cascade;
drop type if exists public.block_type cascade;
drop type if exists public.db_property_type cascade;
drop type if exists public.sync_operation cascade;
drop type if exists public.view_type cascade;

-- ==============================================================================
-- 5. CREATE ENUM TYPES
-- ==============================================================================

create type public.workspace_role as enum ('owner', 'admin', 'editor', 'viewer');

create type public.block_type as enum (
  'paragraph',
  'heading_1',
  'heading_2',
  'heading_3',
  'bullet_list',
  'numbered_list',
  'todo_list',
  'quote',
  'callout',
  'code_block',
  'divider',
  'image',
  'embed',
  'database_view'
);

create type public.view_type as enum ('table', 'board', 'calendar', 'gallery', 'list');

-- ==============================================================================
-- 6. PROFILES & WORKSPACES
-- ==============================================================================

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  full_name text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.workspaces (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  icon text default '🧠',
  owner_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.memberships (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role public.workspace_role not null default 'editor',
  created_at timestamptz not null default now(),
  unique (workspace_id, user_id)
);

-- ==============================================================================
-- 7. NOTES & BLOCKS
-- ==============================================================================

create table public.notes (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  parent_id uuid references public.notes(id) on delete set null,
  title text not null default 'Untitled',
  icon text default '📄',
  cover_url text,
  is_favorite boolean not null default false,
  is_archived boolean not null default false,
  is_public boolean not null default false,
  version bigint not null default 1,
  created_by uuid not null references public.profiles(id),
  updated_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.blocks (
  id uuid primary key default gen_random_uuid(),
  note_id uuid not null references public.notes(id) on delete cascade,
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  parent_block_id uuid references public.blocks(id) on delete cascade,
  type public.block_type not null default 'paragraph',
  content jsonb not null default '{}'::jsonb,
  properties jsonb not null default '{}'::jsonb,
  sort_order double precision not null default 1000.0,
  created_by uuid not null references public.profiles(id),
  updated_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ==============================================================================
-- 8. KNOWLEDGE GRAPH LINKS & RELATIONS
-- ==============================================================================

create table public.links (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  source_note_id uuid not null references public.notes(id) on delete cascade,
  source_block_id uuid references public.blocks(id) on delete set null,
  target_note_id uuid not null references public.notes(id) on delete cascade,
  context_preview text,
  created_at timestamptz not null default now(),
  unique (source_note_id, target_note_id, source_block_id)
);

create table public.relations (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  relation_name text not null,
  from_entity_type text not null,
  from_entity_id uuid not null,
  to_entity_type text not null,
  to_entity_id uuid not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

-- ==============================================================================
-- 9. DATABASES, VIEWS & TEMPLATES
-- ==============================================================================

create table public.templates (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  title text not null,
  description text,
  icon text default '⚡',
  content jsonb not null default '[]'::jsonb,
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.databases (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  note_id uuid references public.notes(id) on delete cascade,
  title text not null default 'Untitled Database',
  schema jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.views (
  id uuid primary key default gen_random_uuid(),
  database_id uuid not null references public.databases(id) on delete cascade,
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  name text not null default 'Default View',
  type public.view_type not null default 'table',
  config jsonb not null default '{
    "filters": [],
    "sorts": [],
    "group_by": null,
    "visible_properties": []
  }'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ==============================================================================
-- 10. PERFORMANCE INDEXES
-- ==============================================================================

create index idx_memberships_user_ws on public.memberships (user_id, workspace_id);
create index idx_notes_workspace on public.notes (workspace_id) where is_archived = false;
create index idx_notes_parent on public.notes (parent_id);
create index idx_blocks_note_sort on public.blocks (note_id, sort_order asc);
create index idx_blocks_parent on public.blocks (parent_block_id);
create index idx_links_target on public.links (target_note_id);
create index idx_links_source_note on public.links (source_note_id);
create index idx_relations_lookup on public.relations (workspace_id, from_entity_id, to_entity_id);

-- ==============================================================================
-- 11. ROW LEVEL SECURITY (RLS)
-- ==============================================================================

alter table public.profiles enable row level security;
alter table public.workspaces enable row level security;
alter table public.memberships enable row level security;
alter table public.notes enable row level security;
alter table public.blocks enable row level security;
alter table public.links enable row level security;
alter table public.relations enable row level security;
alter table public.templates enable row level security;
alter table public.databases enable row level security;
alter table public.views enable row level security;

-- Helper security functions
create or replace function public.is_workspace_member(ws_id uuid)
returns boolean security definer language sql stable as $$
  select exists (
    select 1 from public.memberships
    where workspace_id = ws_id and user_id = auth.uid()
  );
$$;

create or replace function public.is_workspace_editor(ws_id uuid)
returns boolean security definer language sql stable as $$
  select exists (
    select 1 from public.memberships
    where workspace_id = ws_id 
      and user_id = auth.uid() 
      and role in ('owner', 'admin', 'editor')
  );
$$;

-- RLS Policies: Profiles
create policy "Users can view all member profiles"
  on public.profiles for select
  using (auth.uid() is not null);

create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id);

-- RLS Policies: Workspaces
create policy "Members can view workspace"
  on public.workspaces for select
  using (public.is_workspace_member(id));

create policy "Owners can update workspace"
  on public.workspaces for update
  using (owner_id = auth.uid());

-- RLS Policies: Memberships
create policy "Members can view other members in workspace"
  on public.memberships for select
  using (public.is_workspace_member(workspace_id));

-- RLS Policies: Notes
create policy "Members can read workspace notes or public notes"
  on public.notes for select
  using (public.is_workspace_member(workspace_id) or is_public = true);

create policy "Editors can insert workspace notes"
  on public.notes for insert
  with check (public.is_workspace_editor(workspace_id) and auth.uid() = created_by);

create policy "Editors can update workspace notes"
  on public.notes for update
  using (public.is_workspace_editor(workspace_id));

create policy "Editors can delete workspace notes"
  on public.notes for delete
  using (public.is_workspace_editor(workspace_id));

-- RLS Policies: Blocks
create policy "Members can read workspace blocks or public note blocks"
  on public.blocks for select
  using (
    public.is_workspace_member(workspace_id) or 
    exists (select 1 from public.notes where id = blocks.note_id and is_public = true)
  );

create policy "Editors can mutate workspace blocks"
  on public.blocks for all
  using (public.is_workspace_editor(workspace_id))
  with check (public.is_workspace_editor(workspace_id));

-- RLS Policies: Links & Templates & Databases
create policy "Workspace member access for links"
  on public.links for all
  using (public.is_workspace_member(workspace_id))
  with check (public.is_workspace_editor(workspace_id));

create policy "Workspace member access for relations"
  on public.relations for all
  using (public.is_workspace_member(workspace_id))
  with check (public.is_workspace_editor(workspace_id));

create policy "Workspace member access for templates"
  on public.templates for all
  using (public.is_workspace_member(workspace_id))
  with check (public.is_workspace_editor(workspace_id));

create policy "Workspace member access for databases"
  on public.databases for all
  using (public.is_workspace_member(workspace_id))
  with check (public.is_workspace_editor(workspace_id));

create policy "Workspace member access for views"
  on public.views for all
  using (public.is_workspace_member(workspace_id))
  with check (public.is_workspace_editor(workspace_id));

-- ==============================================================================
-- 12. AUTO-BOOTSTRAP TRIGGER (New User -> Profile + Default Workspace)
-- ==============================================================================

create or replace function public.handle_new_user()
returns trigger security definer language plpgsql as $$
declare
  new_ws_id uuid;
  welcome_note_id uuid;
begin
  -- 1. Create Profile
  insert into public.profiles (id, email, full_name, avatar_url)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    new.raw_user_meta_data->>'avatar_url'
  )
  on conflict (id) do nothing;

  -- 2. Create Default Workspace
  insert into public.workspaces (name, slug, owner_id)
  values (
    'Personal Workspace',
    'ws-' || substr(md5(random()::text), 1, 8),
    new.id
  )
  returning id into new_ws_id;

  -- 3. Create Owner Membership
  insert into public.memberships (workspace_id, user_id, role)
  values (new_ws_id, new.id, 'owner');

  -- 4. Create Welcome Note
  insert into public.notes (workspace_id, title, icon, created_by, updated_by)
  values (new_ws_id, 'Getting Started with Synapse', '🚀', new.id, new.id)
  returning id into welcome_note_id;

  -- 5. Seed Welcome Blocks
  insert into public.blocks (note_id, workspace_id, type, content, sort_order, created_by, updated_by)
  values 
    (welcome_note_id, new_ws_id, 'heading_1', '{"text": "Welcome to Synapse"}'::jsonb, 1000.0, new.id, new.id),
    (welcome_note_id, new_ws_id, 'paragraph', '{"text": "Synapse combines block editing, bidirectional linking, and local-first performance."}'::jsonb, 2000.0, new.id, new.id),
    (welcome_note_id, new_ws_id, 'callout', '{"text": "Tip: Press / to open the command palette or type [[ to link notes.", "icon": "💡"}'::jsonb, 3000.0, new.id, new.id);

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
