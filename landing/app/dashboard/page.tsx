"use client";

import { useState, useEffect, useRef } from "react";
import { createClient } from "../../lib/supabase";
import type { User } from "@supabase/supabase-js";

interface SubtitleHistoryItem {
  id: string;
  text: string;
  created_at: string;
}

export default function SubtitlesDashboard() {
  const [user, setUser] = useState<User | null>(null);
  const [history, setHistory] = useState<SubtitleHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [historyOpen, setHistoryOpen] = useState(true);

  // Recognition States
  const [isRecording, setIsRecording] = useState(false);
  const [transcriptionText, setTranscriptionText] = useState("");
  const [aiStatus, setAiStatus] = useState<"ready" | "listening" | "processing" | "fallback">("ready");
  const [userLanguage, setUserLanguage] = useState<string>("ru");

  // Subtitle Custom Styling States
  const [fontSize, setFontSize] = useState("md"); // sm, md, lg, xl
  const [textColor, setTextColor] = useState("white"); // white, yellow, cyan, green
  const [bgColor, setBgColor] = useState("dark"); // dark, semi, none
  const [textGlow, setTextGlow] = useState(true);
  const [settingsOpen, setSettingsOpen] = useState(false);

  // Web Speech API Ref
  const recognitionRef = useRef<any>(null);
  const isRecordingRef = useRef(false);

  // WebSocket Ref (for Whisper)
  const wsRef = useRef<WebSocket | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioStreamRef = useRef<MediaStream | null>(null);

  const getShadow = (color: string) => {
    switch (color) {
      case "yellow": return "0 0 20px rgba(253, 224, 71, 0.45), 0 0 4px rgba(253, 224, 71, 0.8)";
      case "cyan": return "0 0 20px rgba(34, 211, 238, 0.55), 0 0 4px rgba(34, 211, 238, 0.8)";
      case "green": return "0 0 20px rgba(74, 222, 128, 0.55), 0 0 4px rgba(74, 222, 128, 0.8)";
      default: return "0 0 20px rgba(255, 255, 255, 0.35), 0 0 4px rgba(255, 255, 255, 0.8)";
    }
  };

  const getColorCode = (color: string) => {
    switch (color) {
      case "yellow": return "#fdeb47";
      case "cyan": return "#22d3ee";
      case "green": return "#4ade80";
      default: return "#ffffff";
    }
  };

  const changeFontSize = (val: string) => {
    setFontSize(val);
    if (typeof window !== "undefined") localStorage.setItem("sub_fontSize", val);
  };
  const changeTextColor = (val: string) => {
    setTextColor(val);
    if (typeof window !== "undefined") localStorage.setItem("sub_textColor", val);
  };
  const changeBgColor = (val: string) => {
    setBgColor(val);
    if (typeof window !== "undefined") localStorage.setItem("sub_bgColor", val);
  };
  const changeTextGlow = (val: boolean) => {
    setTextGlow(val);
    if (typeof window !== "undefined") localStorage.setItem("sub_textGlow", val ? "true" : "false");
  };

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      if (data?.user) {
        setUser(data.user);
        fetchHistory(data.user.id);
        
        // Fetch user language profile
        supabase.from("users")
          .select("language")
          .eq("id", data.user.id)
          .single()
          .then(({ data: profile }) => {
            if (profile?.language) {
              setUserLanguage(profile.language);
            }
          });
      }
    });

    if (typeof window !== "undefined") {
      setFontSize(localStorage.getItem("sub_fontSize") || "md");
      setTextColor(localStorage.getItem("sub_textColor") || "white");
      setBgColor(localStorage.getItem("sub_bgColor") || "dark");
      setTextGlow(localStorage.getItem("sub_textGlow") !== "false");
    }

    return () => {
      stopRecordingSession();
    };
  }, []);

  async function fetchHistory(userId: string) {
    const supabase = createClient();
    const { data } = await supabase
      .from("subtitles_history")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (data) {
      setHistory(data);
    }
    setLoading(false);
  }

  // Stop recording and close connections
  function stopRecordingSession() {
    isRecordingRef.current = false;
    setIsRecording(false);
    setAiStatus("ready");

    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (e) {}
    }

    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      try {
        mediaRecorderRef.current.stop();
      } catch (e) {}
    }
    if (audioStreamRef.current) {
      audioStreamRef.current.getTracks().forEach(track => track.stop());
    }
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
  }

  // Start Browser-based Native Speech Recognition
  async function startRecordingSession() {
    isRecordingRef.current = true;
    setIsRecording(true);
    setTranscriptionText("");
    setAiStatus("listening");

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setTranscriptionText("Распознавание речи не поддерживается вашим браузером. Пожалуйста, используйте Google Chrome или Safari.");
      isRecordingRef.current = false;
      setIsRecording(false);
      setAiStatus("ready");
      return;
    }

    const recognition = new SpeechRecognition();
    recognitionRef.current = recognition;
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = userLanguage === "kk" ? "kk-KZ" : "ru-RU";

    recognition.onresult = (event: any) => {
      let resultText = "";
      for (let i = 0; i < event.results.length; ++i) {
        const transcript = event.results[i][0].transcript;
        if (resultText && !resultText.endsWith(" ") && !transcript.startsWith(" ")) {
          resultText += " ";
        }
        resultText += transcript;
      }
      setTranscriptionText(resultText);
    };

    recognition.onerror = (err: any) => {
      console.error("Speech recognition error:", err);
      if (err.error === 'not-allowed' || err.error === 'service-not-allowed') {
        setTranscriptionText("Доступ к микрофону отклонен.");
        isRecordingRef.current = false;
        setIsRecording(false);
        setAiStatus("ready");
      }
    };

    recognition.onend = () => {
      if (isRecordingRef.current) {
        try {
          recognition.start();
        } catch (e) {
          console.error("Failed to restart speech recognition:", e);
          setIsRecording(false);
          setAiStatus("ready");
        }
      } else {
        setIsRecording(false);
        setAiStatus("ready");
      }
    };

    try {
      recognition.start();
    } catch (err) {
      console.error("Failed to start speech recognition:", err);
      isRecordingRef.current = false;
      setIsRecording(false);
      setAiStatus("ready");
    }
  }

  // Save current speech transcript to database
  async function handleSaveDialogue() {
    if (!user || !transcriptionText.trim()) return;
    const supabase = createClient();
    await supabase.from("subtitles_history").insert({
      user_id: user.id,
      text: transcriptionText,
      created_at: new Date().toISOString()
    });
    setTranscriptionText("");
    fetchHistory(user.id);
  }

  async function handleClearHistory() {
    if (!user) return;
    const supabase = createClient();
    await supabase.from("subtitles_history").delete().eq("user_id", user.id);
    fetchHistory(user.id);
  }

  async function handleDeleteItem(id: string) {
    if (!user) return;
    const supabase = createClient();
    await supabase.from("subtitles_history").delete().eq("id", id);
    fetchHistory(user.id);
  }

  // Split transcriptionText into a rolling stack of sentences
  const getRollingLines = () => {
    if (!transcriptionText.trim()) return [];
    const sentences = transcriptionText.match(/[^.!?\n]+[.!?\n]*/g) || [transcriptionText];
    const cleaned = sentences.map(s => s.trim()).filter(Boolean);
    return cleaned.slice(-6);
  };

  const rollingLines = getRollingLines();

  if (loading) {
    return (
      <div className="py-20 text-center text-slate-400">
        <div className="w-8 h-8 border-4 border-accent border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
        Загрузка ИИ-Субтитров...
      </div>
    );
  }

  return (
    <div className="space-y-6 relative">
      {/* Dynamic Keyframes Injection */}
      <style jsx global>{`
        @keyframes slide-up {
          0% {
            opacity: 0;
            transform: translateY(16px) scale(0.97);
          }
          100% {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
        @keyframes pulse-ring {
          0% {
            transform: scale(0.95);
            box-shadow: 0 0 0 0 rgba(34, 211, 238, 0.4);
          }
          70% {
            transform: scale(1);
            box-shadow: 0 0 0 12px rgba(34, 211, 238, 0);
          }
          100% {
            transform: scale(0.95);
            box-shadow: 0 0 0 0 rgba(34, 211, 238, 0);
          }
        }
        @keyframes pulse-soft {
          0%, 100% {
            opacity: 0.3;
          }
          50% {
            opacity: 0.65;
          }
        }
        .text-shadow-glow {
          text-shadow: 0 0 20px rgba(34, 211, 238, 0.35), 0 0 4px rgba(255, 255, 255, 0.8);
        }
      `}</style>

      {/* Screen Header */}
      <div className="flex flex-col gap-1 text-left">
        <h2 className="font-syne font-extrabold text-3xl text-slate-800 tracking-tight">AI Субтитры</h2>
        <p className="text-slate-500 text-sm max-w-2xl font-medium">
          Высокоточная расшифровка речи с автоподключением локального распознавания при отсутствии интернета.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
        {/* Cinematic Subtitles screen container */}
        <div className={`${historyOpen ? "lg:col-span-8" : "lg:col-span-12"} transition-all duration-300 flex flex-col gap-6`}>
          
          {/* Main Cinematic Box */}
          <div className="relative aspect-[16/9] min-h-[380px] w-full rounded-3xl bg-slate-950/95 border border-white/10 shadow-[0_25px_60px_rgba(0,0,0,0.6)] flex flex-col justify-between p-8 overflow-hidden">
            
            {/* Ambient Background Blur Blobs */}
            <div className="absolute top-1/4 left-1/3 w-[250px] h-[250px] bg-cyan-500/10 rounded-full blur-[80px] pointer-events-none animate-pulse"></div>
            <div className="absolute bottom-1/4 right-1/4 w-[250px] h-[250px] bg-purple-500/10 rounded-full blur-[80px] pointer-events-none animate-pulse" style={{ animationDelay: "1s" }}></div>

            {/* Floating Top AI Status Bar */}
            <div className="flex justify-center z-10 w-full">
              <div className="bg-slate-900/80 border border-white/10 backdrop-blur-md px-4 py-1.5 rounded-full flex items-center gap-3 shadow-md">
                {aiStatus === "listening" && (
                  <div className="flex items-center gap-2">
                    <span className="relative flex h-2.5 w-2.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500"></span>
                    </span>
                    <span className="text-[10px] font-syne font-extrabold tracking-widest text-green-400 uppercase">
                      🎤 Локальный ввод (Браузер)
                    </span>
                  </div>
                )}
                {aiStatus === "fallback" && (
                  <div className="flex items-center gap-2">
                    <span className="relative flex h-2.5 w-2.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-cyan-400"></span>
                    </span>
                    <span className="text-[10px] font-syne font-extrabold tracking-widest text-cyan-400 uppercase">
                      🎙️ Локальный ввод
                    </span>
                  </div>
                )}
                {aiStatus === "processing" && (
                  <div className="flex items-center gap-2">
                    <svg className="animate-spin h-3.5 w-3.5 text-purple-400" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <span className="text-[10px] font-syne font-extrabold tracking-widest text-purple-400 uppercase">
                      ⚙️ Настройка микрофона...
                    </span>
                  </div>
                )}
                {aiStatus === "ready" && (
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-slate-500"></span>
                    <span className="text-[10px] font-syne font-extrabold tracking-widest text-slate-400 uppercase">
                      ● Готов к работе
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Subtitles Area (Netflix Screen) */}
            <div className="flex-1 flex flex-col justify-end text-left z-10 py-6 max-w-4xl mx-auto w-full px-4">
              {isRecording ? (
                rollingLines.length > 0 ? (
                  <div className={`transition-all duration-300 w-full ${
                    bgColor === "dark" ? "bg-slate-900/80 border border-white/10 p-6 rounded-2xl backdrop-blur-md" : bgColor === "semi" ? "bg-black/40 border border-white/5 p-6 rounded-2xl backdrop-blur-[2px]" : ""
                  }`}>
                    <p style={{
                      fontSize: fontSize === "sm" ? "18px" : fontSize === "lg" ? "30px" : fontSize === "xl" ? "38px" : "24px",
                      lineHeight: "1.6"
                    }} className="font-dm font-semibold transition-all duration-300">
                      {rollingLines.map((line, idx) => {
                        const isLast = idx === rollingLines.length - 1;
                        
                        let customStyle: React.CSSProperties = {};
                        if (isLast) {
                          customStyle = {
                            color: getColorCode(textColor),
                            textShadow: textGlow ? getShadow(textColor) : "none",
                            fontWeight: 800
                          };
                        } else {
                          customStyle = {
                            color: "rgba(255, 255, 255, 0.25)",
                            fontWeight: 500
                          };
                        }

                        return (
                          <span
                            key={idx}
                            className="mr-2.5 transition-all duration-500 inline"
                            style={customStyle}
                          >
                            {line}
                          </span>
                        );
                      })}
                      {/* Blinking cursor */}
                      <span className="inline-block w-0.5 ml-1 vertical-align-middle animate-[cursor-blink_0.8s_step-end_infinite]"
                            style={{ 
                              height: fontSize === "sm" ? "18px" : fontSize === "lg" ? "30px" : fontSize === "xl" ? "38px" : "24px",
                              backgroundColor: getColorCode(textColor)
                            }} />
                    </p>
                  </div>
                ) : (
                  <div className="my-auto space-y-4 animate-pulse text-center w-full">
                    <div className="w-12 h-12 rounded-full bg-cyan-500/10 border border-cyan-500/35 flex items-center justify-center mx-auto text-cyan-400 text-xl">
                      🎙️
                    </div>
                    <p className="text-slate-400 font-syne text-sm font-bold tracking-wider">
                      Говорите, ИИ расшифровывает...
                    </p>
                  </div>
                )
              ) : (
                <div className="my-auto space-y-4 py-8 text-center w-full">
                  <div className="w-16 h-16 rounded-full bg-slate-900 border border-white/5 flex items-center justify-center mx-auto text-2xl shadow-xl">
                    🎬
                  </div>
                  <h3 className="font-syne font-extrabold text-white text-lg">Запуск ИИ-Субтитров</h3>
                  <p className="text-slate-500 text-xs max-w-xs mx-auto leading-relaxed font-semibold">
                    Нажмите круглую кнопку записи внизу для запуска распознавания речи в кино-режиме.
                  </p>
                </div>
              )}
            </div>

            {/* Live Audio Level Waveform (Flickering light) */}
            {isRecording && (
              <div className="absolute bottom-6 right-8 flex gap-1 items-end h-8 pointer-events-none z-10 opacity-75">
                {[...Array(6)].map((_, i) => {
                  const animDelay = (i * 0.15).toFixed(2);
                  return (
                    <div
                      key={i}
                      className="w-1 bg-gradient-to-t from-cyan-400 to-purpleBrand rounded-full min-h-[4px] animate-[sound-pulse_1s_ease-in-out_infinite]"
                      style={{
                        animationDelay: `${animDelay}s`,
                        height: `${Math.floor(Math.random() * 24) + 6}px`
                      }}
                    ></div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Subtitles Design Settings Panel */}
          {settingsOpen && (
            <div className="bg-white/70 backdrop-blur-xl border border-white/80 shadow-lg rounded-2xl p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 animate-[slide-up_0.2s_ease-out]">
              <div className="flex flex-col gap-4 w-full">
                <h4 className="font-syne font-bold text-xs text-slate-700 uppercase tracking-wider">Настройка стиля субтитров</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 w-full">
                  {/* Font Size Selector */}
                  <div className="flex flex-col gap-1.5">
                    <span className="text-[10px] text-slate-400 font-bold uppercase">Размер шрифта</span>
                    <div className="flex gap-1 bg-slate-200/50 p-1 rounded-lg">
                      {["sm", "md", "lg", "xl"].map((sz) => (
                        <button
                          key={sz}
                          onClick={() => changeFontSize(sz)}
                          className={`flex-1 text-[10px] font-bold py-1 rounded ${
                            fontSize === sz ? "bg-white text-slate-800 shadow-sm" : "text-slate-500 hover:text-slate-800"
                          }`}
                        >
                          {sz.toUpperCase()}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Text Color Selector */}
                  <div className="flex flex-col gap-1.5">
                    <span className="text-[10px] text-slate-400 font-bold uppercase">Цвет текста</span>
                    <div className="flex gap-1.5 bg-slate-200/50 p-1 rounded-lg">
                      {["white", "yellow", "cyan", "green"].map((col) => (
                        <button
                          key={col}
                          onClick={() => changeTextColor(col)}
                          className="flex-1 h-5 rounded-md border border-black/10 flex items-center justify-center relative shadow-sm"
                          style={{
                            backgroundColor: getColorCode(col),
                          }}
                          title={col}
                        >
                          {textColor === col && (
                            <span className="w-1.5 h-1.5 bg-slate-900 rounded-full" />
                          )}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Background Selector */}
                  <div className="flex flex-col gap-1.5">
                    <span className="text-[10px] text-slate-400 font-bold uppercase">Фон</span>
                    <div className="flex gap-1 bg-slate-200/50 p-1 rounded-lg">
                      {[
                        { key: "dark", label: "Темный" },
                        { key: "semi", label: "Полупроз." },
                        { key: "none", label: "Без фона" }
                      ].map((bg) => (
                        <button
                          key={bg.key}
                          onClick={() => changeBgColor(bg.key)}
                          className={`flex-1 text-[9px] font-bold py-1 rounded ${
                            bgColor === bg.key ? "bg-white text-slate-800 shadow-sm" : "text-slate-500 hover:text-slate-800"
                          }`}
                        >
                          {bg.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Glow Toggle */}
                  <div className="flex flex-col gap-1.5">
                    <span className="text-[10px] text-slate-400 font-bold uppercase">Свечение текста</span>
                    <button
                      onClick={() => changeTextGlow(!textGlow)}
                      className={`text-[10px] font-bold py-1.5 px-3 rounded-lg border transition-all ${
                        textGlow
                          ? "bg-cyan-500/15 border-cyan-500/20 text-cyan-600 font-extrabold"
                          : "bg-white/50 border-slate-200 text-slate-500"
                      }`}
                    >
                      {textGlow ? "✨ ВКЛЮЧЕНО" : "🔇 ВЫКЛЮЧЕНО"}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Unified Floating Controller Dock */}
          <div className="bg-white/40 backdrop-blur-xl border border-white/60 shadow-xl rounded-2xl p-4 flex flex-wrap items-center justify-between gap-4 z-10">
            {/* Left Section: Record control */}
            <div className="flex items-center gap-3">
              <button
                onClick={isRecording ? stopRecordingSession : startRecordingSession}
                className={`w-12 h-12 rounded-full flex items-center justify-center transition-all duration-300 relative ${
                  isRecording
                    ? "bg-slate-900 border border-slate-700 text-red-500 hover:bg-slate-800 shadow-[0_0_20px_rgba(239,68,68,0.2)]"
                    : "bg-accent text-white hover:bg-accent/90 shadow-md shadow-accent/20"
                }`}
                style={{
                  animation: isRecording ? "pulse-ring 2s infinite" : "none"
                }}
                aria-label={isRecording ? "Остановить запись" : "Начать запись"}
              >
                {isRecording ? (
                  <span className="w-3.5 h-3.5 bg-red-500 rounded-sm"></span>
                ) : (
                  <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                    <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z"></path>
                    <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z"></path>
                  </svg>
                )}
              </button>
              <div className="text-left">
                <p className="font-syne font-bold text-xs text-slate-800">
                  {isRecording ? "Запись активна" : "Микрофон отключен"}
                </p>
                <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">
                  {isRecording ? "Слушаем собеседника" : "Нажмите для запуска"}
                </p>
              </div>
            </div>

            {/* Right Section: Settings and utility keys */}
            <div className="flex items-center gap-3">
              {transcriptionText.trim() && !isRecording && (
                <button
                  onClick={handleSaveDialogue}
                  className="px-4 py-2.5 rounded-xl bg-green-500 hover:bg-green-600 text-white font-syne font-bold text-xs shadow-sm transition-all flex items-center gap-1.5"
                >
                  📥 Сохранить лог
                </button>
              )}
              {transcriptionText.trim() && (
                <button
                  onClick={() => setTranscriptionText("")}
                  className="px-4 py-2.5 rounded-xl bg-white/60 border border-slate-200 text-slate-600 hover:text-red-500 hover:bg-red-500/10 hover:border-red-500/20 font-syne font-bold text-xs shadow-sm transition-all"
                >
                  Очистить экран
                </button>
              )}
              <button
                onClick={() => setSettingsOpen(!settingsOpen)}
                className={`px-4 py-2.5 rounded-xl font-syne font-bold text-xs shadow-sm transition-all border flex items-center gap-1.5 ${
                  settingsOpen
                    ? "bg-accent/15 border-accent/20 text-accent font-extrabold"
                    : "bg-white/60 border-slate-200 text-slate-500 hover:text-slate-800"
                }`}
              >
                ⚙️ Дизайн
              </button>
              <button
                onClick={() => setHistoryOpen(!historyOpen)}
                className={`px-4 py-2.5 rounded-xl font-syne font-bold text-xs shadow-sm transition-all border ${
                  historyOpen
                    ? "bg-accent/15 border-accent/20 text-accent"
                    : "bg-white/60 border-slate-200 text-slate-500 hover:text-slate-800"
                }`}
              >
                📜 История ({history.length})
              </button>
            </div>
          </div>
        </div>

        {/* Collapsible History Sidebar Panel (4 cols) */}
        {historyOpen && (
          <div className="lg:col-span-4 bg-white/40 backdrop-blur-xl border border-white/60 shadow-xl rounded-3xl p-6 flex flex-col gap-6 animate-[fade-up_0.3s_ease-out] max-h-[560px]">
            <div className="flex justify-between items-center">
              <h3 className="font-syne font-extrabold text-base text-slate-800">История диалогов</h3>
              {history.length > 0 && (
                <button
                  onClick={handleClearHistory}
                  className="text-[9px] uppercase font-bold tracking-wider text-slate-400 hover:text-red-500 transition-colors"
                >
                  Очистить всё
                </button>
              )}
            </div>

            {/* List with scroll */}
            <div className="flex-1 overflow-y-auto space-y-3 pr-1">
              {history.length === 0 ? (
                <div className="py-24 text-center text-slate-400 text-xs font-semibold">
                  Нет сохраненных диалогов.
                </div>
              ) : (
                history.map((item) => (
                  <div
                    key={item.id}
                    className="p-3.5 rounded-2xl bg-white/50 border border-white/80 shadow-sm space-y-2 text-left group transition-all hover:bg-white/70 hover:shadow-md"
                  >
                    <div className="flex justify-between items-center">
                      <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">
                        {new Date(item.created_at).toLocaleString("ru-RU", {
                          day: "2-digit",
                          month: "short",
                          hour: "2-digit",
                          minute: "2-digit"
                        })}
                      </span>
                      <button
                        onClick={() => handleDeleteItem(item.id)}
                        className="text-slate-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all p-0.5"
                        aria-label="Удалить запись"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                    <p className="font-dm text-xs text-slate-700 leading-relaxed font-semibold line-clamp-3">
                      {item.text}
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
