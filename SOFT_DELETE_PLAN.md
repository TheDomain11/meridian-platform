# Soft-Delete System — Implementation Plan

Status: **STEP 1 — awaiting approval before any feature code is written.**

Scope confirmed with the following decisions:

1. Tables in scope: the 5 core tables (`clients`, `orders`, `suppliers`, `invoices`, `team`) **plus `enquiries`**. `email_approvals` is explicitly **out of scope** (audit table, left untouched — it keeps its existing hard-delete via `delete-approval.js`).
2. Add **both** `deleted_at` and `deleted_by` columns.
3. Permanent delete goes through a **service-role Netlify function** — never a direct frontend delete.
4. **One shared `/trash` view** with tabs per module.
5. Parent-with-children: **warn-only, no cascade.**

---

## 1. Tables getting the schema change

All six get two new nullable columns and a partial index:

| Table | New columns | Notes |
|---|---|---|
| `clients` | `deleted_at timestamptz`, `deleted_by uuid` | Core |
| `orders` | `deleted_at timestamptz`, `deleted_by uuid` | Core |
| `suppliers` | `deleted_at timestamptz`, `deleted_by uuid` | Core |
| `invoices` | `deleted_at timestamptz`, `deleted_by uuid` | Core |
| `team` | `deleted_at timestamptz`, `deleted_by uuid` | Core |
| `enquiries` | `deleted_at timestamptz`, `deleted_by uuid` | Written by `submit-enquiry.js`; no current UI reader — a Trash tab will be its first read surface |

- `deleted_at` — `null` = live, non-null = trashed (and the timestamp doubles as the deletion date and the anchor for the 30-day countdown: `deleted_at + interval '30 days'`).
- `deleted_by` — `uuid` holding `auth.uid()` of whoever trashed it. Low practical value today (effectively single-user) but added per decision #2 and future-proofs multi-user.
- **No auto-purge / no cron.** The "eligible for permanent deletion after 30 days" state is computed at render time. Nothing is ever deleted automatically.

---

## 2. Every query / component getting the `deleted_at is null` filter

This is the leak surface. Grouped by where the filtering actually happens.

### 2a. The primary chokepoint (frontend)
The entire frontend reads its five core arrays from **one** place:

- **`src/context/AppContext.jsx` → `fetchAll()`** — the five `supabase.from(...).select('*')` calls (clients, orders, suppliers, invoices, team). Adding `.is('deleted_at', null)` to each of these five is what keeps trashed rows out of the entire normal UI. **This single edit covers every list page, every detail page, the Dashboard, and all AI features**, because none of them query Supabase directly — they all consume these arrays.

### 2b. Frontend consumers that inherit the filter from 2a (verified — no direct DB access)
These need **no change** once 2a is filtered, but are listed exhaustively because each is a place trash would appear if 2a were ever bypassed. During implementation each will be re-verified to confirm it reads only from context:

- `src/pages/Clients.jsx` — `filtered`/`sorted` memos
- `src/pages/Orders.jsx` — `enriched`/`filtered`/`sorted`, `clientMap`
- `src/pages/Suppliers.jsx` — `filtered`/`sorted`, category list
- `src/pages/Invoicing.jsx` — `enriched`/`filtered`/`sorted`, `clientMap`/`orderMap`, CSV export source (`buildInvoicesCsv(invoices, …)`)
- `src/pages/Team.jsx` — `filtered`/`sorted`
- `src/pages/ClientDetail.jsx`, `OrderDetail.jsx`, `SupplierDetail.jsx`, `InvoiceDetail.jsx`, `MemberDetail.jsx` — each does `array.find(x => x.id === id)`; a trashed record excluded from the array falls through to their existing "not found" branch (desired)
- `src/pages/Dashboard.jsx` — metric counts, `recentOrders`, `clientMap`
- `src/components/ai/useAIContext.js` — entity resolution for the AI assistant
- `src/components/ai/AIShellBar.jsx` — builds the clients/orders/suppliers context sent to `ai-service`
- `src/components/ai/DashboardInsight.jsx`, `src/components/ai/AIAssistant.jsx` — read context arrays

### 2c. Netlify functions — service-role key BYPASSES RLS, so these are filtered by hand
- **`netlify/functions/inbound-email.js`** (`~line 154`) — `.from('clients').select('id, company').eq('email', …)`. **Real leak risk:** an inbound email matching a *trashed* client would resurrect activity onto it. → add `.is('deleted_at', null)`.
- **`netlify/functions/submit-enquiry.js`** (`~line 111`) — same client-lookup-by-email pattern. → add `.is('deleted_at', null)`. (Also inserts into `enquiries`; insert path unaffected.)
- **`netlify/functions/create-payment-link.js`**, **`send-invoice-email.js`**, **`upload-invoice-pdf.js`** — each `.update(...).eq('id', invoiceId)` on a user-chosen invoice. Low risk, but a trashed invoice should not be payable/sendable → add a `deleted_at is null` guard on the update (defensive).
- **`netlify/functions/list-approvals.js`** — reads `email_approvals` (out of scope) but **joins `clients(company)`**; a trashed client's name could show in an approval row. Cosmetic only. Will add a code comment noting the intentional non-filter (approvals are an audit surface); no functional change.
- `ai-service.js` / `approve-email.js` — touch `email_approvals` only → **no change** (out of scope).

