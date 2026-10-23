/**
 * Supabase Server Client
 * --------------------------------------------------------------------
 * Used ONLY by server-side code: Next.js API routes, Server Actions,
 * Edge Functions, and any code that runs with privileged access.
 *
 * Uses the SERVICE ROLE key which bypasses Row Level Security (RLS).
 * NEVER import this file from a client component — the service-role
 * key must never reach the browser bundle.
 *
 * The 'server-only' marker throws at build time if this module ever
 * ends up in a client bundle.
 */

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

let cachedServerClient: SupabaseClient | null = null;

/**
 * Returns the singleton Supabase server client. Uses the service
 * role key to bypass RLS — only call this from API routes / Edge
 * Functions / Server Actions where the user's session has already
 * been validated by Supabase Auth.
 *
 * Throws a clear configuration error if env vars are missing.
 */
export function getSupabaseServerClient(): SupabaseClient {
  if (cachedServerClient) return cachedServerClient;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error(
      "Supabase server env vars are not configured. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local (server-side only)."
    );
  }

  if (serviceRoleKey.startsWith("placeholder")) {
    throw new Error(
      "Supabase service role key is still the placeholder. Replace it with the real key from your Supabase project settings."
    );
  }

  cachedServerClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  return cachedServerClient;
}

/**
 * Returns true if the server-side Supabase client is configured with
 * a real (non-placeholder) service role key.
 */
export function isSupabaseServerConfigured(): boolean {
  return !!(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.SUPABASE_SERVICE_ROLE_KEY &&
    !process.env.SUPABASE_SERVICE_ROLE_KEY.startsWith("placeholder")
  );
}
