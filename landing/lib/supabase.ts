import { createBrowserClient } from "@supabase/ssr";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

function createBrowserSupabaseClient() {
  return createBrowserClient(supabaseUrl, supabaseAnonKey);
}

let client: ReturnType<typeof createBrowserSupabaseClient> | undefined;

// Components like ChatTab/DmsTab call createClient() on every render (not
// inside a mount-only effect). Without this singleton, each render spawned a
// separate GoTrueClient sharing the same cookie storage, and their competing
// auto-refresh timers could invalidate each other's session — surfacing as
// a random logout, most noticeably around navigation/tab-visibility changes.
//
// That memoization is only safe in an actual browser tab. These "use client"
// components' render bodies also execute server-side during SSR (e.g.
// /community is force-dynamic, so it's rendered fresh per request) — and the
// `let client` module variable lives in the Node.js module cache, which a
// warm Vercel serverless function instance can reuse across *different*
// HTTP requests (and different users). A browser client created there has
// no real session to read, so it immediately fires INITIAL_SESSION with no
// user; if that same cached instance then got reused for a later request,
// its stale/empty auth state — and its own competing auto-refresh timer —
// could bleed into a since-authenticated session, surfacing as the "logged
// out after leaving Community" bug. Root-caused via a `/community` request
// logging INITIAL_SESSION user=none while middleware confirmed the same
// user's session was valid moments before and after. So: memoize only on
// the client; always hand back a fresh, request-scoped instance on the
// server, where there's nothing to gain from caching it anyway.
export function createClient() {
  if (typeof window === "undefined") {
    return createBrowserSupabaseClient();
  }
  if (!client) {
    client = createBrowserSupabaseClient();
  }
  return client;
}
