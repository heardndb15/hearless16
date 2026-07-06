"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div style={{
      minHeight: "100vh",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      background: "var(--bg)",
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
        <div style={{ fontSize: 48, marginBottom: 16 }}>⚠️</div>
        <h1 style={{
          fontFamily: "'Plus Jakarta Sans', sans-serif",
          fontSize: 22, fontWeight: 700,
          color: "var(--text)", marginBottom: 12,
        }}>
          Что-то пошло не так
        </h1>
        <p style={{ fontSize: 14, color: "var(--textSecondary)", lineHeight: 1.7, marginBottom: 28 }}>
          Произошла непредвиденная ошибка. Попробуйте обновить страницу или вернуться на главную.
        </p>
        <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
          <button
            onClick={reset}
            style={{
              padding: "12px 24px", borderRadius: 12, fontSize: 14, fontWeight: 600,
              background: "var(--accent)", color: "white", border: "none", cursor: "pointer",
            }}
          >
            Попробовать снова
          </button>
          <Link
            href="/"
            style={{
              padding: "12px 24px", borderRadius: 12, fontSize: 14, fontWeight: 600,
              background: "white", color: "var(--accent)",
              border: "1.5px solid var(--border)", textDecoration: "none",
              display: "inline-flex", alignItems: "center",
            }}
          >
            На главную
          </Link>
        </div>
      </div>
    </div>
  );
}
