# RMT — Renewal Management System: Project Brief

> Context primer for an AI assistant working on this codebase. Written 2026-08-19 against `APP_VERSION 1.1.0`.

---

## 1. What this application is

**RMT (Renewal Management System)**, internally branded *RenewalPro*, is an internal B2B operations tool built by **MarsLab** to manage the lifecycle of **software/service contract renewals** for their clients.

MarsLab is a **reseller**: they buy licences from vendors (Google Workspace, Microsoft 365, Seqrite, SSL certs, storage, etc.) and resell them to end clients. So every renewal record carries both a **purchase cost** (what MarsLab pays the vendor) and a **sales cost** (what the client pays), with **profit** as the margin between them.

**The core problem it solves:** contract renewals expire silently and revenue leaks. RMT tracks every contract's expiry date, automatically emails clients on a fixed reminder ladder, forces the sales team to record *why* a renewal lapsed, and reports on the revenue and margin at stake.

**Live URL:** `https://rmt.marslabintel.com`
**Availability:** the EC2 instance runs on a schedule — the app is only reachable **09:00–21:00 IST** to save cost.

---

## 2. Users and roles

Authentication is **Zoho SSO only** — there is no username/password login form in the UI (a `password` column and `change-password` route exist as legacy).

| Role | Description |
|---|---|
| `admin` | Full access — reports, user management, trash, activity logs, edit approvals, automation toggle |
| `sales` | Labelled **"CST / Sales"** in the UI. Day-to-day renewal management, field visits |

The DB `CHECK` constraint allows only `('sales','admin')`. Note two inconsistencies in the code: one route references a third role `'cst'` in `requireRole('sales','admin','cst')`, and `visits.js` has a `forbidFinance` guard for a `finance` role. **Neither role exists in the schema** — treat these as dead/aspirational code.

---

## 3. Tech stack

**Frontend**
- React 18.3 + Vite 6.4, plain JS (`.jsx`, no TypeScript)
- React Router 6 with lazy-loaded pages
- Tailwind CSS 3.4 (`darkMode: 'class'`)
- Recharts (charts), Framer Motion (animation), Lucide (icons), react-hot-toast
- three.js — used for a WebGL login background (`LiquidEther`) and a 3D profit/loss graph
- jsPDF + xlsx for export

**Backend**
- Node 20 + Express 4 (ESM, `"type": "module"`)
- PostgreSQL via `pg` (raw SQL — **no ORM**)
- JWT access tokens + HttpOnly refresh-token cookie
- helmet, express-rate-limit, cors, bcryptjs
- nodemailer (SMTP), node-cron, axios

**Infrastructure**
- Docker multi-stage build (node:20-alpine), runs as non-root `USER node`, exposes **3001**
- AWS ECR → EC2 → Kubernetes (`kubectl rollout restart deployment/app`)
- Deploy via `./push.sh` (builds, pushes to ECR, SSHes to EC2, patches the manifest, rolls the deployment)

---

## 4. Architecture

Single Express server does **both** jobs: serves the built React SPA from `dist/` **and** hosts the `/api` routes. There is no separate frontend host.

```
Browser ──> Express (:3001) ──┬── serves dist/ (React SPA)
                              ├── /api/*  (REST)
                              ├── SSE stream (realtime.js) — live push to clients
                              └── node-cron scheduler (in-process)
                                        │
                                   PostgreSQL
```

**Important:** the email scheduler runs **inside the web process** (`startScheduler()`, every 15 minutes after a 3s delay). If the deployment is scaled beyond one replica, **every replica will run the scheduler and send duplicate emails.** There is no leader election or job lock.

---

## 5. Data model (PostgreSQL)

Schema is created idempotently in `server/db.js` using `CREATE TABLE IF NOT EXISTS` plus a long list of `ALTER TABLE ... ADD COLUMN IF NOT EXISTS` migrations.

