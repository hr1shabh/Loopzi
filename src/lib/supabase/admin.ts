import { createClient } from "@supabase/supabase-js";

/**
 * Supabase client with service role key — bypasses RLS.
 * Use ONLY in server-side cron jobs / admin endpoints.
 */
export const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);
