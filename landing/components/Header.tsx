"use client";

import Link from "next/link";

export default function Header() {
  return (
    <header
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        zIndex: 100,
        padding: "16px 0",
        background: "rgba(10, 14, 26, 0.85)",
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

        <nav style={{ display: "flex", gap: 28, alignItems: "center" }}>
          {[
            ["Возможности", "/features"],
            ["О проекте", "/about"],
            ["Блог", "/blog"],
          ].map(([label, href]) => (
            <Link
              key={href}
              href={href}
              style={{
                color: "var(--textSecondary)",
                textDecoration: "none",
                fontSize: 14,
                fontWeight: 500,
                transition: "color 0.2s",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.color = "var(--text)")}
              onMouseLeave={(e) => (e.currentTarget.style.color = "var(--textSecondary)")}
            >
              {label}
            </Link>
          ))}
          <Link
            href="/login"
            className="btn btn-outline"
            style={{ padding: "10px 22px", fontSize: 13 }}
          >
            Войти
          </Link>
          <Link
            href="/register"
            className="btn btn-primary"
            style={{ padding: "10px 22px", fontSize: 13 }}
          >
            Регистрация
          </Link>
        </nav>
      </div>
    </header>
  );
}
