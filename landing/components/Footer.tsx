"use client";

import Link from "next/link";

export default function Footer() {
  return (
    <footer
      style={{
        background: "#F0F9FF",
        borderTop: "1px solid rgba(14,165,233,0.12)",
        padding: "60px 0 32px",
      }}
    >
      <div className="container">
        <div className="footer-grid">
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
                  fontFamily: "'Plus Jakarta Sans', sans-serif",
                  fontSize: 20,
                  fontWeight: 700,
                  color: "#0C4A6E",
                }}
              >
                Hearless
              </span>
            </Link>
            <p
              style={{
                fontSize: 13,
                color: "#075985",
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
                ["Тарифы", "/pricing"],
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
                  fontFamily: "'Plus Jakarta Sans', sans-serif",
                  fontSize: 13,
                  fontWeight: 600,
                  color: "#0C4A6E",
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
                      color: "#075985",
                      textDecoration: "none",
                      fontSize: 13,
                      transition: "color 0.2s",
                    }}
                    onMouseEnter={(e) =>
                      (e.currentTarget.style.color = "#0EA5E9")
                    }
                    onMouseLeave={(e) =>
                      (e.currentTarget.style.color = "#075985")
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
            borderTop: "1px solid rgba(14,165,233,0.12)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: 12,
          }}
        >
          <div style={{ fontSize: 12, color: "#0369A1" }}>
            © {new Date().getFullYear()} Hearless. Все права защищены.
          </div>
          <div style={{ display: "flex", gap: 12 }}>
            {["GitHub", "Telegram", "Instagram"].map((s) => (
              <span
                key={s}
                style={{
                  fontSize: 12,
                  color: "#075985",
                  cursor: "pointer",
                  transition: "color 0.2s",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.color = "#0EA5E9")}
                onMouseLeave={(e) => (e.currentTarget.style.color = "#075985")}
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
