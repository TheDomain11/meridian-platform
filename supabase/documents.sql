-- Meridian Platform — document storage + send-to-client
-- Paste into the Supabase SQL Editor and click Run. Safe to re-run (IF NOT EXISTS guards).
--
-- Stores metadata for documents generated OUTSIDE the app (Claude Code, manual — CSNs,
-- engagement letters, compliance advisory notes) and then uploaded and sent through it.
-- This does NOT wire up automatic generation — draft-compliance-section-background.js and
-- generate-consultation-note.js's Opus + web-search pipeline stays deliberately dormant,
-- per the standing "subscription first, credits as last resort" decision. This table only
-- tracks what happens to a document AFTER a human has generated it: storing it and sending it.

create table if not exists documents (
  id          uuid primary key default gen_random_uuid(),
  order_id    uuid not null references orders(id),
  client_id   uuid not null references clients(id),
  doc_type    text not null check (doc_type in ('CSN', 'Engagement Letter', 'Compliance Advisory Note', 'Other')),
  file_url    text not null,
  filename    text not null,
  uploaded_at timestamptz not null default now(),
  sent_at     timestamptz,
  sent_to     text
);

-- GRANT is separate from — and a prerequisite for — RLS: a role with zero base table
-- privileges gets "permission denied for table documents" before RLS is ever evaluated,
-- no matter what policy exists. Every other table in this schema (clients, orders, ...) has
-- this already, applied automatically when Supabase provisioned the project; a table
-- created directly via SQL doesn't inherit it, so it has to be granted explicitly here.
-- (Found live in production: the first version of this file omitted this and broke the
-- whole app, since AppContext's single fetchAll() throws on any one table's error.)
grant select, insert, update, delete on documents to anon, authenticated;

alter table documents enable row level security;

-- Matches the existing allow_all posture already on clients/orders/invoices — the app's
-- trust boundary is Netlify Auth + service-role functions for privileged writes, not
-- per-table RLS granularity, and this table follows that same established pattern rather
-- than inventing a stricter one-off policy just for itself.
do $$
begin
  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'documents' and policyname = 'allow_all'
  ) then
    create policy allow_all on documents for all to anon, authenticated using (true) with check (true);
  end if;
end $$;

-- Storage bucket, parallel to the existing 'invoices' bucket — public read (documents are
-- fetched by public URL), writes go only through the service-role upload-document.js function.
insert into storage.buckets (id, name, public)
values ('documents', 'documents', true)
on conflict (id) do nothing;

do $$
begin
  if not exists (
    select 1 from pg_policies where schemaname = 'storage' and tablename = 'objects' and policyname = 'Public can read documents'
  ) then
    create policy "Public can read documents" on storage.objects for select to public using (bucket_id = 'documents');
  end if;
  if not exists (
    select 1 from pg_policies where schemaname = 'storage' and tablename = 'objects' and policyname = 'Authenticated users can upload documents'
  ) then
    create policy "Authenticated users can upload documents" on storage.objects for insert to authenticated with check (bucket_id = 'documents');
  end if;
end $$;
