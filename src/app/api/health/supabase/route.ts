/**
 * GET /api/health/supabase
 * --------------------------------------------------------------------
 * Verifies that the Supabase backend is reachable + correctly
 * configured. Returns a structured report so the UI can show a
 * status badge without leaking secrets.
 */

import { NextResponse } from "next/server";
import { getSupabaseServerClient, isSupabaseServerConfigured } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const serverConfigured = isSupabaseServerConfigured();
  const publicUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "(not set)";
  const publicAnonSet = !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const serviceRoleSet = !!process.env.SUPABASE_SERVICE_ROLE_KEY;

  // Don't attempt a connection if env vars aren't set
  if (!serverConfigured) {
    return NextResponse.json({
      status: "not_configured",
      message: "Supabase env vars are not set. The customer app falls back to demo data.",
      env: {
        NEXT_PUBLIC_SUPABASE_URL: publicUrl.startsWith("https://placeholder") ? "(placeholder)" : "set",
        NEXT_PUBLIC_SUPABASE_ANON_KEY: publicAnonSet ? "set" : "(not set)",
        SUPABASE_SERVICE_ROLE_KEY: serviceRoleSet ? "set" : "(not set)",
      },
    });
  }

  // Try a real connection — list one row from each major table
  try {
    const supabase = getSupabaseServerClient();
    const checks: { table: string; ok: boolean; count: number; error?: string }[] = [];

    const tables = ["salons", "salon_services", "staff_members", "bookings", "reviews"];

    for (const table of tables) {
      try {
        const { count, error } = await supabase
          .from(table)
          .select("id", { count: "exact", head: true });

        if (error) {
          checks.push({ table, ok: false, count: 0, error: error.message });
        } else {
          checks.push({ table, ok: true, count: count ?? 0 });
        }
      } catch (e: any) {
        checks.push({ table, ok: false, count: 0, error: e.message });
      }
    }

    const allOk = checks.every((c) => c.ok);

    return NextResponse.json({
      status: allOk ? "ok" : "partial",
      message: allOk
        ? "Supabase backend is reachable and tables are accessible."
        : "Some tables are not accessible — check the migration status.",
      checks,
    });
  } catch (err: any) {
    return NextResponse.json({
      status: "error",
      message: "Supabase client could not be created.",
      error: err?.message,
    }, { status: 500 });
  }
}
