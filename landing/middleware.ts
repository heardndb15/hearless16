import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

const protectedRoutes = ["/dashboard", "/profile"];

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const isProtected = protectedRoutes.some((route) => pathname.startsWith(route));
  if (!isProtected) return NextResponse.next();

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

  if (!supabaseUrl || !supabaseKey) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  const res = NextResponse.next();
  const supabase = createServerClient(supabaseUrl, supabaseKey, {
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
  });

  const { data, error } = await supabase.auth.getUser();

  // TEMP DEBUG: tracing the "logged out after leaving Community" bug — logs
  // every protected-route check so we can see whether getUser() is failing
  // (and why) right when the user navigates out of /community. Check with
  // `vercel logs` or the Vercel dashboard. Remove once root cause is confirmed.
  console.log(
    `[auth-debug] middleware ${new Date().toISOString()} path=${pathname} ` +
    `user=${data?.user?.id ?? "none"} error=${error?.message ?? "none"}`
  );

  if (!data?.user) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  return res;
}

export const config = {
  matcher: ["/dashboard/:path*", "/profile/:path*"],
};
