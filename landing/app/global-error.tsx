"use client";

import { useEffect } from "react";

export default function GlobalError({
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
    <html lang="ru">
      <body style={{
        margin: 0,
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "var(--gradient-soft)",
        fontFamily: "'Plus Jakarta Sans', -apple-system, sans-serif",
      }}>
        <div style={{ textAlign: "center", padding: 24 }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>💔</div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: "var(--text)", marginBottom: 12 }}>
            Критическая ошибка
          </h1>
          <p style={{ fontSize: 14, color: "var(--textSecondary)", marginBottom: 24 }}>
            Не удалось загрузить приложение. Попробуйте обновить страницу.
          </p>
          <button
            onClick={reset}
            style={{
              padding: "12px 28px", borderRadius: 12, fontSize: 14, fontWeight: 600,
              background: "var(--accent)", color: "white", border: "none", cursor: "pointer",
            }}
          >
            Обновить
          </button>
        </div>
      </body>
    </html>
  );
}
