"use client";

import { useState } from "react";
import Link from "next/link";

// ── Hand SVG component ────────────────────────────────────────────────────────
type Fingers = {
  thumb?: boolean;
  index?: boolean;
  middle?: boolean;
  ring?: boolean;
  pinky?: boolean;
  shape?: "o" | "default";
};

function HandSign({ fingers, size = 120, color = "#0EA5E9" }: { fingers: Fingers; size?: number; color?: string }) {
  const { thumb, index, middle, ring, pinky, shape } = fingers;
  const gray = "#CBD5E1";
  const palm = "#E2E8F0";

  // Special О/кольцо shape
  if (shape === "o") {
    return (
      <svg width={size} height={size} viewBox="0 0 80 100" style={{ display: "block", margin: "0 auto" }}>
        <rect x="5" y="60" width="70" height="36" rx="12" fill={palm} stroke="#D1D5DB" strokeWidth="1" />
        {[7, 23, 39, 55].map((x, i) => (
          <rect key={i} x={x} y="44" width="14" height="18" rx="6" fill={gray} />
        ))}
        <circle cx="40" cy="34" r="17" fill="none" stroke={color} strokeWidth="6" strokeLinecap="round" />
        <path d="M 14 62 Q 8 46 22 34" fill="none" stroke={color} strokeWidth="5.5" strokeLinecap="round" />
      </svg>
    );
  }

  const cols = [
    { key: "pinky",  x: 7,  ext: !!pinky  },
    { key: "ring",   x: 23, ext: !!ring   },
    { key: "middle", x: 39, ext: !!middle },
    { key: "index",  x: 55, ext: !!index  },
  ];

  return (
    <svg width={size} height={size} viewBox="0 0 80 100" style={{ display: "block", margin: "0 auto" }}>
      {/* Fingers — drawn first so palm covers their base */}
      {cols.map(({ key, x, ext }) => (
        <rect
          key={key}
          x={x}
          y={ext ? 2 : 44}
          width={14}
          height={ext ? 58 : 17}
          rx={6}
          fill={ext ? color : gray}
        />
      ))}
      {/* Palm */}
      <rect x="5" y="58" width="70" height="38" rx="12" fill={palm} stroke="#D1D5DB" strokeWidth="1" />
      {/* Thumb — rotated from left edge of palm */}
      <rect
        x="-6"
        y={thumb ? -25 : -11}
        width="13"
        height={thumb ? 27 : 13}
        rx="5"
        fill={thumb ? color : gray}
        transform="translate(16, 72) rotate(-40)"
      />
    </svg>
  );
}

