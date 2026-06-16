"use client";

export default function CTASection() {
  return (
    <section
      style={{
        position: "relative",
        overflow: "hidden",
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
            "radial-gradient(circle, rgba(43,191,207,0.08) 0%, transparent 70%)",
          pointerEvents: "none",
        }}
      />

      <div className="container" style={{ textAlign: "center", position: "relative" }}>
        <div className="section-label" style={{ justifyContent: "center" }}>
          <span style={{ display: "none" }} />
          Начни сейчас
          <span style={{ display: "none" }} />
        </div>
        <h2
          className="section-title"
          style={{ maxWidth: 640, margin: "0 auto 20px" }}
        >
          Готов сделать мир{" "}
          <span className="gradient-text">доступнее</span>?
        </h2>
        <p
          className="section-subtitle"
          style={{ margin: "0 auto 36px", textAlign: "center" }}
        >
          Присоединяйся к сообществу Hearless. Бесплатно. Навсегда.
        </p>
        <div style={{ display: "flex", gap: 14, justifyContent: "center", flexWrap: "wrap" }}>
          <a
            href="/register"
            className="btn btn-primary"
            style={{ padding: "16px 40px", fontSize: 15 }}
          >
            Создать аккаунт
            <span style={{ fontSize: 18 }}>→</span>
          </a>
          <a
            href="/features"
            className="btn btn-outline"
            style={{ padding: "16px 40px", fontSize: 15 }}
          >
            Все возможности
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
                border: "1px solid var(--border)",
                textDecoration: "none",
                transition: "all 0.3s ease",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = "var(--accent)";
                e.currentTarget.style.background = "var(--bgCardHover)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = "var(--border)";
                e.currentTarget.style.background = "var(--bgCard)";
              }}
            >
              <span style={{ fontSize: 24 }}>{store.icon}</span>
              <div style={{ textAlign: "left" }}>
                <div style={{ fontSize: 10, color: "var(--textMuted)" }}>
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
