"use client";

import { useState } from "react";
import Link from "next/link";

export default function AiTutorPage() {
  const [chat, setChat] = useState<{ role: string; text: string }[]>([
    { role: "ai", text: "Привет! Я AI-преподаватель жестового языка. С чего хочешь начать?" },
  ]);
  const [input, setInput] = useState("");

  function handleSend() {
    if (!input.trim()) return;
    setChat(c => [...c, { role: "user", text: input.trim() }, { role: "ai", text: "Отличный выбор! Давай разберём этот жест. Посмотри видео ниже и повтори." }]);
    setInput("");
  }

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)" }}>
      <div style={{ padding: "120px 24px 60px", maxWidth: 900, margin: "0 auto" }}>
        <Link href="/" style={{ color: "var(--accent)", textDecoration: "none", fontSize: 14, display: "inline-block", marginBottom: 24 }}>
          ← На главную
        </Link>
        <div className="section-label">Функция</div>
        <h1 className="section-title">AI-преподаватель жестового языка</h1>
        <p className="section-subtitle" style={{ maxWidth: 600 }}>
          Чат с ИИ, видеоуроки, анимации, тесты. Преподаватель подстраивается под твой уровень и отслеживает прогресс.
        </p>

        <div className="ai-tutor-grid">
          {/* Chat */}
          <div style={{ background: "var(--bgCard)", borderRadius: "var(--radius)", border: "1px solid var(--border)", display: "flex", flexDirection: "column", minHeight: 400 }}>
            <div style={{ padding: "20px 24px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ width: 36, height: 36, borderRadius: "50%", background: "var(--accent)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 }}>🤖</div>
              <div>
                <div style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 14, fontWeight: 600, color: "var(--text)" }}>AI-преподаватель</div>
                <div style={{ fontSize: 11, color: "var(--success)" }}>Онлайн</div>
              </div>
            </div>
            <div style={{ flex: 1, padding: 16, display: "flex", flexDirection: "column", gap: 10, overflow: "auto" }}>
              {chat.map((m, i) => (
                <div key={i} style={{ display: "flex", justifyContent: m.role === "user" ? "flex-end" : "flex-start" }}>
                  <div style={{ maxWidth: "80%", padding: "12px 16px", borderRadius: 14, background: m.role === "user" ? "var(--accent)" : "var(--bg)", color: m.role === "user" ? "white" : "var(--text)", fontSize: 14, lineHeight: 1.5, border: m.role === "user" ? "none" : "1px solid var(--border)" }}>
                    {m.text}
                  </div>
                </div>
              ))}
            </div>
            <div style={{ padding: "12px 16px", borderTop: "1px solid var(--border)", display: "flex", gap: 10 }}>
              <input value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === "Enter" && handleSend()} placeholder="Спроси у преподавателя..." style={{ flex: 1, padding: "10px 14px", borderRadius: "var(--radiusSm)", border: "1px solid var(--border)", background: "var(--bg)", color: "var(--text)", fontSize: 14, outline: "none" }} />
              <button onClick={handleSend} className="btn btn-primary" style={{ padding: "10px 20px", fontSize: 13 }}>→</button>
            </div>
          </div>

          {/* Video & Progress */}
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div style={{ background: "var(--bgCard)", borderRadius: "var(--radius)", border: "1px solid var(--border)", padding: "24px", textAlign: "center" }}>
              <div style={{ width: "100%", aspectRatio: "16/9", borderRadius: "var(--radiusSm)", background: "var(--bg)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 16, border: "1px solid var(--border)" }}>
                <span style={{ fontSize: 48 }}>🎬</span>
              </div>
              <h3 style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 15, fontWeight: 600, color: "var(--text)", marginBottom: 4 }}>Видеоурок: Жест «Привет»</h3>
              <p style={{ fontSize: 13, color: "var(--textMuted)" }}>0:42 · Жестоведение</p>
            </div>

            <div style={{ background: "var(--bgCard)", borderRadius: "var(--radius)", border: "1px solid var(--border)", padding: "24px" }}>
              <h3 style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 14, fontWeight: 600, color: "var(--text)", marginBottom: 12 }}>Прогресс</h3>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "var(--textSecondary)", marginBottom: 6 }}><span>Текущий курс</span><span>4/10 уроков</span></div>
              <div style={{ height: 6, borderRadius: 3, background: "var(--border)", overflow: "hidden", marginBottom: 16 }}>
                <div style={{ width: "40%", height: "100%", borderRadius: 3, background: "var(--accent)" }} />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 10 }}>
                {[{ label: "Точность", value: "68%" }, { label: "Тестов пройдено", value: "12" }].map(s => (
                  <div key={s.label} style={{ textAlign: "center", padding: "12px", borderRadius: "var(--radiusSm)", background: "var(--bg)" }}>
                    <div style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 20, fontWeight: 700, color: "var(--accent)" }}>{s.value}</div>
                    <div style={{ fontSize: 11, color: "var(--textMuted)" }}>{s.label}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