// ── Tutorial data ─────────────────────────────────────────────────────────────
const TUTORIALS = [
  {
    id: "alphabet",
    icon: "🖐️",
    title: "Дактильный алфавит",
    level: "Начальный",
    color: "#22C55E",
    desc: "Базовые буквы казахского жестового алфавита",
    gestures: [
      {
        letter: "A",
        name: "Буква А",
        emoji: "✊",
        fingers: { thumb: true, index: false, middle: false, ring: false, pinky: false },
        desc: "Кулак. Четыре пальца сжаты в кулак, большой палец отведён сбоку — не поверх остальных.",
        steps: [
          "Сожмите все четыре пальца в кулак плотно",
          "Отведите большой палец в сторону, не укладывая его поверх",
          "Держите кулак ровно, направив костяшки вперёд",
        ],
        tip: "Большой палец НЕ накрывает пальцы, а стоит сбоку.",
      },
      {
        letter: "B",
        name: "Буква В",
        emoji: "🖐️",
        fingers: { thumb: true, index: true, middle: true, ring: true, pinky: true },
        desc: "Открытая прямая ладонь, все пять пальцев вытянуты и плотно сомкнуты вместе.",
        steps: [
          "Полностью выпрямите все пять пальцев",
          "Сомкните пальцы так, чтобы между ними не было зазоров",
          "Направьте ладонь вперёд, пальцами вверх",
        ],
        tip: "Пальцы должны быть плотно прижаты друг к другу.",
      },
      {
        letter: "G",
        name: "Буква Г",
        emoji: "👈",
        fingers: { thumb: true, index: true, middle: false, ring: false, pinky: false },
        desc: "Указательный палец поднят вертикально вверх, большой — отведён горизонтально под 90°. Остальные сжаты.",
        steps: [
          "Сожмите кулак",
          "Поднимите указательный палец строго вертикально вверх",
          "Отведите большой палец горизонтально в сторону (угол ~90°)",
        ],
        tip: "Большой и указательный образуют форму буквы Г.",
      },
      {
        letter: "V",
        name: "Победа (V)",
        emoji: "✌️",
        fingers: { thumb: false, index: true, middle: true, ring: false, pinky: false },
        desc: "Указательный и средний пальцы подняты и разведены в стороны, безымянный и мизинец прижаты к ладони.",
        steps: [
          "Прижмите безымянный палец и мизинец к ладони",
          "Поднимите указательный и средний пальцы вверх",
          "Раздвиньте их широко в стороны — форма V",
        ],
        tip: "Пальцы должны быть разведены достаточно широко.",
      },
      {
        letter: "O",
        name: "Буква О",
        emoji: "👌",
        fingers: { shape: "o" as const },
        desc: "Пальцы округлены, кончики всех пальцев касаются кончика большого — получается форма кольца.",
        steps: [
          "Согните все четыре пальца в округлую форму",
          "Соедините их кончики с кончиком большого пальца",
          "Убедитесь, что получилось ровное кольцо — буква О",
        ],
        tip: "Кольцо должно быть симметричным, без «провалов».",
      },
    ],
  },
  {
    id: "numbers",
    icon: "✌️",
    title: "Цифры",
    level: "Начальный",
    color: "#22C55E",
    desc: "Числа от 0 до 5 в жестовом языке",
    gestures: [
      {
        letter: "O",
        name: "0 — Ноль",
        emoji: "👌",
        fingers: { shape: "o" as const },
        desc: "Форма кольца O — ноль. Те же пальцы, что и буква О.",
        steps: [
          "Округлите все четыре пальца",
          "Соедините кончики с большим пальцем в форму кольца",
        ],
        tip: "Жест идентичен букве О в алфавите.",
      },
      {
        letter: "G",
        name: "1 — Один",
        emoji: "☝️",
        fingers: { thumb: false, index: true, middle: false, ring: false, pinky: false },
        desc: "Один указательный палец поднят вверх — жест «один».",
        steps: [
          "Сожмите все пальцы в кулак",
          "Поднимите только указательный палец вертикально вверх",
        ],
        tip: "Один палец = одна единица.",
      },
      {
        letter: "V",
        name: "2 — Два",
        emoji: "✌️",
        fingers: { thumb: false, index: true, middle: true, ring: false, pinky: false },
        desc: "Два пальца вверх и врозь — жест «два».",
        steps: [
          "Поднимите указательный и средний пальцы",
          "Раздвиньте их — форма V",
        ],
        tip: "Два пальца = два.",
      },
    ],
  },
  {
    id: "greetings",
    icon: "👋",
    title: "Приветствия",
    level: "Начальный",
    color: "#22C55E",
    desc: "Основные жесты для знакомства и общения",
    gestures: [
      {
        letter: "B",
        name: "Привет",
        emoji: "👋",
        fingers: { thumb: true, index: true, middle: true, ring: true, pinky: true },
        desc: "Открытая ладонь, слегка покачайте кистью вправо-влево — «привет».",
        steps: [
          "Выпрямите все пальцы, раскройте ладонь",
          "Поднимите руку на уровень лица",
          "Покачайте кистью вправо-влево несколько раз",
        ],
        tip: "Движение — лёгкое, расслабленное, не резкое.",
      },
      {
        letter: "A",
        name: "Да",
        emoji: "✊",
        fingers: { thumb: false, index: false, middle: false, ring: false, pinky: false },
        desc: "Кулак слегка опускается и поднимается — жест согласия «да».",
        steps: [
          "Сожмите кулак",
          "Дважды опустите кулак вниз и поднимите обратно",
        ],
        tip: "Движение — небольшое, чёткое, как кивок рукой.",
      },
    ],
  },
  {
    id: "emotions",
    icon: "😊",
    title: "Эмоции",
    level: "Средний",
    color: "#0EA5E9",
    desc: "Радость, грусть и другие базовые чувства",
    gestures: [
      {
        letter: "V",
        name: "Хорошо",
        emoji: "👍",
        fingers: { thumb: true, index: false, middle: false, ring: false, pinky: false },
        desc: "Большой палец поднят вверх — «хорошо», «класс».",
        steps: [
          "Сожмите кулак",
          "Поднимите большой палец вверх",
          "Держите остальные пальцы плотно сжатыми",
        ],
        tip: "Классический жест одобрения, понятный во всём мире.",
      },
      {
        letter: "O",
        name: "Отлично",
        emoji: "👌",
        fingers: { shape: "o" as const },
        desc: "Большой и указательный соединены в кольцо — «ок», «отлично».",
        steps: [
          "Соедините кончики большого и указательного в кольцо",
          "Остальные три пальца выпрямите",
        ],
        tip: "Следите, чтобы кольцо было чётким, без зазора.",
      },
    ],
  },
];

