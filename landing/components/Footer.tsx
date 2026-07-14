"use client";

import Link from "next/link";
import { useLanguage } from "../lib/LanguageContext";

export default function Footer() {
  const { t } = useLanguage();

  return (
    <footer
      style={{
        background: "var(--bg)",
        borderTop: "1px solid var(--border)",
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
                  background: "var(--accent)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 16,
                  fontWeight: 800,
                  color: "var(--white)",
                }}
              >
                H
              </div>
              <span
                style={{
                  fontFamily: "'Plus Jakarta Sans', sans-serif",
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
                color: "var(--textSecondary)",
                lineHeight: 1.7,
                maxWidth: 280,
              }}
            >
              {t.footer.desc}
            </p>
          </div>

          {/* Links */}
          {t.footer.columns.map((col) => (
            <div key={col.title}>
              <h4
                style={{
                  fontFamily: "'Plus Jakarta Sans', sans-serif",
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
                      color: "var(--textSecondary)",
                      textDecoration: "none",
                      fontSize: 13,
                      transition: "color 0.2s",
                    }}
                    onMouseEnter={(e) =>
                      (e.currentTarget.style.color = "var(--accent)")
                    }
                    onMouseLeave={(e) =>
                      (e.currentTarget.style.color = "var(--textSecondary)")
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
          <div style={{ fontSize: 12, color: "var(--accent)" }}>
            © {new Date().getFullYear()} Hearless. {t.footer.copyright}
          </div>
          <div style={{ display: "flex", gap: 12 }}>
            {["GitHub", "Telegram", "Instagram"].map((s) => (
              <span
                key={s}
                style={{
                  fontSize: 12,
                  color: "var(--textSecondary)",
                  cursor: "pointer",
                  transition: "color 0.2s",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.color = "var(--accent)")}
                onMouseLeave={(e) => (e.currentTarget.style.color = "var(--textSecondary)")}
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
