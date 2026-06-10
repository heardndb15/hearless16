export default function Footer() {
  return (
    <footer
      style={{
        background: "var(--dark)",
        color: "var(--card)",
        padding: "40px 0",
        textAlign: "center",
      }}
    >
      <div className="container">
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
            marginBottom: 16,
          }}
        >
          <span style={{ fontSize: 24 }}>🦻</span>
          <span style={{ fontSize: 20, fontWeight: "bold", color: "var(--white)" }}>
            Hearless
          </span>
        </div>
        <p style={{ fontSize: 14, marginBottom: 8 }}>
          Помогаем глухим и слабослышащим людям с 2026 года.
        </p>
        <p style={{ fontSize: 12, opacity: 0.7 }}>
          © {new Date().getFullYear()} Hearless. Все права защищены.
        </p>
      </div>
    </footer>
  );
}
