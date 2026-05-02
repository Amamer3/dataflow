import { createClient } from "@supabase/supabase-js";
import type { Database } from "./types";

function getSupabaseEnv() {
  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SUPABASE_PUBLISHABLE_KEY = process.env.SUPABASE_PUBLISHABLE_KEY;

  if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY) {
    const missing = [
      ...(!SUPABASE_URL ? ["SUPABASE_URL"] : []),
      ...(!SUPABASE_PUBLISHABLE_KEY ? ["SUPABASE_PUBLISHABLE_KEY"] : []),
    ];
    const message = `Missing Supabase environment variable(s): ${missing.join(", ")}. Connect Supabase in the Cloud.`;
    console.error(`[Supabase] ${message}`);
    throw new Error(message);
  }

  return { SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY };
}

function getSupabaseAuthClient(token: string) {
  const { SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY } = getSupabaseEnv();

  return createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
    global: {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
    auth: {
      storage: undefined,
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

export async function getUserIdFromAccessToken(token: string): Promise<string> {
  if (!token) {
    throw new Error("Unauthorized: No token provided");
  }

  const supabase = getSupabaseAuthClient(token);
  const { data, error } = await supabase.auth.getClaims(token);
  if (error || !data?.claims?.sub) {
    throw new Error("Unauthorized: Invalid token");
  }

  return data.claims.sub;
}
