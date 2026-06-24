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
        <div className="section-label" style={{ justifyContent: "center", color: "rgba(255,255,255,0.9)" }}>
          <span style={{ display: "none" }} />
          Начни сейчас
          <span style={{ display: "none" }} />
        </div>
        <h2
          className="section-title"
          style={{ maxWidth: 640, margin: "0 auto 20px", color: "#ffffff" }}
        >
          Готов сделать мир{" "}
          <span style={{ background: "linear-gradient(135deg, #E3F2FD 0%, #90CAF9 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>доступнее</span>?
        </h2>
        <p
          className="section-subtitle"
          style={{ margin: "0 auto 36px", textAlign: "center", color: "rgba(255,255,255,0.8)" }}
        >
          Присоединяйся к сообществу Hearless. Бесплатно. Навсегда.
        </p>
        <div style={{ display: "flex", gap: 14, justifyContent: "center", flexWrap: "wrap" }}>
          <a
            href="/register"
            style={{ padding: "16px 40px", fontSize: 15, display: "inline-flex", alignItems: "center", gap: 8, borderRadius: 50, fontFamily: "'Syne', sans-serif", fontWeight: 600, textDecoration: "none", background: "#0277BD", color: "#ffffff", border: "none", transition: "all 0.3s ease" }}
          >
            Создать аккаунт
            <span style={{ fontSize: 18 }}>→</span>
          </a>
          <a
            href="/features"
            style={{ padding: "16px 40px", fontSize: 15, display: "inline-flex", alignItems: "center", gap: 8, borderRadius: 50, fontFamily: "'Syne', sans-serif", fontWeight: 600, textDecoration: "none", background: "rgba(255,255,255,0.2)", color: "#ffffff", border: "1px solid rgba(255,255,255,0.5)", transition: "all 0.3s ease" }}
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
                background: "rgba(255,255,255,0.72)",
                backdropFilter: "blur(16px)",
                WebkitBackdropFilter: "blur(16px)",
                border: "1.5px solid rgba(255,255,255,0.6)",
                boxShadow: "0 8px 20px rgba(2,136,209,0.18)",
                textDecoration: "none",
                transition: "all 0.3s ease",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = "var(--accent)";
                e.currentTarget.style.background = "rgba(255,255,255,0.85)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = "rgba(255,255,255,0.6)";
                e.currentTarget.style.background = "rgba(255,255,255,0.72)";
              }}
            >
              <span style={{ fontSize: 24 }}>{store.icon}</span>
              <div style={{ textAlign: "left" }}>
                <div style={{ fontSize: 10, color: "#1565C0" }}>
                  {store.sub}
                </div>
                <div
                  style={{
                    fontSize: 15,
                    fontWeight: 600,
                    color: "#0D47A1",
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
