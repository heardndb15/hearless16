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
];

export default function Header() {
  const [dropdown, setDropdown] = useState(false);

  return (
    <header
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        zIndex: 100,
        padding: "16px 0",
        background: "rgba(255,255,255,0.15)",
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
        borderBottom: "1px solid rgba(255,255,255,0.2)",
      }}
    >
      <div
        className="container"
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <Link
          href="/"
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            textDecoration: "none",
          }}
        >
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: 10,
              background: "var(--gradient)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 18,
              fontWeight: 800,
              color: "white",
            }}
          >
            H
          </div>
          <span
            style={{
              fontFamily: "'Syne', sans-serif",
              fontSize: 22,
              fontWeight: 700,
              color: "#ffffff",
            }}
          >
            Hearless
          </span>
        </Link>

        <nav style={{ display: "flex", gap: 28, alignItems: "center", position: "relative" }}>
          {/* Features dropdown */}
          <div
            style={{ position: "relative" }}
            onMouseEnter={() => setDropdown(true)}
            onMouseLeave={() => setDropdown(false)}
          >
            <button
              style={{
                background: "none",
                border: "none",
                color: dropdown ? "#ffffff" : "rgba(255,255,255,0.8)",
                fontSize: 14,
                fontWeight: 500,
                cursor: "pointer",
                fontFamily: "'DM Sans', sans-serif",
                padding: 0,
                transition: "color 0.2s",
                display: "flex",
                alignItems: "center",
                gap: 4,
              }}
            >
              Возможности
              <span style={{ fontSize: 10, transform: dropdown ? "rotate(180deg)" : "none", transition: "transform 0.2s" }}>▼</span>
            </button>

            {dropdown && (
              <div
                style={{
                  position: "absolute",
                  top: "calc(100% + 12px)",
                  left: -120,
                  width: 280,
                  background: "rgba(255,255,255,0.72)",
                  backdropFilter: "blur(16px)",
                  WebkitBackdropFilter: "blur(16px)",
                  border: "1.5px solid rgba(255,255,255,0.6)",
                  borderRadius: "var(--radius)",
                  padding: "8px",
                  boxShadow: "0 8px 20px rgba(2,136,209,0.18)",
                }}
              >
                {FEATURE_LINKS.map(f => (
                  <Link
                    key={f.href}
                    href={f.href}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 12,
                      padding: "10px 14px",
                      borderRadius: "var(--radiusSm)",
                      textDecoration: "none",
                      color: "#1E6FA8",
                      fontSize: 13,
                      transition: "all 0.2s",
                    }}
                    onMouseEnter={e => { e.currentTarget.style.background = "rgba(255,255,255,0.85)"; e.currentTarget.style.color = "#0D47A1"; }}
                    onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "#1E6FA8"; }}
                  >
                    <span style={{ fontSize: 16 }}>{f.icon}</span>
                    {f.label}
                  </Link>
                ))}
              </div>
            )}
          </div>

          <Link href="/about" style={{ color: "rgba(255,255,255,0.8)", textDecoration: "none", fontSize: 14, fontWeight: 500, transition: "color 0.2s" }}
            onMouseEnter={e => e.currentTarget.style.color = "#ffffff"}
            onMouseLeave={e => e.currentTarget.style.color = "rgba(255,255,255,0.8)"}>
            О проекте
          </Link>
          <Link href="/blog" style={{ color: "rgba(255,255,255,0.8)", textDecoration: "none", fontSize: 14, fontWeight: 500, transition: "color 0.2s" }}
            onMouseEnter={e => e.currentTarget.style.color = "#ffffff"}
            onMouseLeave={e => e.currentTarget.style.color = "rgba(255,255,255,0.8)"}>
            Блог
          </Link>
          <Link href="/login" style={{ padding: "10px 22px", fontSize: 13, display: "inline-flex", alignItems: "center", gap: 8, borderRadius: 50, fontFamily: "'Syne', sans-serif", fontWeight: 600, textDecoration: "none", background: "rgba(255,255,255,0.15)", color: "#ffffff", border: "1px solid rgba(255,255,255,0.4)", transition: "all 0.3s ease" }}>Войти</Link>
          <Link href="/register" style={{ padding: "10px 22px", fontSize: 13, display: "inline-flex", alignItems: "center", gap: 8, borderRadius: 50, fontFamily: "'Syne', sans-serif", fontWeight: 600, textDecoration: "none", background: "#0277BD", color: "#ffffff", border: "none", transition: "all 0.3s ease" }}>Регистрация</Link>
        </nav>
      </div>
    </header>
  );
}
