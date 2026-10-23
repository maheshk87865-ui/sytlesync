# StyleSync Salon Partner API — Deployment Guide

## Quick Start (Docker)

```bash
# 1. Clone and configure
cp .env.example .env
# Edit .env with production values

# 2. Start with Docker Compose
docker compose up -d

# 3. Run migrations
docker compose run api bun run db:migrate

# 4. Seed demo data (optional)
docker compose run api bun run db:seed

# 5. Verify health
curl http://localhost:4000/api/v1/health
```

## Quick Start (Bare Metal)

```bash
# 1. Install Bun
curl -fsSL https://bun.sh/install | bash

# 2. Configure
cp .env.example .env
# Edit .env with your DATABASE_URL + secrets

# 3. Install + build
cd backend
bun install
bun run db:generate
bun run db:migrate

# 4. Seed (optional)
bun run db:seed

# 5. Start
bun run dev        # development (hot reload)
bun run start      # production
```

## Environment Configuration

### Development
```bash
NODE_ENV=development
LOG_LEVEL=debug
AUTH_COOKIE_SECURE=false
```

### Staging
```bash
NODE_ENV=staging
LOG_LEVEL=info
AUTH_COOKIE_SECURE=true
CORS_ORIGINS=https://staging.stylesync.in
```

### Production
```bash
NODE_ENV=production
LOG_LEVEL=warn
AUTH_COOKIE_SECURE=true
CORS_ORIGINS=https://app.stylesync.in
AUTH_JWT_SECRET=<32+ char random string>
DATABASE_URL=postgresql://user:pass@db-host:5432/stylesync_salon?schema=public
```

## Commands Reference

| Command | Description |
|---------|-------------|
| `bun run dev` | Start dev server with hot reload |
| `bun run start` | Start production server |
| `bun run db:generate` | Generate Prisma client |
| `bun run db:migrate` | Create + apply migrations |
| `bun run db:push` | Push schema (dev only) |
| `bun run db:seed` | Seed demo data |
| `bun run db:studio` | Open Prisma Studio GUI |
| `bun run lint` | ESLint |
| `bun run typecheck` | TypeScript strict check |
| `bun run test` | Run all tests (50 tests) |
| `bun run test:security` | Auth + RBAC + cross-salon tests |
| `bun run test:concurrency` | Double-booking + idempotency tests |
| `bun run test:consistency` | Data consistency tests |

## Deployment Checklist

### Pre-Deployment
- [ ] Environment variables set (.env)
- [ ] DATABASE_URL points to live PostgreSQL
- [ ] AUTH_JWT_SECRET is a 32+ char random string
- [ ] CORS_ORIGINS matches frontend domain
- [ ] AUTH_COOKIE_SECURE=true (for HTTPS)
- [ ] Payment gateway keys configured (if accepting online payments)
- [ ] Storage provider configured (for file uploads)
- [ ] Email/SMS providers configured (if using notifications)

### Database
- [ ] PostgreSQL 14+ running
- [ ] `bun run db:migrate` applied successfully
- [ ] `bun run db:seed` executed (for demo) OR skip for production
- [ ] Database backup scheduled (pg_dump cron or managed PITR)

### Application
- [ ] `bun run db:generate` succeeded
- [ ] `bun run typecheck` passes (0 errors)
- [ ] `bun run lint` passes (0 errors)
- [ ] `bun run test` passes (50/50 tests)
- [ ] Server starts: `bun run start`
- [ ] Health endpoint returns 200: `curl localhost:4000/api/v1/health`

### Security
- [ ] HTTPS terminated (Nginx/Caddy/Cloudflare)
- [ ] CORS origins locked to production domain
- [ ] Rate limiting active (X-RateLimit headers present)
- [ ] Helmet security headers present (HSTS, CSP, X-Frame-Options)
- [ ] Error messages sanitized in production (no raw DB errors)
- [ ] Secrets not in git (check .gitignore)
- [ ] Password hashing active (bcrypt)

### Monitoring
- [ ] Health check monitored (Uptime Robot / Datadog)
- [ ] Structured logs collected (stdout JSON)
- [ ] Error alerts configured
- [ ] Database backup monitoring

### Post-Deployment
- [ ] Login works: `POST /api/v1/auth/login`
- [ ] Auth token received and stored
- [ ] Dashboard loads: `GET /api/v1/analytics/dashboard`
- [ ] Bookings list: `GET /api/v1/bookings`
- [ ] Calendar loads: `GET /api/v1/calendar?view=WEEK`
- [ ] Availability generates: `GET /api/v1/availability?date=YYYY-MM-DD&staffId=xxx&serviceId=yyy`
- [ ] Payment summary: `GET /api/v1/payments/summary`
- [ ] Cross-salon isolation verified (Salon A token cannot access Salon B data)

## Backup Strategy

### Daily Backups
```bash
pg_dump "$DATABASE_URL" -Fc -f /backups/stylesync_$(date +%Y%m%d_%H%M%S).dump
find /backups -name "*.dump" -mtime +7 -delete
```

### Restore
```bash
pg_restore -d "$DATABASE_URL" -Fc /backups/stylesync_20261006_020000.dump
bun run db:generate
```

## Production Startup

```bash
# Docker
docker compose up -d

# Bare metal
NODE_ENV=production bun src/server.ts
```

## Test Credentials (after seed)

```
Email:    owner@premiumroots.in
Password: password123
API URL:  http://localhost:4000/api/v1
```
