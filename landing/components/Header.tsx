"use client";

import { useState } from "react";
import Link from "next/link";

const FEATURE_LINKS = [
  { label: "AI-субтитры", href: "/subtitles", icon: "💬" },
  { label: "Умные оповещения", href: "/alerts", icon: "🔔" },
  { label: "Изучение жестов", href: "/sign-language", icon: "🤟" },
  { label: "AI-преподаватель", href: "/ai-tutor", icon: "🎓" },
  { label: "Камера → Текст", href: "/camera-to-text", icon: "📷" },
  { label: "Текст → Жесты", href: "/text-to-sign", icon: "👤" },
  { label: "Геймификация", href: "/gamification", icon: "🏆" },
  { label: "Community", href: "/community", icon: "🌐" },
];

export default function Header() {
  const [dropdown, setDropdown] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <>
      <header style={{ position: "fixed", top: 0, left: 0, right: 0, zIndex: 100, padding: "14px 0", background: "rgba(255,255,255,0.95)", backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)", borderBottom: "1px solid rgba(14,165,233,0.1)", boxShadow: "0 2px 16px rgba(14,165,233,0.06)" }}>
        <div className="container" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          {/* Logo */}
          <Link href="/" style={{ display: "flex", alignItems: "center", gap: 10, textDecoration: "none" }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: "var(--gradient)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, fontWeight: 800, color: "white", flexShrink: 0 }}>H</div>
            <span style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 22, fontWeight: 700, color: "#0C4A6E" }}>Hearless</span>
          </Link>

          {/* Desktop nav */}
          <nav className="nav-desktop" style={{ gap: 28, alignItems: "center", position: "relative" }}>
            <div style={{ position: "relative" }} onMouseEnter={() => setDropdown(true)} onMouseLeave={() => setDropdown(false)}>
              <button style={{ background: "none", border: "none", color: dropdown ? "#0EA5E9" : "#075985", fontSize: 14, fontWeight: 500, cursor: "pointer", fontFamily: "'Plus Jakarta Sans', sans-serif", padding: 0, transition: "color 0.2s", display: "flex", alignItems: "center", gap: 4 }}>
                Возможности
                <span style={{ fontSize: 10, transform: dropdown ? "rotate(180deg)" : "none", transition: "transform 0.2s", color: "#075985" }}>▼</span>
              </button>
              {dropdown && (
                <div style={{ position: "absolute", top: "calc(100% + 12px)", left: -120, width: 280, background: "#FFFFFF", backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)", border: "1px solid rgba(14,165,233,0.12)", borderRadius: "var(--radius)", padding: "8px", boxShadow: "0 8px 24px rgba(14,165,233,0.1)" }}>
                  {FEATURE_LINKS.map(f => (
                    <Link key={f.href} href={f.href} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 14px", borderRadius: "var(--radiusSm)", textDecoration: "none", color: "#075985", fontSize: 13, transition: "all 0.2s" }}
                      onMouseEnter={e => { e.currentTarget.style.background = "#F0F9FF"; e.currentTarget.style.color = "#0EA5E9"; }}
                      onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "#075985"; }}>
                      <span style={{ fontSize: 16 }}>{f.icon}</span>{f.label}
                    </Link>
                  ))}
                </div>
              )}
            </div>
            <Link href="/about" style={{ color: "#075985", textDecoration: "none", fontSize: 14, fontWeight: 500 }}>О проекте</Link>
            <Link href="/blog" style={{ color: "#075985", textDecoration: "none", fontSize: 14, fontWeight: 500 }}>Блог</Link>
            <Link href="/pricing" style={{ color: "#075985", textDecoration: "none", fontSize: 14, fontWeight: 500 }}>Тарифы</Link>
            <Link href="/login" style={{ padding: "10px 22px", fontSize: 13, display: "inline-flex", alignItems: "center", borderRadius: 50, fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 600, textDecoration: "none", background: "white", color: "#0369A1", border: "1.5px solid #BAE6FD" }}>Войти</Link>
            <Link href="/register" style={{ padding: "10px 22px", fontSize: 13, display: "inline-flex", alignItems: "center", borderRadius: 12, fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 600, textDecoration: "none", background: "#0EA5E9", color: "#ffffff" }}>Регистрация</Link>
          </nav>

          {/* Hamburger — mobile only */}
          <button
            className="nav-mobile-btn"
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label="Открыть меню"
            style={{ background: "none", border: "1px solid rgba(14,165,233,0.2)", borderRadius: 10, width: 42, height: 42, alignItems: "center", justifyContent: "center", cursor: "pointer", flexDirection: "column", gap: 5, padding: "10px 9px" }}
          >
            <span style={{ display: "block", width: 22, height: 2, background: "#0369A1", borderRadius: 2, transition: "all 0.25s", transform: mobileOpen ? "rotate(45deg) translate(5px, 5px)" : "none" }} />
            <span style={{ display: "block", width: 22, height: 2, background: "#0369A1", borderRadius: 2, transition: "all 0.25s", opacity: mobileOpen ? 0 : 1 }} />
            <span style={{ display: "block", width: 22, height: 2, background: "#0369A1", borderRadius: 2, transition: "all 0.25s", transform: mobileOpen ? "rotate(-45deg) translate(5px, -5px)" : "none" }} />
          </button>
        </div>
      </header>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div style={{ position: "fixed", inset: 0, zIndex: 99 }}>
          {/* Backdrop */}
          <div style={{ position: "absolute", inset: 0, background: "rgba(12,74,110,0.35)", backdropFilter: "blur(2px)" }} onClick={() => setMobileOpen(false)} />

          {/* Panel */}
          <div style={{ position: "absolute", top: 64, left: 0, right: 0, background: "white", borderRadius: "0 0 24px 24px", padding: "8px 16px 24px", boxShadow: "0 16px 40px rgba(14,165,233,0.15)", maxHeight: "calc(100vh - 64px)", overflowY: "auto" }}>
            {/* Feature links */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 4, padding: "8px 0" }}>
              {FEATURE_LINKS.map(f => (
                <Link key={f.href} href={f.href} onClick={() => setMobileOpen(false)}
                  style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 14px", borderRadius: 12, textDecoration: "none", color: "#075985", fontSize: 14, fontWeight: 500, background: "#F8FBFF", border: "1px solid rgba(14,165,233,0.08)" }}>
                  <span style={{ fontSize: 18 }}>{f.icon}</span>
                  <span>{f.label}</span>
                </Link>
              ))}
            </div>

            {/* Divider */}
            <div style={{ borderTop: "1px solid rgba(14,165,233,0.1)", margin: "8px 0" }} />

            {/* Pages */}
            <div style={{ display: "flex", gap: 8, padding: "4px 0 8px" }}>
              <Link href="/about" onClick={() => setMobileOpen(false)} style={{ flex: 1, padding: "12px", borderRadius: 12, textDecoration: "none", color: "#075985", fontSize: 14, fontWeight: 500, textAlign: "center", background: "#F8FBFF", border: "1px solid rgba(14,165,233,0.08)" }}>О проекте</Link>
              <Link href="/blog" onClick={() => setMobileOpen(false)} style={{ flex: 1, padding: "12px", borderRadius: 12, textDecoration: "none", color: "#075985", fontSize: 14, fontWeight: 500, textAlign: "center", background: "#F8FBFF", border: "1px solid rgba(14,165,233,0.08)" }}>Блог</Link>
              <Link href="/pricing" onClick={() => setMobileOpen(false)} style={{ flex: 1, padding: "12px", borderRadius: 12, textDecoration: "none", color: "#0EA5E9", fontSize: 14, fontWeight: 600, textAlign: "center", background: "#E0F2FE", border: "1px solid rgba(14,165,233,0.15)" }}>Тарифы</Link>
            </div>

            {/* Auth buttons */}
            <div style={{ display: "flex", gap: 10, paddingTop: 4 }}>
              <Link href="/login" onClick={() => setMobileOpen(false)} style={{ flex: 1, padding: "14px", borderRadius: 12, textDecoration: "none", color: "#0369A1", border: "1.5px solid #BAE6FD", fontWeight: 600, textAlign: "center", fontSize: 15, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Войти</Link>
              <Link href="/register" onClick={() => setMobileOpen(false)} style={{ flex: 1, padding: "14px", borderRadius: 12, textDecoration: "none", color: "white", background: "#0EA5E9", fontWeight: 600, textAlign: "center", fontSize: 15, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Регистрация</Link>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
