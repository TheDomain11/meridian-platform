-- Meridian Platform — demo seed data
-- Paste into Supabase SQL Editor and click Run

DO $$
DECLARE
  c1 uuid := gen_random_uuid();
  c2 uuid := gen_random_uuid();
  c3 uuid := gen_random_uuid();
  c4 uuid := gen_random_uuid();
  c5 uuid := gen_random_uuid();

  o1 uuid := gen_random_uuid();
  o2 uuid := gen_random_uuid();
  o3 uuid := gen_random_uuid();
  o4 uuid := gen_random_uuid();
  o5 uuid := gen_random_uuid();
BEGIN

-- ── Clients ──────────────────────────────────────────────────────────────────
INSERT INTO clients (id, company, contact, email, phone, country, status, source, notes, open_orders, last_activity) VALUES
  (c1, 'Cape Goods Imports',   'Sipho Ndlovu',   'sipho@capegoods.co.za',    '+27 21 555 0101', 'South Africa', 'Active',      'Referral',  '',                                          2, '2026-06-10'),
  (c2, 'Euro Pacific Trading', 'Klaus Bauer',    'k.bauer@europacific.de',   '+49 89 555 0202', 'Germany',      'Active',      'Trade Show','',                                          1, '2026-06-08'),
  (c3, 'London Direct Ltd',    'Emma Clarke',    'emma@londondirect.co.uk',  '+44 20 555 0303', 'UK',           'Active',      'Inbound',   '',                                          1, '2026-05-30'),
  (c4, 'Johannesburg Traders', 'Themba Khumalo', 'themba@jhbtraders.co.za',  '+27 11 555 0404', 'South Africa', 'On Hold',     'Referral',  'Payment dispute — hold new orders.',        0, '2026-04-15'),
  (c5, 'Benelux Sourcing BV',  'Lotte Visser',   'lotte@beneluxsourcing.nl', '+31 20 555 0505', 'Netherlands',  'Prospecting', 'LinkedIn',  'Initial call done. Send capability deck.', 0, '2026-06-01');

-- ── Orders ───────────────────────────────────────────────────────────────────
INSERT INTO orders (id, order_id, client_id, reference, category, description, value, origin, status, deadline, created_at, notes) VALUES
  (o1, 'MO-2026-001', c1, 'CGI-PO-441',  'Homeware',    'Ceramic mugs 12oz, white with logo, 2000 units', 6400.00,  'Jingdezhen, China', 'Quality Check', '2026-07-15', '2026-05-01', ''),
  (o2, 'MO-2026-002', c2, 'EPT-PO-089',  'Electronics', 'LED desk lamps, USB-C, warm white, 500 units',   8750.00,  'Guangzhou, China',  'Production',    '2026-07-30', '2026-05-10', ''),
  (o3, 'MO-2026-003', c3, 'LDL-PO-212',  'Kitchenware', 'Bamboo cutting boards, large, 1200 units',       3960.00,  'Zhejiang, China',   'Sourcing',      '2026-08-10', '2026-06-01', 'Awaiting supplier quotes.'),
  (o4, 'MO-2026-004', c1, 'CGI-PO-398',  'Homeware',    'Stainless steel vacuum flasks 500ml, 800 units', 5200.00,  'Shenzhen, China',   'Shipped',       '2026-06-30', '2026-04-15', ''),
  (o5, 'MO-2026-005', c2, 'EPT-PO-076',  'Electronics', 'Wireless charging pads 15W, 300 units',          4500.00,  'Dongguan, China',   'Delivered',     '2026-05-20', '2026-03-20', '');

