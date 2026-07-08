"use client";

import Link from "next/link";
import { useLanguage } from "../lib/LanguageContext";

function Check({ ok }: { ok: boolean }) {
  return ok ? (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0 }}>
      <circle cx="8" cy="8" r="8" fill="rgba(0, 0, 0,0.12)" />
      <path d="M5 8l2 2 4-4" stroke="var(--accent)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ) : (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0 }}>
      <circle cx="8" cy="8" r="8" fill="rgba(148,163,184,0.1)" />
      <path d="M5.5 5.5l5 5M10.5 5.5l-5 5" stroke="#94a3b8" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

export default function PricingSection() {
  const { t } = useLanguage();
  const plans = t.pricingSection.plans.map((p, i) => ({ ...p, highlight: i === 1 }));

  return (
    <section id="pricing">
      <div className="container">
        <div style={{ textAlign: "center", marginBottom: 48 }}>
          <div className="section-label">{t.pricingSection.label}</div>
          <h2 className="section-title">
            {t.pricingSection.title}{" "}
            <span className="gradient-text">{t.pricingSection.titleHighlight}</span>
          </h2>
          <p className="section-subtitle" style={{ margin: "0 auto" }}>
            {t.pricingSection.subtitle}
          </p>
        </div>

        <div className="pricing-grid">
          {plans.map((plan) => (
            <div
              key={plan.name}
              style={{
                background: plan.highlight
                  ? "var(--accent)"
                  : "#FFFFFF",
                border: plan.highlight
                  ? "none"
                  : "1px solid rgba(0, 0, 0,0.15)",
                borderRadius: "var(--radius)",
                padding: "32px 28px",
                display: "flex",
                flexDirection: "column",
                boxShadow: plan.highlight
                  ? "0 16px 48px rgba(0, 0, 0,0.28)"
                  : "0 2px 16px rgba(0, 0, 0,0.07)",
                transform: plan.highlight ? "scale(1.03)" : "none",
                position: "relative",
              }}
            >
              {plan.badge && (
                <div style={{
                  position: "absolute",
                  top: -12,
                  left: "50%",
                  transform: "translateX(-50%)",
                  background: "var(--text)",
                  color: "white",
                  fontSize: 11,
                  fontWeight: 800,
                  padding: "4px 14px",
                  borderRadius: 50,
                  letterSpacing: 0.5,
                  whiteSpace: "nowrap",
                }}>
                  {plan.badge}
                </div>
              )}

              <div style={{ marginBottom: 24 }}>
                <div style={{
                  fontFamily: "'Plus Jakarta Sans', sans-serif",
                  fontSize: 20,
                  fontWeight: 800,
                  color: plan.highlight ? "#FFFFFF" : "var(--text)",
                  marginBottom: 12,
                }}>
                  {plan.name}
                </div>
                <div style={{ display: "flex", alignItems: "flex-end", gap: 4 }}>
                  <span style={{
                    fontFamily: "'Plus Jakarta Sans', sans-serif",
                    fontSize: 42,
                    fontWeight: 800,
                    color: plan.highlight ? "#FFFFFF" : "var(--text)",
                    lineHeight: 1,
                  }}>
                    {plan.price === 0 ? "0" : plan.price.toLocaleString("ru-RU")}
                  </span>
                  <span style={{ color: plan.highlight ? "rgba(255,255,255,0.75)" : "var(--textSecondary)", fontSize: 14, paddingBottom: 6 }}>
                    {plan.price === 0 ? "₸" : `₸/${plan.period}`}
                  </span>
                </div>
                {plan.price === 0 && (
                  <div style={{ color: plan.highlight ? "rgba(255,255,255,0.7)" : "var(--textSecondary)", fontSize: 13, marginTop: 2 }}>
                    {plan.period}
                  </div>
                )}
              </div>

              <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 10, marginBottom: 28 }}>
                {plan.features.map((f) => (
                  <div key={f} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <Check ok={true} />
                    <span style={{ fontSize: 13, color: plan.highlight ? "rgba(255,255,255,0.9)" : "var(--textSecondary)" }}>{f}</span>
                  </div>
                ))}
                {plan.missing.map((f) => (
                  <div key={f} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <Check ok={false} />
                    <span style={{ fontSize: 13, color: plan.highlight ? "rgba(255,255,255,0.45)" : "#94a3b8" }}>{f}</span>
                  </div>
                ))}
              </div>

              <Link
                href={plan.ctaHref}
                style={{
                  display: "block",
                  textAlign: "center",
                  padding: "14px",
                  borderRadius: 12,
                  fontFamily: "'Plus Jakarta Sans', sans-serif",
                  fontWeight: 700,
                  fontSize: 14,
                  textDecoration: "none",
                  background: plan.highlight ? "rgba(255,255,255,0.18)" : "var(--accent)",
                  color: "#FFFFFF",
                  border: plan.highlight ? "1.5px solid rgba(255,255,255,0.35)" : "none",
                  transition: "all 0.2s",
                }}
                onMouseEnter={e => {
                  (e.currentTarget as HTMLElement).style.background = plan.highlight ? "rgba(255,255,255,0.28)" : "var(--accent)";
                }}
                onMouseLeave={e => {
                  (e.currentTarget as HTMLElement).style.background = plan.highlight ? "rgba(255,255,255,0.18)" : "var(--accent)";
                }}
              >
                {plan.cta}
              </Link>
            </div>
          ))}
        </div>

        <div style={{ textAlign: "center", marginTop: 32 }}>
          <Link href="/pricing" style={{ color: "var(--accent)", textDecoration: "none", fontSize: 14, fontWeight: 600 }}>
            {t.pricingSection.compareLink}
          </Link>
        </div>
      </div>
    </section>
  );
}
