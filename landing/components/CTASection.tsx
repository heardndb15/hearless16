"use client";

export default function CTASection() {
  return (
    <section
      style={{
        position: "relative",
        overflow: "hidden",
        background: "#E0F2FE",
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
            "radial-gradient(circle, rgba(14,165,233,0.08) 0%, transparent 70%)",
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
          style={{ maxWidth: 640, margin: "0 auto 20px", color: "#0C4A6E" }}
        >
          Готов сделать мир{" "}
          <span style={{ background: "linear-gradient(135deg, #0EA5E9 0%, #38BDF8 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>доступнее</span>?
        </h2>
        <p
          className="section-subtitle"
          style={{ margin: "0 auto 36px", textAlign: "center", color: "#075985" }}
        >
          Присоединяйся к сообществу Hearless. Бесплатно. Навсегда.
        </p>
        <div style={{ display: "flex", gap: 14, justifyContent: "center", flexWrap: "wrap" }}>
          <a
            href="/register"
            style={{ padding: "16px 40px", fontSize: 15, display: "inline-flex", alignItems: "center", gap: 8, borderRadius: 12, fontFamily: "'Syne', sans-serif", fontWeight: 600, textDecoration: "none", background: "#0EA5E9", color: "white", border: "none", transition: "all 0.3s ease" }}
          >
            Создать аккаунт
            <span style={{ fontSize: 18 }}>→</span>
          </a>
          <a
            href="/features"
            style={{ padding: "16px 40px", fontSize: 15, display: "inline-flex", alignItems: "center", gap: 8, borderRadius: 12, fontFamily: "'Syne', sans-serif", fontWeight: 600, textDecoration: "none", background: "white", color: "#0369A1", border: "1.5px solid #BAE6FD", transition: "all 0.3s ease" }}
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
                background: "#FFFFFF",
                border: "1.5px solid rgba(14,165,233,0.12)",
                boxShadow: "0 8px 20px rgba(14,165,233,0.07)",
                textDecoration: "none",
                transition: "all 0.3s ease",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = "var(--accent)";
                e.currentTarget.style.background = "#F0F9FF";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = "rgba(14,165,233,0.12)";
                e.currentTarget.style.background = "#FFFFFF";
              }}
            >
              <span style={{ fontSize: 24 }}>{store.icon}</span>
              <div style={{ textAlign: "left" }}>
                <div style={{ fontSize: 10, color: "#0369A1" }}>
                  {store.sub}
                </div>
                <div
                  style={{
                    fontSize: 15,
                    fontWeight: 600,
                    color: "#0C4A6E",
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