const LEVEL_COLOR: Record<string, string> = {
  "Начальный": "#22C55E",
  "Средний": "#0EA5E9",
  "Продвинутый": "#8B5CF6",
};

export default function SignLanguagePage() {
  const [activeTutorialId, setActiveTutorialId] = useState(TUTORIALS[0].id);
  const [activeStep, setActiveStep] = useState(0);

  const tutorial = TUTORIALS.find(t => t.id === activeTutorialId)!;
  const gesture = tutorial.gestures[activeStep];

  function selectTutorial(id: string) {
    setActiveTutorialId(id);
    setActiveStep(0);
  }

  return (
    <div style={{ minHeight: "100vh" }}>
      <div style={{ padding: "120px 24px 60px", maxWidth: 1060, margin: "0 auto" }}>
        <Link href="/" style={{ color: "var(--accent)", textDecoration: "none", fontSize: 14, display: "inline-block", marginBottom: 24 }}>
          ← На главную
        </Link>
        <div className="section-label">Изучение</div>
        <h1 className="section-title">Жестовый язык</h1>
        <p className="section-subtitle" style={{ maxWidth: 580 }}>
          Пошаговые уроки: смотри эталон жеста, читай подсказки — и сразу проверяй с AI-камерой.
        </p>

        <div style={{ display: "grid", gridTemplateColumns: "240px 1fr", gap: 24, marginTop: 40, alignItems: "start" }}>

          {/* Sidebar */}
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: "var(--textMuted)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 6, paddingLeft: 4 }}>
              Разделы
            </div>
            {TUTORIALS.map(t => (
              <button
                key={t.id}
                onClick={() => selectTutorial(t.id)}
                style={{
                  display: "flex", alignItems: "center", gap: 12,
                  padding: "11px 14px", borderRadius: "var(--radiusSm)",
                  border: activeTutorialId === t.id ? `1.5px solid ${t.color}` : "1px solid var(--border)",
                  background: activeTutorialId === t.id ? "#F0F9FF" : "var(--bgCard)",
                  cursor: "pointer", textAlign: "left", transition: "all 0.2s",
                  width: "100%",
                }}
              >
                <span style={{ fontSize: 20 }}>{t.icon}</span>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: activeTutorialId === t.id ? "#0369A1" : "var(--text)", lineHeight: 1.3 }}>
                    {t.title}
                  </div>
                  <div style={{ fontSize: 11, color: LEVEL_COLOR[t.level], fontWeight: 600, marginTop: 2 }}>
                    {t.level} · {t.gestures.length} жест{t.gestures.length > 1 ? "а" : ""}
                  </div>
                </div>
              </button>
            ))}

            {/* Quick link to free practice */}
            <div style={{ marginTop: 16, padding: "14px", borderRadius: "var(--radiusSm)", border: "1px dashed #BAE6FD", background: "#F0F9FF", textAlign: "center" }}>
              <div style={{ fontSize: 20, marginBottom: 6 }}>🎥</div>
              <p style={{ fontSize: 12, color: "var(--textSecondary)", marginBottom: 10, lineHeight: 1.5 }}>
                Свободная тренировка всех жестов
              </p>
              <Link href="/sign-language/practice" style={{ fontSize: 12, fontWeight: 700, color: "var(--accent)", textDecoration: "none" }}>
                Открыть тренажёр →
              </Link>
            </div>
          </div>

          {/* Tutorial area */}
          <div>
            {/* ── Gesture card grid ── */}
            <div style={{
              display: "flex", gap: 10, marginBottom: 20,
              overflowX: "auto", paddingBottom: 6,
              scrollbarWidth: "thin",
            }}>
              {tutorial.gestures.map((g, i) => (
                <button
                  key={i}
                  onClick={() => setActiveStep(i)}
                  style={{
                    flexShrink: 0,
                    width: 88,
                    padding: "10px 6px 8px",
                    borderRadius: 14,
                    border: activeStep === i ? "2px solid #0EA5E9" : "1.5px solid #E2E8F0",
                    background: activeStep === i ? "#E0F2FE" : "white",
                    cursor: "pointer",
                    textAlign: "center",
                    transition: "all 0.18s",
                    boxShadow: activeStep === i ? "0 0 0 3px rgba(14,165,233,0.12)" : "none",
                  }}
                >
                  <HandSign
                    fingers={g.fingers}
                    size={58}
                    color={activeStep === i ? "#0EA5E9" : "#94A3B8"}
                  />
                  <div style={{
                    fontSize: 10, fontWeight: 700, marginTop: 6, lineHeight: 1.3,
                    color: activeStep === i ? "#0369A1" : "#475569",
                  }}>
                    {g.name}
                  </div>
                </button>
              ))}
            </div>

            {/* ── Main lesson card ── */}
            <div style={{
              background: "var(--bgCard)",
              border: "1px solid var(--border)",
              borderRadius: "var(--radiusXl)",
              padding: 32,
              boxShadow: "var(--shadow)",
            }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 36 }}>

                {/* Left: reference with SVG hand */}
                <div>
                  <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--accent)", marginBottom: 12 }}>
                    Эталон жеста
                  </div>
                  <div style={{
                    background: "linear-gradient(135deg, #F0F9FF 0%, #E0F2FE 100%)",
                    borderRadius: 16,
                    height: 200,
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    border: "1px solid #BAE6FD",
                    marginBottom: 16,
                    gap: 6,
                  }}>
                    <HandSign fingers={gesture.fingers} size={148} color="#0EA5E9" />
                    <span style={{ fontSize: 13, color: "#94A3B8" }}>{gesture.emoji} {gesture.name}</span>
                  </div>
                  <h2 style={{ fontSize: 20, fontWeight: 700, color: "var(--text)", marginBottom: 8 }}>
                    {gesture.name}
                  </h2>
                  <p style={{ fontSize: 14, color: "var(--textSecondary)", lineHeight: 1.7, marginBottom: 12 }}>
                    {gesture.desc}
                  </p>
                  {gesture.tip && (
                    <div style={{ background: "#FFF7ED", border: "1px solid #FED7AA", borderRadius: 10, padding: "10px 14px", display: "flex", gap: 8, alignItems: "flex-start" }}>
                      <span style={{ fontSize: 14, flexShrink: 0 }}>💡</span>
                      <p style={{ fontSize: 13, color: "#9A3412", lineHeight: 1.5, margin: 0 }}>{gesture.tip}</p>
                    </div>
                  )}
                </div>

                {/* Right: steps + camera CTA */}
                <div>
                  <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--accent)", marginBottom: 12 }}>
                    Как сделать
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 14, marginBottom: 28 }}>
                    {gesture.steps.map((step, i) => (
                      <div key={i} style={{ display: "flex", gap: 14, alignItems: "flex-start" }}>
                        <div style={{
                          width: 28, height: 28, borderRadius: "50%",
                          background: "#E0F2FE", border: "1.5px solid #BAE6FD",
                          display: "flex", alignItems: "center", justifyContent: "center",
                          fontSize: 12, fontWeight: 700, color: "#0369A1", flexShrink: 0,
                        }}>
                          {i + 1}
                        </div>
                        <p style={{ fontSize: 14, color: "var(--text)", lineHeight: 1.6, margin: 0, paddingTop: 4 }}>
                          {step}
                        </p>
                      </div>
                    ))}
                  </div>

                  {/* AI camera CTA */}
                  <div style={{
                    background: "linear-gradient(135deg, #E0F2FE 0%, #F0F9FF 100%)",
                    borderRadius: 16,
                    padding: "22px 20px",
                    border: "1px solid #BAE6FD",
                    textAlign: "center",
                  }}>
                    <div style={{ fontSize: 28, marginBottom: 8 }}>📷</div>
                    <p style={{ fontSize: 13, color: "var(--textSecondary)", marginBottom: 14, lineHeight: 1.6 }}>
                      Повтори жест перед камерой — AI проверит точность в реальном времени
                    </p>
                    <Link
                      href={`/sign-language/practice?gesture=${gesture.letter}`}
                      style={{
                        display: "inline-flex", alignItems: "center", gap: 8,
                        padding: "12px 24px", borderRadius: 12,
                        background: "#0EA5E9", color: "white",
                        fontWeight: 700, fontSize: 14, textDecoration: "none",
                      }}
                    >
                      🤖 Проверить с AI-камерой
                    </Link>
                  </div>
                </div>
              </div>

              {/* Navigation */}
              <div style={{
                display: "flex", justifyContent: "space-between", alignItems: "center",
                marginTop: 28, paddingTop: 20,
                borderTop: "1px solid var(--border)",
              }}>
                <button
                  onClick={() => setActiveStep(s => Math.max(0, s - 1))}
                  disabled={activeStep === 0}
                  style={{
                    padding: "10px 20px", borderRadius: 10,
                    border: "1px solid var(--border)", background: "white",
                    color: activeStep === 0 ? "var(--textMuted)" : "var(--text)",
                    cursor: activeStep === 0 ? "not-allowed" : "pointer",
                    fontWeight: 600, fontSize: 13, opacity: activeStep === 0 ? 0.45 : 1,
                  }}
                >
                  ← Предыдущий
                </button>
                <span style={{ fontSize: 13, color: "var(--textMuted)" }}>
                  {activeStep + 1} / {tutorial.gestures.length}
                </span>
                <button
                  onClick={() => setActiveStep(s => Math.min(tutorial.gestures.length - 1, s + 1))}
                  disabled={activeStep === tutorial.gestures.length - 1}
                  style={{
                    padding: "10px 20px", borderRadius: 10,
                    border: "1px solid var(--accent)", background: "#0EA5E9", color: "white",
                    cursor: activeStep === tutorial.gestures.length - 1 ? "not-allowed" : "pointer",
                    fontWeight: 600, fontSize: 13,
                    opacity: activeStep === tutorial.gestures.length - 1 ? 0.45 : 1,
                  }}
                >
                  Следующий →
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
