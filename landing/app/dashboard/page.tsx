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

  // Recognition States
  const [isRecording, setIsRecording] = useState(false);
  const [transcriptionText, setTranscriptionText] = useState("");
  const [aiStatus, setAiStatus] = useState<"ready" | "listening" | "processing" | "fallback">("ready");

  // Web Speech API Ref
  const recognitionRef = useRef<any>(null);

  // WebSocket Ref (for Whisper)
  const wsRef = useRef<WebSocket | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioStreamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      if (data?.user) {
        setUser(data.user);
        fetchHistory(data.user.id);
      }
    });

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

  // Stop everything
  function stopRecordingSession() {
    setIsRecording(false);
    setAiStatus("ready");

    // Stop Web Speech
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (e) {}
    }

    // Stop WebSocket & MediaRecorder
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

  // Start Whisper WebSocket or Fallback to Web Speech API
  async function startRecordingSession() {
    setIsRecording(true);
    setTranscriptionText("");
    setAiStatus("processing");

    // 1. Try Whisper WebSocket
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioStreamRef.current = stream;

      const wsUrl = "ws://localhost:8000/ws/transcribe";
      console.log(`Connecting to Whisper WebSocket: ${wsUrl}`);
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log("Whisper WS Connected. Starting stream...");
        setAiStatus("listening");

        // Setup MediaRecorder to record in chunks
        const mediaRecorder = new MediaRecorder(stream, { mimeType: "audio/webm" });
        mediaRecorderRef.current = mediaRecorder;

        mediaRecorder.ondataavailable = async (event) => {
          if (event.data.size > 0 && ws.readyState === WebSocket.OPEN) {
            // Convert blob to base64
            const reader = new FileReader();
            reader.onloadend = () => {
              const base64data = (reader.result as string).split(",")[1];
              ws.send(JSON.stringify({ action: "chunk", audio: base64data }));
            };
            reader.readAsDataURL(event.data);
          }
        };

        // Collect chunks every 1.5 seconds
        mediaRecorder.start(1500);
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.text) {
            setTranscriptionText(data.text);
          }
        } catch (e) {}
      };

      ws.onerror = (err) => {
        console.warn("Whisper WS encountered an error. Falling back to Web Speech API...", err);
        switchToFallbackRecognition();
      };

      ws.onclose = () => {
        console.log("Whisper WS closed.");
      };

    } catch (err) {
      console.warn("Could not capture mic or connect to WS. Falling back to Web Speech API.", err);
      switchToFallbackRecognition();
    }
  }

  // Fallback: Web Speech API (Local browser Speech Recognition)
  function switchToFallbackRecognition() {
    setAiStatus("fallback");
    
    // Stop any existing WS audio streaming
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      try { mediaRecorderRef.current.stop(); } catch (e) {}
    }
    if (wsRef.current) {
      try { wsRef.current.close(); } catch (e) {}
      wsRef.current = null;
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setTranscriptionText("Распознавание речи не поддерживается вашим браузером.");
      setIsRecording(false);
      setAiStatus("ready");
      return;
    }

    const recognition = new SpeechRecognition();
    recognitionRef.current = recognition;
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "ru-RU";

    recognition.onresult = (event: any) => {
      let resultText = "";
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        resultText += event.results[i][0].transcript;
      }
      setTranscriptionText(resultText);
    };

    recognition.onerror = () => {
      setIsRecording(false);
      setAiStatus("ready");
    };

    recognition.onend = () => {
      setIsRecording(false);
      setAiStatus("ready");
    };

    recognition.start();
  }

  // Save current speech log to DB
  async function handleSaveDialogue() {
    if (!user || !transcriptionText) return;
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

  if (loading) {
    return <div className="py-20 text-center text-slate-400">Загрузка ИИ-Субтитров...</div>;
  }

  return (
    <div className="space-y-8">
      {/* Header Info */}
      <div className="flex flex-col gap-2">
        <h2 className="font-syne font-extrabold text-3xl text-slate-800">Распознавание речи Live</h2>
        <p className="text-slate-500 text-sm max-w-2xl font-medium">
          Whisper AI расшифровывает голос собеседника в режиме реального времени. Если ИИ-сервер недоступен, автоматически подключается локальный голосовой ввод.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Side: Caption Output Area (7 cols) */}
        <div className="lg:col-span-7 bg-white/40 backdrop-blur-xl border border-white/60 shadow-xl rounded-2xl p-6 flex flex-col gap-6 relative">
          
          {/* Status Indicator */}
          <div className="flex justify-between items-center">
            <span className="font-syne text-xs font-extrabold text-slate-700 flex items-center gap-2 uppercase tracking-wider">
              <span className={`w-2.5 h-2.5 rounded-full ${
                aiStatus === "listening" ? "bg-green-500 animate-pulse" :
                aiStatus === "fallback" ? "bg-cyan-500 animate-pulse" :
                aiStatus === "processing" ? "bg-purple-500 animate-spin border border-t-transparent" : "bg-slate-400"
              }`}></span>
              {aiStatus === "listening" ? "AI слушает (Whisper)" :
               aiStatus === "fallback" ? "Голосовой ввод (Локальный)" :
               aiStatus === "processing" ? "Подключение к Whisper..." : "Готов к работе"}
            </span>

            {/* Simulated sound waveform indicator */}
            {isRecording && (
              <div className="flex gap-0.5 items-center h-4">
                {[...Array(5)].map((_, i) => (
                  <div
                    key={i}
                    className="w-1 bg-accent rounded-full animate-[sound-pulse_1s_ease-in-out_infinite] min-h-[4px]"
                    style={{ animationDelay: `${i * 0.15}s` }}
                  ></div>
                ))}
              </div>
            )}
          </div>

          {/* Subtitles Visualizer (Netflix-Style) */}
          <div className="relative aspect-[16/10] rounded-2xl bg-slate-950/90 border border-slate-900 shadow-2xl flex items-center justify-center p-8 overflow-hidden">
            {isRecording ? (
              <div className="text-center max-w-lg">
                <p className="font-dm font-bold text-2xl md:text-3xl text-white leading-relaxed tracking-wide bg-black/60 backdrop-blur-sm px-6 py-4 rounded-xl border border-white/5 inline-block shadow-lg animate-[fade-up_0.2s_ease-out]">
                  {transcriptionText || "Начните говорить..."}
                </p>
              </div>
            ) : (
              <div className="text-center p-6 space-y-3">
                <span className="text-4xl opacity-40">🎙️</span>
                <h4 className="font-syne font-bold text-sm text-slate-400">Включите микрофон</h4>
                <p className="text-xs text-slate-500 max-w-xs leading-normal mx-auto font-semibold">
                  Нажмите кнопку записи. Приложение расшифрует русскую и казахскую речь с высокой точностью.
                </p>
              </div>
            )}
            
            {/* Ambient glow when listening */}
            {isRecording && (
              <div className={`absolute inset-0 pointer-events-none border rounded-2xl animate-pulse ${
                aiStatus === "fallback" ? "border-cyan-400/20" : "border-accent/20"
              }`}></div>
            )}
          </div>

          {/* Controls button row */}
          <div className="flex gap-4">
            <button
              onClick={isRecording ? stopRecordingSession : startRecordingSession}
              className={`flex-1 py-4 rounded-2xl font-syne font-bold text-sm tracking-wide shadow-md transition-all duration-200 ${
                isRecording
                  ? "bg-slate-900 hover:bg-slate-800 text-white border border-slate-800"
                  : "bg-accent hover:bg-accent/90 text-white"
              }`}
            >
              {isRecording ? "■ Остановить запись" : "▶ Начать слушать"}
            </button>
            
            {transcriptionText && !isRecording && (
              <button
                onClick={handleSaveDialogue}
                className="px-6 py-4 rounded-2xl bg-green-500 hover:bg-green-600 text-white font-syne font-bold text-sm shadow-md transition-all duration-200"
              >
                Сохранить в историю
              </button>
            )}
          </div>
        </div>

        {/* Right Side: Dialogue History Logs (5 cols) */}
        <div className="lg:col-span-5 bg-white/40 backdrop-blur-xl border border-white/60 shadow-xl rounded-2xl p-6 flex flex-col gap-6">
          <div className="flex justify-between items-center">
            <h3 className="font-syne font-extrabold text-lg text-slate-800">История диалогов</h3>
            {history.length > 0 && (
              <button
                onClick={handleClearHistory}
                className="text-[10px] uppercase font-bold text-slate-400 hover:text-red-500 transition-colors"
              >
                Очистить
              </button>
            )}
          </div>

          <div className="flex-1 overflow-y-auto max-h-[420px] space-y-3 pr-1">
            {history.length === 0 ? (
              <div className="py-20 text-center text-slate-400 text-xs font-semibold">
                История пуста. Проведите первый диалог для сохранения записей.
              </div>
            ) : (
              history.map((item) => (
                <div
                  key={item.id}
                  className="p-4 rounded-xl bg-white/50 border border-white/80 shadow-sm space-y-2 text-left group"
                >
                  <div className="flex justify-between items-start">
                    <span className="text-[10px] text-slate-400 font-bold">
                      {new Date(item.created_at).toLocaleString("ru-RU", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                    </span>
                    <button
                      onClick={() => handleDeleteItem(item.id)}
                      className="text-slate-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity p-0.5"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                  <p className="font-dm text-xs text-slate-700 leading-relaxed font-semibold">
                    {item.text}
                  </p>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
