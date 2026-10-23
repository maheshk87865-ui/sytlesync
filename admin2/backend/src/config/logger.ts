// ============================================================
// Structured logger
// - JSON output in production, pretty console in development
// - Never logs sensitive fields (configured via LOG_REDACT_FIELDS)
// ============================================================

import { config } from '../config/index.js';

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const LEVEL_PRIORITY: Record<LogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
};

const currentLevel = LEVEL_PRIORITY[config.log.level as LogLevel] ?? LEVEL_PRIORITY.info;
const redactFields = new Set(config.log.redactFields.map((f) => f.toLowerCase()));

function redact(value: unknown, seen = new WeakSet()): unknown {
  if (value === null || value === undefined) return value;
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') return value;
  if (typeof value === 'object') {
    if (seen.has(value as object)) return '[Circular]';
    seen.add(value as object);
    if (Array.isArray(value)) return value.map((v) => redact(v, seen));
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      const lower = k.toLowerCase();
      if (redactFields.has(lower)) {
        out[k] = '[REDACTED]';
      } else {
        out[k] = redact(v, seen);
      }
    }
    return out;
  }
  return value;
}

function format(entry: Record<string, unknown>): string {
  if (config.app.env === 'production') return JSON.stringify(redact(entry));
  // Pretty format for dev
  const { level, message, ...rest } = entry as { level: string; message: string; [k: string]: unknown };
  const restStr = Object.keys(rest).length ? ' ' + JSON.stringify(redact(rest)) : '';
  const color = {
    debug: '\x1b[90m',
    info: '\x1b[32m',
    warn: '\x1b[33m',
    error: '\x1b[31m',
  }[level] ?? '';
  return `${color}[${level.toUpperCase()}]\x1b[0m ${message}${restStr}`;
}

function log(level: LogLevel, message: string, meta: Record<string, unknown> = {}) {
  if (LEVEL_PRIORITY[level] < currentLevel) return;
  const entry = {
    level,
    message,
    timestamp: new Date().toISOString(),
    ...meta,
  };
  const line = format(entry);
  if (level === 'error') process.stderr.write(line + '\n');
  else process.stdout.write(line + '\n');
}

export const logger = {
  debug: (message: string, meta?: Record<string, unknown>) => log('debug', message, meta),
  info: (message: string, meta?: Record<string, unknown>) => log('info', message, meta),
  warn: (message: string, meta?: Record<string, unknown>) => log('warn', message, meta),
  error: (message: string, meta?: Record<string, unknown>) => log('error', message, meta),
};

// Request-scoped logger — attaches requestId/userId/salonId to every log line
export function createRequestLogger(requestId: string, extra: Record<string, unknown> = {}) {
  return {
    debug: (message: string, meta?: Record<string, unknown>) => log('debug', message, { requestId, ...extra, ...meta }),
    info: (message: string, meta?: Record<string, unknown>) => log('info', message, { requestId, ...extra, ...meta }),
    warn: (message: string, meta?: Record<string, unknown>) => log('warn', message, { requestId, ...extra, ...meta }),
    error: (message: string, meta?: Record<string, unknown>) => log('error', message, { requestId, ...extra, ...meta }),
  };
}
