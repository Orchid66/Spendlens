-- supabase/schema.sql
-- Run this in your Supabase SQL editor to set up the database schema.

-- Audits table: stores full audit results by unique ID
create table if not exists audits (
  id text primary key,
  audit_data jsonb not null,
  created_at timestamptz default now() not null
);

-- Enable Row Level Security
alter table audits enable row level security;

-- Audits are publicly readable (they're the shareable result pages)
create policy "Audits are publicly readable"
  on audits for select
  using (true);

-- Only server (service role) can insert
create policy "Service role can insert audits"
  on audits for insert
  with check (false); -- blocked for anon; server uses service_role key which bypasses RLS

-- Leads table: stores email captures
create table if not exists leads (
  id uuid default gen_random_uuid() primary key,
  audit_id text references audits(id) on delete set null,
  email text not null,
  company_name text,
  role text,
  team_size text,
  monthly_savings integer default 0,
  created_at timestamptz default now() not null
);

alter table leads enable row level security;

-- Leads are private — only service role can read/write
create policy "No public access to leads"
  on leads for all
  using (false);

-- Index for fast lookup by audit_id
create index if not exists leads_audit_id_idx on leads (audit_id);

-- Index for time-series queries
create index if not exists audits_created_at_idx on audits (created_at desc);
