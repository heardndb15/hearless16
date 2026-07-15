export default function Download() {
  return (
    <section id="download" style={{ textAlign: "center" }}>
      <div className="container">
        <h2
          style={{
            fontSize: 36,
            fontWeight: "bold",
            color: "var(--heading)",
            marginBottom: 16,
          }}
        >
          Скачайте Hearless
        </h2>
        <p
          style={{
            fontSize: 18,
            color: "var(--textSecondary)",
            marginBottom: 40,
            maxWidth: 480,
            margin: "0 auto 40px",
          }}
        >
          Доступно на iOS и Android. Бесплатно.
        </p>
        <div
          style={{
            display: "flex",
            gap: 20,
            justifyContent: "center",
            flexWrap: "wrap",
          }}
        >
          <a
            href="#"
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              background: "var(--dark)",
              color: "var(--white)",
              padding: "14px 32px",
              borderRadius: 16,
              textDecoration: "none",
              fontWeight: "600",
            }}
          >
            <span style={{ fontSize: 28 }}>🍎</span>
            <div style={{ textAlign: "left" }}>
              <div style={{ fontSize: 12, opacity: 0.7 }}>Скачать в</div>
              <div style={{ fontSize: 18 }}>App Store</div>
            </div>
          </a>
          <a
            href="#"
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              background: "var(--dark)",
              color: "var(--white)",
              padding: "14px 32px",
              borderRadius: 16,
              textDecoration: "none",
              fontWeight: "600",
            }}
          >
            <span style={{ fontSize: 28 }}>📱</span>
            <div style={{ textAlign: "left" }}>
              <div style={{ fontSize: 12, opacity: 0.7 }}>Скачать в</div>
              <div style={{ fontSize: 18 }}>Google Play</div>
            </div>
          </a>
        </div>
      </div>
    </section>
  );
}
