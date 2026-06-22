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
      <div className="min-h-screen flex items-center justify-center bg-slate-50 text-slate-800">
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
      name: "Режим учебы",
      path: "/dashboard/study",
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l9-5-9-5-9 5 9 5zm0 0l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14zm-4 6v-7.5l4-2.222" />
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
    <div className="min-h-screen bg-[url('/bg-main.png')] bg-cover bg-no-repeat bg-center bg-fixed font-dm flex text-slate-800 relative overflow-hidden">

      {/* Sidebar Desktop */}
      <aside className="hidden md:flex flex-col w-72 bg-white/40 backdrop-blur-xl border-r border-white/60 shadow-xl shrink-0 z-10 relative">
        {/* Brand Header */}
        <div className="p-6 border-b border-slate-200/60 flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-accent to-purpleBrand flex items-center justify-center font-syne font-extrabold text-white text-lg shadow-md shadow-accent/20">
            H
          </div>
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
                    ? item.isSos
                      ? "bg-red-500/10 border border-red-500/20 text-red-600 shadow-sm"
                      : "bg-accent/10 border border-accent/20 text-accent shadow-sm"
                    : "border border-transparent text-slate-500 hover:bg-slate-200/50 hover:text-slate-800"
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
        <div className="p-4 border-t border-slate-200/60 bg-white/30">
          <div className="flex items-center gap-3 p-2.5 rounded-xl bg-white/60 border border-white/80 shadow-sm mb-3">
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
        <header className="flex md:hidden items-center justify-between px-6 py-4 bg-white/40 backdrop-blur-lg border-b border-white/60">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-accent to-purpleBrand flex items-center justify-center font-syne font-extrabold text-white text-md">
              H
            </div>
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
            <aside className="relative flex flex-col w-72 bg-white/90 backdrop-blur-2xl h-full border-r border-white/60 shadow-2xl p-6">
              <div className="flex items-center justify-between mb-8 pb-4 border-b border-slate-200">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-accent/20 border border-accent/30 text-accent flex items-center justify-center font-bold">
                    H
                  </div>
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
                          ? item.isSos
                            ? "bg-red-500/10 border border-red-500/20 text-red-600"
                            : "bg-accent/10 border border-accent/20 text-accent"
                          : "border border-transparent text-slate-500 hover:bg-slate-200/50 hover:text-slate-800"
                      }`}
                    >
                      <span>{item.icon}</span>
                      <span>{item.name}</span>
                    </Link>
                  );
                })}
              </nav>

              <div className="mt-auto pt-4 border-t border-slate-200">
                <div className="flex items-center gap-3 p-2 rounded-xl bg-white/60 border border-white/80 shadow-sm mb-3">
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
