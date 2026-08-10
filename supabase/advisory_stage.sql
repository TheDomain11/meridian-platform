-- Meridian Platform — advisory-stage tracking
-- Paste into the Supabase SQL Editor and click Run. Safe to re-run (IF NOT EXISTS guards).
--
-- Adds two columns to orders so advisory engagements can be tracked separately from the
-- existing goods-movement status (StatusTracker / orders.status):
--
--   engagement_type — whether Meridian is running the full sourcing mandate for this order
--                     or only a standalone advisory service. Drives which draft-invoice
--                     line items the advisory-stage tracker prompts (see
--                     src/lib/advisoryInvoiceTriggers.js).
--   advisory_stage  — where the advisory engagement itself is, independent of the physical
--                     goods status. Consultation and Engagement Letter can both be true
--                     while goods status is still "Sourcing".
--
-- The inline CHECK constraints ride along with "add column if not exists", so re-running
-- this file is a no-op once the columns exist (no separate ADD CONSTRAINT to conflict on).

alter table orders
  add column if not exists engagement_type text not null default 'Full Mandate'
    check (engagement_type in ('Full Mandate', 'Standalone')),
  add column if not exists advisory_stage text not null default 'Consultation'
    check (advisory_stage in (
      'Consultation', 'Engagement Letter', 'Supplier ID',
      'RFQ', 'Contract', 'Compliance', 'Inspection', 'Delivery'
    ));

-- Explicit backfill: every existing order is a Full Mandate engagement. This matches the
-- column default already applied by ADD COLUMN above, but is stated explicitly rather than
-- relying on the implicit backfill.
update orders set engagement_type = 'Full Mandate';

-- advisory_stage is intentionally left at its default 'Consultation' for every existing
-- row (including MI-2026-002 and MI-2026-003) — accurate, they're both still pre-CSN.