| Table | Purpose |
|---|---|
| `renewals` | **The core table.** One row per client contract |
| `renewal_history` | Audit trail — `previous_data`/`new_data` as JSON text, who and when |
| `activity_logs` | App-wide action log with IP address |
| `email_logs` | Every email sent, recipient type, status, errors |
| `notifications` | In-app notifications, per user or per role |
| `refresh_tokens` | Refresh-token store for revocation |
| `trash_renewals` | Soft-delete holding area (mirrors `renewals` columns) |
| `visits` | Field-visit tracking with GPS |
| `visit_locations` | GPS breadcrumb trail per visit |
| `automation_settings` | Global email-automation on/off |
| `automation_logs` | Who toggled automation and why |
| `product_pricing` | Vendor price book — list/ERP/purchase/sales price, coupon discount |

### `renewals` — key columns

- **Identity:** `unique_id` (e.g. `RMT-273`), `client_name`, `reference_id`, `entity`
- **Service:** `service`, `product`, `description`, `vendor`, `quantity`
- **Dates/value:** `renewal_date`, `value`, `plan_period` (`monthly_plan`/`quarterly_plan`/`halfly_plan`/`yearly_plan`), `plan_duration`
- **People:** `owner`, `client_email`, `sales_email`, `contact_number`
- **Economics:** `purchase_cost`, `total_purchase_cost`, `sales_cost`, `total_sales_cost`, `profit`
- **Invoice:** `invoice_status` (`'Sent'`/`'Not'` only), `invoice_number`, `invoice_value`, `invoice_sent_date`, `quotation_number`
- **Payment:** `payment_status`, `payment_amount`, `payment_received_date`
- **Workflow:** `status`, `renewal_confirmation`, `follow_up_status`, `follow_up_remarks`, `edit_status`, `edit_reason`, `expiry_reason`, `locked`
- **Email ladder flags:** `day_30_sent`, `day_20_sent`, `day_15_sent`, `day_10_sent`, `day_5_sent`, `day_3_sent`, `day_0_sent`

### State vocabularies

- `status`: `Active`, `Pending Renewal`, `Renewed`, `Expired`, `-`
- `renewal_confirmation`: `pending`, `reminder_sent`, `quote_sent`, `quotation_confirmation`, `awaiting_client_approval`, `awaiting_with_vendor`, `renewed`, `cancelled`, `lost`, `service_discontinued`
- `edit_status`: `requested`, `approved`

---

## 6. Key business logic

### Automated client reminder ladder
The scheduler fires on **exact** day counts before expiry: **30, 20, 15, 10, 5, 3, 0**. Each has its own `day_N_sent` boolean so a reminder is never sent twice. Emails go to the client and to sales; expiry alerts go to admin.

### Automatic status transitions
- More than 30 days left → auto-set `renewal_confirmation = 'renewed'`
- Fewer than 30 days left → auto-**revert** back to `'pending'`

This also runs as a side effect of `GET /api/renewals/:id` — **fetching a record can mutate it.** Be aware when writing tests or read-only tooling.

### Edit-approval workflow
Sales cannot freely edit locked records. They call `request-edit` with a **mandatory reason**; an admin approves (in-app or via an emailed approval link). `edit_status` and `edit_reason` capture the trail.

### Mandatory expiry reason
When a renewal expires without a reason, sales users get a **blocking floating widget** (in `Layout.jsx`) polling every 60s that nags them until they explain why. Snooze is 1 hour.

