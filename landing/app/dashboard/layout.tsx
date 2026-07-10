"use client";

import React, { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { createClient } from "../../lib/supabase";
import type { User } from "@supabase/supabase-js";

interface Profile {
  name: string;
  language: string;
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const supabase = createClient();

    async function loadProfile(userId: string) {
      const { data: profileData } = await supabase
        .from("users")
        .select("name, language")
        .eq("id", userId)
        .single();
      if (profileData) {
        setProfile({ name: profileData.name || "", language: profileData.language || "ru" });
      }
      setLoading(false);
    }

    // middleware.ts already gates every /dashboard/* and /profile/* request
    // server-side before this component ever mounts — reaching this code
    // means the server just confirmed a valid session. So a null session
    // here (e.g. on the INITIAL_SESSION event, which can race the browser
    // client's cookie restore right after a fresh mount) is treated as a
    // transient client-side hiccup, not a sign-out — same as how
    // Header.tsx / community/page.tsx react to auth state without ever
    // forcing navigation. Only an explicit SIGNED_OUT event (real
    // sign-out, or the SDK reporting a failed refresh) redirects.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session?.user) {
        setUser(session.user);
        loadProfile(session.user.id);
        return;
      }
      if (event === "SIGNED_OUT") {
        // A SIGNED_OUT event can fire spuriously: middleware.ts calls
        // getUser() server-side on every /dashboard/* navigation, which can
        // silently rotate the refresh token and write new cookies — but
        // this tab's own GoTrueClient keeps refreshing on its own
        // independent timer using the token it already had in memory. If
        // that stale, now-rotated-out token gets used right after the
        // server rotated it, Supabase rejects it and this client fires
        // SIGNED_OUT even though the account is still genuinely logged in
        // server-side (this is the "logged out after leaving Community"
        // bug — Community sits outside the middleware, so the tab spends
        // longer than usual before its next server round-trip, widening
        // the window for this race). Re-verify with a fresh network call
        // before trusting the event: a real sign-out still confirms as
        // logged-out here; a racy false one recovers with no redirect.
        supabase.auth.getUser().then(({ data, error }) => {
          console.log(
            `[auth-debug] ${new Date().toISOString()} SIGNED_OUT re-check ` +
            `user=${data?.user?.id ?? "none"} error=${error?.message ?? "none"}`
          );
          if (!data?.user) {
            router.push("/login");
          }
        });
      }
    });

    return () => subscription.unsubscribe();
  }, [router]);

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    await fetch("/api/auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "signout" }),
    });
    router.push("/login");
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--bg)] text-sky-900">
        {/* Decorative background blobs */}
        <div className="absolute top-1/4 left-1/4 w-[300px] h-[300px] bg-cyan-200/50 rounded-full blur-[80px] pointer-events-none"></div>
        <div className="absolute bottom-1/4 right-1/4 w-[300px] h-[300px] bg-purple-200/40 rounded-full blur-[80px] pointer-events-none"></div>
        
        <div className="relative z-10 flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-t-accent border-r-transparent border-slate-200 rounded-full animate-spin"></div>
          <p className="text-slate-500 font-syne text-xs font-bold tracking-widest uppercase">Hearless AI ...</p>
        </div>
      </div>
    );
  }

  const menuItems = [
    {
      name: "Субтитры Live",
      path: "/dashboard",
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      ),
    },
    {
      name: "Изучение жестов",
      path: "/dashboard/learn",
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
        </svg>
      ),
    },
    {
      name: "Перевод жестов",
      path: "/dashboard/sign-language-reader",
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 11V6a1.5 1.5 0 013 0v4m0-5a1.5 1.5 0 013 0v5m0-4a1.5 1.5 0 013 0v5m0-2.5a1.5 1.5 0 013 0V15a6 6 0 01-6 6h-1a5 5 0 01-4-2l-2-3a1.5 1.5 0 012.4-1.8L7 15" />
        </svg>
      ),
    },
    {
      name: "Текст → Речь",
      path: "/dashboard/text-to-speech",
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5L6 9H2v6h4l5 4V5z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.54 8.46a5 5 0 010 7.07M18.36 5.64a9 9 0 010 12.73" />
        </svg>
      ),
    },

    {
      name: "Community",
      path: "/dashboard/community",
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      ),
    },
    {
      name: "Профиль",
      path: "/dashboard/profile",
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        </svg>
      ),
    },
  ];

  return (
    <div className="min-h-screen bg-[var(--bg)] font-dm flex text-slate-800 relative overflow-hidden">

      {/* Sidebar Desktop */}
      <aside className="hidden md:flex flex-col w-72 bg-white border-r border-sky-100 shadow-sm shrink-0 z-10 relative">
        {/* Brand Header */}
        <div className="p-6 border-b border-slate-200/60 flex items-center gap-3">
          <img src="/logo.png" alt="Hearless" className="w-9 h-9 rounded-xl object-cover shadow-md shadow-accent/20" />
          <div>
            <h1 className="font-syne font-bold text-lg text-slate-800 leading-none">Hearless</h1>
            <span className="text-[10px] text-accent font-semibold tracking-widest uppercase">AI Assist</span>
          </div>
        </div>

        {/* Navigation Menu */}
        <nav className="flex-1 px-4 py-6 space-y-1.5 overflow-y-auto">
          {menuItems.map((item) => {
            const isActive = pathname === item.path;
            return (
              <Link
                key={item.name}
                href={item.path}
                className={`flex items-center gap-4 px-4 py-3 rounded-xl font-syne font-bold text-sm transition-all duration-200 group ${
                  isActive
                    ? "bg-sky-100 border border-sky-200 text-sky-700 shadow-sm"
                    : "border border-transparent text-sky-800 hover:bg-sky-50 hover:text-sky-900"
                }`}
              >
                <span className={`transition-transform duration-200 group-hover:scale-110 ${isActive ? "" : "opacity-80"}`}>
                  {item.icon}
                </span>
                <span>{item.name}</span>
              </Link>
            );
          })}
        </nav>

        {/* User Card */}
        <div className="p-4 border-t border-slate-200/60 bg-white">
          <div className="flex items-center gap-3 p-2.5 rounded-xl bg-sky-50 border border-sky-100 shadow-sm mb-3">
            <div className="w-10 h-10 rounded-lg bg-accent/15 border border-accent/20 text-accent flex items-center justify-center font-extrabold font-syne">
              {profile?.name ? profile.name[0].toUpperCase() : user?.email?.[0].toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-syne text-sm font-bold text-slate-800 truncate">{profile?.name || "Пользователь"}</p>
              <p className="text-[10px] text-slate-400 font-semibold truncate mt-0.5">{user?.email}</p>
            </div>
          </div>
          <button
            onClick={handleSignOut}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-slate-200 bg-white/50 text-slate-600 hover:text-red-500 hover:bg-red-500/10 hover:border-red-500/20 font-bold text-xs shadow-sm transition-colors duration-200"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            Выйти из аккаунта
          </button>
        </div>
      </aside>

      {/* Main Container */}
      <div className="flex-1 flex flex-col min-w-0 z-10 relative">
        {/* Mobile Header */}
        <header className="flex md:hidden items-center justify-between px-6 py-4 bg-white border-b border-sky-100">
          <div className="flex items-center gap-3">
            <img src="/logo.png" alt="Hearless" className="w-8 h-8 rounded-lg object-cover" />
            <h1 className="font-syne font-bold text-md text-slate-800">Hearless</h1>
          </div>
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-1.5 rounded-lg border border-slate-200 text-slate-500 hover:text-slate-800 bg-white/50"
            aria-label="Toggle menu"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        </header>

        {/* Mobile Sidebar Drawer Overlay */}
        {mobileMenuOpen && (
          <div className="fixed inset-0 z-50 flex md:hidden">
            {/* Backdrop */}
            <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setMobileMenuOpen(false)}></div>

            {/* Sidebar Content */}
            <aside className="relative flex flex-col w-72 bg-white h-full border-r border-white/60 shadow-2xl p-6">
              <div className="flex items-center justify-between mb-8 pb-4 border-b border-slate-200">
                <div className="flex items-center gap-3">
                  <img src="/logo.png" alt="Hearless" className="w-8 h-8 rounded-lg object-cover" />
                  <h2 className="font-syne font-bold text-slate-800 text-md">Навигация</h2>
                </div>
                <button
                  onClick={() => setMobileMenuOpen(false)}
                  className="p-1 rounded-lg border border-slate-200 text-slate-500"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <nav className="flex-1 space-y-1.5">
                {menuItems.map((item) => {
                  const isActive = pathname === item.path;
                  return (
                    <Link
                      key={item.name}
                      href={item.path}
                      onClick={() => setMobileMenuOpen(false)}
                      className={`flex items-center gap-4 px-4 py-3 rounded-xl font-syne font-bold text-sm transition-all group ${
                        isActive
                          ? "bg-sky-100 border border-sky-200 text-sky-700"
                          : "border border-transparent text-sky-800 hover:bg-sky-50 hover:text-sky-900"
                      }`}
                    >
                      <span>{item.icon}</span>
                      <span>{item.name}</span>
                    </Link>
                  );
                })}
              </nav>

              <div className="mt-auto pt-4 border-t border-slate-200">
                <div className="flex items-center gap-3 p-2 rounded-xl bg-sky-50 border border-sky-100 shadow-sm mb-3">
                  <div className="w-9 h-9 rounded-lg bg-accent/20 text-accent flex items-center justify-center font-bold text-sm">
                    {profile?.name ? profile.name[0].toUpperCase() : user?.email?.[0].toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-syne text-sm font-bold text-slate-800 truncate">{profile?.name || "Пользователь"}</p>
                    <p className="text-[10px] text-slate-400 truncate">{user?.email}</p>
                  </div>
                </div>
                <button
                  onClick={handleSignOut}
                  className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg border border-slate-200 text-slate-500 font-bold text-xs"
                >
                  Выйти из аккаунта
                </button>
              </div>
            </aside>
          </div>
        )}

        {/* Page Content View */}
        <main className="flex-1 overflow-y-auto px-6 py-8 md:p-12">
          <div className="max-w-6xl mx-auto animate-[fade-up_0.4s_ease-out]">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
