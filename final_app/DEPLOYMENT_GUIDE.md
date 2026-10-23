# StyleSync Cloud PaaS Deployment Guide
## Vercel (Frontends) + Render / Railway (Authoritative Backend)

This document provides the production deployment instructions for the complete StyleSync platform across Cloud PaaS providers.

---

## Architecture Overview

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
│       (admin1)       │  │       (admin2)       │  │       (stylesync-admin)       │
│   Deployed on Vercel │  │   Deployed on Vercel │  │      Deployed on Vercel       │
│  https://...vercel.app│ │  https://...vercel.app│ │     https://...vercel.app     │
└──────────┬───────────┘  └──────────┬───────────┘  └───────────────┬───────────────┘
           │                         │                              │
           │  REST Requests          │  REST Requests               │
           └────────────► ┌──────────▼────────────┐ ◄───────────────┘
                          │ Authoritative Backend │
                          │   (admin1/backend)    │
                          │   Render / Railway    │
                          │ https://...onrender...│
                          └──────────┬────────────┘
                                     │
                          ┌──────────▼────────────┐
                          │ Database Storage      │
                          │  Persistent Disk or   │
                          │  Hosted PostgreSQL    │
                          └───────────────────────┘
```

---

## 1. Deploy the Backend: `admin1/backend` (Render or Railway)

Deploy the backend first so you have its live HTTPS URL to supply to the frontends.

### Option A: Render (Recommended for Free Tier & Persistent Disks)

1. **Log in** to your [Render Dashboard](https://dashboard.render.com).
2. Click **New +** > **Web Service**.
3. Connect your Git repository containing the StyleSync workspace.
4. Fill in the service configuration:
   * **Name:** `stylesync-api`
   * **Root Directory:** `admin1/backend`
   * **Runtime:** `Node`
   * **Build Command:**
     ```bash
     npm install && npx prisma generate --schema=prisma/schema.sqlite.prisma && npm run build
     ```
   * **Start Command:**
     ```bash
     node dist/server.js
     ```
5. **Add Persistent Disk (For SQLite Data Persistence):**
   * Scroll down to **Disks** and click **Add Disk**.
   * **Name:** `stylesync-data`
   * **Mount Path:** `/data`
   * **Size:** `1 GB` (or larger)
6. **Set Environment Variables:**
   | Variable | Value | Notes |
   | :--- | :--- | :--- |
   | `NODE_ENV` | `production` | Enables production optimizations |
   | `PORT` | `10000` | (Render automatically routes this) |
   | `DATABASE_URL` | `file:/data/stylesync.db` | Points to persistent disk |
   | `JWT_SECRET` | *(Generate a secure 64-char string)* | Session signing key |
   | `CORS_ORIGINS` | `*` *(temporarily, update with Vercel URLs in Step 5)* | Allowed origins |
   | `AI_MODE` | `real` | Production AI engine flag |
   | `GEMINI_API_KEY` | *(Your Google Gemini API Key)* | Required for AI hairstyle analysis |
7. Click **Create Web Service**. Render will build and deploy your API at `https://stylesync-api.onrender.com`.

---

### Option B: Railway

1. **Log in** to [Railway.app](https://railway.app).
2. Click **New Project** > **Deploy from GitHub repo**.
3. Select the repository and configure the service:
   * **Root Directory:** `admin1/backend`
   * Railway automatically reads `railway.json`.
4. Under **Variables**, add the same environment variables as listed in the Render table above.
5. In **Settings** > **Networking**, click **Generate Domain** to get your public API URL.

---

## 2. Deploy Customer Web App: `admin1` (Vercel)

1. **Log in** to [Vercel](https://vercel.com).
2. Click **Add New...** > **Project** and import your repository.
3. In the configuration screen:
   * **Project Name:** `stylesync-customer`
   * **Framework Preset:** `Next.js`
   * **Root Directory:** Click **Edit** and select `admin1`.
4. **Environment Variables:**
   | Variable | Value | Notes |
   | :--- | :--- | :--- |
   | `NEXT_PUBLIC_BACKEND_URL` | `https://your-backend.onrender.com/api/v1` | URL from Step 1 |
   | `GEMINI_API_KEY` | *(Your Gemini API Key)* | For client/server AI features |
   | `AI_MODE` | `real` | AI engine mode |
5. Click **Deploy**. Vercel will build and assign a domain (e.g., `https://stylesync-customer.vercel.app`).

---

## 3. Deploy Salon Partner App: `admin2` (Vercel)

1. Click **Add New...** > **Project** on Vercel and import the same repository.
2. In the configuration screen:
   * **Project Name:** `stylesync-salon`
   * **Framework Preset:** `Next.js`
   * **Root Directory:** Click **Edit** and select `admin2`.
3. **Environment Variables:**
   | Variable | Value | Notes |
   | :--- | :--- | :--- |
   | `NEXT_PUBLIC_BACKEND_URL` | `https://your-backend.onrender.com/api/v1` | Same backend URL |
   | `NEXT_PUBLIC_API_URL` | `https://your-backend.onrender.com/api/v1` | Fallback backend URL |
4. Click **Deploy**. Vercel will build and assign a domain (e.g., `https://stylesync-salon.vercel.app`).

---

## 4. Deploy Super Admin Platform: `stylesync-admin` (Vercel)

1. Click **Add New...** > **Project** on Vercel and import the repository.
2. In the configuration screen:
   * **Project Name:** `stylesync-admin`
   * **Framework Preset:** `Next.js`
   * **Root Directory:** Click **Edit** and select `stylesync-admin`.
   * **Build Command:** `npx prisma generate && next build`
3. **Environment Variables:**
   | Variable | Value | Notes |
   | :--- | :--- | :--- |
   | `DATABASE_URL` | `file:./prisma/dev.db` | Admin SQLite warehouse |
   | `JWT_SECRET` | *(Secure random string)* | Admin session auth |
   | `NEXT_PUBLIC_APP_NAME` | `StyleSync Admin` | Platform title |
   | `NEXT_PUBLIC_DEFAULT_CITY` | `Srinagar` | Pilot city |
   | `NEXT_PUBLIC_CURRENCY` | `INR` | Transaction currency |
   | `NEXT_PUBLIC_TIMEZONE` | `Asia/Kolkata` | Regional timezone |
4. Click **Deploy**. Vercel will compile all 46 administrative pages and assign a domain (e.g., `https://stylesync-admin.vercel.app`).

---

## 5. Final Step: Lock Down CORS on the Backend

Now that all three Vercel frontends are live with their assigned URLs:

1. Return to your **Render / Railway Dashboard** for `stylesync-api`.
2. Update the `CORS_ORIGINS` environment variable to strictly allow your deployed frontends:
   ```env
   CORS_ORIGINS=https://stylesync-customer.vercel.app,https://stylesync-salon.vercel.app,https://stylesync-admin.vercel.app
   ```
3. Save changes. Render/Railway will automatically perform a zero-downtime redeploy.

---

## 6. Post-Deployment Verification Checklist

Verify your live production deployment:

- [ ] **Backend Health Check:** Open `https://your-backend.onrender.com/api/v1/health` in your browser. Expect `{"status":"ok"}`.
- [ ] **Customer App:** Open `https://stylesync-customer.vercel.app`, verify salons load and booking flow executes.
- [ ] **Salon Partner Portal:** Open `https://stylesync-salon.vercel.app`, log in and verify bookings & service management sync live with the backend.
- [ ] **Super Admin Portal:** Open `https://stylesync-admin.vercel.app/login`, authenticate with `admin@stylesync.in` / `Admin@123456`, and verify financial charts, audit logs, and Srinagar pilot salons.
