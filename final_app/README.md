# StyleSync 💇‍♂️✨

A unified multi-app platform for salon booking, partner operations, and administrative management.

---

## 🌟 Overview

**StyleSync** connects customers, salon partners, and platform administrators seamlessly in one ecosystem:

1. **Customer App** — Discover salons, explore services, book appointments, and track booking statuses in real-time.
2. **Salon Partner App** — Dedicated portal for salon owners to manage staff, services, operating hours, client bookings, and revenue.
3. **Super Admin Portal** — Central command dashboard for platform-level management, salon verification, user auditing, and global analytics.
4. **Authoritative Backend** — Centralized REST API engine with database persistence powered by Prisma ORM.

---

## 🏗️ Architecture

```
                      ┌────────────────────────────────────────┐
                      │          Cloud DNS / Users             │
                      └──────────────────┬─────────────────────┘
                                         │
        ┌────────────────────────────────┼────────────────────────────────┐
        │                                │                                │
        ▼                                ▼                                ▼
┌──────────────────────┐  ┌──────────────────────┐  ┌───────────────────────────────┐
│     Customer App     │  │   Salon Partner App  │  │      Super Admin Portal       │
│  Explore & Bookings  │  │   Manage Operations  │  │    Platform Governance       │
└──────────┬───────────┘  └──────────┬───────────┘  └───────────────┬───────────────┘
           │                         │                              │
           │  REST Requests          │  REST Requests               │
           └────────────► ┌──────────▼────────────┐ ◄───────────────┘
                          │ Authoritative Backend │
                          │   Node.js / Express   │
                          └──────────┬────────────┘
                                     │
                          ┌──────────▼────────────┐
                          │   Prisma ORM & DB     │
                          │ PostgreSQL / SQLite   │
                          └───────────────────────┘
```

---

## 📁 Repository Structure

```text
├── api-client.ts                   # Unified type-safe API client
├── DEPLOYMENT_GUIDE.md             # Complete cloud deployment documentation
├── docker-compose.prod.yml         # Production container orchestration
├── generated-clients/              # Generated API & Prisma client bindings
├── prisma-admin/                   # Prisma schema & migrations (Admin instance)
├── prisma-admin1/                  # Prisma schema & migrations (Core backend)
├── prisma-client-admin/            # Compiled client models
├── prisma-client-admin1/           # Compiled client models
├── run-e2e-integration-suite.ts    # End-to-end multi-app integration tests
├── setup-deploy-configs.js         # Deployment configuration automation
├── sync-authoritative-db.ts        # Database synchronization utility
├── THREE_APP_INTEGRATION_REPORT.md # Cross-app integration verification report
├── tsconfig.json                   # TypeScript configuration
└── LICENSE                         # MIT License
```

---

## 🚀 Getting Started

### Prerequisites

- **Node.js**: v18.x or later
- **npm** or **yarn** / **pnpm**
- **Git**
- Optional: **Docker** & **Docker Compose**

### 1. Installation

Clone the repository and install dependencies:

```bash
git clone https://github.com/maheshk87865-ui/sytlesync.git
cd sytlesync
npm install
```

### 2. Environment Configuration

Create a `.env` file in the root and configure database credentials:

```env
DATABASE_URL="postgresql://user:password@localhost:5432/stylesync?schema=public"
PORT=5000
NODE_ENV=development
```

### 3. Database Migration & Prisma Setup

Generate Prisma client and run migrations:

```bash
npx prisma generate --schema=./prisma-admin1/schema.prisma
npx prisma migrate dev --schema=./prisma-admin1/schema.prisma
```

### 4. Running the Multi-App Integration Suite

To verify communication across all services and frontends:

```bash
npx ts-node run-e2e-integration-suite.ts
```

---

## 🚢 Deployment

For full cloud PaaS deployment instructions (e.g. Vercel for frontends, Render/Railway for backend, PostgreSQL for database), see [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md).

---

## 📄 License

This project is licensed under the terms of the [MIT License](./LICENSE).
