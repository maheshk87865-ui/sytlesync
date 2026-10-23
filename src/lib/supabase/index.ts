/**
 * Supabase Public Exports
 * --------------------------------------------------------------------
 * Barrel file — re-exports the public API of the Supabase layer so
 * callers can do `import { ... } from "@/lib/supabase"` without
 * knowing whether they need the browser or server client.
 *
 * Convention:
 *   - Components / hooks / Zustand stores import from
 *     `@/lib/supabase/client` (browser, anon key, RLS-protected)
 *   - API routes / Edge Functions / Server Actions import from
 *     `@/lib/supabase/server` (service role, bypasses RLS)
 */

export {
  getSupabaseBrowserClient,
  isSupabaseConfigured,
  SupabaseConfigError,
  warnIfNotConfigured,
} from "./client";

export {
  getSupabaseServerClient,
  isSupabaseServerConfigured,
} from "./server";
