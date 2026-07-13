import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

// req.headers.get("origin") is not reliably present on every request path
// (proxies/edge configs can drop it) and can reflect a non-canonical host
// (e.g. the bare apex domain, which Vercel then 307-redirects to the
// canonical www host) - both silently point Supabase's redirectTo /
// emailRedirectTo at the wrong absolute URL, which can break the OAuth PKCE
// cookie (host-scoped) or just fail to bring the user back after email
// confirmation. NEXT_PUBLIC_SITE_URL pins these links to the known-good
// canonical domain; the header and the hardcoded fallback are only a safety
// net for when it isn't set.
const SITE_URL_FALLBACK = "https://www.hearless.live";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { action } = body;

  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return NextResponse.json({ error: "Supabase не настроен" }, { status: 500 });
  }

  const origin = process.env.NEXT_PUBLIC_SITE_URL || req.headers.get("origin") || SITE_URL_FALLBACK;
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
      const { email, password, name, language, terms } = body;
      if (terms !== true) {
        return NextResponse.json({ error: "Необходимо принять условия использования" }, { status: 400 });
      }
      if (typeof name !== "string" || name.trim().length < 1 || name.length > 50) {
        return NextResponse.json({ error: "Некорректное имя" }, { status: 400 });
      }
      if (typeof password !== "string" || password.length < 6) {
        return NextResponse.json({ error: "Пароль должен быть не менее 6 символов" }, { status: 400 });
      }
      const supabase = createSupabase();
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
        redirectTo: `${origin}/login`,
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
