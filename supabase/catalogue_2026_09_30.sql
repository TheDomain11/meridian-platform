-- Meridian Platform — catalogue of 30 September 2026
-- Paste into the Supabase SQL Editor and click Run. Safe to re-run.
--
-- Widens orders_engagement_type_check to the new catalogue. It is a superset of the
-- previous list: the retired types ('Counterparty Check', 'Full Mandate', 'Standalone')
-- stay valid so existing rows keep working, and the app no longer offers them.
-- No existing row is changed. Run this BEFORE deploying the matching app code.

alter table orders drop constraint if exists orders_engagement_type_check;
alter table orders
  add constraint orders_engagement_type_check
    check (engagement_type in (
      'Pre-Order Check', 'Supplier Check', 'Import Compliance Assessment',
      'Transaction File', 'Held Goods and Non-Conformance Assessment',
      'Supply Contract Risk Assessment', 'Enhanced Supplier Due Diligence',
      'Inspection coordination', 'Negotiation Advisory',
      'PRC Specialist Coordination', 'Repeat Order File',
      'Counterparty Check', 'Full Mandate', 'Standalone'
    ));

alter table orders alter column engagement_type set default 'Pre-Order Check';
