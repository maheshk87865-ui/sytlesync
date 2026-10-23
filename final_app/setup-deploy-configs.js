const fs = require('fs');
const path = require('path');

// 1. admin1/backend deployment files
const backendDir = 'D:/AntiGravity/admin1/backend';

// render.yaml
const renderYaml = `services:
  - type: web
    name: stylesync-api
    runtime: node
    plan: starter
    region: oregon
    rootDir: admin1/backend
    buildCommand: npm install && npx prisma generate --schema=prisma/schema.sqlite.prisma && npm run build
    startCommand: node dist/server.js
    disk:
      name: stylesync-data
      mountPath: /data
      sizeGB: 1
    envVars:
      - key: NODE_ENV
        value: production
      - key: PORT
        value: 10000
      - key: DATABASE_URL
        value: file:/data/stylesync.db
      - key: CORS_ORIGINS
        value: https://stylesync-customer.vercel.app,https://stylesync-salon.vercel.app,https://stylesync-admin.vercel.app
      - key: JWT_SECRET
        generateValue: true
      - key: AI_MODE
        value: real
`;
fs.writeFileSync(path.join(backendDir, 'render.yaml'), renderYaml, 'utf8');

// railway.json
const railwayJson = {
  "$schema": "https://railway.app/railway.schema.json",
  "build": {
    "builder": "NIXPACKS",
    "buildCommand": "npm install && npx prisma generate --schema=prisma/schema.sqlite.prisma && npm run build"
  },
  "deploy": {
    "startCommand": "node dist/server.js",
    "restartPolicyType": "ON_FAILURE",
    "restartPolicyMaxRetries": 5
  }
};
fs.writeFileSync(path.join(backendDir, 'railway.json'), JSON.stringify(railwayJson, null, 2), 'utf8');

// Dockerfile (production alpine multi-stage)
const dockerfile = `FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json tsconfig.json ./
COPY prisma ./prisma/
RUN npm ci
RUN npx prisma generate --schema=prisma/schema.sqlite.prisma
COPY src ./src/
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=4000
COPY package*.json ./
RUN npm ci --only=production
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma
COPY prisma ./prisma/
RUN mkdir -p /data && chown -R node:node /data
USER node
EXPOSE 4000
CMD ["node", "dist/server.js"]
`;
fs.writeFileSync(path.join(backendDir, 'Dockerfile'), dockerfile, 'utf8');

// .dockerignore
const dockerignore = `node_modules
dist
.env
db/*.db
db/*.db-journal
`;
fs.writeFileSync(path.join(backendDir, '.dockerignore'), dockerignore, 'utf8');

// .env.production.example
const backendEnvExample = `# StyleSync Authoritative Backend (Express) Production Environment
NODE_ENV=production
PORT=4000

# Database Configuration
# If deploying with persistent disk (e.g. Render Disk or Railway Volume):
DATABASE_URL=file:/data/stylesync.db
# If deploying with hosted PostgreSQL (e.g. Supabase, Neon, Railway Postgres):
# DATABASE_URL=postgresql://user:password@host:5432/stylesync?schema=public&sslmode=require

# Security & CORS (comma-separated list of deployed Vercel frontend domains)
CORS_ORIGINS=https://stylesync-customer.vercel.app,https://stylesync-salon.vercel.app,https://stylesync-admin.vercel.app
JWT_SECRET=replace_with_a_secure_random_64_character_hex_or_string

# External Services
GEMINI_API_KEY=your_gemini_api_key_here
AI_MODE=real
`;
fs.writeFileSync(path.join(backendDir, '.env.production.example'), backendEnvExample, 'utf8');

// Update backend package.json scripts to include build:prod
const backendPkgPath = path.join(backendDir, 'package.json');
const backendPkg = JSON.parse(fs.readFileSync(backendPkgPath, 'utf8'));
backendPkg.scripts = {
  ...backendPkg.scripts,
  "build:prod": "prisma generate --schema=prisma/schema.sqlite.prisma && tsc -p tsconfig.json",
  "build:prod:postgres": "prisma generate --schema=prisma/schema.prisma && tsc -p tsconfig.json"
};
fs.writeFileSync(backendPkgPath, JSON.stringify(backendPkg, null, 2) + '\n', 'utf8');
console.log('✓ admin1/backend deployment files created');

// 2. admin1 (Customer App) Vercel files
const admin1Dir = 'D:/AntiGravity/admin1';
const vercelCustomer = {
  "framework": "nextjs",
  "buildCommand": "next build",
  "installCommand": "npm install"
};
fs.writeFileSync(path.join(admin1Dir, 'vercel.json'), JSON.stringify(vercelCustomer, null, 2) + '\n', 'utf8');

const admin1EnvExample = `# StyleSync Customer App — Production Environment (Vercel)
# URL of your deployed Express backend on Render/Railway
NEXT_PUBLIC_BACKEND_URL=https://stylesync-api.onrender.com/api/v1

# AI Features
GEMINI_API_KEY=your_gemini_api_key_here
AI_MODE=real
`;
fs.writeFileSync(path.join(admin1Dir, '.env.production.example'), admin1EnvExample, 'utf8');
console.log('✓ admin1 deployment files created');

// 3. admin2 (Salon Partner App) Vercel files
const admin2Dir = 'D:/AntiGravity/admin2';
const vercelSalon = {
  "framework": "nextjs",
  "buildCommand": "next build",
  "installCommand": "npm install"
};
fs.writeFileSync(path.join(admin2Dir, 'vercel.json'), JSON.stringify(vercelSalon, null, 2) + '\n', 'utf8');

const admin2EnvExample = `# StyleSync Salon Partner App — Production Environment (Vercel)
# URL of your deployed Express backend on Render/Railway
NEXT_PUBLIC_BACKEND_URL=https://stylesync-api.onrender.com/api/v1
NEXT_PUBLIC_API_URL=https://stylesync-api.onrender.com/api/v1
`;
fs.writeFileSync(path.join(admin2Dir, '.env.production.example'), admin2EnvExample, 'utf8');
console.log('✓ admin2 deployment files created');

// 4. stylesync-admin (Super Admin App) Vercel files
const adminDir = 'D:/AntiGravity/stylesync-admin';
const vercelAdmin = {
  "framework": "nextjs",
  "buildCommand": "npx prisma generate && next build",
  "installCommand": "npm install"
};
fs.writeFileSync(path.join(adminDir, 'vercel.json'), JSON.stringify(vercelAdmin, null, 2) + '\n', 'utf8');

const adminEnvExample = `# StyleSync Super Admin — Production Environment (Vercel)
DATABASE_URL="file:./prisma/dev.db"
JWT_SECRET=replace_with_a_secure_random_64_character_hex_or_string
NEXT_PUBLIC_APP_NAME="StyleSync Admin"
NEXT_PUBLIC_DEFAULT_CITY="Srinagar"
NEXT_PUBLIC_CURRENCY="INR"
NEXT_PUBLIC_TIMEZONE="Asia/Kolkata"
`;
fs.writeFileSync(path.join(adminDir, '.env.production.example'), adminEnvExample, 'utf8');
console.log('✓ stylesync-admin deployment files created');