-- ── Suppliers ────────────────────────────────────────────────────────────────
INSERT INTO suppliers (id, name, contact_name, wechat, phone, email, location, category, moq, lead_time, payment_terms, verified, status, orders_fulfilled, last_used, notes) VALUES
  (gen_random_uuid(), 'Jingdezhen Ceramics Co.', 'Wei Zhang',  'weizhang_jdz', '+86 798 555 0101', 'wei@jdzceramics.cn',     'Jingdezhen', 'Homeware',    '500 units',  45,   'T/T 30% deposit', true,  'Active',      12, '2026-05-01', ''),
  (gen_random_uuid(), 'Guangzhou Lumex Ltd.',    'Amy Liu',    'amyliu_lumex', '+86 20 555 0202',  'amy.liu@lumexgz.cn',     'Guangzhou',  'Electronics', '200 units',  35,   'T/T 50% deposit', true,  'Active',      8,  '2026-05-10', ''),
  (gen_random_uuid(), 'Shenzhen MetalWorks Co.', 'Jack Chen',  'jackchen_szm', '+86 755 555 0303', 'jack@szmetalworks.cn',   'Shenzhen',   'Homeware',    '300 units',  30,   'T/T 30% deposit', true,  'Active',      20, '2026-04-15', ''),
  (gen_random_uuid(), 'Dongguan PowerTech Ltd.', 'Sarah Wang', 'sarahwang_dg', '+86 769 555 0404', 'sarah@dgpowertech.cn',   'Dongguan',   'Electronics', '100 units',  40,   'T/T 30% deposit', true,  'Active',      6,  '2026-03-20', ''),
  (gen_random_uuid(), 'Foshan Textile Mill',     'Tom Li',     'tomli_foshan', '+86 757 555 0505', 'tom.li@fstextile.cn',    'Foshan',     'Textiles',    '1000 units', 50,   'T/T 50% deposit', false, 'Probation',   2,  '2026-02-10', 'Quality issue on last batch — monitoring.'),
  (gen_random_uuid(), 'Yiwu General Goods Co.',  'N/A',        '',             '+86 579 555 0606', 'contact@yiwugeneral.cn', 'Yiwu',       'General',     'N/A',        NULL, 'N/A',             false, 'Blacklisted', 0,  NULL,         'Fraudulent samples. Do not engage.');

-- ── Invoices ─────────────────────────────────────────────────────────────────
INSERT INTO invoices (id, invoice_no, client_id, order_id, status, issue_date, due_date, currency, line_items, notes) VALUES
  (gen_random_uuid(), 'INV-2026-001', c1, o4, 'Paid',  '2026-04-20', '2026-05-20', 'USD',
    '[{"description":"Stainless Steel Flasks 500ml x800","qty":800,"unit":6.50,"total":5200.00},{"description":"Sea Freight & Insurance","qty":1,"unit":420.00,"total":420.00}]', ''),
  (gen_random_uuid(), 'INV-2026-002', c2, o5, 'Paid',  '2026-03-25', '2026-04-25', 'USD',
    '[{"description":"Wireless Charging Pads 15W x300","qty":300,"unit":15.00,"total":4500.00},{"description":"Air Freight","qty":1,"unit":380.00,"total":380.00}]', ''),
  (gen_random_uuid(), 'INV-2026-003', c1, o1, 'Sent',  '2026-05-05', '2026-06-05', 'USD',
    '[{"description":"Ceramic Mugs 12oz x2000","qty":2000,"unit":3.20,"total":6400.00},{"description":"Sea Freight & Insurance","qty":1,"unit":510.00,"total":510.00}]', ''),
  (gen_random_uuid(), 'INV-2026-004', c2, o2, 'Draft', '2026-06-12', '2026-07-12', 'USD',
    '[{"description":"LED Desk Lamps USB-C x500","qty":500,"unit":17.50,"total":8750.00},{"description":"Sea Freight","qty":1,"unit":620.00,"total":620.00}]', 'Awaiting client PO confirmation before sending.'),
  (gen_random_uuid(), 'INV-2026-005', c3, o3, 'Draft', '2026-06-15', '2026-07-15', 'USD',
    '[{"description":"Bamboo Cutting Boards large x1200","qty":1200,"unit":3.30,"total":3960.00}]', 'Deposit invoice — 50% of order value.');

-- ── Team ─────────────────────────────────────────────────────────────────────
INSERT INTO team (id, name, email, phone, whatsapp, role, department, status, last_active, notes) VALUES
  (gen_random_uuid(), 'George Meridian', 'george@meridianinternational.io', '+852 6297 1699', '+852 6297 1699', 'Founder / Director', 'Leadership',       'Active',   '2026-06-19', ''),
  (gen_random_uuid(), 'Sarah Chen',      'sarah@meridianinternational.io',  '',               '',               'Sourcing Manager',   'Sourcing',         'Active',   '2026-06-18', ''),
  (gen_random_uuid(), 'James Okafor',    'james@meridianinternational.io',  '',               '',               'Client Manager',     'Client Relations', 'Active',   '2026-06-17', ''),
  (gen_random_uuid(), 'Mei Lin',         'mei@meridianinternational.io',    '',               '',               'Logistics Manager',  'Logistics',        'Active',   '2026-06-16', ''),
  (gen_random_uuid(), 'Anika Patel',     'anika@meridianinternational.io',  '',               '',               'Finance Manager',    'Finance',          'Active',   '2026-06-15', ''),
  (gen_random_uuid(), 'Tom Richards',    'tom@meridianinternational.io',    '',               '',               'Sourcing Analyst',   'Sourcing',         'Inactive', '2026-05-01', 'On leave until August.');

END $$;
