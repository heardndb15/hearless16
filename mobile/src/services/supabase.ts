import { createClient } from "@supabase/supabase-js";
import { LargeSecureStore } from "./secureSessionStorage";

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || "";
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || "";

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn("EXPO_PUBLIC_SUPABASE_URL и EXPO_PUBLIC_SUPABASE_ANON_KEY не заданы");
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    // Plain AsyncStorage keeps the session (access + refresh token) as
    // unencrypted plaintext on disk — recoverable from an unencrypted
    // device backup or with physical/ADB access. LargeSecureStore encrypts
    // it with a key held in the platform Keychain/Keystore instead.
    storage: new LargeSecureStore(),
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
