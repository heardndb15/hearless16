"use client";

import Link from "next/link";

export default function Footer() {
  return (
    <footer
      style={{
        borderTop: "1px solid var(--border)",
        padding: "60px 0 32px",
      }}
    >
      <div className="container">
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "2fr 1fr 1fr 1fr",
            gap: 40,
            marginBottom: 48,
          }}
        >
          {/* Brand */}
          <div>
            <Link
              href="/"
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                textDecoration: "none",
                marginBottom: 16,
              }}
            >
              <div
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 8,
                  background: "var(--gradient)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 16,
                  fontWeight: 800,
                  color: "white",
                }}
              >
                H
              </div>
              <span
                style={{
                  fontFamily: "'Syne', sans-serif",
                  fontSize: 20,
                  fontWeight: 700,
                  color: "var(--text)",
                }}
              >
                Hearless
              </span>
            </Link>
            <p
              style={{
                fontSize: 13,
                color: "var(--textMuted)",
                lineHeight: 1.7,
                maxWidth: 280,
              }}
            >
              Первая AI-платформа в Казахстане и Центральной Азии для глухих и
              слабослышащих людей.
            </p>
          </div>

          {/* Links */}
          {[
            {
              title: "Продукт",
              links: [
                ["Возможности", "/features"],
                ["О проекте", "/about"],
                ["Блог", "/blog"],
              ],
            },
            {
              title: "Аккаунт",
              links: [
                ["Войти", "/login"],
                ["Регистрация", "/register"],
                ["Контакты", "/contact"],
              ],
            },
            {
              title: "Правовое",
              links: [
                ["Конфиденциальность", "#"],
                ["Условия", "#"],
                ["Документы", "#"],
              ],
            },
          ].map((col) => (
            <div key={col.title}>
              <h4
                style={{
                  fontFamily: "'Syne', sans-serif",
                  fontSize: 13,
                  fontWeight: 600,
                  color: "var(--text)",
                  marginBottom: 16,
                  textTransform: "uppercase",
                  letterSpacing: 1,
                }}
              >
                {col.title}
              </h4>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {col.links.map(([label, href]) => (
                  <Link
                    key={label}
                    href={href}
                    style={{
                      color: "var(--textMuted)",
                      textDecoration: "none",
                      fontSize: 13,
                      transition: "color 0.2s",
                    }}
                    onMouseEnter={(e) =>
                      (e.currentTarget.style.color = "var(--accent)")
                    }
                    onMouseLeave={(e) =>
                      (e.currentTarget.style.color = "var(--textMuted)")
                    }
                  >
                    {label}
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div
          style={{
            paddingTop: 24,
            borderTop: "1px solid var(--border)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: 12,
          }}
        >
          <div style={{ fontSize: 12, color: "var(--textMuted)" }}>
            © {new Date().getFullYear()} Hearless. Все права защищены.
          </div>
          <div style={{ display: "flex", gap: 12 }}>
            {["GitHub", "Telegram", "Instagram"].map((s) => (
              <span
                key={s}
                style={{
                  fontSize: 12,
                  color: "var(--textMuted)",
                  cursor: "pointer",
                  transition: "color 0.2s",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.color = "var(--text)")}
                onMouseLeave={(e) => (e.currentTarget.style.color = "var(--textMuted)")}
              >
                {s}
              </span>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
