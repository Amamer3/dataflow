import { createClient } from "@supabase/supabase-js";
import type { Database } from "./types.js";
import { supabaseAdmin } from "./client.server.js";
import { Request, Response, NextFunction } from "express";

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

export type AuthenticatedUser = {
  userId: string;
  role: Database["public"]["Tables"]["profiles"]["Row"]["role"] | null;
};

export async function getUserFromAccessToken(token: string): Promise<AuthenticatedUser> {
  if (!token) {
    throw new Error("Unauthorized: No token provided");
  }

  const supabase = getSupabaseAuthClient(token);
  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data?.user?.id) {
    throw new Error("Unauthorized: Invalid token");
  }

  const userId = data.user.id;
  const { data: profile, error: profileError } = await supabaseAdmin
    .from("profiles")
    .select("role")
    .eq("id", userId)
    .single();

  if (profileError || !profile) {
    throw new Error("Unauthorized: Unable to resolve user role");
  }

  return { userId, role: profile.role ?? null };
}

export async function getUserIdFromAccessToken(token: string): Promise<string> {
  return (await getUserFromAccessToken(token)).userId;
}

export interface AuthRequest extends Request {
  user?: AuthenticatedUser;
}

export async function authMiddleware(req: AuthRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Unauthorized: No token provided" });
  }

  const token = authHeader.split(" ")[1];
  try {
    const user = await getUserFromAccessToken(token);
    req.user = user;
    next();
  } catch (error: any) {
    res.status(401).json({ error: error.message });
  }
}

export async function adminMiddleware(req: AuthRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Unauthorized: No token provided" });
  }

  const token = authHeader.split(" ")[1];
  try {
    const user = await getUserFromAccessToken(token);
    if (user.role !== "admin" && user.role !== "super_admin") {
      return res.status(403).json({ error: "Forbidden: Admin access required" });
    }
    req.user = user;
    next();
  } catch (error: any) {
    res.status(401).json({ error: error.message });
  }
}
