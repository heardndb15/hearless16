import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

function createSupabase(req: NextRequest, res: NextResponse) {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || "",
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "",
    {
      cookies: {
        getAll() {
          return req.cookies.getAll();
        },
        setAll(cookies) {
          cookies.forEach(({ name, value, options }) =>
            res.cookies.set(name, value, options)
          );
        },
      },
    }
  );
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { action } = body;

  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return NextResponse.json({ error: "Supabase не настроен" }, { status: 500 });
  }

  try {
    if (action === "register") {
      const res = NextResponse.json({});
      const supabase = createSupabase(req, res);
      const { email, password, name, language } = body;
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { name, language: language || "ru" } },
      });
      if (error) return NextResponse.json({ error: error.message }, { status: 400 });
      return NextResponse.json({ user: data.user });
    }

    if (action === "login") {
      const res = NextResponse.json({});
      const supabase = createSupabase(req, res);
      const { email, password } = body;
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) return NextResponse.json({ error: error.message }, { status: 400 });
      return NextResponse.json({ user: data.user, session: data.session });
    }

    if (action === "reset-password") {
      const res = NextResponse.json({});
      const supabase = createSupabase(req, res);
      const { email } = body;
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${req.headers.get("origin") || ""}/login`,
      });
      if (error) return NextResponse.json({ error: error.message }, { status: 400 });
      return NextResponse.json({ message: "Письмо отправлено. Проверьте почту." });
    }

    if (action === "signout") {
      const res = NextResponse.json({ message: "Выход выполнен" });
      const supabase = createSupabase(req, res);
      await supabase.auth.signOut();
      return res;
    }

    if (action === "google") {
      const res = NextResponse.json({});
      const supabase = createSupabase(req, res);
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: `${req.headers.get("origin") || ""}/dashboard` },
      });
      if (error) return NextResponse.json({ error: error.message }, { status: 400 });
      return NextResponse.json({ url: data.url });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch {
    return NextResponse.json({ error: "Ошибка сервера" }, { status: 500 });
  }
}
