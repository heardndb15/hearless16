"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";

// 1. Демо-фразы для режима диктовки
const PHRASES: Record<string, string[]> = {
  "ҚАЗ": ["Сәлем, қаліңіз қалай?", "Менің атым Әлихан.", "Сізге көмек қажет пе?", "Рахмет! Сау болыңыз."],
  "РУС": ["Привет, как дела?", "Меня зовут Алихан.", "Вам нужна помощь?", "Спасибо! До свидания."],
  "ENG": ["Hello, how are you?", "My name is Alikhan.", "Do you need help?", "Thank you! Goodbye."],
};

// 2. Синхронизированные субтитры для демонстрационного видео
const DEMO_VIDEO_SUBTITLES = [
  { start: 0, end: 3, text: "Introducing Chromecast." },
  { start: 3, end: 6, text: "The easiest way to enjoy online video and music on your TV." },
  { start: 6, end: 9, text: "For just thirty-five dollars." },
  { start: 9, end: 12, text: "Plug it in, connect to Wi-Fi, and cast." },
  { start: 12, end: 15, text: "From your phone, tablet or laptop." },
  { start: 15, end: 18, text: "No remote required. Search, browse and control." },
  { start: 18, end: 21, text: "Enjoy your favorite web content on the big screen." }
];

export default function SubtitlesPage() {
  const [mode, setMode] = useState<"speech" | "video">("speech"); // "speech" (диктовка) или "video" (видео)
  const [lang, setLang] = useState("РУС");
  const [phraseIdx, setPhraseIdx] = useState(0);
  const [chars, setChars] = useState(0);
  const [inputText, setInputText] = useState("");
  const [history, setHistory] = useState<string[]>([]);
  const isDemo = inputText.trim() === "";

  // Настройки дисплея (совпадающие с мобильным клиентом)
  const [fontSize, setFontSize] = useState(24);
  const [textColor, setTextColor] = useState("#22d3ee");
  const [bgOpacity, setBgOpacity] = useState(0.85);
  const [alignment, setAlignment] = useState<"center" | "left">("center");

  // Состояния для плеера видео
  const [videoSrc, setVideoSrc] = useState("https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4");
  const [videoSubtitle, setVideoSubtitle] = useState("");
  const [isVideoPlaying, setIsVideoPlaying] = useState(false);
  const [isApiConnecting, setIsApiConnecting] = useState(false);
  const [audioSourceConnected, setAudioSourceConnected] = useState(false);
  const [frequencyData, setFrequencyData] = useState<number[]>([10, 15, 8, 12, 6]);

  // Референсы для видео и веб-аудио
  const videoElementRef = useRef<HTMLVideoElement | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sourceRef = useRef<MediaElementAudioSourceNode | null>(null);
  const animationRef = useRef<number | null>(null);

  // --- ЭФФЕКТ ДЛЯ РЕЖИМА ДИКТОВКИ ---
  useEffect(() => {
    if (mode !== "speech" || !isDemo) return;
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
  }, [chars, phraseIdx, lang, isDemo, mode]);

  const displayText = isDemo ? PHRASES[lang][phraseIdx].slice(0, chars) : inputText;

  // --- ИНИЦИАЛИЗАЦИЯ И ОБРАБОТКА ВЕБ-АУДИО ДЛЯ ВИЗУАЛИЗАЦИИ ---
  const initAudioAnalyser = (videoEl: HTMLVideoElement) => {
    if (audioSourceConnected || typeof window === "undefined") return;
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      const audioCtx = new AudioContextClass();
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 32; // Небольшой размер для 5 столбиков

      // Создаем источник звука из видео (требует crossOrigin="anonymous" для CORS источников)
      const source = audioCtx.createMediaElementSource(videoEl);
      source.connect(analyser);
      analyser.connect(audioCtx.destination);

      audioCtxRef.current = audioCtx;
      analyserRef.current = analyser;
      sourceRef.current = source;
      setAudioSourceConnected(true);
      
      // Запуск цикла анимации
      updateFrequencyBars(analyser);
    } catch (err) {
      console.warn("Web Audio API ограничено политикой CORS для этого видео. Запускается симуляция аудио-волны.", err);
      runAudioSimulation();
    }
  };

  // Цикл чтения частот с микрофона/аудиодорожки видео
  const updateFrequencyBars = (analyser: AnalyserNode) => {
    const dataArray = new Uint8Array(analyser.frequencyBinCount);
    const render = () => {
      analyser.getByteFrequencyData(dataArray);
      // Маппим данные частот в высоты столбиков (5 штук)
      const mapped = [
        Math.max(4, Math.round(dataArray[1] / 6)),
        Math.max(4, Math.round(dataArray[3] / 5)),
        Math.max(4, Math.round(dataArray[5] / 4)),
        Math.max(4, Math.round(dataArray[7] / 5)),
        Math.max(4, Math.round(dataArray[9] / 6)),
      ];
      setFrequencyData(mapped);
      animationRef.current = requestAnimationFrame(render);
    };
    render();
  };

  // Симуляция спектра при CORS ограничениях
  const runAudioSimulation = () => {
    const render = () => {
      if (videoElementRef.current && !videoElementRef.current.paused) {
        setFrequencyData([
          Math.max(4, Math.round(Math.random() * 20)),
          Math.max(4, Math.round(Math.random() * 24)),
          Math.max(4, Math.round(Math.random() * 28)),
          Math.max(4, Math.round(Math.random() * 22)),
          Math.max(4, Math.round(Math.random() * 16)),
        ]);
      } else {
        setFrequencyData([4, 4, 4, 4, 4]); // Сброс в тишину при паузе
      }
      animationRef.current = requestAnimationFrame(render);
    };
    render();
  };

  // --- ОБРАБОТКА ИЗМЕНЕНИЙ ВИДЕО ---
  const handleTimeUpdate = () => {
    const video = videoElementRef.current;
    if (!video) return;
    const time = video.currentTime;

    // Ищем соответствующий блок субтитров для демо-видео
    const activeSub = DEMO_VIDEO_SUBTITLES.find(
      sub => time >= sub.start && time <= sub.end
    );
    setVideoSubtitle(activeSub ? activeSub.text : "");
  };

  const handlePlayPause = (playing: boolean) => {
    setIsVideoPlaying(playing);
    if (playing && videoElementRef.current) {
      // Инициализируем аудиоанализатор при первом воспроизведении
      initAudioAnalyser(videoElementRef.current);
    }
  };

  // Загрузка пользовательского видео
  const handleVideoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setVideoSrc(url);
      setVideoSubtitle("");
      setAudioSourceConnected(false); // Сбрасываем анализатор для нового источника
    }
  };

  // Очистка при размонтировании
  useEffect(() => {
    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
      if (audioCtxRef.current) audioCtxRef.current.close();
    };
  }, []);

  const getBgColor = (opacity: number) => {
    if (opacity === 0) return "transparent";
    return `rgba(15, 23, 42, ${opacity})`;
  };

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)" }}>
      {/* Стили звуковой волны */}
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
          transition: height 0.08s ease;
        }
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

      <div style={{ padding: "120px 24px 60px", maxWidth: 960, margin: "0 auto" }}>
        <Link href="/" style={{ color: "var(--accent)", textDecoration: "none", fontSize: 14, display: "inline-flex", alignItems: "center", gap: 6, marginBottom: 24, fontWeight: 600, transition: "color 0.2s" }}>
          ← На главную
        </Link>
        <div className="section-label">Доступность медиа</div>
        <h1 className="section-title">AI-субтитры в реальном времени</h1>
        <p className="section-subtitle" style={{ maxWidth: 650, marginBottom: 40 }}>
          Транскрибируйте устную речь или смотрите видеоролики с мгновенной генерацией высококонтрастных субтитров.
        </p>

        {/* Переключатель режимов */}
        <div style={{ 
          display: "inline-flex", 
          background: "var(--bgCard)", 
          borderRadius: 30, 
          padding: 4, 
          border: "1px solid var(--border)",
          marginBottom: 32
        }}>
          <button 
            onClick={() => setMode("speech")}
            style={{
              padding: "10px 24px",
              borderRadius: 24,
              border: "none",
              fontSize: 13,
              fontWeight: 600,
              fontFamily: "'Syne', sans-serif",
              cursor: "pointer",
              background: mode === "speech" ? "var(--gradient)" : "transparent",
              color: mode === "speech" ? "#ffffff" : "var(--text)",
              transition: "all 0.2s ease"
            }}
          >
            🗣️ Режим диктовки
          </button>
          <button 
            onClick={() => setMode("video")}
            style={{
              padding: "10px 24px",
              borderRadius: 24,
              border: "none",
              fontSize: 13,
              fontWeight: 600,
              fontFamily: "'Syne', sans-serif",
              cursor: "pointer",
              background: mode === "video" ? "var(--gradient)" : "transparent",
              color: mode === "video" ? "#ffffff" : "var(--text)",
              transition: "all 0.2s ease"
            }}
          >
            🎬 Видео и Фильмы
          </button>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 280px", gap: 24, alignItems: "start" }} className="grid-cols-1 lg:grid-cols-[1fr_280px]">
          
          {/* ==========================================
              ЛЕВЫЙ БЛОК: ЭКРАН И ВВОД
             ========================================== */}
          <div>
            {mode === "speech" ? (
              // --- РЕЖИМ 1: ТРАНСКРИБАЦИЯ РЕЧИ (ДИКТОВКА) ---
              <div>
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
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
                    <span style={{ fontSize: 11, color: "rgba(255, 255, 255, 0.4)", fontWeight: 600, textTransform: "uppercase", letterSpacing: 1 }}>
                      {isDemo ? "Демо-поток речи" : "Пользовательский текст"}
                    </span>
                    <div className="soundwave-indicator">
                      {frequencyData.map((height, i) => (
                        <div key={i} className="sound-bar" style={{ height, background: textColor }} />
                      ))}
                    </div>
                  </div>

                  <div style={{ 
                    fontSize: `${fontSize}px`, 
                    fontWeight: 600, 
                    lineHeight: 1.6, 
                    textAlign: alignment,
                    minHeight: 90,
                    textShadow: bgOpacity === 0 ? "none" : "0 2px 10px rgba(0, 0, 0, 0.4)"
                  }}>
                    {isDemo ? (
                      <>
                        {PHRASES[lang].slice(0, phraseIdx).map((ph, idx) => (
                          <span key={idx} style={{ color: "rgba(255, 255, 255, 0.25)", marginRight: 10, fontWeight: 500 }}>
                            {ph}
                          </span>
                        ))}
                        <span style={{ color: textColor, fontWeight: 800 }}>
                          {PHRASES[lang][phraseIdx].slice(0, chars)}
                        </span>
                      </>
                    ) : (
                      <>
                        {(() => {
                          const sentences = inputText.match(/[^.!?\n]+[.!?\n]*/g) || [inputText];
                          const cleaned = sentences.map(s => s.trim()).filter(Boolean);
                          return cleaned.map((line, idx) => {
                            const isLast = idx === cleaned.length - 1;
                            return (
                              <span key={idx} style={{ color: isLast ? textColor : "rgba(255, 255, 255, 0.25)", fontWeight: isLast ? 800 : 500, marginRight: 10 }}>
                                {line}
                              </span>
                            );
                          });
                        })()}
                      </>
                    )}
                    <span style={{ display: "inline-block", width: 3, height: fontSize - 4, background: textColor, marginLeft: 6, verticalAlign: "middle", animation: "cursor-blink 0.8s step-end infinite" }} />
                  </div>

                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 20, paddingTop: 16, borderTop: "1px solid rgba(255, 255, 255, 0.06)" }}>
                    <span style={{ fontSize: 11, color: "rgba(255, 255, 255, 0.3)" }}>
                      Язык: {lang} • Размер: {fontSize}px
                    </span>
                    <span style={{ fontSize: 11, color: "rgba(255, 255, 255, 0.3)" }}>
                      Hearless v1.0
                    </span>
                  </div>
                </div>

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
            ) : (
              // --- РЕЖИМ 2: СУБТИТРЫ ДЛЯ ВИДЕО И КИНО ---
              <div>
                <div style={{ 
                  position: "relative", 
                  width: "100%", 
                  aspectRatio: "16/9",
                  borderRadius: "24px",
                  overflow: "hidden",
                  background: "#090d16",
                  border: "1px solid var(--border)",
                  boxShadow: "0 20px 50px rgba(0,0,0,0.3)",
                  marginBottom: 24
                }}>
                  {/* Плеер видео */}
                  <video 
                    ref={videoElementRef}
                    src={videoSrc}
                    crossOrigin="anonymous"
                    onTimeUpdate={handleTimeUpdate}
                    onPlay={() => handlePlayPause(true)}
                    onPause={() => handlePlayPause(false)}
                    controls
                    style={{ width: "100%", height: "100%", display: "block" }}
                  />

                  {/* Оверлей субтитров (динамически управляемый настройками) */}
                  {videoSubtitle && (
                    <div style={{ 
                      position: "absolute", 
                      bottom: "12%", 
                      left: "5%", 
                      right: "5%", 
                      pointerEvents: "none",
                      display: "flex",
                      justifyContent: alignment === "center" ? "center" : "flex-start",
                      zIndex: 15
                    }}>
                      <div style={{ 
                        background: getBgColor(bgOpacity), 
                        color: textColor,
                        fontSize: `${fontSize}px`, 
                        fontWeight: 700, 
                        lineHeight: 1.5, 
                        textAlign: alignment,
                        padding: "10px 24px",
                        borderRadius: 12,
                        maxWidth: "90%",
                        border: bgOpacity > 0 ? "1px solid rgba(255,255,255,0.08)" : "none",
                        backdropFilter: bgOpacity > 0 ? "blur(12px)" : "none",
                        textShadow: bgOpacity === 0 ? "0 2px 8px #000000" : "none",
                        boxShadow: bgOpacity > 0 ? "0 10px 25px rgba(0,0,0,0.3)" : "none",
                        fontFamily: "sans-serif"
                      }}>
                        {videoSubtitle}
                      </div>
                    </div>
                  )}
                </div>

                {/* Панель управления видео-режимом */}
                <div style={{ background: "var(--bgCard)", borderRadius: "20px", padding: "24px", border: "1px solid var(--border)", backdropFilter: "blur(16px)" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20, flexWrap: "wrap", gap: 12 }}>
                    <div>
                      <h3 style={{ fontSize: 15, fontWeight: 700, color: "var(--text)", marginBottom: 4 }}>Загрузите свое видео</h3>
                      <p style={{ fontSize: 12, color: "var(--textSecondary)" }}>Поддерживаются форматы MP4, WebM (файлы обрабатываются локально).</p>
                    </div>
                    {/* Кнопка загрузки */}
                    <label className="btn btn-outline" style={{ padding: "10px 20px", fontSize: 12, borderRadius: 10, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 8 }}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12"/>
                      </svg>
                      <span>Выбрать файл</span>
                      <input type="file" accept="video/*" onChange={handleVideoUpload} style={{ display: "none" }} />
                    </label>
                  </div>

                  <div style={{ display: "flex", gap: 12, borderTop: "1px solid var(--border)", paddingTop: 16, alignItems: "center", justifyContent: "space-between", flexWrap: "wrap" }}>
                    {/* Звуковая волна видео */}
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <span style={{ fontSize: 12, color: "var(--textSecondary)", fontWeight: 500 }}>Аудиодорожка:</span>
                      <div className="soundwave-indicator">
                        {frequencyData.map((height, i) => (
                          <div key={i} className="sound-bar" style={{ height, background: isVideoPlaying ? textColor : "var(--border)" }} />
                        ))}
                      </div>
                    </div>

                    {/* Выбор демо-видео */}
                    <button 
                      className="btn btn-primary" 
                      onClick={() => {
                        setVideoSrc("https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4");
                        setVideoSubtitle("");
                        setAudioSourceConnected(false);
                      }}
                      style={{ padding: "8px 16px", fontSize: 11, borderRadius: 8 }}
                    >
                      Сбросить к демо-видео
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* ==========================================
              ПРАВЫЙ БЛОК: НАСТРОЙКИ СТИЛЕЙ
             ========================================== */}
          <div style={{ background: "var(--bgCard)", borderRadius: "24px", padding: "24px", border: "1px solid var(--border)", backdropFilter: "blur(16px)" }}>
            <h3 style={{ fontFamily: "'Syne', sans-serif", fontSize: 16, fontWeight: 700, color: "var(--text)", marginBottom: 20 }}>
              Настройки субтитров
            </h3>

            {/* Выбор языка (только для диктовки) */}
            {mode === "speech" && (
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
            )}

            {/* Выбор движка распознавания (только для видео) */}
            {mode === "video" && (
              <div style={{ marginBottom: 20 }}>
                <label style={{ fontSize: 12, fontWeight: 600, color: "var(--textSecondary)", display: "block", marginBottom: 8 }}>Движок ИИ</label>
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  <button 
                    onClick={() => setIsApiConnecting(false)}
                    style={{ 
                      width: "100%", 
                      padding: "10px", 
                      borderRadius: 12, 
                      border: !isApiConnecting ? "none" : "1px solid var(--border)", 
                      background: !isApiConnecting ? "var(--gradient)" : "rgba(255,255,255,0.4)", 
                      color: !isApiConnecting ? "white" : "var(--textSecondary)", 
                      fontWeight: 600, 
                      fontSize: 12, 
                      cursor: "pointer", 
                      textAlign: "left", 
                      paddingLeft: 16 
                    }}
                  >
                    Имитация (Синхронно)
                  </button>
                  <button 
                    onClick={() => {
                      setIsApiConnecting(true);
                      alert("Подключение к FastAPI серверу субтитров /ws/transcribe. Для работы в реальном времени убедитесь, что бэкенд запущен.");
                    }}
                    style={{ 
                      width: "100%", 
                      padding: "10px", 
                      borderRadius: 12, 
                      border: isApiConnecting ? "none" : "1px solid var(--border)", 
                      background: isApiConnecting ? "var(--gradient)" : "rgba(255,255,255,0.4)", 
                      color: isApiConnecting ? "white" : "var(--textSecondary)", 
                      fontWeight: 600, 
                      fontSize: 12, 
                      cursor: "pointer", 
                      textAlign: "left", 
                      paddingLeft: 16 
                    }}
                  >
                    API Сервер Hearless
                  </button>
                </div>
              </div>
            )}

            {/* Размер шрифта */}
            <div style={{ marginBottom: 20 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: "var(--textSecondary)", display: "block", marginBottom: 8 }}>Размер текста</label>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 6 }}>
                {[18, 22, 24, 28].map((sz) => (
                  <button key={sz} onClick={() => setFontSize(sz)}
                    style={{ padding: "8px 0", borderRadius: 12, border: fontSize === sz ? "none" : "1px solid var(--border)", background: fontSize === sz ? "var(--gradient)" : "rgba(255,255,255,0.4)", color: fontSize === sz ? "white" : "var(--textSecondary)", fontWeight: 600, fontSize: 12, cursor: "pointer", transition: "all 0.2s" }}>
                    {sz}
                  </button>
                ))}
              </div>
            </div>

            {/* Цвет текста */}
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

            {/* Стиль фона */}
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

            {/* Выравнивание */}
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

        {/* История сессии диктовки */}
        {mode === "speech" && history.length > 0 && (
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

        {/* Описание технологий */}
        <div style={{ marginTop: 64, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 20 }}>
          {[
            { title: "Транскрипция видеофайлов", desc: "Загрузите файл или укажите прямую ссылку. Плеер автоматически наложит сгенерированные AI-субтитры." },
            { title: "Реактивная аудио-волна", desc: "Датчик спектра Web Audio API анализирует звуковые частоты видеоролика в реальном времени." },
            { title: "Гибкая адаптация под глаза", desc: "Меняйте контрастность, размер шрифта и цветовые палитры субтитров прямо во время просмотра фильма." },
            { title: "Прямой коннект к FastAPI", desc: "Переключитесь в режим API для интеграции с вашим Whisper WebSocket сервером." },
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