### 2d. New code that deliberately reads ONLY trashed rows
- New `AppContext` trash loader — a fetch per in-scope table using `.not('deleted_at', 'is', null)`, lazy-loaded when `/trash` opens (keeps the main app payload lean).

---

## 3. Supabase migration SQL (you run this — I will not)

Delivered as `supabase/soft_delete.sql`. Paste into the Supabase SQL Editor and Run:

```sql
-- Soft-delete: add deleted_at + deleted_by to all in-scope tables.
-- Safe to re-run (IF NOT EXISTS guards).

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
```

### RLS actions you must verify/confirm in the dashboard
The frontend uses the **anon key** under an authenticated session, so it is subject to RLS. Only `email_approvals`'s policy exists in the repo; the six in-scope tables' policies live only in your Supabase project.

- **Soft delete & restore** are `UPDATE`s (setting/clearing `deleted_at`). These work through the frontend only if the `authenticated` role already has an `UPDATE` policy on each table — which it must, since `updateClient`/`updateOrder`/etc. already work today. No new policy expected, but confirm `enquiries` (which has never been updated from the app) has an `UPDATE` policy for `authenticated`, or its soft-delete/restore will need to go through a service-role function too.
- **Permanent delete** is a `DELETE`, routed through a **service-role Netlify function** (per decision #3). Service role bypasses RLS, so **no delete policy is required** — this is the reason we chose that route.

No data backfill: existing rows default to `deleted_at = null` = live.

---

## 4. New Netlify function (service-role, permanent delete)

- **`netlify/functions/purge-record.js`** — POST `{ table, id }`. Validates `table` against an allowlist (`clients`, `orders`, `suppliers`, `invoices`, `team`, `enquiries` — never `email_approvals` or anything else), then hard-deletes via `getSupabaseAdmin()` (service role). Mirrors the existing `delete-approval.js` shape and error handling.
- **Foreign-key safety (warn-only, decision #5):** the function attempts the delete and, if Postgres raises an FK violation (e.g. deleting a client still referenced by orders/invoices), returns a structured error naming the blocking relation. The frontend surfaces that in the second-confirmation dialog rather than cascading. The function does **not** cascade and does **not** touch child rows.

---

## 5. New dependencies for CSV / PDF export

**None.** Everything reuses what's already in `package.json`:

- **CSV** — `src/lib/csvExport.js` already has generic `downloadCsv()` + `escapeCsv()`. I'll add a small generic record→CSV builder beside them (no new dep).
- **PDF** — `jspdf` + `jspdf-autotable` are already dependencies (used by `src/lib/pdf/generateInvoicePdf.js`). A generic single-record field/value PDF reuses them; invoices can reuse the existing branded `generateInvoicePdf`. No new dep.

---

## 6. Frontend surface changes (for context; built in STEP 2)

- **Delete button:** added next to the existing **Edit** button on all five detail pages (`ClientDetail`, `OrderDetail`, `SupplierDetail`, `InvoiceDetail`, `MemberDetail`). (`enquiries` has no detail page; its rows are trashable only from within the Trash view's Enquiries tab if surfaced there, or not user-trashable at all — see open note below.)
- **Confirmation dialogs:** a shared confirm component, modeled on the existing inline `confirmDeleteId` pattern in `pages/Approvals.jsx`. Used for both the first (soft-delete) and second (permanent-delete) confirmations.
- **`/trash` route + Trash nav item:** new `pages/Trash.jsx`, route in `App.jsx`, entry in `components/Sidebar.jsx`. Tabs per in-scope module; each item shows deletion date and days remaining, flips to an "eligible for permanent deletion" flag past 30 days; per-item Restore / Export (CSV or PDF) / Permanently Delete.
- **`AppContext` additions:** `softDelete(entity, id)`, `restore(entity, id)`, `permanentDelete(entity, id)` (calls `purge-record.js`), and a lazy trash loader. Soft-delete/restore stamp `deleted_at` and `deleted_by` (`auth.uid()` from the current session).

### One open note on `enquiries`
`enquiries` has no list/detail page today, so there is no existing place to put a "Delete" button for it, and it has never been UPDATEd from the frontend (RLS caveat above). Two viable options for STEP 2 — flagging so you can pick:
- **(a)** Give `enquiries` a read-only Trash tab only for records trashed by future tooling, and don't add a user-facing "trash an enquiry" action yet (minimal, matches current lack of an enquiries UI).
- **(b)** Also add a small enquiries list surface so they can be trashed like other records (larger scope, arguably out of what was asked).

My recommendation is **(a)** for this pass. Confirm or override in your approval.

---

## Summary of files touched in STEP 2 (no code written yet)

**New:** `supabase/soft_delete.sql`, `netlify/functions/purge-record.js`, `src/pages/Trash.jsx`, a shared confirm-dialog component, generic CSV/PDF export helpers (extending `src/lib/csvExport.js` and `src/lib/pdf/`).
**Modified:** `src/context/AppContext.jsx` (5 fetch filters + soft-delete/restore/purge/trash-loader methods), `netlify/functions/inbound-email.js`, `submit-enquiry.js`, `create-payment-link.js`, `send-invoice-email.js`, `upload-invoice-pdf.js` (defensive filters), `src/App.jsx` (route), `src/components/Sidebar.jsx` (nav), the 5 detail pages (Delete button).

Awaiting approval to proceed to STEP 2.
