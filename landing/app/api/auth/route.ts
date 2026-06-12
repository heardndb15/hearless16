import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

function getClient() {
  return createClient(supabaseUrl, supabaseKey);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { action } = body;

  if (!supabaseUrl || !supabaseKey) {
    return NextResponse.json({ error: "Supabase не настроен" }, { status: 500 });
  }

  const supabase = getClient();

  try {
    if (action === "register") {
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
      const { email, password } = body;
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) return NextResponse.json({ error: error.message }, { status: 400 });
      return NextResponse.json({ user: data.user, session: data.session });
    }

    if (action === "reset-password") {
      const { email } = body;
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${req.headers.get("origin") || "https://hearless16-ej8b.vercel.app"}/login`,
      });
      if (error) return NextResponse.json({ error: error.message }, { status: 400 });
      return NextResponse.json({ message: "Письмо отправлено. Проверьте почту." });
    }

    if (action === "signout") {
      const { error } = await supabase.auth.signOut();
      if (error) return NextResponse.json({ error: error.message }, { status: 400 });
      return NextResponse.json({ message: "Выход выполнен" });
    }

    if (action === "google") {
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
