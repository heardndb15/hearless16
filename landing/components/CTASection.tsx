"use client";

import { useLanguage } from "../lib/LanguageContext";

export default function CTASection() {
  const { t } = useLanguage();

  return (
    <section
      style={{
        position: "relative",
        overflow: "hidden",
        background: "var(--chipBg)",
      }}
    >
      {/* Background glow */}
      <div
        style={{
          position: "absolute",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          width: "60%",
          height: "60%",
          borderRadius: "50%",
          background:
            "radial-gradient(circle, rgba(0, 0, 0,0.08) 0%, transparent 70%)",
          pointerEvents: "none",
        }}
      />

      <div className="container" style={{ textAlign: "center", position: "relative" }}>
        <div className="section-label" style={{ justifyContent: "center" }}>
          <span style={{ display: "none" }} />
          {t.cta.label}
          <span style={{ display: "none" }} />
        </div>
        <h2
          className="section-title"
          style={{ maxWidth: 640, margin: "0 auto 20px", color: "var(--text)" }}
        >
          {t.cta.title}{" "}
          <span style={{ color: "var(--accent)" }}>{t.cta.titleHighlight}</span>?
        </h2>
        <p
          className="section-subtitle"
          style={{ margin: "0 auto 36px", textAlign: "center", color: "var(--textSecondary)" }}
        >
          {t.cta.subtitle}
        </p>
        <div style={{ display: "flex", gap: 14, justifyContent: "center", flexWrap: "wrap" }}>
          <a
            href="/register"
            style={{ padding: "16px 40px", fontSize: 15, display: "inline-flex", alignItems: "center", gap: 8, borderRadius: 12, fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 600, textDecoration: "none", background: "var(--gradient-accent)", color: "var(--white)", border: "none", transition: "all 0.3s ease" }}
          >
            {t.cta.btn1}
            <span style={{ fontSize: 18 }}>→</span>
          </a>
          <a
            href="/features"
            style={{ padding: "16px 40px", fontSize: 15, display: "inline-flex", alignItems: "center", gap: 8, borderRadius: 12, fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 600, textDecoration: "none", background: "var(--bgCard)", color: "var(--accent)", border: "1.5px solid var(--border)", transition: "all 0.3s ease" }}
          >
            {t.cta.btn2}
          </a>
        </div>

        {/* Download buttons */}
        <div
          style={{
            display: "flex",
            gap: 14,
            justifyContent: "center",
            marginTop: 36,
            flexWrap: "wrap",
          }}
        >
          {[
            { label: "App Store", sub: "iOS 16+", icon: "🍎" },
            { label: "Google Play", sub: "Android 12+", icon: "📱" },
          ].map((store) => (
            <a
              key={store.label}
              href="#"
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                padding: "12px 24px",
                borderRadius: "var(--radiusSm)",
                background: "var(--bgCard)",
                border: "1.5px solid var(--border)",
                boxShadow: "0 8px 20px rgba(0, 0, 0,0.07)",
                textDecoration: "none",
                transition: "all 0.3s ease",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = "var(--accent)";
                e.currentTarget.style.background = "var(--bg)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = "var(--border)";
                e.currentTarget.style.background = "var(--bgCard)";
              }}
            >
              <span style={{ fontSize: 24 }}>{store.icon}</span>
              <div style={{ textAlign: "left" }}>
                <div style={{ fontSize: 10, color: "var(--accent)" }}>
                  {store.sub}
                </div>
                <div
                  style={{
                    fontSize: 15,
                    fontWeight: 600,
                    color: "var(--text)",
                  }}
                >
                  {store.label}
                </div>
              </div>
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}
