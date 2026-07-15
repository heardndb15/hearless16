"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { createClient } from "../lib/supabase";
import { useLanguage } from "../lib/LanguageContext";
import type { Lang } from "../lib/translations";

const LANG_LABELS: Record<Lang, string> = { ru: "РУС", en: "ENG", kz: "ҚАЗ" };

export default function Header() {
  const { lang, setLang, t } = useLanguage();
  const [dropdown, setDropdown] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [userName, setUserName] = useState<string | null>(null);
  // userName starts null before the async session check below resolves,
  // which used to make the header render the logged-out (Войти/Регистрация)
  // buttons for a brief moment on every fresh page load — including landing
  // back on "/" from Community via "← На сайт" — even though the user was
  // still fully logged in. authChecked lets the header show neither state
  // until it actually knows, instead of flashing "logged out" first.
  const [authChecked, setAuthChecked] = useState(false);

  useEffect(() => {
    let subscription: { unsubscribe: () => void } | null = null;

    async function loadName(supabase: ReturnType<typeof createClient>, userId: string, email?: string) {
      try {
        const { data } = await supabase.from("users").select("name").eq("id", userId).single();
        setUserName(data?.name || email?.split("@")[0] || t.nav.account);
      } catch {
        setUserName(email?.split("@")[0] || t.nav.account);
      }
    }

    try {
      const supabase = createClient();
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (session?.user) loadName(supabase, session.user.id, session.user.email ?? undefined);
        setAuthChecked(true);
      });
      const { data } = supabase.auth.onAuthStateChange((_event, session) => {
        if (session?.user) {
          loadName(supabase, session.user.id, session.user.email ?? undefined);
        } else {
          setUserName(null);
        }
        setAuthChecked(true);
      });
      subscription = data.subscription;
    } catch {
      // Supabase not configured
      setAuthChecked(true);
    }
    return () => subscription?.unsubscribe();
  }, [t.nav.account]);

  return (
    <>
      <header style={{ position: "fixed", top: 0, left: 0, right: 0, zIndex: 100, padding: "14px 0", background: "var(--headerBg)", backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)", borderBottom: "1px solid var(--border)", boxShadow: "0 2px 16px rgba(0, 0, 0,0.06)" }}>
        <div className="container" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          {/* Logo */}
          <Link href="/" style={{ display: "flex", alignItems: "center", gap: 10, textDecoration: "none" }}>
            <img src="/logo.png" alt="Hearless" style={{ width: 36, height: 36, borderRadius: 10, flexShrink: 0, objectFit: "cover" }} />
            <span style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 22, fontWeight: 700, color: "var(--text)" }}>Hearless</span>
          </Link>

          {/* Desktop nav */}
          <nav className="nav-desktop" style={{ gap: 20, alignItems: "center", position: "relative" }}>
            <div style={{ position: "relative" }} onMouseEnter={() => setDropdown(true)} onMouseLeave={() => setDropdown(false)}>
              <button style={{ background: "none", border: "none", color: dropdown ? "var(--accent)" : "var(--textSecondary)", fontSize: 14, fontWeight: 500, cursor: "pointer", fontFamily: "'Plus Jakarta Sans', sans-serif", padding: 0, transition: "color 0.2s", display: "flex", alignItems: "center", gap: 4 }}>
                {t.nav.features}
                <span style={{ fontSize: 10, transform: dropdown ? "rotate(180deg)" : "none", transition: "transform 0.2s", color: "var(--textSecondary)" }}>▼</span>
              </button>
              {dropdown && (
                <div style={{ position: "absolute", top: "calc(100% + 12px)", left: -120, width: 280, background: "var(--bgCard)", backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)", border: "1px solid var(--border)", borderRadius: "var(--radius)", padding: "8px", boxShadow: "0 8px 24px rgba(0, 0, 0,0.1)" }}>
                  {t.featureLinks.map(f => (
                    <Link key={f.href} href={f.href} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 14px", borderRadius: "var(--radiusSm)", textDecoration: "none", color: "var(--textSecondary)", fontSize: 13, transition: "all 0.2s" }}
                      onMouseEnter={e => { e.currentTarget.style.background = "var(--bg)"; e.currentTarget.style.color = "var(--accent)"; }}
                      onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "var(--textSecondary)"; }}>
                      <span style={{ fontSize: 16 }}>{f.icon}</span>{f.label}
                    </Link>
                  ))}
                </div>
              )}
            </div>
            <Link href="/about" style={{ color: "var(--textSecondary)", textDecoration: "none", fontSize: 14, fontWeight: 500 }}>{t.nav.about}</Link>
            <Link href="/blog" style={{ color: "var(--textSecondary)", textDecoration: "none", fontSize: 14, fontWeight: 500 }}>{t.nav.blog}</Link>
            <Link href="/pricing" style={{ color: "var(--textSecondary)", textDecoration: "none", fontSize: 14, fontWeight: 500 }}>{t.nav.pricing}</Link>

            {/* Language switcher */}
            <div style={{ display: "flex", gap: 3, background: "var(--bg)", borderRadius: 10, padding: 3, border: "1px solid var(--border)" }}>
              {(["ru", "en", "kz"] as Lang[]).map((l) => (
                <button
                  key={l}
                  onClick={() => setLang(l)}
                  style={{
                    padding: "4px 9px",
                    borderRadius: 7,
                    border: "none",
                    background: lang === l ? "var(--accent)" : "transparent",
                    color: lang === l ? "var(--white)" : "var(--textSecondary)",
                    fontSize: 11,
                    fontWeight: 700,
                    cursor: "pointer",
                    fontFamily: "'Plus Jakarta Sans', sans-serif",
                    transition: "all 0.2s",
                    letterSpacing: "0.03em",
                  }}
                >
                  {LANG_LABELS[l]}
                </button>
              ))}
            </div>

            {!authChecked ? (
              <div style={{ width: 110, height: 38 }} />
            ) : userName ? (
              <Link href="/dashboard" style={{ padding: "10px 22px", fontSize: 13, display: "inline-flex", alignItems: "center", gap: 8, borderRadius: 12, fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 600, textDecoration: "none", background: "var(--accent)", color: "var(--white)" }}>
                <span style={{ width: 22, height: 22, borderRadius: "50%", background: "rgba(255,255,255,0.25)", display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 800 }}>{userName[0].toUpperCase()}</span>
                {userName}
              </Link>
            ) : (
              <>
                <Link href="/login" style={{ padding: "10px 22px", fontSize: 13, display: "inline-flex", alignItems: "center", borderRadius: 50, fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 600, textDecoration: "none", background: "var(--bgCard)", color: "var(--accent)", border: "1.5px solid var(--border)" }}>{t.nav.login}</Link>
                <Link href="/register" style={{ padding: "10px 22px", fontSize: 13, display: "inline-flex", alignItems: "center", borderRadius: 12, fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 600, textDecoration: "none", background: "var(--accent)", color: "var(--white)" }}>{t.nav.register}</Link>
              </>
            )}
          </nav>

          {/* Hamburger — mobile only */}
          <button
            className="nav-mobile-btn"
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label={t.nav.openMenu}
            style={{ background: "none", border: "1px solid var(--border)", borderRadius: 10, width: 42, height: 42, alignItems: "center", justifyContent: "center", cursor: "pointer", flexDirection: "column", gap: 5, padding: "10px 9px" }}
          >
            <span style={{ display: "block", width: 22, height: 2, background: "var(--accent)", borderRadius: 2, transition: "all 0.25s", transform: mobileOpen ? "rotate(45deg) translate(5px, 5px)" : "none" }} />
            <span style={{ display: "block", width: 22, height: 2, background: "var(--accent)", borderRadius: 2, transition: "all 0.25s", opacity: mobileOpen ? 0 : 1 }} />
            <span style={{ display: "block", width: 22, height: 2, background: "var(--accent)", borderRadius: 2, transition: "all 0.25s", transform: mobileOpen ? "rotate(-45deg) translate(5px, -5px)" : "none" }} />
          </button>
        </div>
      </header>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div style={{ position: "fixed", inset: 0, zIndex: 99 }}>
          {/* Backdrop */}
          <div style={{ position: "absolute", inset: 0, background: "var(--overlay)", backdropFilter: "blur(2px)" }} onClick={() => setMobileOpen(false)} />

          {/* Panel */}
          <div style={{ position: "absolute", top: 64, left: 0, right: 0, background: "var(--bgCard)", borderRadius: "0 0 24px 24px", padding: "8px 16px 24px", boxShadow: "0 16px 40px rgba(0, 0, 0,0.15)", maxHeight: "calc(100vh - 64px)", overflowY: "auto" }}>
            {/* Feature links */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 4, padding: "8px 0" }}>
              {t.featureLinks.map(f => (
                <Link key={f.href} href={f.href} onClick={() => setMobileOpen(false)}
                  style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 14px", borderRadius: 12, textDecoration: "none", color: "var(--textSecondary)", fontSize: 14, fontWeight: 500, background: "var(--chipBg)", border: "1px solid var(--border)" }}>
                  <span style={{ fontSize: 18 }}>{f.icon}</span>
                  <span>{f.label}</span>
                </Link>
              ))}
            </div>

            {/* Divider */}
            <div style={{ borderTop: "1px solid var(--border)", margin: "8px 0" }} />

            {/* Pages */}
            <div style={{ display: "flex", gap: 8, padding: "4px 0 8px" }}>
              <Link href="/about" onClick={() => setMobileOpen(false)} style={{ flex: 1, padding: "12px", borderRadius: 12, textDecoration: "none", color: "var(--textSecondary)", fontSize: 14, fontWeight: 500, textAlign: "center", background: "var(--chipBg)", border: "1px solid var(--border)" }}>{t.nav.about}</Link>
              <Link href="/blog" onClick={() => setMobileOpen(false)} style={{ flex: 1, padding: "12px", borderRadius: 12, textDecoration: "none", color: "var(--textSecondary)", fontSize: 14, fontWeight: 500, textAlign: "center", background: "var(--chipBg)", border: "1px solid var(--border)" }}>{t.nav.blog}</Link>
              <Link href="/pricing" onClick={() => setMobileOpen(false)} style={{ flex: 1, padding: "12px", borderRadius: 12, textDecoration: "none", color: "var(--accent)", fontSize: 14, fontWeight: 600, textAlign: "center", background: "var(--chipBg)", border: "1px solid var(--border)" }}>{t.nav.pricing}</Link>
            </div>

            {/* Mobile language switcher */}
            <div style={{ display: "flex", gap: 8, padding: "4px 0 8px" }}>
              {(["ru", "en", "kz"] as Lang[]).map((l) => (
                <button
                  key={l}
                  onClick={() => setLang(l)}
                  style={{
                    flex: 1,
                    padding: "10px",
                    borderRadius: 12,
                    border: lang === l ? "1.5px solid var(--accent)" : "1px solid var(--border)",
                    background: lang === l ? "var(--chipBg)" : "var(--bg)",
                    color: lang === l ? "var(--accent)" : "var(--textSecondary)",
                    fontSize: 13,
                    fontWeight: 700,
                    cursor: "pointer",
                    fontFamily: "'Plus Jakarta Sans', sans-serif",
                    transition: "all 0.2s",
                  }}
                >
                  {LANG_LABELS[l]}
                </button>
              ))}
            </div>

            {/* Auth buttons */}
            <div style={{ display: "flex", gap: 10, paddingTop: 4 }}>
              {!authChecked ? (
                <div style={{ flex: 1, height: 48 }} />
              ) : userName ? (
                <Link href="/dashboard" onClick={() => setMobileOpen(false)} style={{ flex: 1, padding: "14px", borderRadius: 12, textDecoration: "none", color: "var(--white)", background: "var(--accent)", fontWeight: 600, textAlign: "center", fontSize: 15, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                  {userName[0].toUpperCase()} · {userName}
                </Link>
              ) : (
                <>
                  <Link href="/login" onClick={() => setMobileOpen(false)} style={{ flex: 1, padding: "14px", borderRadius: 12, textDecoration: "none", color: "var(--accent)", border: "1.5px solid var(--border)", fontWeight: 600, textAlign: "center", fontSize: 15, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{t.nav.login}</Link>
                  <Link href="/register" onClick={() => setMobileOpen(false)} style={{ flex: 1, padding: "14px", borderRadius: 12, textDecoration: "none", color: "var(--white)", background: "var(--accent)", fontWeight: 600, textAlign: "center", fontSize: 15, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{t.nav.register}</Link>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
