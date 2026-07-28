-- Meridian Platform — soft-delete columns
-- Paste into the Supabase SQL Editor and click Run. Safe to re-run (IF NOT EXISTS guards).
--
-- Adds a soft-delete flag (deleted_at) and an actor column (deleted_by) to every
-- table that holds user-editable records. deleted_at IS NULL means the row is live;
-- a non-null timestamp means it has been moved to Trash at that time. Nothing is ever
-- auto-purged — the 30-day "eligible for permanent deletion" state is computed in the UI.
--
-- email_approvals is intentionally NOT included — it is an audit table with its own
-- lifecycle and hard-delete path, and stays as-is.

alter table clients   add column if not exists deleted_at timestamptz, add column if not exists deleted_by uuid;
alter table orders    add column if not exists deleted_at timestamptz, add column if not exists deleted_by uuid;
alter table suppliers add column if not exists deleted_at timestamptz, add column if not exists deleted_by uuid;
alter table invoices  add column if not exists deleted_at timestamptz, add column if not exists deleted_by uuid;
alter table team      add column if not exists deleted_at timestamptz, add column if not exists deleted_by uuid;
alter table enquiries add column if not exists deleted_at timestamptz, add column if not exists deleted_by uuid;

-- Partial indexes keep the common "live rows only" queries fast.
create index if not exists clients_live_idx   on clients   (id) where deleted_at is null;
create index if not exists orders_live_idx    on orders    (id) where deleted_at is null;
create index if not exists suppliers_live_idx on suppliers (id) where deleted_at is null;
create index if not exists invoices_live_idx  on invoices  (id) where deleted_at is null;
create index if not exists team_live_idx      on team      (id) where deleted_at is null;
create index if not exists enquiries_live_idx on enquiries (id) where deleted_at is null;

-- RLS notes (verify in the dashboard — no SQL required here unless a gap is found):
--   * Soft-delete / restore for the 5 core tables run as authenticated UPDATEs from the
--     browser. These already work today (updateClient/updateOrder/etc.), so no new policy
--     is expected.
--   * enquiries soft-delete/restore and ALL permanent deletes run through service-role
--     Netlify functions (netlify/functions/restore-record.js, purge-record.js), which
--     bypass RLS — so no delete policy or enquiries UPDATE policy is required.
