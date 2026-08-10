-- Meridian Platform — merge advisory + goods trackers into one engagement timeline
-- Paste into the Supabase SQL Editor and click Run. Safe to re-run.
--
-- Expands orders.advisory_stage from the old 8-value advisory-only vocabulary to the
-- merged, deduplicated 11-stage linear sequence that EngagementTimeline.jsx renders for
-- Full Mandate orders (advisory-only stages interleaved with the goods-movement stages
-- that used to live on their own separate StatusTracker block).
--
-- orders.status and its own CHECK constraint are left completely alone here — Dashboard
-- open-orders logic and Orders.jsx filters still read it. Application code (OrderDetail.jsx)
-- keeps status in sync whenever advisory_stage moves onto one of the goods-equivalent
-- stages; that's a runtime concern, not a schema one, so there's nothing to do here for it.

-- Drop first so the backfill below (which writes values the OLD constraint would reject)
-- can run, and so re-running this file doesn't fail on a constraint that already exists.
alter table orders drop constraint if exists orders_advisory_stage_check;

-- Backfill: map every existing old-vocabulary value to its semantic equivalent in the new
-- list, so no existing order silently resets to 'Consultation'. Idempotent — once a row is
-- already on a new-vocabulary value, none of these WHEN arms match and it falls through
-- unchanged via ELSE.
update orders set advisory_stage = case advisory_stage
  when 'Consultation'      then 'Consultation'
  when 'Engagement Letter' then 'Engagement Letter'
  when 'Supplier ID'       then 'Supplier Sourcing & Verification'
  when 'RFQ'               then 'RFQ & Negotiation'
  when 'Contract'          then 'Contract'
  when 'Compliance'        then 'Compliance Review'
  when 'Inspection'        then 'Inspection / QC'
  when 'Delivery'          then 'Delivered'
  else advisory_stage
end;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'orders_advisory_stage_check'
  ) then
    alter table orders
      add constraint orders_advisory_stage_check
        check (advisory_stage in (
          'Consultation', 'Engagement Letter', 'Supplier Sourcing & Verification',
          'RFQ & Negotiation', 'Sampling', 'Contract', 'Compliance Review',
          'Production', 'Inspection / QC', 'Shipped', 'Delivered'
        ));
  end if;
end $$;
