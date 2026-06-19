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
    supabase.auth.getUser().then(({ data, error }) => {
      if (error || !data?.user) {
        router.push("/login");
      } else {
        setUser(data.user);
        supabase
          .from("users")
          .select("name, language")
          .eq("id", data.user.id)
          .single()
          .then(({ data: profileData }) => {
            if (profileData) {
              setProfile({
                name: profileData.name || "",
                language: profileData.language || "ru",
              });
            }
            setLoading(false);
          });
      }
    });
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
      <div className="min-h-screen flex items-center justify-center bg-slate-900 text-white">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-t-accent border-r-transparent border-slate-700 rounded-full animate-spin"></div>
          <p className="text-slate-400 font-syne text-sm font-semibold tracking-wider">HEARLESS AI ...</p>
        </div>
      </div>
    );
  }

  const menuItems = [
    {
      name: "Обзор",
      path: "/dashboard",
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2H6a2 2 0 01-2-2v-4zM14 16a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2h-2a2 2 0 01-2-2v-4z" />
        </svg>
      ),
    },
    {
      name: "Распознавание жестов",
      path: "/dashboard/gestures",
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
        </svg>
      ),
    },
    {
      name: "Детектор звуков",
      path: "/dashboard/sounds",
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
        </svg>
      ),
    },
    {
      name: "SOS Сигнал",
      path: "/dashboard/sos",
      icon: (
        <svg className="w-5 h-5 text-red-500 fill-current animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
      ),
      isSos: true,
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
    <div className="min-h-screen bg-slate-950 font-dm flex text-slate-100">
      {/* Sidebar Desktop */}
      <aside className="hidden md:flex flex-col w-72 bg-slate-900 border-r border-slate-800 shrink-0">
        {/* Brand Header */}
        <div className="p-6 border-b border-slate-800 flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-accent to-purpleBrand flex items-center justify-center font-syne font-extrabold text-white text-lg shadow-lg shadow-accent/20">
            H
          </div>
          <div>
            <h1 className="font-syne font-bold text-lg text-white leading-none">Hearless</h1>
            <span className="text-[10px] text-accent font-semibold tracking-widest uppercase">AI Dashboard</span>
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
                className={`flex items-center gap-4 px-4 py-3 rounded-xl font-syne font-semibold text-sm transition-all duration-200 group ${
                  isActive
                    ? item.isSos
                      ? "bg-red-500/10 border border-red-500/30 text-red-500 shadow-sm"
                      : "bg-accent/10 border border-accent/30 text-accent shadow-sm"
                    : "border border-transparent text-slate-400 hover:bg-slate-800 hover:text-white"
                }`}
              >
                <span className={`transition-transform duration-200 group-hover:scale-110 ${isActive ? "" : "opacity-72"}`}>
                  {item.icon}
                </span>
                <span>{item.name}</span>
              </Link>
            );
          })}
        </nav>

        {/* User Card */}
        <div className="p-4 border-t border-slate-800 bg-slate-900/50 backdrop-blur-sm">
          <div className="flex items-center gap-3 p-2 rounded-xl bg-slate-950/40 border border-slate-800/40 mb-3">
            <div className="w-10 h-10 rounded-lg bg-accent/20 border border-accent/30 text-accent flex items-center justify-center font-bold font-syne">
              {profile?.name ? profile.name[0].toUpperCase() : user?.email?.[0].toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-syne text-sm font-bold text-white truncate">{profile?.name || "Пользователь"}</p>
              <p className="text-[11px] text-slate-400 truncate">{user?.email}</p>
            </div>
          </div>
          <button
            onClick={handleSignOut}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg border border-slate-800 text-slate-400 hover:text-red-400 hover:bg-red-500/10 hover:border-red-500/20 font-semibold text-xs transition-colors duration-200"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            Выйти из аккаунта
          </button>
        </div>
      </aside>

      {/* Main Container */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile Header */}
        <header className="flex md:hidden items-center justify-between px-6 py-4 bg-slate-900 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-accent to-purpleBrand flex items-center justify-center font-syne font-extrabold text-white text-md">
              H
            </div>
            <h1 className="font-syne font-bold text-md text-white">Hearless</h1>
          </div>
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-1.5 rounded-lg border border-slate-800 text-slate-400 hover:text-white"
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
            <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm" onClick={() => setMobileMenuOpen(false)}></div>

            {/* Sidebar Content */}
            <aside className="relative flex flex-col w-72 bg-slate-900 h-full border-r border-slate-800 shadow-2xl p-6">
              <div className="flex items-center justify-between mb-8 pb-4 border-b border-slate-800">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-accent/20 border border-accent/30 text-accent flex items-center justify-center font-bold">
                    H
                  </div>
                  <h2 className="font-syne font-bold text-white text-md">Навигация</h2>
                </div>
                <button
                  onClick={() => setMobileMenuOpen(false)}
                  className="p-1 rounded-lg border border-slate-800 text-slate-400"
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
                      className={`flex items-center gap-4 px-4 py-3 rounded-xl font-syne font-semibold text-sm transition-all group ${
                        isActive
                          ? item.isSos
                            ? "bg-red-500/10 border border-red-500/30 text-red-500"
                            : "bg-accent/10 border border-accent/30 text-accent"
                          : "border border-transparent text-slate-400 hover:bg-slate-800 hover:text-white"
                      }`}
                    >
                      <span>{item.icon}</span>
                      <span>{item.name}</span>
                    </Link>
                  );
                })}
              </nav>

              <div className="mt-auto pt-4 border-t border-slate-800">
                <div className="flex items-center gap-3 p-2 rounded-xl bg-slate-950/40 border border-slate-800/40 mb-3">
                  <div className="w-9 h-9 rounded-lg bg-accent/20 text-accent flex items-center justify-center font-bold text-sm">
                    {profile?.name ? profile.name[0].toUpperCase() : user?.email?.[0].toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-syne text-sm font-bold text-white truncate">{profile?.name || "Пользователь"}</p>
                    <p className="text-[11px] text-slate-400 truncate">{user?.email}</p>
                  </div>
                </div>
                <button
                  onClick={handleSignOut}
                  className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg border border-slate-800 text-slate-400 font-semibold text-xs"
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
