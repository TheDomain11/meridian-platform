-- Meridian Platform — the File model (Sept 2026)
-- Paste into the Supabase SQL Editor and click Run. Safe to re-run.
--
-- Meridian now sells the Meridian File in three fixed-fee tiers, plus the Full Mandate
-- for large end-to-end orders (see src/lib/engagements.js and
-- Pricing_Architecture_2026-09.md). Two CHECK constraints on orders need widening:
--
--   engagement_type — adds 'Counterparty Check', 'Transaction File', 'Repeat Order File'.
--                     'Full Mandate' stays. 'Standalone' stays valid so any existing
--                     Standalone rows keep working; the app no longer offers it.
--   advisory_stage  — adds 'Checks in Progress', the one stage a File has that a Full
--                     Mandate doesn't. Files use: Consultation -> Engagement Letter ->
--                     Checks in Progress -> Delivered.
--
-- No existing row is changed. Run this BEFORE deploying the matching app code: the new
-- app offers the File tiers when creating orders, and the old constraint would reject them.

alter table orders drop constraint if exists orders_engagement_type_check;
alter table orders
  add constraint orders_engagement_type_check
    check (engagement_type in (
      'Counterparty Check', 'Transaction File', 'Repeat Order File',
      'Full Mandate', 'Standalone'
    ));

alter table orders alter column engagement_type set default 'Transaction File';

alter table orders drop constraint if exists orders_advisory_stage_check;
alter table orders
  add constraint orders_advisory_stage_check
    check (advisory_stage in (
      'Consultation', 'Engagement Letter', 'Supplier Sourcing & Verification',
      'RFQ & Negotiation', 'Sampling', 'Contract', 'Compliance Review',
      'Production', 'Inspection / QC', 'Shipped', 'Delivered',
      'Checks in Progress'
    ));
