import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

// /api/ai, /api/transcribe and /api/tts are also called from public,
// no-login-required marketing demo pages (/subtitles, /text-to-speech) as
// well as their /dashboard/* counterparts. So this can't require a session —
// it only tells the caller who to rate-limit as: the real user id when
// logged in (generous quota), otherwise their IP (tight quota, since an
// anonymous caller is the actual abuse vector for these paid-API proxies).
export type RequestIdentity = { key: string; anonymous: boolean };

export async function identifyRequest(req: NextRequest): Promise<RequestIdentity> {
  if (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      {
        cookies: {
          getAll() { return req.cookies.getAll(); },
          setAll() {},
        },
      }
    );
    const { data: { user } } = await supabase.auth.getUser();
    if (user) return { key: `user:${user.id}`, anonymous: false };
  }

  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "unknown";
  return { key: `ip:${ip}`, anonymous: true };
}

const WINDOW_MS = 60_000;
const buckets = new Map<string, { count: number; resetAt: number }>();

// Best-effort only: resets on cold start and isn't shared across serverless
// instances. Its job is to blunt a single authenticated account looping
// requests against a paid third-party API, not to be a precise global limiter.
export function checkRateLimit(key: string, maxPerMinute: number): boolean {
  const now = Date.now();
  const bucket = buckets.get(key);
  if (!bucket || now > bucket.resetAt) {
    buckets.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return true;
  }
  if (bucket.count >= maxPerMinute) return false;
  bucket.count += 1;
  return true;
}
