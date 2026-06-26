"use client";

import Link from "next/link";

const PLANS = [
  {
    name: "Free",
    price: 0,
    period: "навсегда",
    badge: null,
    highlight: false,
    cta: "Начать бесплатно",
    ctaHref: "/register",
    features: [
      "Субтитры до 30 мин в день",
      "Базовые уроки жестового языка",
      "Алфавит и приветствия",
    ],
    missing: ["История субтитров", "Уроки среднего уровня", "Полный курс"],
  },
  {
    name: "Basic",
    price: 990,
    period: "в месяц",
    badge: "Популярный",
    highlight: true,
    cta: "Попробовать Basic",
    ctaHref: "/api/checkout?plan=basic",
    features: [
      "Субтитры до 2 часов в день",
      "Все базовые уроки",
      "Уроки среднего уровня",
      "История субтитров",
    ],
    missing: ["Полный курс жестового языка", "Тесты и прогресс"],
  },
  {
    name: "Pro",
    price: 2490,
    period: "в месяц",
    badge: null,
    highlight: false,
    cta: "Выбрать Pro",
    ctaHref: "/api/checkout?plan=pro",
    features: [
      "Субтитры без ограничений",
      "Полный курс жестового языка",
      "Тесты и прогресс",
      "Приоритетная поддержка",
      "Ранний доступ к функциям",
    ],
    missing: [],
  },
];

function Check({ ok }: { ok: boolean }) {
  return ok ? (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0 }}>
      <circle cx="8" cy="8" r="8" fill="rgba(14,165,233,0.12)" />
      <path d="M5 8l2 2 4-4" stroke="#0EA5E9" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ) : (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0 }}>
      <circle cx="8" cy="8" r="8" fill="rgba(148,163,184,0.1)" />
      <path d="M5.5 5.5l5 5M10.5 5.5l-5 5" stroke="#94a3b8" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

export default function PricingSection() {
  return (
    <section id="pricing">
      <div className="container">
        <div style={{ textAlign: "center", marginBottom: 48 }}>
          <div className="section-label">Тарифы</div>
          <h2 className="section-title">
            Выберите свой{" "}
            <span className="gradient-text">план</span>
          </h2>
          <p className="section-subtitle" style={{ margin: "0 auto" }}>
            Начните бесплатно и переходите на расширенный план в любой момент.
            Без скрытых платежей.
          </p>
        </div>

        <div className="pricing-grid">
          {PLANS.map((plan) => (
            <div
              key={plan.name}
              style={{
                background: plan.highlight
                  ? "linear-gradient(135deg, #0EA5E9 0%, #0284C7 100%)"
                  : "#FFFFFF",
                border: plan.highlight
                  ? "none"
                  : "1px solid rgba(14,165,233,0.15)",
                borderRadius: "var(--radius)",
                padding: "32px 28px",
                display: "flex",
                flexDirection: "column",
                boxShadow: plan.highlight
                  ? "0 16px 48px rgba(14,165,233,0.28)"
                  : "0 2px 16px rgba(14,165,233,0.07)",
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
                  background: "#0C4A6E",
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
                  color: plan.highlight ? "#FFFFFF" : "#0C4A6E",
                  marginBottom: 12,
                }}>
                  {plan.name}
                </div>
                <div style={{ display: "flex", alignItems: "flex-end", gap: 4 }}>
                  <span style={{
                    fontFamily: "'Plus Jakarta Sans', sans-serif",
                    fontSize: 42,
                    fontWeight: 800,
                    color: plan.highlight ? "#FFFFFF" : "#0C4A6E",
                    lineHeight: 1,
                  }}>
                    {plan.price === 0 ? "0" : plan.price.toLocaleString("ru-RU")}
                  </span>
                  <span style={{ color: plan.highlight ? "rgba(255,255,255,0.75)" : "#075985", fontSize: 14, paddingBottom: 6 }}>
                    {plan.price === 0 ? "₸" : `₸/${plan.period}`}
                  </span>
                </div>
                {plan.price === 0 && (
                  <div style={{ color: plan.highlight ? "rgba(255,255,255,0.7)" : "#075985", fontSize: 13, marginTop: 2 }}>
                    навсегда
                  </div>
                )}
              </div>

              <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 10, marginBottom: 28 }}>
                {plan.features.map((f) => (
                  <div key={f} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <Check ok={true} />
                    <span style={{ fontSize: 13, color: plan.highlight ? "rgba(255,255,255,0.9)" : "#075985" }}>{f}</span>
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
                  background: plan.highlight ? "rgba(255,255,255,0.18)" : "#0EA5E9",
                  color: "#FFFFFF",
                  border: plan.highlight ? "1.5px solid rgba(255,255,255,0.35)" : "none",
                  transition: "all 0.2s",
                }}
                onMouseEnter={e => {
                  (e.currentTarget as HTMLElement).style.background = plan.highlight ? "rgba(255,255,255,0.28)" : "#0284C7";
                }}
                onMouseLeave={e => {
                  (e.currentTarget as HTMLElement).style.background = plan.highlight ? "rgba(255,255,255,0.18)" : "#0EA5E9";
                }}
              >
                {plan.cta}
              </Link>
            </div>
          ))}
        </div>

        <div style={{ textAlign: "center", marginTop: 32 }}>
          <Link href="/pricing" style={{ color: "#0EA5E9", textDecoration: "none", fontSize: 14, fontWeight: 600 }}>
            Полное сравнение тарифов →
          </Link>
        </div>
      </div>
    </section>
  );
}
