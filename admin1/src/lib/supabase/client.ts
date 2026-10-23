/**
 * Supabase Browser Client
 * --------------------------------------------------------------------
 * Used by client-side code (React components, hooks, Zustand stores).
 *
 * Uses the PUBLIC anon key — protected by Row Level Security (RLS)
 * policies in the database. Safe to expose to the browser.
 *
 * The service-role key is NEVER imported here — it lives only in
 * src/lib/supabase/server.ts and is used by server-side API routes
 * and Edge Functions.
 */

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

let cachedClient: SupabaseClient | null = null;

/**
 * Returns the singleton Supabase browser client. Throws a clear
 * configuration error if env vars are missing so callers can
 * surface it to the user instead of silently failing.
 */
export function getSupabaseBrowserClient(): SupabaseClient {
  if (cachedClient) return cachedClient;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new SupabaseConfigError(
      "Supabase env vars are not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local"
    );
  }

  cachedClient = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
    // Realtime is enabled so the customer app can subscribe to
    // booking updates, slot availability, etc.
    realtime: {
      params: { eventsPerSecond: 5 },
    },
  });

  return cachedClient;
}

/**
 * Returns true if Supabase is properly configured (env vars present).
 * Used by the data-access services to decide whether to attempt a
 * real call or fall back to demo data.
 */
export function isSupabaseConfigured(): boolean {
  return !!(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY &&
    !process.env.NEXT_PUBLIC_SUPABASE_URL.startsWith("https://placeholder")
  );
}

/**
 * Custom error class — used to distinguish configuration issues from
 * runtime database errors.
 */
export class SupabaseConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SupabaseConfigError";
  }
}

/**
 * Convenience export — call once at module load to verify the env.
 * Logs a warning (not an error) so the dev server keeps running when
 * the backend isn't configured yet.
 */
export function warnIfNotConfigured(): void {
  if (!isSupabaseConfigured() && typeof console !== "undefined") {
    console.warn(
      "[supabase] Not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local to enable real backend data. Falling back to demo data."
    );
  }
}
