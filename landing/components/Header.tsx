export default function Header() {
  return (
    <header
      style={{
        padding: "16px 0",
        borderBottom: "1px solid var(--card)",
        background: "var(--background)",
      }}
    >
      <div
        className="container"
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 28 }}>🦻</span>
          <span
            style={{ fontSize: 24, fontWeight: "bold", color: "var(--heading)" }}
          >
            Hearless
          </span>
        </div>
        <nav style={{ display: "flex", gap: 24, alignItems: "center" }}>
          <a
            href="#features"
            style={{ color: "var(--heading)", textDecoration: "none" }}
          >
            Возможности
          </a>
          <a
            href="#register"
            className="btn btn-primary"
            style={{ padding: "10px 24px", fontSize: 14 }}
          >
            Войти
          </a>
        </nav>
      </div>
    </header>
  );
}
