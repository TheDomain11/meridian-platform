-- Meridian Platform — compliance_drafts table
-- Paste into Supabase SQL Editor and click Run

create table if not exists compliance_drafts (
  engagement_ref text primary key,
  client_id      text,
  status         text not null default 'pending' check (status in ('pending', 'complete', 'failed')),
  compliance     jsonb,
  errors         jsonb,
  created_at     timestamptz default now(),
  completed_at   timestamptz
);

-- This table is only ever read/written via Netlify functions using the service-role key
-- (see netlify/functions/_supabaseAdmin.js), so RLS stays enabled with no permissive
-- policies — the anon/authenticated roles get no access at all, by design.
alter table compliance_drafts enable row level security;