### Field visits
Sales start a visit against a `renewal_id`, stream GPS breadcrumbs, check in (recording `arrival_distance_meters` from the client's stored lat/long), attach notes and a photo, then check out.

---

## 7. API surface

All under `/api`, all JWT-protected except the Zoho callback and the Books webhook.

| Prefix | Purpose |
|---|---|
| `/api/auth` | Zoho OAuth (`/zoho`, `/zoho/callback`, `/zoho/logout`), `/refresh`, `/logout`, `/me` |
| `/api/renewals` | Full CRUD, `/:id/history`, `/:id/request-edit`, `/:id/approve-edit`, `/:id/renew`, `/:id/confirm-renewal`, `/:id/expiry-reason`, `/:id/invoice`, `/:id/payment`, `/:id/product-costs`, `/edits-history`, `/expired-no-reason` |
| `/api/dashboard` | `/stats`, `/actionable-items`, `/activity-logs`, `/email-logs`, `/notification-center`, `/charts/status`, `/charts/services`, `/charts/monthly`, `/trigger-scheduler` |
| `/api/visits` | `/start`, `/:id/location`, `/:id/check-in`, `/:id/notes`, `/:id/check-out`, `/admin/active`, `/admin/history`, `/admin/metrics` |
| `/api/pricing` | Price-book CRUD + `/analytics` |
| `/api/automation` | `/status`, `/toggle` (admin only, requires a note) |
| `/api/admin/users` | User management |
| `/api/webhooks` | `/zoho-books` — inbound invoice sync |
| `/api/tiles` | Map tile proxy for the visits map |

---

## 8. Integrations

| System | Purpose |
|---|---|
| **Zoho OAuth** | Sole authentication method |
| **Zoho Books** | Inbound webhook syncs invoice number/value/date onto the matching renewal, matched via an **"RMT ID" custom field** on the invoice |
| **Zoho Cliq** | Outbound notifications to two webhooks — a general channel and a sales channel |
| **SMTP** | Client/sales reminder emails via nodemailer |

---

## 9. Frontend pages

`/` Dashboard · `/renewals` RenewalsList (largest page, ~2,600 lines) · `/renewals/:id` ClientDetails · `/reports` Reports · `/visits` Visits · `/automation` EmailAutomation · `/pricing` Pricing · `/notifications` · `/edits-history` · `/settings` · `/trash` *(admin)* · `/activity-logs` *(admin)* · `/admin/users` *(admin)*

The design system lives in `src/index.css` (`.card`, `.btn-primary`, `.btn-secondary`, `.input-field`, `.label`) plus `tailwind.config.js`. The current theme is a warm amber/orange/rose gradient with **glassmorphic translucent cards** ("iPhone Liquid Glass"). This is a deliberate aesthetic choice by the owner — **do not replace it with a flat/neutral design without being asked.**

---

## 10. Known issues and gotchas

Things a new contributor will trip over:

1. **`invoice_status` is binary (`'Sent'`/`'Not'`).** The Zoho Books webhook *receives* `paid`, `partially_paid`, and `overdue` — then collapses all of them to `'Sent'`. **Payment state arriving from Zoho is discarded.** Closing this is the highest-value improvement available.
2. **Scheduler runs in-process** — scaling past 1 replica causes duplicate emails.
3. **`GET /api/renewals/:id` mutates the row** (auto status transitions).
4. **`visits.photo_data` stores base64 images as `TEXT` in Postgres.** Bloats the table and every `SELECT *`.
5. **Hardcoded AWS credentials were previously committed** in `push.sh` (now removed from the working tree, but still present in local git history at commit `776cbdd`). Never pushed to GitHub. The key should be rotated.
6. **`origin/main` is far behind** — local `main` was ~42 commits ahead at last check. Most work is unpushed.
7. **No test suite.** No unit, integration, or e2e tests exist. Verification is manual.
8. **No TypeScript**, and very large single-file components (`RenewalsList.jsx` ~2,600 lines, `Layout.jsx` ~1,300 lines).
9. **Local dev requires Zoho SSO**, which makes running authenticated pages locally awkward. The local Postgres is typically empty.
10. **Recently fixed:** the Reports "AI Executive Monthly P&L" panel used to fabricate profit as `revenue × 0.72` instead of using the real `profit` column — overstating margin by 6–12× in testing. Now uses `SUM(profit)` and discloses incomplete coverage. The panel labelled "AI" is still **plain arithmetic, not a model call.**

---

## 11. Development commands

```bash
npm run build     # vite build → dist/
npm start         # NODE_ENV=production node server/index.js  (serves dist/ + /api)
npm run dev       # build then start (NOT a hot-reload dev server)
npm run seed      # node server/seed.js
./push.sh         # full deploy: docker build → ECR → EC2 → kubectl rollout
```

There is **no HMR dev server script** — `npm run dev` does a full build then starts the production server.
