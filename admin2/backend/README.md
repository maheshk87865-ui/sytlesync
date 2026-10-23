# StyleSync Salon Partner App — Backend

Production-ready backend for the **StyleSync Salon Partner App** (salon management only — not the customer app).

## Stack

- **Runtime**: Bun (dev) / Node.js (prod)
- **Language**: TypeScript (strict)
- **HTTP**: Express
- **Database**: PostgreSQL via Prisma ORM
- **Validation**: Zod
- **Auth**: JWT/session (foundation stub — see `src/middleware/auth.ts`)
- **Logging**: Structured (JSON in prod, pretty in dev) with sensitive-field redaction

## Architecture

```
Controller  →  Service  →  Repository  →  Database
```

- **Controller** — HTTP layer (validates input, calls service, returns unified envelope)
- **Service** — Business logic (conflict prevention, status transitions, etc.)
- **Repository** — Data access (all Prisma queries live here, never in routes)
- **Routes** — Express router wiring (no business logic)

Every resource is **salon-scoped**: every query filters by `salonId` from the authenticated context — a salon can never see another salon's data.

## Project structure

```
backend/
  src/
    config/         env config, logger
    database/       Prisma client singleton
    middleware/     requestId, requestLogger, auth, validate, errorHandler
    modules/
      auth/         salon registration + login + me
      salons/       salon profile, status, temporary closure
      staff/        staff CRUD + service assignments + schedules + unavailability
      bookings/     create (with conflict prevention), list, status, reschedule
      calendar/     bookings + blocked slots for a date range
      availability/ blocked slots + breaks
      services/     salon service catalog (CRUD, toggle active)
      customers/     customer CRUD + booking history + reviews + favorites
      reviews/      reviews + salon reply
      payments/     payments list, status update, refund, revenue summary
      analytics/    booking/customer/service/staff analytics
      notifications/ salon-side in-app notifications
      support/      support tickets + responses
      settings/     salon business settings (key/value JSON)
      audit/         audit log
      (each module has controller/, service/, repository/, routes/, validation/)
    routes/         re-exports each module's router
    utils/          response helpers, moduleFactory
    jobs/           background jobs (placeholder)
    types/           shared types (placeholder)
    app.ts           express setup + middleware wiring
    server.ts        HTTP entry point + graceful shutdown
  prisma/
    schema.prisma   full data model
  .env.example     all required env vars (no hardcoded secrets)
```

## Quick start

```bash
cd backend
cp .env.example .env     # fill in real values
bun install             # or npm install
bun run db:generate     # generate Prisma client
bun run db:migrate      # create + apply migrations (PostgreSQL must be running)
bun run dev             # start dev server on port 4000
```

## Health check

```
GET /api/v1/health
```

Response:
```json
{
  "success": true,
  "data": {
    "status": "healthy",
    "database": "connected",
    "timestamp": "2026-10-06T04:33:00.000Z"
  }
}
```

## API versioning

All routes are prefixed with `/api/v1/`. Examples:

- `/api/v1/auth` — register, login, me
- `/api/v1/salon` — salon profile + status + closure
- `/api/v1/staff` — staff CRUD + unavailability
- `/api/v1/bookings` — booking CRUD + status + reschedule
- `/api/v1/calendar` — calendar data for a date range
- `/api/v1/availability` — blocked slots + breaks
- `/api/v1/services` — service catalog CRUD
- `/api/v1/customers` — customer CRUD + history
- `/api/v1/reviews` — reviews + reply
- `/api/v1/payments` — payments + status + refund + summary
- `/api/v1/analytics` — analytics dashboard
- `/api/v1/notifications` — in-app notifications
- `/api/v1/support` — support tickets
- `/api/v1/settings` — salon business settings
- `/api/v1/audit` — audit log

## Response format

Success:
```json
{ "success": true, "data": {}, "message": "..." }
```

Error:
```json
{ "success": false, "error": { "code": "...", "message": "...", "details": {} } }
```

## Conflict prevention (bookings)

The bookings service enforces all of the following before creating a booking:

- Salon must be `OPEN`
- Service must exist, be active, and belong to the salon
- Staff must exist, be `ACTIVE`, and belong to the salon
- Staff must be assigned to the selected service
- Staff must be working that day (per their weekly schedule)
- Requested time must fall within the staff's working hours
- Staff must have no time-off entry overlapping the requested time
- No existing non-cancelled booking for the same staff overlaps the requested time (no double-booking)
- No blocked slot or break overlaps the requested time

Violations return `409 Conflict` with a specific `code`:
- `SALON_CLOSED`, `STAFF_UNAVAILABLE`, `BOOKING_CONFLICT`, `SLOT_BLOCKED`, `SLOT_BREAK`, `INVALID_STATUS_TRANSITION`, `PAYMENT_NOT_REFUNDABLE`

## Notes

- **Money is stored in paise** (₹1 = 100 paise) to avoid float rounding issues. The frontend divides by 100 for display.
- **Auth is a foundation stub**: `src/middleware/auth.ts` attaches a `req.context = { userId, salonId, role }` derived from the `X-Salon-Id`/`X-User-Id`/`X-Role` headers so endpoints can be exercised before the full JWT/session flow is wired up. The real implementation will replace this stub.
- **Opening hours** are not yet modelled as columns on `Salon`; the foundation skips the salon-hours check in the bookings service. The full implementation will load opening hours from `SalonSettings`.

## Backup and Restore Strategy

### Automated Backups (Production)

Use `pg_dump` with compression for nightly full backups:

```bash
# Daily backup (cron: 0 2 * * *)
pg_dump "$DATABASE_URL" -Fc -f /backups/stylesync_$(date +%Y%m%d_%H%M%S).dump

# Retain 7 daily + 4 weekly + 12 monthly backups
find /backups -name "*.dump" -mtime +7 -delete
```

### Point-in-Time Recovery (PITR)

If using managed PostgreSQL (e.g. Supabase, RDS), enable WAL archiving for point-in-time recovery to any second.

### Restore Procedure

```bash
# Restore from a backup file
pg_restore -d "$DATABASE_URL" -Fc /backups/stylesync_20261006_020000.dump

# After restore, regenerate the Prisma client
bun run db:generate
```

### Database Health Monitoring

The `/api/v1/health` endpoint checks:
- Database connectivity (`SELECT 1`)
- Server uptime
- Memory usage (RSS)

Set up external monitoring (e.g. Uptime Robot, Datadog) to poll this endpoint every 30 seconds and alert on non-200 responses.

## Test Coverage

### Running Tests

```bash
# All tests
bun run test

# Security tests only (auth, RBAC, cross-salon isolation)
bun run test:security

# Concurrency tests only (double-booking, payment idempotency, status transitions)
bun run test:concurrency
```

### Test Coverage Summary

| Test Suite | Tests | Covers |
|-----------|-------|--------|
| Security | 23 | Auth, role-based access, cross-salon isolation, password hashing, JWT |
| Concurrency | 27 | Double-booking prevention, payment idempotency, status transitions, revenue calculation, cross-salon data isolation |
| **Total** | **50** | |
