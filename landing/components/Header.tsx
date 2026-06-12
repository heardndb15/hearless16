import Link from "next/link";

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
        <Link href="/" style={{ display: "flex", alignItems: "center", gap: 8, textDecoration: "none" }}>
          <span style={{ fontSize: 28 }}>🦻</span>
          <span style={{ fontSize: 24, fontWeight: "bold", color: "var(--heading)" }}>
            Hearless
          </span>
        </Link>
        <nav style={{ display: "flex", gap: 20, alignItems: "center" }}>
          <Link
            href="/features"
            style={{ color: "var(--heading)", textDecoration: "none", fontSize: 14 }}
          >
            Возможности
          </Link>
          <Link
            href="/about"
            style={{ color: "var(--heading)", textDecoration: "none", fontSize: 14 }}
          >
            О проекте
          </Link>
          <Link
            href="/blog"
            style={{ color: "var(--heading)", textDecoration: "none", fontSize: 14 }}
          >
            Блог
          </Link>
          <Link
            href="/contact"
            style={{ color: "var(--heading)", textDecoration: "none", fontSize: 14 }}
          >
            Контакты
          </Link>
          <Link
            href="/login"
            style={{ color: "var(--heading)", textDecoration: "none", fontSize: 14 }}
          >
            Войти
          </Link>
          <Link
            href="/register"
            className="btn btn-primary"
            style={{ padding: "10px 24px", fontSize: 14, textDecoration: "none" }}
          >
            Регистрация
          </Link>
        </nav>
      </div>
    </header>
  );
}
