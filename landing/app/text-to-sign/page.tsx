"use client";

import { useState } from "react";
import Link from "next/link";

const DEMO_WORDS = ["Привет", "Спасибо", "Помогите", "Вода", "Еда", "Семья", "Работа", "Любовь"];

export default function TextToSignPage() {
  const [text, setText] = useState("");
  const [isSigned, setIsSigned] = useState(false);

  function handleTranslate() {
    if (text.trim()) setIsSigned(true);
  }

  return (
    <div style={{ minHeight: "100vh", background: "var(--gradient-soft)" }}>
      <div style={{ padding: "120px 24px 60px", maxWidth: 800, margin: "0 auto" }}>
        <Link href="/" style={{ color: "var(--accent)", textDecoration: "none", fontSize: 14, display: "inline-block", marginBottom: 24 }}>
          ← На главную
        </Link>
        <div className="section-label">Функция</div>
        <h1 className="section-title">Текст → Жестовый язык</h1>
        <p className="section-subtitle" style={{ maxWidth: 600 }}>
          Введи текст — 3D-аватар покажет его на жестовом языке. Поддержка казахского, русского и английского.
        </p>

        {/* Input */}
        <div style={{ marginTop: 40, background: "var(--bgCard)", borderRadius: "var(--radius)", border: "1px solid var(--border)", padding: "32px 28px" }}>
          <textarea value={text} onChange={e => { setText(e.target.value); setIsSigned(false); }} placeholder="Введи текст для перевода на жестовый язык..." rows={3}
            style={{ width: "100%", padding: "14px 18px", borderRadius: "var(--radiusSm)", border: "1px solid var(--border)", background: "var(--bg)", color: "var(--text)", fontSize: 16, fontFamily: "'Plus Jakarta Sans', sans-serif", resize: "none", outline: "none", marginBottom: 16 }} />
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {DEMO_WORDS.map(w => (
                <button key={w} onClick={() => { setText(w); setIsSigned(false); }}
                  style={{ padding: "6px 14px", borderRadius: 50, border: "1px solid var(--border)", background: "var(--bg)", color: "var(--textSecondary)", fontSize: 12, cursor: "pointer", transition: "all 0.2s" }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = "var(--accent)"; e.currentTarget.style.color = "var(--accent)"; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--border)"; e.currentTarget.style.color = "var(--textSecondary)"; }}>
                  {w}
                </button>
              ))}
            </div>
            <button onClick={handleTranslate} className="btn btn-primary" style={{ padding: "12px 28px", fontSize: 13 }}>
              Перевести →
            </button>
          </div>
        </div>

        {/* Avatar display */}
        {isSigned && (
          <div style={{ marginTop: 24, background: "var(--bgCard)", borderRadius: "var(--radius)", border: "1px solid var(--border)", padding: "32px 28px", textAlign: "center" }}>
            <div style={{ width: 200, height: 200, borderRadius: "50%", background: "var(--bg)", border: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px" }}>
              <span style={{ fontSize: 100 }}>🧑‍🏫</span>
            </div>
            <div style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 24, fontWeight: 700, color: "var(--text)", marginBottom: 8 }}>
              &ldquo;{text}&rdquo;
            </div>
            <div style={{ fontSize: 14, color: "var(--textSecondary)" }}>
              3D-аватар показывает этот жест. В приложении доступна полная анимация.
            </div>
          </div>
        )}

        {/* Steps */}
        <div style={{ marginTop: 60 }}>
          <h2 style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 20, fontWeight: 600, color: "var(--text)", marginBottom: 20 }}>Как это работает</h2>
          <div className="text-to-sign-steps-grid">
            {[{ step: "01", title: "Ввод текста", desc: "Напиши слово или фразу на казахском, русском или английском языке." },
              { step: "02", title: "AI-анализ", desc: "ИИ разбирает текст на отдельные жесты и строит последовательность показа." },
              { step: "03", title: "3D-анимация", desc: "Аватар воспроизводит жесты с точной артикуляцией и мимикой." },
            ].map(d => (
              <div key={d.step} style={{ background: "var(--bgCard)", borderRadius: "var(--radius)", padding: "28px 24px", border: "1px solid var(--border)" }}>
                <div style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 32, fontWeight: 800, color: "var(--accent)", opacity: 0.3, marginBottom: 12 }}>{d.step}</div>
                <h3 style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 16, fontWeight: 600, color: "var(--text)", marginBottom: 8 }}>{d.title}</h3>
                <p style={{ fontSize: 14, color: "var(--textSecondary)", lineHeight: 1.7 }}>{d.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
