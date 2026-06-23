"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";

interface SubtitleSegment {
  start: number;
  end: number;
  text: string;
}

export default function TranscriptPage() {
  // Состояния синхронизации
  const [mode, setMode] = useState<"speech" | "video">("speech");
  const [lang, setLang] = useState("РУС");
  const [phraseIdx, setPhraseIdx] = useState(0);
  const [chars, setChars] = useState(0);
  const [inputText, setInputText] = useState("");
  const [history, setHistory] = useState<string[]>([]);
  const [videoSubtitle, setVideoSubtitle] = useState("");
  const [currentTime, setCurrentTime] = useState(0);
  const [isVideoPlaying, setIsVideoPlaying] = useState(false);
  const [subtitlesList, setSubtitlesList] = useState<SubtitleSegment[]>([]);
  const [displayText, setDisplayText] = useState("");
  
  // Состояния AI
  const [aiSummary, setAiSummary] = useState("");
  const [aiResponse, setAiResponse] = useState("");

  // Состояние соединения
  const [isConnected, setIsConnected] = useState(false);

  // Кастомизация интерфейса чтения
  const [themeMode, setThemeMode] = useState<"dark" | "light" | "contrast">("dark");
  const [fontSize, setFontSize] = useState(24);
  const [lineHeight, setLineHeight] = useState(1.6);
  const [copied, setCopied] = useState(false);

  const channelRef = useRef<BroadcastChannel | null>(null);
  const lastActiveRef = useRef<number>(Date.now());

  // Хелперы форматирования времени
  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  const formatSrtTime = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    const ms = Math.floor((seconds % 1) * 1000);
    return `${hrs.toString().padStart(2, "0")}:${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")},${ms.toString().padStart(3, "0")}`;
  };

  // Настройка BroadcastChannel
  useEffect(() => {
    if (typeof window === "undefined") return;

    const channel = new BroadcastChannel("hearless-subtitles");
    channelRef.current = channel;

    // Запрос синхронизации при монтировании
    channel.postMessage({ type: "request-sync" });

    const handleMessage = (event: MessageEvent) => {
      const { type, payload } = event.data;
      lastActiveRef.current = Date.now();
      setIsConnected(true);

      if (type === "sync-state") {
        if (payload.mode) setMode(payload.mode);
        if (payload.lang) setLang(payload.lang);
        if (payload.phraseIdx !== undefined) setPhraseIdx(payload.phraseIdx);
        if (payload.chars !== undefined) setChars(payload.chars);
        if (payload.inputText !== undefined) setInputText(payload.inputText);
        if (payload.history !== undefined) setHistory(payload.history);
        if (payload.fontSize !== undefined) setFontSize(payload.fontSize);
        if (payload.textColor !== undefined) {
          // Не перезаписываем цвет если пользователь читает в своей теме, но можем сохранить
        }
        if (payload.videoSubtitle !== undefined) setVideoSubtitle(payload.videoSubtitle);
        if (payload.currentTime !== undefined) setCurrentTime(payload.currentTime);
        if (payload.isVideoPlaying !== undefined) setIsVideoPlaying(payload.isVideoPlaying);
        if (payload.subtitlesList !== undefined) setSubtitlesList(payload.subtitlesList);
        if (payload.displayText !== undefined) setDisplayText(payload.displayText);
        if (payload.aiSummary !== undefined) setAiSummary(payload.aiSummary);
        if (payload.aiResponse !== undefined) setAiResponse(payload.aiResponse);
      } else if (type === "time-update") {
        if (payload.currentTime !== undefined) setCurrentTime(payload.currentTime);
        if (payload.videoSubtitle !== undefined) setVideoSubtitle(payload.videoSubtitle);
      }
    };

    channel.addEventListener("message", handleMessage);

    // Периодический опрос активности
    const pingInterval = setInterval(() => {
      channel.postMessage({ type: "request-sync" });
    }, 2500);

    return () => {
      channel.removeEventListener("message", handleMessage);
      channel.close();
      clearInterval(pingInterval);
    };
  }, []);

  // Отслеживание отключения
  useEffect(() => {
    const checkTimer = setInterval(() => {
      if (Date.now() - lastActiveRef.current > 6000) {
        setIsConnected(false);
      }
    }, 2000);
    return () => clearInterval(checkTimer);
  }, []);

  // Перемотка на таймлайн плеера
  const seekVideo = (time: number) => {
    if (channelRef.current) {
      channelRef.current.postMessage({
        type: "seek-video",
        payload: { time }
      });
    }
  };

  // Определение активного индекса видео субтитров
  const activeSubIndex = subtitlesList.findIndex(
    (sub) => currentTime >= sub.start && currentTime <= sub.end
  );

  // Автоматический скролл к активному субтитру
  useEffect(() => {
    if (mode === "video" && activeSubIndex !== -1) {
      const activeEl = document.getElementById(`sub-line-${activeSubIndex}`);
      if (activeEl) {
        activeEl.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    }
  }, [activeSubIndex, mode]);

  // Стилизация тем
  const getThemeStyles = () => {
    switch (themeMode) {
      case "light":
        return {
          bg: "#f8fafc",
          text: "#0f172a",
          cardBg: "#ffffff",
          border: "#e2e8f0",
          accent: "#0284c7",
          activeBg: "rgba(2, 132, 199, 0.1)",
          textSecondary: "#475569"
        };
      case "contrast":
        return {
          bg: "#000000",
          text: "#fdeb47",
          cardBg: "#111111",
          border: "#333333",
          accent: "#fdeb47",
          activeBg: "rgba(253, 235, 71, 0.2)",
          textSecondary: "#eab308"
        };
      case "dark":
      default:
        return {
          bg: "#090d16",
          text: "#f8fafc",
          cardBg: "rgba(15, 23, 42, 0.6)",
          border: "rgba(56, 189, 248, 0.15)",
          accent: "#22d3ee",
          activeBg: "rgba(34, 211, 238, 0.12)",
          textSecondary: "#0e7490"
        };
    }
  };

  const theme = getThemeStyles();

  // Логика экспорта
  const getFullText = () => {
    if (mode === "speech") {
      return [...history, displayText].filter(Boolean).join("\n");
    } else {
      return subtitlesList
        .map((s) => `[${formatTime(s.start)} - ${formatTime(s.end)}] ${s.text}`)
        .join("\n");
    }
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(getFullText());
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Не удалось скопировать: ", err);
    }
  };

  const downloadTxt = () => {
    const element = document.createElement("a");
    const file = new Blob([getFullText()], { type: "text/plain;charset=utf-8" });
    element.href = URL.createObjectURL(file);
    element.download = `hearless-transcript-${mode}-${Date.now()}.txt`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  const downloadSrt = () => {
    if (mode !== "video" || subtitlesList.length === 0) return;
    let srtContent = "";
    subtitlesList.forEach((sub, i) => {
      srtContent += `${i + 1}\n`;
      srtContent += `${formatSrtTime(sub.start)} --> ${formatSrtTime(sub.end)}\n`;
      srtContent += `${sub.text}\n\n`;
    });
    const element = document.createElement("a");
    const file = new Blob([srtContent], { type: "text/plain;charset=utf-8" });
    element.href = URL.createObjectURL(file);
    element.download = `hearless-subtitles-${Date.now()}.srt`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        backgroundColor: theme.bg,
        color: theme.text,
        transition: "all 0.3s ease",
        fontFamily: "'DM Sans', sans-serif",
        padding: "40px 24px"
      }}
    >
      <div style={{ maxWidth: 840, margin: "0 auto" }}>
        
        {/* Шапка страницы */}
        <header
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            borderBottom: `1px solid ${theme.border}`,
            paddingBottom: 20,
            marginBottom: 30
          }}
        >
          <div>
            <h1
              style={{
                fontFamily: "'Syne', sans-serif",
                fontSize: 24,
                fontWeight: 800,
                color: theme.accent,
                display: "flex",
                alignItems: "center",
                gap: 8
              }}
            >
              Hearless Transcript
              <span
                style={{
                  fontSize: 11,
                  padding: "4px 8px",
                  borderRadius: 12,
                  background: isConnected ? "rgba(34, 197, 94, 0.15)" : "rgba(148, 163, 184, 0.15)",
                  color: isConnected ? "#22c55e" : "#94a3b8",
                  fontWeight: 600
                }}
              >
                {isConnected ? "🟢 В сети" : "⚪ Ожидание плеера"}
              </span>
            </h1>
            <p style={{ fontSize: 13, color: theme.textSecondary, marginTop: 4 }}>
              {mode === "speech" ? "Режим диктовки (Текст)" : "Режим видео (Интерактивный таймлайн)"}
            </p>
          </div>
          <button
            onClick={() => window.close()}
            style={{
              background: "transparent",
              border: `1px solid ${theme.border}`,
              color: theme.text,
              padding: "8px 16px",
              borderRadius: 30,
              cursor: "pointer",
              fontSize: 12,
              fontWeight: 600,
              transition: "all 0.2s"
            }}
            onMouseOver={(e) => (e.currentTarget.style.borderColor = theme.accent)}
            onMouseOut={(e) => (e.currentTarget.style.borderColor = theme.border)}
          >
            Закрыть вкладку
          </button>
        </header>

        {/* Панель настроек чтения */}
        <section
          style={{
            background: theme.cardBg,
            border: `1px solid ${theme.border}`,
            borderRadius: 16,
            padding: 20,
            marginBottom: 24,
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
            gap: 16
          }}
        >
          {/* Выбор Темы */}
          <div>
            <label style={{ fontSize: 11, fontWeight: 700, color: theme.textSecondary, display: "block", marginBottom: 6, textTransform: "uppercase" }}>Тема чтения</label>
            <div style={{ display: "flex", gap: 6 }}>
              {(["dark", "light", "contrast"] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setThemeMode(t)}
                  style={{
                    flex: 1,
                    padding: "6px 0",
                    borderRadius: 8,
                    border: themeMode === t ? `2px solid ${theme.accent}` : `1px solid ${theme.border}`,
                    background: t === "dark" ? "#090d16" : t === "light" ? "#f1f5f9" : "#000000",
                    color: t === "dark" ? "#ffffff" : t === "light" ? "#0f172a" : "#fdeb47",
                    fontSize: 10,
                    fontWeight: 700,
                    cursor: "pointer"
                  }}
                >
                  {t === "dark" ? "Темная" : t === "light" ? "Светлая" : "Контраст"}
                </button>
              ))}
            </div>
          </div>

          {/* Размер шрифта */}
          <div>
            <label style={{ fontSize: 11, fontWeight: 700, color: theme.textSecondary, display: "block", marginBottom: 6, textTransform: "uppercase" }}>Размер текста</label>
            <div style={{ display: "flex", gap: 6 }}>
              {[18, 24, 30, 36].map((sz) => (
                <button
                  key={sz}
                  onClick={() => setFontSize(sz)}
                  style={{
                    flex: 1,
                    padding: "6px 0",
                    borderRadius: 8,
                    border: fontSize === sz ? `2px solid ${theme.accent}` : `1px solid ${theme.border}`,
                    background: "transparent",
                    color: theme.text,
                    fontSize: 11,
                    fontWeight: 700,
                    cursor: "pointer"
                  }}
                >
                  {sz}px
                </button>
              ))}
            </div>
          </div>

          {/* Интервал */}
          <div>
            <label style={{ fontSize: 11, fontWeight: 700, color: theme.textSecondary, display: "block", marginBottom: 6, textTransform: "uppercase" }}>Интервал</label>
            <div style={{ display: "flex", gap: 6 }}>
              {[1.4, 1.8, 2.2].map((lh) => (
                <button
                  key={lh}
                  onClick={() => setLineHeight(lh)}
                  style={{
                    flex: 1,
                    padding: "6px 0",
                    borderRadius: 8,
                    border: lineHeight === lh ? `2px solid ${theme.accent}` : `1px solid ${theme.border}`,
                    background: "transparent",
                    color: theme.text,
                    fontSize: 11,
                    fontWeight: 700,
                    cursor: "pointer"
                  }}
                >
                  {lh === 1.4 ? "Обычный" : lh === 1.8 ? "Широкий" : "Макс"}
                </button>
              ))}
            </div>
          </div>

          {/* Управление и экспорт */}
          <div style={{ display: "flex", flexDirection: "column", justifySelf: "stretch", justifyContent: "flex-end" }}>
            <label style={{ fontSize: 11, fontWeight: 700, color: theme.textSecondary, display: "block", marginBottom: 6, textTransform: "uppercase" }}>Экспорт</label>
            <div style={{ display: "flex", gap: 6 }}>
              <button
                onClick={handleCopy}
                style={{
                  flex: 1,
                  padding: "8px 0",
                  borderRadius: 8,
                  border: "none",
                  background: theme.accent,
                  color: themeMode === "contrast" ? "#000000" : "#ffffff",
                  fontSize: 11,
                  fontWeight: 700,
                  cursor: "pointer",
                  textAlign: "center"
                }}
              >
                {copied ? "Готово!" : "Копировать"}
              </button>
              <button
                onClick={downloadTxt}
                style={{
                  padding: "8px 10px",
                  borderRadius: 8,
                  border: `1px solid ${theme.border}`,
                  background: "transparent",
                  color: theme.text,
                  fontSize: 11,
                  fontWeight: 700,
                  cursor: "pointer"
                }}
                title="Скачать в формате .txt"
              >
                TXT
              </button>
              {mode === "video" && (
                <button
                  onClick={downloadSrt}
                  style={{
                    padding: "8px 10px",
                    borderRadius: 8,
                    border: `1px solid ${theme.border}`,
                    background: "transparent",
                    color: theme.text,
                    fontSize: 11,
                    fontWeight: 700,
                    cursor: "pointer"
                  }}
                  title="Скачать субтитры в .srt"
                >
                  SRT
                </button>
              )}
            </div>
          </div>
        </section>

        {/* Двухколоночный грид для транскрипта и AI-аналитики */}
        <div style={{ display: "grid", gridTemplateColumns: (aiSummary || aiResponse) ? "1fr 320px" : "1fr", gap: 24, alignItems: "start" }}>
          
          {/* Главная область вывода */}
          <main
            style={{
              background: theme.cardBg,
              border: `1px solid ${theme.border}`,
              borderRadius: 24,
              padding: "32px 24px",
              minHeight: 400,
              maxHeight: "calc(100vh - 280px)",
              overflowY: "auto",
              boxShadow: themeMode === "dark" ? "0 20px 40px rgba(0,0,0,0.4)" : "none",
              display: "flex",
              flexDirection: "column"
            }}
          >
            {!isConnected && subtitlesList.length === 0 && history.length === 0 && (
              <div style={{ margin: "auto", textAlign: "center", maxWidth: 400, padding: "40px 0" }}>
                <div style={{ fontSize: 40, marginBottom: 16 }}>📡</div>
                <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>Ожидание подключения к плееру</h3>
                <p style={{ fontSize: 13, color: theme.textSecondary, lineHeight: 1.5 }}>
                  Пожалуйста, держите открытой вкладку с видеоплеером или диктовкой (/subtitles) для начала трансляции.
                </p>
              </div>
            )}

            {/* Режим 1: Диктовка речи */}
            {mode === "speech" && (isConnected || history.length > 0) && (
              <div
                style={{
                  fontSize: `${fontSize}px`,
                  lineHeight: lineHeight,
                  fontWeight: 500,
                  textAlign: "left"
                }}
              >
                {history.map((ph, idx) => (
                  <p
                    key={idx}
                    style={{
                      color: themeMode === "contrast" ? "rgba(253, 235, 71, 0.6)" : "rgba(255, 255, 255, 0.4)",
                      marginBottom: 16
                    }}
                    className={themeMode === "light" ? "text-slate-400" : ""}
                  >
                    {ph}
                  </p>
                ))}
                {displayText && (
                  <p style={{ color: theme.accent, fontWeight: 700 }}>
                    {displayText}
                    <span
                      style={{
                        display: "inline-block",
                        width: 3,
                        height: fontSize - 4,
                        background: theme.accent,
                        marginLeft: 6,
                        verticalAlign: "middle",
                        animation: "cursor-blink 0.8s step-end infinite"
                      }}
                    />
                  </p>
                )}
                {!displayText && history.length === 0 && (
                  <div style={{ textAlign: "center", color: theme.textSecondary, padding: "60px 0", fontSize: 14 }}>
                    Ожидание начала речи...
                  </div>
                )}
              </div>
            )}

            {/* Режим 2: Таймлайн субтитров видео */}
            {mode === "video" && (subtitlesList.length > 0) && (
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {subtitlesList.map((sub, i) => {
                  const isActive = i === activeSubIndex;
                  return (
                    <div
                      key={i}
                      id={`sub-line-${i}`}
                      onClick={() => seekVideo(sub.start)}
                      style={{
                        padding: "16px 20px",
                        borderRadius: 14,
                        background: isActive ? theme.activeBg : "transparent",
                        border: isActive ? `1px solid ${theme.accent}` : `1px solid transparent`,
                        cursor: "pointer",
                        display: "grid",
                        gridTemplateColumns: "100px 1fr",
                        gap: 20,
                        alignItems: "center",
                        transition: "all 0.2s ease"
                      }}
                      onMouseOver={(e) => {
                        if (!isActive) {
                          e.currentTarget.style.background = "rgba(148, 163, 184, 0.05)";
                        }
                      }}
                      onMouseOut={(e) => {
                        if (!isActive) {
                          e.currentTarget.style.background = "transparent";
                        }
                      }}
                    >
                      {/* Метка времени */}
                      <span
                        style={{
                          fontSize: 13,
                          fontWeight: 700,
                          color: isActive ? theme.accent : theme.textSecondary,
                          fontFamily: "monospace",
                          background: isActive ? "rgba(2, 132, 199, 0.08)" : "transparent",
                          padding: "4px 8px",
                          borderRadius: 6,
                          textAlign: "center"
                        }}
                      >
                        {formatTime(sub.start)}
                      </span>
                      {/* Текст субтитра */}
                      <span
                        style={{
                          fontSize: `${fontSize - 2}px`,
                          fontWeight: isActive ? 700 : 500,
                          lineHeight: 1.4,
                          color: isActive ? theme.accent : theme.text
                        }}
                      >
                        {sub.text}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </main>

          {/* Панель AI-Аналитики на странице транскрипта */}
          {(aiSummary || aiResponse) && (
            <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
              {/* Блок конспекта */}
              {aiSummary && (
                <div style={{ 
                  background: theme.cardBg, 
                  border: `1px solid ${theme.border}`, 
                  borderRadius: 24, 
                  padding: 24,
                  boxShadow: themeMode === "dark" ? "0 20px 40px rgba(0,0,0,0.4)" : "none"
                }}>
                  <h3 style={{ fontFamily: "'Syne', sans-serif", fontSize: 15, fontWeight: 700, color: theme.accent, marginBottom: 12, display: "flex", alignItems: "center", gap: 6 }}>
                    📝 AI-Конспект (Тезисы):
                  </h3>
                  <div style={{ 
                    fontSize: 13, 
                    lineHeight: 1.6, 
                    whiteSpace: "pre-wrap", 
                    color: theme.text 
                  }}>
                    {aiSummary}
                  </div>
                </div>
              )}

              {/* Блок ответа на вопросы */}
              {aiResponse && (
                <div style={{ 
                  background: theme.cardBg, 
                  border: `1px solid ${theme.border}`, 
                  borderRadius: 24, 
                  padding: 24,
                  boxShadow: themeMode === "dark" ? "0 20px 40px rgba(0,0,0,0.4)" : "none"
                }}>
                  <h3 style={{ fontFamily: "'Syne', sans-serif", fontSize: 15, fontWeight: 700, color: theme.accent, marginBottom: 12, display: "flex", alignItems: "center", gap: 6 }}>
                    💬 AI-Ответ на вопрос:
                  </h3>
                  <div style={{ 
                    fontSize: 13, 
                    lineHeight: 1.5, 
                    color: theme.text 
                  }}>
                    {aiResponse}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Дополнительная справка по сочетаниям клавиш и управлению */}
        <footer style={{ marginTop: 24, textAlign: "center", fontSize: 12, color: theme.textSecondary }}>
          Кликните по любой строке таймлайна, чтобы перемотать видео в основном плеере.
        </footer>
      </div>
      
      {/* Стили курсора диктовки */}
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes cursor-blink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0; }
        }
      `}} />
    </div>
  );
}
