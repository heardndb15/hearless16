"use client";

import { useState } from "react";
import Link from "next/link";

const PLANS = [
  {
    id: "free",
    name: "Free",
    price: 0,
    period: "навсегда",
    badge: null,
    color: "var(--textSecondary)",
    bg: "#FFFFFF",
    border: "rgba(0, 0, 0,0.15)",
    highlight: false,
    cta: "Начать бесплатно",
    ctaHref: "/register",
    features: [
      { text: "Субтитры до 30 мин в день", ok: true },
      { text: "Базовые уроки жестового языка", ok: true },
      { text: "Алфавит и приветствия", ok: true },
      { text: "История субтитров", ok: false },
      { text: "Уроки среднего уровня", ok: false },
      { text: "Полный курс жестового языка", ok: false },
      { text: "Тесты и прогресс", ok: false },
      { text: "Приоритетная поддержка", ok: false },
    ],
  },
  {
    id: "basic",
    name: "Basic",
    price: 990,
    period: "в месяц",
    badge: "Популярный",
    color: "#FFFFFF",
    bg: "var(--accent)",
    border: "transparent",
    highlight: true,
    cta: "Попробовать Basic",
    ctaHref: "/api/checkout?plan=basic",
    features: [
      { text: "Субтитры до 2 часов в день", ok: true },
      { text: "Все базовые уроки", ok: true },
      { text: "Уроки среднего уровня", ok: true },
      { text: "История субтитров (сохранение)", ok: true },
      { text: "Полный курс жестового языка", ok: false },
      { text: "Тесты и прогресс", ok: false },
      { text: "Приоритетная поддержка", ok: false },
      { text: "Расширенная аналитика", ok: false },
    ],
  },
  {
    id: "pro",
    name: "Pro",
    price: 2490,
    period: "в месяц",
    badge: null,
    color: "var(--textSecondary)",
    bg: "#FFFFFF",
    border: "rgba(0, 0, 0,0.15)",
    highlight: false,
    cta: "Выбрать Pro",
    ctaHref: "/api/checkout?plan=pro",
    features: [
      { text: "Субтитры без ограничений", ok: true },
      { text: "Полный курс жестового языка", ok: true },
      { text: "Тесты и прогресс по урокам", ok: true },
      { text: "История субтитров", ok: true },
      { text: "Приоритетная поддержка", ok: true },
      { text: "Расширенная аналитика", ok: true },
      { text: "Ранний доступ к новым функциям", ok: true },
      { text: "Персональный AI-наставник", ok: true },
    ],
  },
];

const FAQ = [
  {
    q: "Можно ли отменить подписку в любой момент?",
    a: "Да, вы можете отменить подписку в любой момент из настроек профиля. После отмены доступ сохраняется до конца оплаченного периода.",
  },
  {
    q: "Как происходит оплата?",
    a: "Оплата производится через защищённый платёжный шлюз. Поддерживаются карты Visa, Mastercard и Kaspi Pay. Данные карты не хранятся на наших серверах.",
  },
  {
    q: "Есть ли пробный период для платных тарифов?",
    a: "Да, при первой подписке на Basic или Pro действует 7-дневный бесплатный пробный период. Списание начнётся только после его окончания.",
  },
  {
    q: "Могу ли я сменить тариф?",
    a: "Конечно. Вы можете перейти на более высокий тариф в любой момент — доступ откроется мгновенно. При переходе на более низкий тариф изменения вступят в силу со следующего расчётного периода.",
  },
  {
    q: "Что происходит с моими данными при отмене?",
    a: "Ваши данные (история субтитров, прогресс по урокам) сохраняются в течение 90 дней после отмены. После этого срока неиспользуемые данные удаляются.",
  },
];

