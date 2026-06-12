import Link from "next/link";

export default function Footer() {
  return (
    <footer
      style={{
        background: "var(--dark)",
        color: "var(--card)",
        padding: "40px 0",
      }}
    >
      <div className="container">
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
            gap: 32,
            marginBottom: 32,
          }}
        >
          <div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                marginBottom: 16,
              }}
            >
              <span style={{ fontSize: 24 }}>🦻</span>
              <span
                style={{ fontSize: 20, fontWeight: "bold", color: "var(--white)" }}
              >
                Hearless
              </span>
            </div>
            <p style={{ fontSize: 13, lineHeight: 1.6 }}>
              Помогаем глухим и слабослышащим людям с 2026 года.
            </p>
          </div>
          <div>
            <h4 style={{ color: "var(--white)", marginBottom: 12, fontSize: 15 }}>
              Страницы
            </h4>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <Link href="/features" style={linkStyle}>Возможности</Link>
              <Link href="/about" style={linkStyle}>О проекте</Link>
              <Link href="/blog" style={linkStyle}>Блог</Link>
              <Link href="/contact" style={linkStyle}>Контакты</Link>
            </div>
          </div>
          <div>
            <h4 style={{ color: "var(--white)", marginBottom: 12, fontSize: 15 }}>
              Аккаунт
            </h4>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <Link href="/login" style={linkStyle}>Войти</Link>
              <Link href="/register" style={linkStyle}>Регистрация</Link>
            </div>
          </div>
        </div>
        <p style={{ fontSize: 12, opacity: 0.7, textAlign: "center" }}>
          © {new Date().getFullYear()} Hearless. Все права защищены.
        </p>
      </div>
    </footer>
  );
}

const linkStyle: React.CSSProperties = {
  color: "var(--card)",
  textDecoration: "none",
  fontSize: 13,
  opacity: 0.8,
};
