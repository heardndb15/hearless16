"use client";

import { useState } from "react";
import Link from "next/link";

export default function SOSPage() {
  const [pressing, setPressing] = useState(false);
  const [sent, setSent] = useState(false);

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)" }}>
      <div style={{ padding: "120px 24px 60px", maxWidth: 800, margin: "0 auto" }}>
        <Link href="/" style={{ color: "var(--accent)", textDecoration: "none", fontSize: 14, display: "inline-block", marginBottom: 24 }}>
          ← На главную
        </Link>
        <div className="section-label">Функция</div>
        <h1 className="section-title">Экстренная помощь</h1>
        <p className="section-subtitle" style={{ maxWidth: 600 }}>
          SOS-кнопка с геолокацией, экстренный чат и мгновенное уведомление родственников. Помощь в один клик.
        </p>

        {/* SOS demo */}
        <div style={{ marginTop: 40, textAlign: "center", background: "var(--bgCard)", borderRadius: "var(--radius)", border: "1px solid var(--border)", padding: "48px 32px" }}>
          {sent ? (
            <div>
              <div style={{ fontSize: 64, marginBottom: 16 }}>✅</div>
              <h2 style={{ fontFamily: "'Syne', sans-serif", fontSize: 22, fontWeight: 700, color: "var(--text)", marginBottom: 8 }}>Сигнал отправлен!</h2>
              <p style={{ fontSize: 14, color: "var(--textSecondary)", marginBottom: 20 }}>
                Геолокация передана родственникам. Ожидайте помощи.
              </p>
              <button onClick={() => setSent(false)} className="btn btn-outline" style={{ padding: "12px 28px", fontSize: 13 }}>
                Сбросить
              </button>
            </div>
          ) : (
            <>
              <div style={{ position: "relative", display: "inline-block", marginBottom: 24 }}>
                <div style={{ width: 140, height: 140, borderRadius: "50%", background: "red", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", transition: "all 0.3s ease", boxShadow: pressing ? "0 0 60px rgba(239,68,68,0.5)" : "0 0 20px rgba(239,68,68,0.2)", transform: pressing ? "scale(0.92)" : "scale(1)" }}
                  onMouseDown={() => setPressing(true)}
                  onMouseUp={() => { setPressing(false); setSent(true); }}
                  onMouseLeave={() => setPressing(false)}>
                  <span style={{ fontFamily: "'Syne', sans-serif", fontSize: 28, fontWeight: 800, color: "white" }}>SOS</span>
                </div>
              </div>
              <div style={{ fontFamily: "'Syne', sans-serif", fontSize: 15, fontWeight: 600, color: "var(--text)", marginBottom: 6 }}>Нажми и удерживай 2 секунды</div>
              <p style={{ fontSize: 13, color: "var(--textMuted)" }}>Сигнал с геолокацией будет отправлен твоим близким</p>
            </>
          )}
        </div>

        {/* Details grid */}
        <div style={{ marginTop: 40, display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 16 }}>
          {[{ icon: "📍", title: "Геолокация", desc: "При отправке SOS передаются точные координаты. Родственники видят твоё местоположение на карте." },
            { icon: "💬", title: "Экстренный чат", desc: "Встроенный чат с близкими. Можно написать сообщение, даже если не можешь говорить." },
            { icon: "👨‍👩‍👧", title: "Уведомление родственников", desc: "До 5 доверенных контактов получат мгновенное push-уведомление и SMS." },
            { icon: "🤫", title: "Тихий SOS", desc: "Режим скрытой помощи: без звука и вибрации, только вспышка экрана." },
          ].map(d => (
            <div key={d.title} style={{ background: "var(--bgCard)", borderRadius: "var(--radius)", padding: "24px 20px", border: "1px solid var(--border)" }}>
              <div style={{ fontSize: 28, marginBottom: 12 }}>{d.icon}</div>
              <h3 style={{ fontFamily: "'Syne', sans-serif", fontSize: 15, fontWeight: 600, color: "var(--text)", marginBottom: 8 }}>{d.title}</h3>
              <p style={{ fontSize: 14, color: "var(--textSecondary)", lineHeight: 1.7 }}>{d.desc}</p>
            </div>
          ))}
        </div>

        {/* Settings */}
        <div style={{ marginTop: 40, background: "var(--bgCard)", borderRadius: "var(--radius)", border: "1px solid var(--border)", padding: "28px 24px" }}>
          <h3 style={{ fontFamily: "'Syne', sans-serif", fontSize: 16, fontWeight: 600, color: "var(--text)", marginBottom: 16 }}>Настройки экстренной помощи</h3>
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {[{ label: "Автоотправка через", value: "5 секунд" },
              { label: "Повторная отправка", value: "Каждые 5 минут" },
              { label: "Доверенные контакты", value: "2 из 5" },
            ].map(s => (
              <div key={s.label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", borderBottom: "1px solid var(--border)" }}>
                <span style={{ fontSize: 14, color: "var(--textSecondary)" }}>{s.label}</span>
                <span style={{ fontFamily: "'Syne', sans-serif", fontSize: 14, fontWeight: 600, color: "var(--text)" }}>{s.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
