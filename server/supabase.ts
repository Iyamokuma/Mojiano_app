import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const url = process.env.SUPABASE_URL ?? "";
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

const globalForSupabase = globalThis as unknown as { supabaseAdmin?: SupabaseClient };

export const supabaseAdmin =
  globalForSupabase.supabaseAdmin ??
  createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

if (process.env.NODE_ENV !== "production") globalForSupabase.supabaseAdmin = supabaseAdmin;
