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
        background: "var(--headerBg)",
        backdropFilter: "blur(16px)",
        borderBottom: "1px solid var(--border)",
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
              color: "var(--text)",
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
                color: dropdown ? "var(--text)" : "var(--textSecondary)",
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
                  background: "var(--bgCard)",
                  border: "1px solid var(--border)",
                  borderRadius: "var(--radius)",
                  padding: "8px",
                  boxShadow: "var(--shadow)",
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
                      color: "var(--textSecondary)",
                      fontSize: 13,
                      transition: "all 0.2s",
                    }}
                    onMouseEnter={e => { e.currentTarget.style.background = "var(--bgCardHover)"; e.currentTarget.style.color = "var(--text)"; }}
                    onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "var(--textSecondary)"; }}
                  >
                    <span style={{ fontSize: 16 }}>{f.icon}</span>
                    {f.label}
                  </Link>
                ))}
              </div>
            )}
          </div>

          <Link href="/about" style={{ color: "var(--textSecondary)", textDecoration: "none", fontSize: 14, fontWeight: 500, transition: "color 0.2s" }}
            onMouseEnter={e => e.currentTarget.style.color = "var(--text)"}
            onMouseLeave={e => e.currentTarget.style.color = "var(--textSecondary)"}>
            О проекте
          </Link>
          <Link href="/blog" style={{ color: "var(--textSecondary)", textDecoration: "none", fontSize: 14, fontWeight: 500, transition: "color 0.2s" }}
            onMouseEnter={e => e.currentTarget.style.color = "var(--text)"}
            onMouseLeave={e => e.currentTarget.style.color = "var(--textSecondary)"}>
            Блог
          </Link>
          <Link href="/login" className="btn btn-outline" style={{ padding: "10px 22px", fontSize: 13 }}>Войти</Link>
          <Link href="/register" className="btn btn-primary" style={{ padding: "10px 22px", fontSize: 13 }}>Регистрация</Link>
        </nav>
      </div>
    </header>
  );
}
