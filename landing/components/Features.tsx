"use client";

import Link from "next/link";
import { useLanguage } from "../lib/LanguageContext";

export default function FeaturesSection() {
  const { t } = useLanguage();

  return (
    <section id="features">
      <div className="container">
        <div style={{ marginBottom: 56 }}>
          <div className="section-label">{t.features.label}</div>
          <h2 className="section-title">
            {t.features.title}{" "}
            <span style={{ color: "var(--accent)" }}>{t.features.titleHighlight}</span>
          </h2>
          <p className="section-subtitle">{t.features.subtitle}</p>
        </div>

        <div className="features-grid">
          {t.features.items.map((feat) => (
            <Link
              key={feat.href}
              href={feat.href}
              style={{
                gridColumn: feat.span === "wide" ? "1 / -1" : undefined,
                background: "var(--bgCard)",
                borderRadius: "var(--radius)",
                padding: "32px 28px",
                border: "1px solid var(--border)",
                boxShadow: "var(--shadow)",
                transition: "all 0.3s ease",
                textDecoration: "none",
                position: "relative",
                overflow: "hidden",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = "var(--accent)";
                e.currentTarget.style.background = "var(--bg)";
                e.currentTarget.style.boxShadow = "var(--shadowStrong)";
                e.currentTarget.style.transform = "translateY(-3px)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = "var(--border)";
                e.currentTarget.style.background = "var(--bgCard)";
                e.currentTarget.style.boxShadow = "var(--shadow)";
                e.currentTarget.style.transform = "translateY(0)";
              }}
            >
              <div style={{ width: 48, height: 48, borderRadius: 14, background: "var(--chipBg)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, marginBottom: 16 }}>
                {feat.icon}
              </div>
              <h3 style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 18, fontWeight: 700, color: "var(--text)", marginBottom: 10 }}>
                {feat.title}
              </h3>
              <p style={{ fontSize: 14, color: "var(--textSecondary)", lineHeight: 1.7 }}>
                {feat.desc}
              </p>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
