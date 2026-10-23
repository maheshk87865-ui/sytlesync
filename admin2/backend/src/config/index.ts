// ============================================================
// Centralized environment config loader
// - Reads .env via dotenv
// - Validates required vars (fails fast on missing secrets)
// - Exposes a typed `config` object — never use process.env directly in app code
// ============================================================

import dotenv from 'dotenv';

// In dev we load .env; in production .env is typically injected by the host
if (process.env.NODE_ENV !== 'production') {
  dotenv.config();
}

const env = process.env as Record<string, string | undefined>;

function required(name: string, fallback?: string): string {
  const v = env[name] ?? fallback;
  if (v === undefined || v === '') {
    if (process.env.NODE_ENV === 'production') {
      // In production we MUST have real values
      throw new Error(`Missing required environment variable: ${name}`);
    }
    // In dev, allow the placeholder fallback so the server can still start
    return fallback ?? '';
  }
  return v;
}

function optional(name: string, fallback = ''): string {
  return env[name] ?? fallback;
}

function int(name: string, fallback: number): number {
  const v = env[name];
  if (v === undefined || v === '') return fallback;
  const n = parseInt(v, 10);
  return Number.isNaN(n) ? fallback : n;
}

function bool(name: string, fallback: boolean): boolean {
  const v = env[name]?.toLowerCase();
  if (v === undefined) return fallback;
  return v === 'true' || v === '1' || v === 'yes';
}

function list(name: string, fallback: string[]): string[] {
  const v = env[name];
  if (!v) return fallback;
  return v.split(',').map((s) => s.trim()).filter(Boolean);
}

export const config = {
  app: {
    name: optional('APP_NAME', 'StyleSync Salon Partner API'),
    env: optional('NODE_ENV', 'development'),
    baseUrl: required('APP_BASE_URL', 'http://localhost:4000'),
    frontendBaseUrl: required('FRONTEND_BASE_URL', 'http://localhost:3000'),
    port: int('PORT', 4000),
    corsOrigins: list('CORS_ORIGINS', ['http://localhost:3000']),
  },

  db: {
    url: required(
      'DATABASE_URL',
      // dev-only placeholder so the server can boot without a real DB for typecheck/lint
      'postgresql://stylesync:stylesync@localhost:5432/stylesync_salon?schema=public',
    ),
    poolSize: int('DATABASE_POOL_SIZE', 10),
  },

  auth: {
    jwtSecret: required('AUTH_JWT_SECRET', 'dev-only-change-me-in-production-min-32-chars-please'),
    jwtExpiresIn: optional('AUTH_JWT_EXPIRES_IN', '7d'),
    cookieName: optional('AUTH_COOKIE_NAME', 'stylesync_salon_session'),
    cookieSecure: bool('AUTH_COOKIE_SECURE', false),
    bcryptRounds: int('AUTH_BCRYPT_ROUNDS', 10),
  },

  supabase: {
    url: optional('SUPABASE_URL'),
    anonKey: optional('SUPABASE_ANON_KEY'),
    serviceRoleKey: optional('SUPABASE_SERVICE_ROLE_KEY'),
  },

  storage: {
    provider: optional('STORAGE_PROVIDER', 'local') as 'supabase' | 's3' | 'local',
    s3: {
      endpoint: optional('S3_ENDPOINT'),
      region: optional('S3_REGION', 'us-east-1'),
      bucket: optional('S3_BUCKET'),
      accessKeyId: optional('S3_ACCESS_KEY_ID'),
      secretAccessKey: optional('S3_SECRET_ACCESS_KEY'),
    },
    localDir: optional('STORAGE_LOCAL_DIR', './uploads'),
  },

  payment: {
    gatewayKey: optional('PAYMENT_GATEWAY_KEY'),
    gatewaySecret: optional('PAYMENT_GATEWAY_SECRET'),
    webhookSecret: optional('PAYMENT_WEBHOOK_SECRET'),
  },

  notification: {
    providerKey: optional('NOTIFICATION_PROVIDER_KEY'),
  },

  email: {
    provider: optional('EMAIL_PROVIDER', 'none') as 'smtp' | 'sendgrid' | 'ses' | 'none',
    from: optional('EMAIL_FROM', 'StyleSync <noreply@stylesync.in>'),
    smtp: {
      host: optional('SMTP_HOST'),
      port: int('SMTP_PORT', 587),
      user: optional('SMTP_USER'),
      password: optional('SMTP_PASSWORD'),
    },
    sendgridApiKey: optional('SENDGRID_API_KEY'),
  },

  sms: {
    provider: optional('SMS_PROVIDER', 'none') as 'none' | 'twilio' | 'msg91',
    key: optional('SMS_PROVIDER_KEY'),
    secret: optional('SMS_PROVIDER_SECRET'),
    senderId: optional('SMS_SENDER_ID'),
  },

  log: {
    level: optional('LOG_LEVEL', 'info'),
    redactFields: list('LOG_REDACT_FIELDS', ['password', 'token', 'secret', 'authorization', 'apiKey', 'refreshToken', 'paymentSecret']),
  },

  rateLimit: {
    windowMs: int('RATE_LIMIT_WINDOW_MS', 60_000),
    max: int('RATE_LIMIT_MAX', 100),
  },

  business: {
    defaultTimezone: optional('DEFAULT_BUSINESS_TIMEZONE', 'Asia/Kolkata'),
  },

  apiDocs: {
    enabled: bool('ENABLE_API_DOCS', true),
  },
} as const;

export type Config = typeof config;
