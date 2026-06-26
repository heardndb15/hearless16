import Link from "next/link";

export default function NotFound() {
  return (
    <div style={{
      minHeight: "100vh",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      background: "linear-gradient(180deg, #F0F9FF 0%, #FFFFFF 50%, #F0F9FF 100%)",
      padding: "24px",
    }}>
      <div style={{
        maxWidth: 480,
        width: "100%",
        background: "#FFFFFF",
        border: "1px solid rgba(14,165,233,0.12)",
        borderRadius: 24,
        padding: "48px 40px",
        textAlign: "center",
        boxShadow: "0 2px 16px rgba(14,165,233,0.07)",
      }}>
        <div style={{
          fontFamily: "'Plus Jakarta Sans', sans-serif",
          fontSize: 72, fontWeight: 800,
          color: "#BAE6FD", lineHeight: 1, marginBottom: 16,
        }}>
          404
        </div>
        <h1 style={{
          fontFamily: "'Plus Jakarta Sans', sans-serif",
          fontSize: 22, fontWeight: 700,
          color: "#0C4A6E", marginBottom: 12,
        }}>
          Страница не найдена
        </h1>
        <p style={{ fontSize: 14, color: "#075985", lineHeight: 1.7, marginBottom: 28 }}>
          Возможно, страница была перемещена или удалена. Вернитесь на главную и попробуйте снова.
        </p>
        <Link
          href="/"
          style={{
            padding: "13px 32px", borderRadius: 12, fontSize: 14, fontWeight: 700,
            background: "#0EA5E9", color: "white", textDecoration: "none",
            display: "inline-flex", alignItems: "center", gap: 8,
          }}
        >
          ← На главную
        </Link>
      </div>
    </div>
  );
}
