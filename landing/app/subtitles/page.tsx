"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

const PHRASES: Record<string, string[]> = {
  "ҚАЗ": ["Сәлем, қаліңіз қалай?", "Менің атым Әлихан.", "Сізге көмек қажет пе?", "Рахмет! Сау болыңыз."],
  "РУС": ["Привет, как дела?", "Меня зовут Алихан.", "Вам нужна помощь?", "Спасибо! До свидания."],
  "ENG": ["Hello, how are you?", "My name is Alikhan.", "Do you need help?", "Thank you! Goodbye."],
};

export default function SubtitlesPage() {
  const [lang, setLang] = useState("РУС");
  const [phraseIdx, setPhraseIdx] = useState(0);
  const [chars, setChars] = useState(0);
  const [inputText, setInputText] = useState("");
  const [history, setHistory] = useState<string[]>([]);
  const isDemo = inputText.trim() === "";

  // Live customization options (matching the mobile client)
  const [fontSize, setFontSize] = useState(28); // 18, 24, 28, 36
  const [textColor, setTextColor] = useState("#22d3ee"); // White, Yellow, Cyan, Green
  const [bgOpacity, setBgOpacity] = useState(0.85); // 0.85, 0.5, 0 (transparent)
  const [alignment, setAlignment] = useState<"center" | "left">("center");

  useEffect(() => {
    if (!isDemo) return;
    const current = PHRASES[lang][phraseIdx];
    if (chars < current.length) {
      const t = setTimeout(() => setChars(c => c + 1), 45);
      return () => clearTimeout(t);
    }
    const p = setTimeout(() => {
      setPhraseIdx(i => (i + 1) % PHRASES[lang].length);
      setChars(0);
    }, 2800);
    return () => clearTimeout(p);
  }, [chars, phraseIdx, lang, isDemo]);

  const displayText = isDemo ? PHRASES[lang][phraseIdx].slice(0, chars) : inputText;

  const getBgColor = (opacity: number) => {
    if (opacity === 0) return "transparent";
    return `rgba(15, 23, 42, ${opacity})`; // Deep slate dark glass background
  };

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)" }}>
      {/* Soundwave Keyframe Animations */}
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes soundBar {
          0%, 100% { height: 4px; }
          50% { height: 24px; }
        }
        .soundwave-indicator {
          display: flex;
          align-items: center;
          gap: 3px;
          height: 30px;
        }
        .sound-bar {
          width: 3px;
          border-radius: 3px;
          animation: soundBar 1s ease-in-out infinite;
        }
        .sound-bar:nth-child(1) { animation-delay: 0.1s; height: 10px; }
        .sound-bar:nth-child(2) { animation-delay: 0.2s; height: 18px; }
        .sound-bar:nth-child(3) { animation-delay: 0.3s; height: 24px; }
        .sound-bar:nth-child(4) { animation-delay: 0.4s; height: 15px; }
        .sound-bar:nth-child(5) { animation-delay: 0.5s; height: 8px; }

        @keyframes cursor-blink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0; }
        }
        .glass-display {
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .glass-display:hover {
          transform: translateY(-2px);
        }
      `}} />

      <div style={{ padding: "120px 24px 60px", maxWidth: 900, margin: "0 auto" }}>
        <Link href="/" style={{ color: "var(--accent)", textDecoration: "none", fontSize: 14, display: "inline-flex", alignItems: "center", gap: 6, marginBottom: 24, fontWeight: 500, transition: "color 0.2s" }} className="hover:text-sky-600">
          ← На главную
        </Link>
        <div className="section-label">Демонстрация</div>
        <h1 className="section-title">AI-субтитры в реальном времени</h1>
        <p className="section-subtitle" style={{ maxWidth: 650, marginBottom: 40 }}>
          Испытайте наши новые высококонтрастные субтитры. Настройте внешний вид дисплея прямо здесь под свои нужды.
        </p>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 280px", gap: 24, alignItems: "start" }} className="grid-cols-1 lg:grid-cols-[1fr_280px]">
          {/* Main Subtitles Container & Controls */}
          <div>
            {/* Display */}
            <div className="glass-display" style={{ 
              background: getBgColor(bgOpacity), 
              borderRadius: "24px", 
              padding: "36px 32px", 
              border: bgOpacity > 0 ? "1px solid rgba(255, 255, 255, 0.1)" : "1px dashed var(--border)", 
              minHeight: 220, 
              marginBottom: 24,
              boxShadow: bgOpacity > 0 ? "0 20px 40px rgba(15, 23, 42, 0.15)" : "none",
              position: "relative",
              overflow: "hidden",
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
              backdropFilter: bgOpacity > 0 ? "blur(20px)" : "none"
            }}>
              {/* Top Bar inside Display */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
                <span style={{ fontSize: 11, color: "rgba(255, 255, 255, 0.4)", fontWeight: 600, textTransform: "uppercase", letterSpacing: 1 }}>
                  {isDemo ? "Демо-поток речи" : "Пользовательский текст"}
                </span>
                {/* Live soundwave representation */}
                <div className="soundwave-indicator">
                  <div className="sound-bar" style={{ background: textColor }} />
                  <div className="sound-bar" style={{ background: textColor }} />
                  <div className="sound-bar" style={{ background: textColor }} />
                  <div className="sound-bar" style={{ background: textColor }} />
                  <div className="sound-bar" style={{ background: textColor }} />
                </div>
              </div>

              {/* Subtitles text */}
              {isDemo ? (
                <div style={{ 
                  fontSize: `${fontSize}px`, 
                  fontWeight: 600, 
                  lineHeight: 1.6, 
                  textAlign: alignment,
                  minHeight: 90,
                  textShadow: bgOpacity === 0 ? "none" : "0 2px 10px rgba(0, 0, 0, 0.4)"
                }}>
                  {/* Previous phrases faded */}
                  {PHRASES[lang].slice(0, phraseIdx).map((ph, idx) => (
                    <span key={idx} style={{ color: "rgba(255, 255, 255, 0.25)", marginRight: 10, fontWeight: 500 }}>
                      {ph}
                    </span>
                  ))}
                  {/* Current phrase highlighted */}
                  <span style={{ color: textColor, fontWeight: 800 }}>
                    {PHRASES[lang][phraseIdx].slice(0, chars)}
                  </span>
                  <span style={{ display: "inline-block", width: 3, height: fontSize - 4, background: textColor, marginLeft: 6, verticalAlign: "middle", animation: "cursor-blink 0.8s step-end infinite" }} />
                </div>
              ) : (
                <div style={{ 
                  fontSize: `${fontSize}px`, 
                  fontWeight: 600, 
                  lineHeight: 1.6, 
                  textAlign: alignment,
                  minHeight: 90,
                  textShadow: bgOpacity === 0 ? "none" : "0 2px 10px rgba(0, 0, 0, 0.4)"
                }}>
                  {(() => {
                    const sentences = inputText.match(/[^.!?\n]+[.!?\n]*/g) || [inputText];
                    const cleaned = sentences.map(s => s.trim()).filter(Boolean);
                    return cleaned.map((line, idx) => {
                      const isLast = idx === cleaned.length - 1;
                      return (
                        <span
                          key={idx}
                          style={{
                            color: isLast ? textColor : "rgba(255, 255, 255, 0.25)",
                            fontWeight: isLast ? 800 : 500,
                            marginRight: 10
                          }}
                        >
                          {line}
                        </span>
                      );
                    });
                  })()}
                  <span style={{ display: "inline-block", width: 3, height: fontSize - 4, background: textColor, marginLeft: 6, verticalAlign: "middle", animation: "cursor-blink 0.8s step-end infinite" }} />
                </div>
              )}

              {/* Bottom details */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 20, paddingTop: 16, borderTop: "1px solid rgba(255, 255, 255, 0.06)" }}>
                <span style={{ fontSize: 11, color: "rgba(255, 255, 255, 0.3)" }}>
                  Язык: {lang} • Размер: {fontSize}px
                </span>
                <span style={{ fontSize: 11, color: "rgba(255, 255, 255, 0.3)" }}>
                  Hearless v1.0
                </span>
              </div>
            </div>

            {/* Input Form */}
            <div style={{ background: "var(--bgCard)", borderRadius: "20px", padding: "24px", border: "1px solid var(--border)", backdropFilter: "blur(16px)" }}>
              <textarea value={inputText} onChange={e => setInputText(e.target.value)} placeholder="Введите текст, чтобы сымитировать речь на лету..." rows={2}
                style={{ width: "100%", padding: "16px 20px", borderRadius: "14px", border: "1px solid var(--border)", background: "rgba(255,255,255,0.6)", color: "var(--text)", fontSize: 15, fontFamily: "'DM Sans', sans-serif", resize: "none", outline: "none", marginBottom: 16, transition: "border 0.2s" }}
                className="focus:border-sky-500" />

              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
                <button onClick={() => { if (inputText.trim()) { setHistory(h => [...h, inputText.trim()]); setInputText(""); } }}
                  className="btn btn-primary" style={{ padding: "12px 28px", fontSize: 13, borderRadius: 50 }}>
                  Добавить в историю →
                </button>
                <div style={{ display: "flex", gap: 8 }}>
                  <span style={{ padding: "6px 14px", borderRadius: 30, background: "rgba(2,132,199,0.08)", color: "var(--accent)", fontSize: 11, fontWeight: 600 }}>{lang}</span>
                  <span style={{ padding: "6px 14px", borderRadius: 30, background: "rgba(56,189,248,0.08)", color: "var(--textSecondary)", fontSize: 11, fontWeight: 600 }}>Whisper Engine</span>
                </div>
              </div>
            </div>
          </div>

          {/* Right Panel: Customization settings (Match mobile) */}
          <div style={{ background: "var(--bgCard)", borderRadius: "24px", padding: "24px", border: "1px solid var(--border)", backdropFilter: "blur(16px)" }}>
            <h3 style={{ fontFamily: "'Syne', sans-serif", fontSize: 16, fontWeight: 700, color: "var(--text)", marginBottom: 20 }}>
              Настройки дисплея
            </h3>

            {/* Language switch */}
            <div style={{ marginBottom: 20 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: "var(--textSecondary)", display: "block", marginBottom: 8 }}>Язык источника</label>
              <div style={{ display: "flex", gap: 6 }}>
                {["ҚАЗ", "РУС", "ENG"].map(l => (
                  <button key={l} onClick={() => { setLang(l); setPhraseIdx(0); setChars(0); }}
                    style={{ flex: 1, padding: "8px 0", borderRadius: 12, border: lang === l ? "none" : "1px solid var(--border)", background: lang === l ? "var(--gradient)" : "rgba(255,255,255,0.4)", color: lang === l ? "white" : "var(--textSecondary)", fontFamily: "'Syne', sans-serif", fontWeight: 600, fontSize: 12, cursor: "pointer", transition: "all 0.2s" }}>
                    {l}
                  </button>
                ))}
              </div>
            </div>

            {/* Font Size */}
            <div style={{ marginBottom: 20 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: "var(--textSecondary)", display: "block", marginBottom: 8 }}>Размер текста</label>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 6 }}>
                {[18, 24, 28, 36].map((sz) => (
                  <button key={sz} onClick={() => setFontSize(sz)}
                    style={{ padding: "8px 0", borderRadius: 12, border: fontSize === sz ? "none" : "1px solid var(--border)", background: fontSize === sz ? "var(--gradient)" : "rgba(255,255,255,0.4)", color: fontSize === sz ? "white" : "var(--textSecondary)", fontWeight: 600, fontSize: 12, cursor: "pointer", transition: "all 0.2s" }}>
                    {sz}
                  </button>
                ))}
              </div>
            </div>

            {/* Text Color */}
            <div style={{ marginBottom: 20 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: "var(--textSecondary)", display: "block", marginBottom: 8 }}>Цвет субтитров</label>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 6 }}>
                {[
                  { code: "#ffffff", name: "Белый" },
                  { code: "#fdeb47", name: "Желтый" },
                  { code: "#22d3ee", name: "Циан" },
                  { code: "#4ade80", name: "Зеленый" }
                ].map((c) => (
                  <button key={c.code} onClick={() => setTextColor(c.code)}
                    style={{ padding: "8px 0", borderRadius: 12, border: textColor === c.code ? "2px solid var(--accent)" : "1px solid var(--border)", background: "rgba(15, 23, 42, 0.95)", color: c.code, fontWeight: 600, fontSize: 12, cursor: "pointer", transition: "all 0.2s" }}>
                    {c.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Background Style */}
            <div style={{ marginBottom: 20 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: "var(--textSecondary)", display: "block", marginBottom: 8 }}>Задний фон дисплея</label>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {[
                  { opacity: 0.85, label: "Сплошной темный" },
                  { opacity: 0.5, label: "Полупрозрачный" },
                  { opacity: 0, label: "Без фона" }
                ].map((bg) => (
                  <button key={bg.opacity} onClick={() => setBgOpacity(bg.opacity)}
                    style={{ width: "100%", padding: "10px", borderRadius: 12, border: bgOpacity === bg.opacity ? "none" : "1px solid var(--border)", background: bgOpacity === bg.opacity ? "var(--gradient)" : "rgba(255,255,255,0.4)", color: bgOpacity === bg.opacity ? "white" : "var(--textSecondary)", fontWeight: 600, fontSize: 12, cursor: "pointer", transition: "all 0.2s", textAlign: "left", paddingLeft: 16 }}>
                    {bg.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Alignment */}
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: "var(--textSecondary)", display: "block", marginBottom: 8 }}>Выравнивание текста</label>
              <div style={{ display: "flex", gap: 6 }}>
                {[
                  { key: "center", label: "Центр" },
                  { key: "left", label: "По левому краю" }
                ].map((align) => (
                  <button key={align.key} onClick={() => setAlignment(align.key as any)}
                    style={{ flex: 1, padding: "8px 0", borderRadius: 12, border: alignment === align.key ? "none" : "1px solid var(--border)", background: alignment === align.key ? "var(--gradient)" : "rgba(255,255,255,0.4)", color: alignment === align.key ? "white" : "var(--textSecondary)", fontWeight: 600, fontSize: 12, cursor: "pointer", transition: "all 0.2s" }}>
                    {align.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* History */}
        {history.length > 0 && (
          <div style={{ marginTop: 40 }}>
            <h3 style={{ fontFamily: "'Syne', sans-serif", fontSize: 16, fontWeight: 700, color: "var(--text)", marginBottom: 16 }}>История сессии</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {history.map((h, i) => (
                <div key={i} style={{ padding: "16px 20px", borderRadius: "14px", background: "var(--bgCard)", border: "1px solid var(--border)", fontSize: 14, color: "var(--text)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span>{h}</span>
                  <span style={{ fontSize: 11, color: "var(--textSecondary)" }}>{new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Details Grid */}
        <div style={{ marginTop: 64, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 20 }}>
          {[
            { title: "Автоопределение языка", desc: "Умный алгоритм Whisper распознает казахский, русский или английский язык на лету." },
            { title: "Гибкая настройка UI", desc: "Настройте размер шрифта, контрастный цвет текста и уровень прозрачности под свои глаза." },
            { title: "Минимальный пинг", desc: "Стриминг аудио через веб-сокеты гарантирует минимальное время ожидания субтитров." },
            { title: "История сессии", desc: "Все реплики сохраняются в истории текущей сессии с временными метками." },
          ].map(d => (
            <div key={d.title} style={{ background: "var(--bgCard)", borderRadius: "20px", padding: "28px 24px", border: "1px solid var(--border)", transition: "transform 0.2s" }} className="hover:-translate-y-1">
              <h3 style={{ fontFamily: "'Syne', sans-serif", fontSize: 15, fontWeight: 750, color: "var(--text)", marginBottom: 8 }}>{d.title}</h3>
              <p style={{ fontSize: 13, color: "var(--textSecondary)", lineHeight: 1.6 }}>{d.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
