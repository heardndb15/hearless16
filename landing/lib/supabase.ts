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
  }
  return client;
}
