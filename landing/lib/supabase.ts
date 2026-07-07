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
export function createClient() {
  if (!client) {
    client = createBrowserSupabaseClient();
    // TEMP DEBUG: tracing the "logged out after leaving Community" bug —
    // logs every auth event from the one shared browser client so we can see
    // whether a SIGNED_OUT fires right after a refresh attempt. Remove once
    // root cause is confirmed.
    client.auth.onAuthStateChange((event, session) => {
      console.log(
        `[auth-debug] ${new Date().toISOString()} event=${event} ` +
        `user=${session?.user?.id ?? "none"} ` +
        `expires_at=${session?.expires_at ?? "n/a"}`
      );
    });
  }
  return client;
}
