# StyleSync — Website-Based Super Admin Panel

A comprehensive, production-grade, full-stack administrative platform for **StyleSync**, a salon and beauty-service marketplace connecting customers with partner salons.

The platform's initial pilot launch is centered in **Srinagar, Jammu & Kashmir, India**, with support for geographic scaling across tier-1 and tier-2 Indian cities.

- **Currency:** INR (₹)
- **Timezone:** Asia/Kolkata (`IST`)
- **Pilot Location:** Srinagar, J&K (Lal Chowk, Rajbagh, Karan Nagar, Bemina, Hyderpora, Hazratbal, etc.)
- **Platform:** Web-based responsive administrative website (Desktop, Laptop, Tablet, Mobile)

---

## Architecture & Technology Stack

| Layer | Technology | Details |
| :--- | :--- | :--- |
| **Frontend Framework** | **Next.js 16 (App Router)** | TypeScript, React Server/Client Components, Turbopack |
| **Styling & Design System** | **Tailwind CSS** | Curated Brand Palette, Desktop-first responsive layout, Zero unstyled components |
| **Icons & Micro-interactions** | **Lucide React** | Consistent SVG icon library across all 18 modules |
| **Database & ORM** | **Prisma ORM & SQLite / PostgreSQL** | Full relational schema, migrations, foreign keys, cascade safety |
| **Authentication & RBAC** | **jose & bcryptjs** | Secure HTTP-only cookies, 8-hour sessions, role-based authorization guards |
| **Testing** | **TypeScript automated test suite** | End-to-end integration and business logic verification |

### Brand Design Tokens
- **Primary Green:** `#0F766E`
- **Dark Green:** `#115E59`
- **Light Mint:** `#CCFBF1`
- **Page Background:** `#F8FAF9`
- **Card Background:** `#FFFFFF`
- **Primary Text:** `#17201F`
- **Secondary Text:** `#64706E`
- **Border Lines:** `#E2E8E6`

---

## Administrative Credentials

The database comes pre-seeded with 5 role-specific administrative test accounts:

| Role | Email | Password | Scope & Permissions |
| :--- | :--- | :--- | :--- |
| **Super Admin** | `admin@stylesync.in` | `AdminPassword123!` | Full unconstrained platform governance, settings, audits, admin provisioning |
| **Operations Admin** | `ops@stylesync.in` | `AdminPassword123!` | Salons, customers, global service catalog, bookings, operational approvals |
| **Finance Admin** | `finance@stylesync.in` | `AdminPassword123!` | Payments ledger, 7%/2% commissions, refund processing, payouts |
| **Support Admin** | `support@stylesync.in` | `AdminPassword123!` | Customer disputes, salon tickets, private staff resolution notes |
| **Analyst** | `analyst@stylesync.in` | `AdminPassword123!` | Read-only analytics, retention graphs, CSV reports export |

---

## 18 Functional Administrative Modules

Every route listed below is fully implemented, wired to real database aggregations, and resilient to page refreshes:

1. **`/login`** — Secure authentication page with role preview quick-switchers.
2. **`/dashboard`** — Core command center: customer, salon, booking, finance, and operational aggregations with 14-day trends and date filters (`Today`, `Last 7 Days`, `This Month`, `All Time`).
3. **`/customers`** & **`/customers/[id]`** — Complete customer directory, status toggle (Active/Suspended), full booking history, payments, and complaint investigations.
4. **`/salons`** & **`/salons/[id]`** — Partner salon applications, operational status (Open/Closed), one-click Approve/Reject (with reason)/Suspend modals, stylists, and catalog breakdown.
5. **`/services`** — Global catalog grouped by Hair, Beard & Grooming, Skin & Beauty, Nails, Makeup, and Salon-specific. Supports adding, editing, and toggling status.
6. **`/bookings`** — Central booking ledger with date/salon/status filters, cancellations with audit reason, and no-show flags.
7. **`/calendar`** — Interactive day/week/month appointment planner with stylist and salon density filtering.
8. **`/payments`** — Real financial splits enforcing **7% commission on new-customer bookings** and **2% on repeat-customer bookings**, duplicate refund prevention, and transaction details.
9. **`/reviews`** — Customer feedback stream with moderation queue for reported reviews and restore/hide actions.
10. **`/analytics`** — High-level platform health, cancellation curves, repeat client ratios, top salons, and one-click CSV report export.
11. **`/support`** — Dispute management with SLA priority badges, customer messages, and internal administrative private notes.
12. **`/notifications`** — Live operational alerts (new salon applications, flagged reviews, dispute escalation) with read/unread tracking.
13. **`/ai-operations`** — Telemetry for StyleSync AI features (Virtual Hairstyle Try-On, Facial Analysis, Salon Matchmaker) with latency and token tracking, and customer photo privacy safeguards.
14. **`/locations`** — Srinagar locality management (Lal Chowk, Rajbagh, etc.) and expandable multi-city coverage.
15. **`/settings`** — Platform-wide business rules: cancellation penalty window, default commission percentages, AI feature flags.
16. **`/admin-users`** — Administrator roster with RBAC assignment and self-deactivation prevention safeguards.
17. **`/audit-logs`** — Immutable tamper-evident security logs for every administrative decision, approval, and refund.
18. **`/profile`** — Current administrator profile, role privileges, and active session status.

---

## Quickstart Guide

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Database & Environment
Copy `.env.example` to `.env` (or use existing configuration):
```env
DATABASE_URL="file:./dev.db"
JWT_SECRET="stylesync_jwt_production_secret_key_change_in_real_env_2026"
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

### 3. Generate Prisma Client & Run Seeds
```bash
# Push schema to SQLite database
node ./node_modules/prisma/build/index.js db push

# Seed 30 Srinagar customers, 10 partner salons, 25 services, 80 bookings, reviews & tickets
npx tsx prisma/seed.ts
```

### 4. Run Automated Tests
```bash
npx tsx tests/run-all-tests.ts
```
*Expected output: `22 PASSED, 0 FAILED`*

### 5. Start Development Server
```bash
npm run dev
```
Open **[http://localhost:3000](http://localhost:3000)** in your browser.

### 6. Production Build Verification
```bash
npm run build
npm start
```
*Next.js compiles all 44 static and dynamic routes with zero TypeScript or prerendering warnings.*

---

## Business Logic & Financial Integrity

1. **Commission Model:**
   - **New Customer:** 7% platform fee retained by StyleSync, 93% allocated as salon payout.
   - **Repeat Customer:** 2% platform fee retained by StyleSync, 98% allocated as salon payout.
2. **Refund Policy Protection:**
   - Server-side guard prevents refunding more than the total collected charge.
   - Idempotency guarantees prevent duplicate double-refund submissions.
3. **Audit Trail:**
   - All approvals, rejections, suspensions, and manual refunds are recorded in the `AuditLog` table with administrator ID, IP, and timestamp.