export default function PricingPage() {
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  return (
    <div style={{ minHeight: "100vh", background: "var(--gradient-soft)", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
      {/* Nav */}
      <div style={{ position: "fixed", top: 0, left: 0, right: 0, zIndex: 50, background: "rgba(255,255,255,0.95)", backdropFilter: "blur(20px)", borderBottom: "1px solid rgba(0, 0, 0,0.1)", padding: "14px 0" }}>
        <div className="container" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <Link href="/" style={{ display: "flex", alignItems: "center", gap: 10, textDecoration: "none" }}>
            <img src="/logo.png" alt="Hearless" style={{ width: 34, height: 34, borderRadius: 10, objectFit: "cover" }} />
            <span style={{ fontSize: 20, fontWeight: 700, color: "var(--text)" }}>Hearless</span>
          </Link>
          <div style={{ display: "flex", gap: 10 }}>
            <Link href="/login" style={{ padding: "10px 20px", borderRadius: 50, border: "1.5px solid var(--border)", color: "var(--accent)", textDecoration: "none", fontWeight: 600, fontSize: 13 }}>Войти</Link>
            <Link href="/register" style={{ padding: "10px 20px", borderRadius: 12, background: "var(--accent)", color: "white", textDecoration: "none", fontWeight: 600, fontSize: 13 }}>Начать</Link>
          </div>
        </div>
      </div>

      <div style={{ paddingTop: 100 }}>

        {/* Hero */}
        <div style={{ textAlign: "center", padding: "60px 24px 48px", maxWidth: 680, margin: "0 auto" }}>
          <div className="section-label" style={{ justifyContent: "center" }}>Тарифы</div>
          <h1 style={{ fontSize: "clamp(32px, 6vw, 52px)", fontWeight: 800, color: "var(--text)", lineHeight: 1.1, marginBottom: 18 }}>
            Простые и прозрачные{" "}
            <span style={{ color: "var(--accent)" }}>цены</span>
          </h1>
          <p style={{ fontSize: 17, color: "var(--textSecondary)", lineHeight: 1.7, maxWidth: 520, margin: "0 auto" }}>
            Начни бесплатно и переходи на платный тариф когда будешь готов. Никаких скрытых платежей.
          </p>
        </div>

        {/* Plans */}
        <div className="container" style={{ maxWidth: 1040 }}>
          <div className="pricing-grid">
            {PLANS.map((plan) => (
              <div
                key={plan.id}
                style={{
                  background: plan.bg,
                  borderRadius: 24,
                  border: `1.5px solid ${plan.border}`,
                  padding: "32px 28px 36px",
                  display: "flex",
                  flexDirection: "column",
                  boxShadow: plan.highlight
                    ? "0 20px 60px rgba(0, 0, 0,0.3)"
                    : "0 2px 20px rgba(0, 0, 0,0.07)",
                  position: "relative",
                  transform: plan.highlight ? "scale(1.03)" : "none",
                }}
              >
                {/* Badge */}
                {plan.badge && (
                  <div style={{ position: "absolute", top: -14, left: "50%", transform: "translateX(-50%)", background: "var(--text)", color: "white", fontSize: 11, fontWeight: 700, padding: "5px 16px", borderRadius: 20, letterSpacing: 1, whiteSpace: "nowrap" }}>
                    ★ {plan.badge}
                  </div>
                )}

                {/* Plan name */}
                <div style={{ marginBottom: 20 }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: plan.highlight ? "rgba(255,255,255,0.7)" : "var(--accent)", letterSpacing: 1.5, textTransform: "uppercase" }}>
                    {plan.name}
                  </span>
                </div>

                {/* Price */}
                <div style={{ marginBottom: 28 }}>
                  <div style={{ display: "flex", alignItems: "baseline", gap: 4 }}>
                    <span style={{ fontSize: 42, fontWeight: 800, color: plan.highlight ? "white" : "var(--text)", lineHeight: 1 }}>
                      {plan.price === 0 ? "0" : plan.price.toLocaleString("ru-KZ")}
                    </span>
                    <span style={{ fontSize: 16, fontWeight: 600, color: plan.highlight ? "rgba(255,255,255,0.8)" : "var(--textSecondary)" }}>
                      {plan.price === 0 ? " ₸" : " ₸"}
                    </span>
                  </div>
                  <div style={{ fontSize: 13, color: plan.highlight ? "rgba(255,255,255,0.65)" : "var(--accent)", marginTop: 4 }}>
                    {plan.period}
                  </div>
                </div>

                {/* CTA */}
                <Link
                  href={plan.ctaHref}
                  style={{
                    display: "block",
                    textAlign: "center",
                    padding: "14px",
                    borderRadius: 12,
                    textDecoration: "none",
                    fontWeight: 700,
                    fontSize: 14,
                    marginBottom: 28,
                    background: plan.highlight ? "rgba(255,255,255,0.18)" : "var(--accent)",
                    color: plan.highlight ? "white" : "white",
                    border: plan.highlight ? "1.5px solid rgba(255,255,255,0.35)" : "none",
                    transition: "all 0.2s",
                  }}
                >
                  {plan.cta}
                </Link>

                {/* Divider */}
                <div style={{ borderTop: `1px solid ${plan.highlight ? "rgba(255,255,255,0.2)" : "rgba(0, 0, 0,0.1)"}`, marginBottom: 24 }} />

                {/* Features */}
                <div style={{ display: "flex", flexDirection: "column", gap: 12, flex: 1 }}>
                  {plan.features.map((f, i) => (
                    <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, opacity: f.ok ? 1 : 0.4 }}>
                      <span style={{ width: 20, height: 20, borderRadius: "50%", background: f.ok ? (plan.highlight ? "rgba(255,255,255,0.25)" : "var(--chipBg)") : "transparent", border: f.ok ? "none" : `1.5px solid ${plan.highlight ? "rgba(255,255,255,0.3)" : "rgba(0, 0, 0,0.2)"}`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, fontSize: 11 }}>
                        {f.ok ? (
                          <svg width="11" height="8" viewBox="0 0 11 8" fill="none">
                            <path d="M1 4L4 7L10 1" stroke={plan.highlight ? "white" : "var(--accent)"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        ) : (
                          <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
                            <path d="M1 1L7 7M7 1L1 7" stroke={plan.highlight ? "rgba(255,255,255,0.5)" : "rgba(0, 0, 0,0.4)"} strokeWidth="1.5" strokeLinecap="round" />
                          </svg>
                        )}
                      </span>
                      <span style={{ fontSize: 13, color: plan.highlight ? (f.ok ? "white" : "rgba(255,255,255,0.5)") : (f.ok ? "var(--textSecondary)" : "#94B8C8"), fontWeight: f.ok ? 500 : 400 }}>
                        {f.text}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Trust badges */}
        <div style={{ display: "flex", justifyContent: "center", gap: 40, flexWrap: "wrap", padding: "56px 24px 0", maxWidth: 720, margin: "0 auto" }}>
          {[
            { icon: "🔒", text: "Безопасная оплата" },
            { icon: "↩️", text: "7 дней бесплатно" },
            { icon: "❌", text: "Отмена в любой момент" },
            { icon: "💳", text: "Kaspi Pay, Visa, Mastercard" },
          ].map((b) => (
            <div key={b.text} style={{ display: "flex", alignItems: "center", gap: 8, color: "var(--accent)", fontSize: 13, fontWeight: 500 }}>
              <span style={{ fontSize: 18 }}>{b.icon}</span>
              {b.text}
            </div>
          ))}
        </div>

        {/* Compare table */}
        <div className="container" style={{ maxWidth: 800, marginTop: 80, paddingBottom: 0 }}>
          <h2 style={{ fontSize: "clamp(22px, 4vw, 32px)", fontWeight: 800, color: "var(--text)", textAlign: "center", marginBottom: 8 }}>Сравнение тарифов</h2>
          <p style={{ textAlign: "center", color: "var(--accent)", fontSize: 14, marginBottom: 36 }}>Подробное сравнение всех возможностей</p>

          <div className="pricing-compare-scroll">
          <div style={{ background: "white", borderRadius: 20, border: "1px solid rgba(0, 0, 0,0.12)", overflow: "hidden", boxShadow: "0 4px 24px rgba(0, 0, 0,0.07)" }}>
            {/* Header row */}
            <div className="pricing-compare-grid" style={{ background: "var(--bg)", borderBottom: "1px solid rgba(0, 0, 0,0.1)", padding: "16px 24px" }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: "var(--accent)", textTransform: "uppercase", letterSpacing: 1 }}>Функция</div>
              {PLANS.map(p => (
                <div key={p.id} style={{ fontSize: 13, fontWeight: 700, color: "var(--text)", textAlign: "center" }}>{p.name}</div>
              ))}
            </div>

            {[
              { label: "Субтитры в день", values: ["30 мин", "2 часа", "Без лимита"] },
              { label: "Базовые уроки жестов", values: [true, true, true] },
              { label: "Уроки среднего уровня", values: [false, true, true] },
              { label: "Продвинутые уроки", values: [false, false, true] },
              { label: "История субтитров", values: [false, true, true] },
              { label: "Тесты и прогресс", values: [false, false, true] },
              { label: "Приоритетная поддержка", values: [false, false, true] },
              { label: "Ранний доступ к функциям", values: [false, false, true] },
            ].map((row, i) => (
              <div key={row.label} className="pricing-compare-grid" style={{ padding: "14px 24px", borderBottom: i < 7 ? "1px solid rgba(0, 0, 0,0.07)" : "none", background: i % 2 === 0 ? "white" : "#FAFEFF" }}>
                <div style={{ fontSize: 13, color: "var(--textSecondary)", fontWeight: 500 }}>{row.label}</div>
                {row.values.map((v, j) => (
                  <div key={j} style={{ textAlign: "center" }}>
                    {typeof v === "boolean" ? (
                      v ? (
                        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ margin: "0 auto" }}>
                          <circle cx="8" cy="8" r="8" fill="var(--chipBg)" />
                          <path d="M5 8.5L7 10.5L11 6.5" stroke="var(--accent)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      ) : (
                        <span style={{ color: "#CBD5E1", fontSize: 16 }}>—</span>
                      )
                    ) : (
                      <span style={{ fontSize: 12, fontWeight: 600, color: j === 1 ? "var(--accent)" : "var(--textSecondary)" }}>{v}</span>
                    )}
                  </div>
                ))}
              </div>
            ))}
          </div>
          </div>
        </div>

        {/* FAQ */}
        <div className="container" style={{ maxWidth: 720, marginTop: 80, paddingBottom: 80 }}>
          <h2 style={{ fontSize: "clamp(22px, 4vw, 32px)", fontWeight: 800, color: "var(--text)", textAlign: "center", marginBottom: 8 }}>Частые вопросы</h2>
          <p style={{ textAlign: "center", color: "var(--accent)", fontSize: 14, marginBottom: 36 }}>Ответы на популярные вопросы о тарифах</p>

          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {FAQ.map((item, i) => (
              <div key={i} style={{ background: "white", borderRadius: 16, border: "1px solid rgba(0, 0, 0,0.12)", overflow: "hidden", boxShadow: "0 2px 12px rgba(0, 0, 0,0.05)" }}>
                <button
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  style={{ width: "100%", display: "flex", justifyContent: "space-between", alignItems: "center", padding: "18px 22px", background: "none", border: "none", cursor: "pointer", textAlign: "left", gap: 16 }}
                >
                  <span style={{ fontSize: 14, fontWeight: 600, color: "var(--text)", lineHeight: 1.4 }}>{item.q}</span>
                  <span style={{ fontSize: 18, color: "var(--accent)", transform: openFaq === i ? "rotate(45deg)" : "none", transition: "transform 0.2s", flexShrink: 0 }}>+</span>
                </button>
                {openFaq === i && (
                  <div style={{ padding: "0 22px 18px", fontSize: 14, color: "var(--textSecondary)", lineHeight: 1.7, borderTop: "1px solid rgba(0, 0, 0,0.08)" }}>
                    <div style={{ paddingTop: 14 }}>{item.a}</div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* CTA */}
        <div style={{ background: "var(--accent)", padding: "64px 24px", textAlign: "center" }}>
          <h2 style={{ fontSize: "clamp(24px, 5vw, 38px)", fontWeight: 800, color: "white", marginBottom: 12 }}>Готов начать?</h2>
          <p style={{ fontSize: 16, color: "rgba(255,255,255,0.85)", marginBottom: 32, maxWidth: 440, margin: "0 auto 32px" }}>
            Зарегистрируйся бесплатно и начни пользоваться Hearless уже сегодня.
          </p>
          <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
            <Link href="/register" style={{ padding: "16px 36px", borderRadius: 12, background: "white", color: "var(--accent)", fontWeight: 700, fontSize: 15, textDecoration: "none" }}>
              Начать бесплатно
            </Link>
            <Link href="/contact" style={{ padding: "16px 36px", borderRadius: 12, background: "rgba(255,255,255,0.15)", color: "white", border: "1.5px solid rgba(255,255,255,0.35)", fontWeight: 700, fontSize: 15, textDecoration: "none" }}>
              Связаться с нами
            </Link>
          </div>
        </div>

      </div>
    </div>
  );
}
