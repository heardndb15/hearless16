import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

// req.headers.get("origin") is not reliably present on every request path
// (proxies/edge configs can drop it), which silently produced a relative
// redirectTo/emailRedirectTo ("/auth/callback...") instead of an absolute
// URL - Supabase then can't send the user back after Google OAuth or an
// email confirmation. Falling back to the known production domain keeps
// these links absolute even when the header is missing.
const SITE_URL_FALLBACK = "https://www.hearless.live";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { action } = body;

  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return NextResponse.json({ error: "Supabase не настроен" }, { status: 500 });
  }

  const cookieStore: { name: string; value: string; options: any }[] = [];

  function createSupabase() {
    return createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() { return req.cookies.getAll(); },
          setAll(cookies) {
            cookies.forEach(({ name, value, options }) =>
              cookieStore.push({ name, value, options })
            );
          },
        },
      }
    );
  }

  try {
    if (action === "register") {
      const supabase = createSupabase();
      const { email, password, name, language } = body;
      const origin = req.headers.get("origin") || SITE_URL_FALLBACK;
      const { data, error } = await supabase.auth.signUp({
        email, password,
        options: {
          data: { name, language: language || "ru" },
          emailRedirectTo: `${origin}/auth/callback?next=/dashboard`,
        },
      });
      if (error) return NextResponse.json({ error: error.message }, { status: 400 });
      const res = NextResponse.json({ user: data.user, session: data.session });
      cookieStore.forEach(c => res.cookies.set(c.name, c.value, c.options));
      return res;
    }

    if (action === "login") {
      const supabase = createSupabase();
      const { email, password } = body;
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) return NextResponse.json({ error: error.message }, { status: 400 });
      const res = NextResponse.json({ user: data.user, session: data.session });
      cookieStore.forEach(c => res.cookies.set(c.name, c.value, c.options));
      return res;
    }

    if (action === "reset-password") {
      const supabase = createSupabase();
      const { email } = body;
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${req.headers.get("origin") || SITE_URL_FALLBACK}/login`,
      });
      if (error) return NextResponse.json({ error: error.message }, { status: 400 });
      const res = NextResponse.json({ message: "Письмо отправлено. Проверьте почту." });
      cookieStore.forEach(c => res.cookies.set(c.name, c.value, c.options));
      return res;
    }

    if (action === "signout") {
      const supabase = createSupabase();
      await supabase.auth.signOut();
      const res = NextResponse.json({ message: "Выход выполнен" });
      cookieStore.forEach(c => res.cookies.set(c.name, c.value, c.options));
      return res;
    }

    if (action === "google") {
      const supabase = createSupabase();
      const origin = process.env.NEXT_PUBLIC_SITE_URL || req.headers.get("origin") || SITE_URL_FALLBACK;
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: `${origin}/auth/callback?next=/dashboard` },
      });
      if (error) return NextResponse.json({ error: error.message }, { status: 400 });
      const res = NextResponse.json({ url: data.url });
      cookieStore.forEach(c => res.cookies.set(c.name, c.value, c.options));
      return res;
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch {
    return NextResponse.json({ error: "Ошибка сервера" }, { status: 500 });
  }
}
