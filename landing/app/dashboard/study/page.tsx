"use client";

import { useState, useEffect, useRef } from "react";
import { createClient } from "../../../lib/supabase";
import type { User } from "@supabase/supabase-js";

interface LectureHighlight {
  summary: string;
  highlights: string[];
  key_terms: { term: string; definition: string }[];
}

interface LectureItem {
  id: string;
  user_id: string;
  title: string;
  transcript: string;
  summary: string;
  highlights: LectureHighlight;
  created_at: string;
}

export default function StudyDashboard() {
  const [user, setUser] = useState<User | null>(null);
  const [lectures, setLectures] = useState<LectureItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"list" | "record" | "view">("list");
  
  // Active viewing lecture
  const [selectedLecture, setSelectedLecture] = useState<LectureItem | null>(null);
  
  // Recording states
  const [isRecording, setIsRecording] = useState(false);
  const [transcriptionText, setTranscriptionText] = useState("");
  const [aiStatus, setAiStatus] = useState<"ready" | "listening" | "processing" | "analyzing">("ready");
  const [lectureTitle, setLectureTitle] = useState("");
  const [userLanguage, setUserLanguage] = useState<string>("ru");

  // Analysis result temporary state
  const [analysisResult, setAnalysisResult] = useState<LectureHighlight | null>(null);

  // Web Speech API / WebSocket refs
  const recognitionRef = useRef<any>(null);
  const isRecordingRef = useRef(false);
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioStreamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      if (data?.user) {
        setUser(data.user);
        fetchLectures(data.user.id);
        
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

    return () => {
      stopRecordingSession();
    };
  }, []);

  useEffect(() => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight;
    }
  }, [transcriptionText]);

  async function fetchLectures(userId: string) {
    try {
      const isProd = typeof window !== "undefined" && window.location.hostname !== "localhost" && window.location.hostname !== "127.0.0.1";
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || (isProd ? "https://hearless16-1.onrender.com" : "http://localhost:8000");
      
      const res = await fetch(`${baseUrl}/study/lectures/${userId}`);
      if (res.ok) {
        const data = await res.json();
        setLectures(data);
      }
    } catch (e) {
      console.error("Error fetching lectures:", e);
    } finally {
      setLoading(false);
    }
  }

  function stopRecordingSession() {
    isRecordingRef.current = false;
    setIsRecording(false);
    setAiStatus("ready");

    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch (e) {}
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      try { mediaRecorderRef.current.stop(); } catch (e) {}
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
    setAnalysisResult(null);
    setAiStatus("listening");

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setTranscriptionText("Распознавание речи не поддерживается браузером. Пожалуйста, используйте Google Chrome или Safari.");
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

  async function handleAnalyze() {
    stopRecordingSession();
    if (!transcriptionText.trim()) return;

    setAiStatus("analyzing");
    try {
      const isProd = typeof window !== "undefined" && window.location.hostname !== "localhost" && window.location.hostname !== "127.0.0.1";
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || (isProd ? "https://hearless16-1.onrender.com" : "http://localhost:8000");

      const response = await fetch(`${baseUrl}/study/analyze`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transcript: transcriptionText }),
      });

      if (response.ok) {
        const json = await response.json();
        setAnalysisResult(json);
        // Default lecture title
        const dateStr = new Date().toLocaleString("ru-RU", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
        setLectureTitle(`Лекция от ${dateStr}`);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setAiStatus("ready");
    }
  }

  async function handleSaveLecture() {
    if (!user || !transcriptionText.trim() || !analysisResult) return;

    try {
      const isProd = typeof window !== "undefined" && window.location.hostname !== "localhost" && window.location.hostname !== "127.0.0.1";
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || (isProd ? "https://hearless16-1.onrender.com" : "http://localhost:8000");

      const payload = {
        user_id: user.id,
        title: lectureTitle || "Без названия",
        transcript: transcriptionText,
        summary: analysisResult.summary || "",
        highlights: analysisResult
      };

      const response = await fetch(`${baseUrl}/study/lectures`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        fetchLectures(user.id);
        setActiveTab("list");
        setTranscriptionText("");
        setAnalysisResult(null);
      }
    } catch (e) {
      console.error(e);
    }
  }

  async function handleDeleteLecture(id: string) {
    if (!confirm("Вы уверены, что хотите удалить эту лекцию?")) return;

    try {
      const isProd = typeof window !== "undefined" && window.location.hostname !== "localhost" && window.location.hostname !== "127.0.0.1";
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || (isProd ? "https://hearless16-1.onrender.com" : "http://localhost:8000");

      const response = await fetch(`${baseUrl}/study/lectures/${id}`, {
        method: "DELETE",
      });

      if (response.ok) {
        if (selectedLecture?.id === id) {
          setSelectedLecture(null);
          setActiveTab("list");
        }
        if (user) fetchLectures(user.id);
      }
    } catch (e) {
      console.error(e);
    }
  }

  const getRollingLines = () => {
    if (!transcriptionText.trim()) return [];
    const sentences = transcriptionText.match(/[^.!?\n]+[.!?\n]*/g) || [transcriptionText];
    return sentences.map(s => s.trim()).filter(Boolean).slice(-30);
  };
  const rollingLines = getRollingLines();

  return (
    <div className="space-y-6">
      {/* Styles Injection */}
      <style jsx global>{`
        @keyframes sound-wave {
          0%, 100% { transform: scaleY(0.3); }
          50% { transform: scaleY(1); }
        }
        /* Custom scrollbar for subtitles */
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.15);
          border-radius: 9999px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(255, 255, 255, 0.3);
        }
      `}</style>

      {/* Page Header */}
      <div className="flex justify-between items-center flex-wrap gap-4 text-left">
        <div>
          <h2 className="font-syne font-extrabold text-3xl text-sky-900 tracking-tight">Режим учебы 🎓</h2>
          <p className="text-sky-600 text-sm max-w-2xl font-medium">
            Записывайте университетские лекции. Наш ИИ автоматически структурирует материал, выделит ключевые тезисы и словарь терминов.
          </p>
        </div>

        {activeTab !== "record" && (
          <button
            onClick={() => {
              setActiveTab("record");
              setTranscriptionText("");
              setAnalysisResult(null);
            }}
            className="px-5 py-3 rounded-2xl bg-accent text-white font-syne font-bold text-xs shadow-md shadow-accent/20 hover:bg-accent/90 transition-all flex items-center gap-2"
          >
            <span>🎤 Записать лекцию</span>
          </button>
        )}
      </div>

      {/* Main UI switch */}
      {activeTab === "list" && (
        <div className="space-y-6">
          {loading ? (
            <div className="py-20 text-center text-sky-500">
              <div className="w-8 h-8 border-4 border-accent border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              Загрузка конспектов...
            </div>
          ) : lectures.length === 0 ? (
            <div className="bg-sky-50/40 border border-sky-100/60 shadow-xl rounded-3xl p-12 text-center max-w-lg mx-auto space-y-4 my-8">
              <div className="w-16 h-16 rounded-full bg-sky-100/50 flex items-center justify-center mx-auto text-3xl shadow-sm">
                🎓
              </div>
              <h3 className="font-syne font-extrabold text-sky-900 text-lg">Записей пока нет</h3>
              <p className="text-sky-600 text-xs leading-relaxed font-semibold">
                Запишите свою первую лекцию или семинар! ИИ создаст подробную выжимку, словарь терминов и выделит самое важное.
              </p>
              <button
                onClick={() => setActiveTab("record")}
                className="px-5 py-2.5 rounded-xl bg-accent text-white font-syne font-bold text-xs shadow-md hover:bg-accent/90 transition-all mx-auto"
              >
                Начать запись
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {lectures.map((lecture) => (
                <div
                  key={lecture.id}
                  onClick={() => {
                    setSelectedLecture(lecture);
                    setActiveTab("view");
                  }}
                  className="bg-sky-50/50 border border-sky-100/80 rounded-3xl p-6 shadow-sm hover:shadow-lg hover:bg-sky-100/30 transition-all cursor-pointer text-left flex flex-col justify-between min-h-[180px] group"
                >
                  <div className="space-y-2">
                    <div className="flex justify-between items-start gap-2">
                      <span className="text-[10px] text-accent font-bold uppercase tracking-wider bg-sky-100/60 px-2.5 py-1 rounded-md">
                        {new Date(lecture.created_at).toLocaleDateString("ru-RU", { day: "2-digit", month: "short" })}
                      </span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteLecture(lecture.id);
                        }}
                        className="opacity-0 group-hover:opacity-100 text-sky-400 hover:text-red-500 p-1 transition-all"
                      >
                        🗑️
                      </button>
                    </div>
                    <h3 className="font-syne font-extrabold text-sky-900 text-base leading-snug truncate">
                      {lecture.title}
                    </h3>
                    <p className="text-sky-600 text-xs font-semibold leading-relaxed line-clamp-3">
                      {lecture.summary || lecture.transcript}
                    </p>
                  </div>
                  <div className="pt-4 border-t border-sky-100/50 flex items-center justify-between">
                    <span className="text-[10px] text-sky-500 font-bold uppercase">
                      📚 {lecture.highlights?.key_terms?.length || 0} терминов
                    </span>
                    <span className="text-xs text-accent font-bold group-hover:translate-x-1 transition-transform">
                      Открыть →
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === "record" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
          {/* Record Display & Waveform */}
          <div className="lg:col-span-7 flex flex-col gap-6">
            <div className="relative aspect-[16/9] min-h-[360px] w-full rounded-3xl bg-sky-950/95 border border-sky-900/50 shadow-2xl flex flex-col justify-between p-8 overflow-hidden">
              {/* Blur blobs */}
              <div className="absolute top-1/4 left-1/3 w-[220px] h-[220px] bg-accent/10 rounded-full blur-[80px] pointer-events-none"></div>

              {/* Status Header */}
              <div className="flex justify-between items-center z-10">
                <span className="text-[10px] font-syne font-extrabold text-sky-300 uppercase tracking-widest bg-sky-900/80 border border-white/5 px-3 py-1.5 rounded-full">
                  {isRecording ? "🔴 Запись аудио" : "⚪ Готов к записи"}
                </span>

                {isRecording && (
                  <div className="flex gap-0.5 items-end h-5">
                    {[...Array(6)].map((_, i) => (
                      <div
                        key={i}
                        className="w-0.5 bg-cyan-400 rounded-full"
                        style={{
                          height: "100%",
                          animation: "sound-wave 1.2s infinite ease-in-out",
                          animationDelay: `${i * 0.15}s`,
                          transformOrigin: "bottom"
                        }}
                      ></div>
                    ))}
                  </div>
                )}
              </div>

              {/* Transcription Content Area */}
              <div ref={scrollContainerRef} className="flex-1 overflow-y-auto z-10 my-4 max-w-2xl mx-auto w-full px-4 custom-scrollbar">
                <div className="min-h-full flex flex-col justify-end">
                  {transcriptionText ? (
                    <div className="bg-slate-900/80 border border-white/10 p-5 rounded-2xl backdrop-blur-md w-full">
                      <p className="font-dm font-semibold text-lg md:text-xl leading-relaxed transition-all duration-300">
                        {rollingLines.map((line, idx) => {
                          const isLast = idx === rollingLines.length - 1;
                          return (
                            <span
                              key={idx}
                              className={`mr-2.5 transition-all duration-500 inline ${
                                isLast ? "text-cyan-400 font-extrabold" : "text-white/25 font-medium"
                              }`}
                            >
                              {line}
                            </span>
                          );
                        })}
                        {/* Blinking cursor */}
                        <span className="inline-block w-0.5 h-5 bg-cyan-400 ml-1 vertical-align-middle animate-[cursor-blink_0.8s_step-end_infinite]" />
                      </p>
                    </div>
                  ) : (
                    <div className="my-auto space-y-3 animate-pulse text-center w-full">
                      <p className="text-sky-300 text-sm font-semibold">
                        {isRecording ? "Слушаю лекцию преподавателя..." : "Нажмите кнопку ниже для записи"}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Action Button */}
              <div className="flex justify-center z-10">
                {!isRecording ? (
                  <button
                    onClick={startRecordingSession}
                    className="w-14 h-14 rounded-full bg-accent hover:bg-accent/90 text-white flex items-center justify-center shadow-lg transition-transform hover:scale-105"
                  >
                    🎤
                  </button>
                ) : (
                  <button
                    onClick={handleAnalyze}
                    className="px-6 py-3 rounded-full bg-red-500 hover:bg-red-600 text-white font-syne font-bold text-xs shadow-lg transition-transform hover:scale-105 flex items-center gap-2"
                  >
                    ⏹ Остановить и анализировать
                  </button>
                )}
              </div>
            </div>

            {/* Back Button */}
            <button
              onClick={() => {
                stopRecordingSession();
                setActiveTab("list");
              }}
              className="self-start text-xs font-bold text-sky-500 hover:text-sky-800 flex items-center gap-1"
            >
              ← Отмена
            </button>
          </div>

          {/* AI Analysis and Save Form */}
          <div className="lg:col-span-5 flex flex-col gap-6">
            {aiStatus === "analyzing" ? (
              <div className="bg-sky-50/50 border border-sky-100/80 shadow-xl rounded-3xl p-8 text-center flex-1 flex flex-col justify-center items-center gap-4 min-h-[300px]">
                <div className="w-12 h-12 border-4 border-accent border-t-transparent rounded-full animate-spin"></div>
                <h3 className="font-syne font-extrabold text-sky-900 text-base">ИИ анализирует лекцию...</h3>
                <p className="text-sky-600 text-xs max-w-xs font-semibold leading-relaxed">
                  Мы структурируем конспект, составляем резюме лекции и собираем новые термины. Это займет несколько секунд.
                </p>
              </div>
            ) : analysisResult ? (
              <div className="bg-sky-50/60 border border-sky-100/80 shadow-xl rounded-3xl p-6 space-y-5 text-left flex-1 flex flex-col justify-between">
                <div className="space-y-4 flex-1 overflow-y-auto max-h-[420px] pr-1">
                  <h3 className="font-syne font-extrabold text-sky-900 text-lg">Результат анализа ИИ</h3>
                  
                  {/* Title input */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] text-sky-500 font-bold uppercase">Название лекции</label>
                    <input
                      type="text"
                      value={lectureTitle}
                      onChange={(e) => setLectureTitle(e.target.value)}
                      className="px-3.5 py-2.5 rounded-xl border border-sky-200 bg-white/85 text-xs font-bold outline-none focus:border-accent"
                    />
                  </div>

                  {/* Summary */}
                  <div className="flex flex-col gap-1.5">
                    <span className="text-[10px] text-sky-500 font-bold uppercase">Краткое содержание</span>
                    <p className="text-sky-700 text-xs leading-relaxed bg-white/40 border border-sky-100 p-3 rounded-xl font-semibold">
                      {analysisResult.summary}
                    </p>
                  </div>

                  {/* Highlights count */}
                  <div className="flex justify-between text-xs bg-sky-50 p-3 rounded-xl border border-sky-100">
                    <span className="text-sky-600 font-semibold">Выделено ключевых тезисов:</span>
                    <span className="font-bold text-accent">{analysisResult.highlights?.length || 0}</span>
                  </div>

                  {/* Terms count */}
                  <div className="flex justify-between text-xs bg-sky-50 p-3 rounded-xl border border-sky-100">
                    <span className="text-sky-600 font-semibold">Обнаружено терминов:</span>
                    <span className="font-bold text-purpleBrand">{analysisResult.key_terms?.length || 0}</span>
                  </div>
                </div>

                <div className="pt-5 border-t border-sky-100 flex gap-3">
                  <button
                    onClick={handleSaveLecture}
                    className="flex-1 py-3 rounded-xl bg-green-500 text-white font-syne font-bold text-xs hover:bg-green-600 transition-all shadow-md shadow-green-500/10"
                  >
                    💾 Сохранить в конспекты
                  </button>
                  <button
                    onClick={() => setAnalysisResult(null)}
                    className="py-3 px-5 rounded-xl border border-sky-200 hover:bg-sky-50 text-sky-600 font-bold text-xs"
                  >
                    Сбросить
                  </button>
                </div>
              </div>
            ) : (
              <div className="bg-sky-50/40 border border-sky-100/60 shadow-xl rounded-3xl p-8 text-center flex-1 flex flex-col justify-center items-center gap-3 min-h-[300px]">
                <div className="w-14 h-14 rounded-full bg-sky-100/50 flex items-center justify-center text-xl text-sky-400">
                  ✨
                </div>
                <h4 className="font-syne font-bold text-sky-900 text-sm">Готов к анализу</h4>
                <p className="text-sky-600 text-[11px] leading-relaxed max-w-xs font-semibold">
                  После записи лекции здесь появится умный конспект лекции, ключевые моменты и определения.
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === "view" && selectedLecture && (
        <div className="space-y-6 text-left">
          {/* Lecture Navigation & Header */}
          <div className="flex items-center justify-between flex-wrap gap-4 border-b border-sky-200 pb-4">
            <button
              onClick={() => setActiveTab("list")}
              className="text-xs font-bold text-sky-500 hover:text-sky-800 flex items-center gap-1"
            >
              ← Назад к списку
            </button>
            <button
              onClick={() => handleDeleteLecture(selectedLecture.id)}
              className="text-xs font-bold text-red-500 hover:text-red-600 flex items-center gap-1.5"
            >
              🗑️ Удалить конспект
            </button>
          </div>

          <div className="bg-sky-50/60 border border-sky-100/80 shadow-xl rounded-3xl p-6 md:p-8 space-y-6">
            <div className="space-y-2">
              <span className="text-[10px] text-accent font-extrabold uppercase bg-accent/15 px-3 py-1 rounded-md tracking-wider">
                {new Date(selectedLecture.created_at).toLocaleString("ru-RU", { day: "2-digit", month: "long", year: "numeric" })}
              </span>
              <h2 className="font-syne font-extrabold text-2xl md:text-3xl text-sky-900">
                {selectedLecture.title}
              </h2>
            </div>

            {/* Structured Tabs Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 pt-4">
              
              {/* Summary & Highlights (Left 7 Columns) */}
              <div className="lg:col-span-7 space-y-6">
                
                {/* Summary Card */}
                <div className="bg-sky-900 text-white rounded-3xl p-6 shadow-md relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-accent/20 rounded-full blur-2xl pointer-events-none"></div>
                  <h3 className="font-syne font-extrabold text-sm text-cyan-400 uppercase tracking-widest mb-3">Сводка лекции</h3>
                  <p className="font-dm text-sm leading-relaxed text-slate-200 font-medium">
                    {selectedLecture.summary}
                  </p>
                </div>

                {/* Highlights Card */}
                <div className="bg-white border border-sky-100 rounded-3xl p-6 shadow-sm space-y-4">
                  <h3 className="font-syne font-extrabold text-sm text-sky-850 uppercase tracking-widest">Ключевые тезисы</h3>
                  <div className="space-y-3">
                    {selectedLecture.highlights?.highlights?.map((hl, i) => (
                      <div key={i} className="flex gap-3 items-start">
                        <span className="w-5 h-5 rounded-full bg-cyan-100/50 flex items-center justify-center text-cyan-500 font-bold text-xs shrink-0 mt-0.5">
                          ✓
                        </span>
                        <p className="text-sky-900 text-xs font-semibold leading-relaxed">
                          {hl}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Full Transcript Card */}
                <div className="bg-white border border-sky-100 rounded-3xl p-6 shadow-sm space-y-3">
                  <h3 className="font-syne font-extrabold text-sm text-sky-850 uppercase tracking-widest">Полный текст лекции</h3>
                  <p className="text-sky-900 text-xs leading-relaxed font-semibold max-h-[220px] overflow-y-auto bg-sky-50/70 p-4 rounded-2xl border border-sky-100 whitespace-pre-line">
                    {selectedLecture.transcript}
                  </p>
                </div>
              </div>

              {/* Glossary (Right 5 Columns) */}
              <div className="lg:col-span-5 space-y-6">
                <div className="bg-white border border-sky-100 rounded-3xl p-6 shadow-sm space-y-4">
                  <h3 className="font-syne font-extrabold text-sm text-purpleBrand uppercase tracking-widest">Словарь терминов</h3>
                  <div className="space-y-4 max-h-[500px] overflow-y-auto pr-1">
                    {selectedLecture.highlights?.key_terms?.map((term, i) => (
                      <div
                        key={i}
                        className="p-4 rounded-2xl bg-sky-50 border border-sky-100 transition-all hover:bg-sky-100/40"
                      >
                        <h4 className="font-syne font-extrabold text-xs text-sky-900 uppercase tracking-wide">
                          🔑 {term.term}
                        </h4>
                        <p className="text-sky-600 text-[11px] font-semibold leading-normal mt-1">
                          {term.definition}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
