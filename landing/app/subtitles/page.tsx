"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { createClient } from "../../lib/supabase";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "https://hearless16-1.onrender.com";

const WINDOW_TIMESLICE_MS = 500;
const WINDOW_INTERVAL_MS = 3000;
const WINDOW_OVERLAP_MS = 1000;
const WINDOW_CHUNK_COUNT = (WINDOW_INTERVAL_MS + WINDOW_OVERLAP_MS) / WINDOW_TIMESLICE_MS;

const STALE_AFTER_MS = 8000;
const STALE_ALPHA = 0.4;

interface SubtitleSegment { start: number; end: number; text: string; }

function parseSRT(content: string): SubtitleSegment[] {
  const blocks = content.trim().split(/\n\s*\n/);
  const result: SubtitleSegment[] = [];
  for (const block of blocks) {
    const lines = block.trim().split("\n");
    if (lines.length < 3) continue;
    const timeLine = lines[1];
    const timeMatch = timeLine.match(/(\d{2}):(\d{2}):(\d{2})[,.](\d{3})\s*-->\s*(\d{2}):(\d{2}):(\d{2})[,.](\d{3})/);
    if (!timeMatch) continue;
    const toSec = (h: string, m: string, s: string, ms: string) =>
      parseInt(h) * 3600 + parseInt(m) * 60 + parseInt(s) + parseInt(ms) / 1000;
    const start = toSec(timeMatch[1], timeMatch[2], timeMatch[3], timeMatch[4]);
    const end = toSec(timeMatch[5], timeMatch[6], timeMatch[7], timeMatch[8]);
    const text = lines.slice(2).join(" ").replace(/<[^>]+>/g, "").trim();
    if (text) result.push({ start, end, text });
  }
  return result;
}

function parseVTT(content: string): SubtitleSegment[] {
  const lines = content.replace(/^WEBVTT[^\n]*\n/, "").trim().split("\n");
  const result: SubtitleSegment[] = [];
  let i = 0;
  while (i < lines.length) {
    const timeLine = lines[i];
    const timeMatch = timeLine.match(/(\d{2}):(\d{2}):(\d{2})\.(\d{3})\s*-->\s*(\d{2}):(\d{2}):(\d{2})\.(\d{3})/);
    if (timeMatch) {
      const toSec = (h: string, m: string, s: string, ms: string) =>
        parseInt(h) * 3600 + parseInt(m) * 60 + parseInt(s) + parseInt(ms) / 1000;
      const start = toSec(timeMatch[1], timeMatch[2], timeMatch[3], timeMatch[4]);
      const end = toSec(timeMatch[5], timeMatch[6], timeMatch[7], timeMatch[8]);
      i++;
      const textLines: string[] = [];
      while (i < lines.length && lines[i].trim() !== "") {
        textLines.push(lines[i].replace(/<[^>]+>/g, "").trim());
        i++;
      }
      const text = textLines.join(" ");
      if (text) result.push({ start, end, text });
    } else {
      i++;
    }
  }
  return result;
}

// 1. Демо-фразы для режима диктовки
const PHRASES: Record<string, string[]> = {
  "ҚАЗ": ["Сәлем, қаліңіз қалай?", "Менің атым Әліхан.", "Сізге көмек қажет пе?", "Рахмет! Сау болыңыз."],
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

const SPEAKER_COLORS = ["var(--accent)", "#10B981", "#F59E0B", "#8B5CF6"];
const SPEAKER_BG = ["rgba(0, 0, 0,0.10)", "rgba(16,185,129,0.10)", "rgba(245,158,11,0.10)", "rgba(139,92,246,0.10)"];
const SPEAKER_LABELS = ["Говорящий 1", "Говорящий 2", "Говорящий 3", "Говорящий 4"];

export default function SubtitlesPage() {
  const [mode, setMode] = useState<"speech" | "video">("speech"); // "speech" (диктовка) или "video" (видео)
  const [lang, setLang] = useState("РУС");
  const [phraseIdx, setPhraseIdx] = useState(0);
  const [chars, setChars] = useState(0);
  const [inputText, setInputText] = useState("");
  const [history, setHistory] = useState<string[]>([]);
  const [isMicActive, setIsMicActive] = useState(false);
  const [interimText, setInterimText] = useState("");
  const recognitionRef = useRef<any>(null);
  const isDemo = inputText.trim() === "" && !isMicActive;

  // Состояния для Replicate AI
  const [aiSummary, setAiSummary] = useState("");
  const [aiQuery, setAiQuery] = useState("");
  const [aiResponse, setAiResponse] = useState("");
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [useAiPunctuation, setUseAiPunctuation] = useState(false);

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

  // New: user-uploaded SRT subtitles for video mode
  const [userSubtitles, setUserSubtitles] = useState<SubtitleSegment[]>([]);

  // New: Whisper backend mode
  const [useWhisper, setUseWhisper] = useState(false);
  const [whisperStatus, setWhisperStatus] = useState<"idle" | "recording" | "processing">("idle");
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const micStreamRef = useRef<MediaStream | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const whisperIntervalRef = useRef<any>(null);
  const [token, setToken] = useState("");

  // New: auto-save state
  const [sessionSaved, setSessionSaved] = useState(false);

  // Screen audio capture for background subtitles
  const [isScreenCapturing, setIsScreenCapturing] = useState(false);
  const screenStreamRef = useRef<MediaStream | null>(null);
  const screenRecorderRef = useRef<MediaRecorder | null>(null);
  const screenChunksRef = useRef<Blob[]>([]);
  const screenHeaderChunkRef = useRef<Blob | null>(null);
  const screenIntervalRef = useRef<any>(null);
  const screenSendInFlightRef = useRef(false);
  const lastNonEmptyTextAtRef = useRef<number>(0);
  const [isTextStale, setIsTextStale] = useState(false);
  const staleCheckIntervalRef = useRef<any>(null);
  const [screenCaptureText, setScreenCaptureText] = useState("");

  // Map display lang labels to ISO codes for backend API
  const toLangCode = (l: string): string =>
    l === "ENG" ? "en" : l === "ҚАЗ" ? "kk" : "ru";

  // New: speaker diarization
  const [useDiarization, setUseDiarization] = useState(false);
  const useDiarizationRef = useRef(false);
  useEffect(() => { useDiarizationRef.current = useDiarization; }, [useDiarization]);
  interface SpeakerSegment { text: string; speaker: number; }
  const [speakerSegments, setSpeakerSegments] = useState<SpeakerSegment[]>([]);
  const diarizationStateRef = useRef({ current_speaker: 0, last_end: 0.0 });

  //Состояния для плавающего окна (Picture-in-Picture)
  const [isPipActive, setIsPipActive] = useState(false);
  const [activePipText, setActivePipText] = useState("");
  const lastSubUpdateTimeRef = useRef<number>(Date.now());

  // Референсы для видео и веб-аудио
  const videoElementRef = useRef<HTMLVideoElement | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sourceRef = useRef<MediaElementAudioSourceNode | null>(null);
  const animationRef = useRef<number | null>(null);

  // Референсы для Picture-in-Picture
  const pipCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const pipVideoRef = useRef<HTMLVideoElement | null>(null);

  // --- ЭФФЕКТ ДЛЯ Р Р•Р–РРњРђ Р”РРљРўРћР’РљР ---
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

  const displayText = isMicActive
    ? interimText
    : (isDemo ? PHRASES[lang][phraseIdx].slice(0, chars) : inputText);

  // --- REPLICATE AI ---
  const callReplicateAI = async (prompt: string, textContent: string) => {
    try {
      const res = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, text: textContent }),
      });
      if (!res.ok) return null;
      const data = await res.json();
      return data.result || null;
    } catch {
      return null;
    }
  };

  // Метод для автоматической пунктуации фразы
  const getPunctuationWithAI = async (rawText: string) => {
    const prompt = "Ты — AI-редактор. Твоя задача — расставить знаки препинания, исправить заглавные буквы и мелкие опечатки в предложенном тексте распознанной русской, казахской или английской речи. Верни ТОЛЬКО исправленный текст, без каких-либо вводных слов или кавычек.";
    const cleaned = await callReplicateAI(prompt, rawText);
    return cleaned || rawText;
  };

  // Генерация конспекта
  const generateSummary = async () => {
    const fullTranscript = [...history, displayText].filter(Boolean).join("\n");
    if (!fullTranscript.trim()) {
      alert("РСЃС‚РѕСЂРёСЏ транскрипта пуста. Пожалуйста, наговорите или введите текст сначала.");
      return;
    }
    
    setIsAiLoading(true);
    const prompt = "Ты — профессиональный ассистент по доступности. Сделай краткое конспектирование (в виде тезисов и bullet points на русском языке) для предложенного транскрипта. Выдели главные мысли, решения и ключевые факты.";
    const result = await callReplicateAI(prompt, fullTranscript);
    if (result) {
      setAiSummary(result);
    } else {
      alert("Не удалось сгенерировать конспект. Проверьте соединение с интернетом или настройки ключа.");
    }
    setIsAiLoading(false);
  };

  // Чат с AI по содержанию
  const askAiAboutTranscript = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!aiQuery.trim()) return;
    
    const fullTranscript = [...history, displayText].filter(Boolean).join("\n");
    if (!fullTranscript.trim()) {
      alert("РСЃС‚РѕСЂРёСЏ пуста. Задавать вопросы пока не по чему.");
      return;
    }
    
    setIsAiLoading(true);
    setAiResponse("AI думает...");
    const prompt = `Пользователь задает вопрос: "${aiQuery}". Ответь на него коротко и содержательно, основываясь исключительно на содержании предложенного транскрипта. Если в тексте нет ответа на этот вопрос, так и скажи.`;
    const result = await callReplicateAI(prompt, fullTranscript);
    if (result) {
      setAiResponse(result);
    } else {
      setAiResponse("Ошибка при получении ответа от AI.");
    }
    setIsAiLoading(false);
  };

  // --- Р›РћР“РРљРђ РАБОТЫ РњРРљР РћР¤РћРќРђ (WEB SPEECH API) ---
  // Load auth token for backend Whisper
  useEffect(() => {
    try {
      createClient().auth.getSession().then(({ data: { session } }) => {
        setToken(session?.access_token ?? "");
      }).catch(() => {});
    } catch {}
  }, []);

  const saveSession = async (historyArr: string[]) => {
    if (!token || historyArr.length === 0 || sessionSaved) return;
    try {
      await fetch(`${API_URL}/subtitles/`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ text: historyArr.join("\n"), language: toLangCode(lang) }),
      });
      setSessionSaved(true);
    } catch {}
  };

  const startWhisperRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      micStreamRef.current = stream;
      setWhisperStatus("recording");
      setIsMicActive(true);
      isMicActiveRef.current = true;
      audioChunksRef.current = [];

      // Browser SpeechRecognition runs in parallel for real-time interim display —
      // skipped for Kazakh, which has no real kk-KZ support and must go through
      // FreedomSpeech only.
      const SpeechRecognitionAPI = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognitionAPI && langRef.current !== "ҚАЗ") {
        const interimRec = new SpeechRecognitionAPI();
        interimRec.continuous = true;
        interimRec.interimResults = true;
        const lc = toLangCode(langRef.current);
        interimRec.lang = lc === "en" ? "en-US" : lc === "kk" ? "kk-KZ" : "ru-RU";
        interimRec.onresult = (event: any) => {
          let interim = "";
          for (let i = event.resultIndex; i < event.results.length; ++i) {
            if (!event.results[i].isFinal) interim += event.results[i][0].transcript;
          }
          if (isMicActiveRef.current) setInterimText(interim || "Слушаю (Replicate AI)...");
        };
        interimRec.onend = () => {
          if (isMicActiveRef.current) { try { interimRec.start(); } catch {} }
        };
        recognitionRef.current = interimRec;
        interimRec.start();
      }
      setInterimText("Слушаю (Replicate AI)...");

      const sendChunk = async () => {
        const chunks = [...audioChunksRef.current];
        audioChunksRef.current = [];
        if (chunks.length === 0) return;
        const blob = new Blob(chunks, { type: "audio/webm" });
        setWhisperStatus("processing");
        try {
          const fd = new FormData();
          fd.append("file", blob, "audio.webm");
          fd.append("language", toLangCode(langRef.current));
          const res = await fetch("/api/transcribe", {
            method: "POST",
            body: fd,
          });
          if (res.ok) {
            const data = await res.json();
            if (data.text?.trim()) setHistory(prev => [...prev, data.text.trim()]);
          }
        } catch {}
        if (isMicActiveRef.current) setWhisperStatus("recording");
      };

      const startRecorder = () => {
        const mr = new MediaRecorder(stream, { mimeType: "audio/webm" });
        mr.ondataavailable = (e) => { if (e.data.size > 0) audioChunksRef.current.push(e.data); };
        mr.start();
        mediaRecorderRef.current = mr;
      };

      startRecorder();
      whisperIntervalRef.current = setInterval(async () => {
        if (!isMicActiveRef.current) return;
        if (mediaRecorderRef.current?.state === "recording") {
          mediaRecorderRef.current.stop();
          await new Promise<void>(r => { mediaRecorderRef.current!.onstop = () => r(); });
          if (isMicActiveRef.current) startRecorder();
          sendChunk();
        }
      }, 3000);
    } catch { setIsMicActive(false); isMicActiveRef.current = false; setWhisperStatus("idle"); alert("Нет доступа к микрофону"); }
  };

  const stopWhisperRecording = () => {
    clearInterval(whisperIntervalRef.current);
    isMicActiveRef.current = false;
    if (mediaRecorderRef.current?.state === "recording") mediaRecorderRef.current.stop();
    micStreamRef.current?.getTracks().forEach((t) => t.stop());
    micStreamRef.current = null;
    if (recognitionRef.current) { try { recognitionRef.current.stop(); } catch {} recognitionRef.current = null; }
    setIsMicActive(false);
    setWhisperStatus("idle");
    setInterimText("");
    diarizationStateRef.current = { current_speaker: 0, last_end: 0.0 };
    saveSession(history);
  };

  const startScreenCapture = async () => {
    try {
      const stream = await (navigator.mediaDevices as any).getDisplayMedia({
        video: true,
        audio: { echoCancellation: false, noiseSuppression: false, sampleRate: 44100 },
      });

      const audioTracks = stream.getAudioTracks();
      if (audioTracks.length === 0) {
        stream.getTracks().forEach((t: MediaStreamTrack) => t.stop());
        alert("Аудио не найдено. Выберите вкладку и убедитесь, что включён звук.");
        return;
      }

      // Останавливаем видео-трек — он нам не нужен
      stream.getVideoTracks().forEach((t: MediaStreamTrack) => t.stop());

      const audioStream = new MediaStream(audioTracks);
      screenStreamRef.current = audioStream;
      screenChunksRef.current = [];
      screenHeaderChunkRef.current = null;
      setIsScreenCapturing(true);
      lastNonEmptyTextAtRef.current = Date.now();
      setIsTextStale(false);
      setScreenCaptureText("");

      // Открываем PiP автоматически
      if (!document.pictureInPictureElement) {
        setTimeout(() => togglePipSubtitles(), 300);
      }

      // A single continuous recorder (never stopped mid-session) emits a
      // small blob every WINDOW_TIMESLICE_MS. The very first blob carries
      // the WebM header required to decode any blob built from these chunks
      // as a standalone file; later chunks are independent clusters that
      // decode fine appended after that header even with older ones dropped.
      const mr = new MediaRecorder(audioStream, { mimeType: "audio/webm" });
      mr.ondataavailable = (e: BlobEvent) => {
        if (e.data.size === 0) return;
        if (!screenHeaderChunkRef.current) {
          screenHeaderChunkRef.current = e.data;
        } else {
          screenChunksRef.current.push(e.data);
          if (screenChunksRef.current.length > WINDOW_CHUNK_COUNT) {
            screenChunksRef.current = screenChunksRef.current.slice(-WINDOW_CHUNK_COUNT);
          }
        }
      };
      mr.start(WINDOW_TIMESLICE_MS);
      screenRecorderRef.current = mr;

      // Every WINDOW_INTERVAL_MS, send header + the last WINDOW_CHUNK_COUNT
      // chunks (~WINDOW_INTERVAL_MS + WINDOW_OVERLAP_MS of audio). Consecutive
      // sends overlap by WINDOW_OVERLAP_MS, so a word split by the old hard
      // 3s boundary now lands whole inside at least one request.
      const sendWindow = async () => {
        // Replicate transcription can take longer than WINDOW_INTERVAL_MS
        // (cold starts routinely exceed it); without this guard the next
        // tick fires anyway, and whichever overlapping request resolves
        // last wins the UI update — sometimes an older, slower response
        // landing after a newer one, showing captions out of order.
        if (screenSendInFlightRef.current) return;
        const header = screenHeaderChunkRef.current;
        if (!header || screenChunksRef.current.length === 0) return;
        const windowChunks = screenChunksRef.current.slice(-WINDOW_CHUNK_COUNT);
        const blob = new Blob([header, ...windowChunks], { type: "audio/webm" });
        screenSendInFlightRef.current = true;
        try {
          const fd = new FormData();
          fd.append("file", blob, "audio.webm");
          fd.append("language", toLangCode(langRef.current));
          const res = await fetch("/api/transcribe", { method: "POST", body: fd });
          if (res.ok) {
            const data = await res.json();
            if (data.text?.trim()) {
              setHistory(prev => [...prev, data.text.trim()]);
              setActivePipText(data.text.trim());
              setScreenCaptureText(data.text.trim());
              lastNonEmptyTextAtRef.current = Date.now();
              setIsTextStale(false);
            }
          }
        } catch {} finally {
          screenSendInFlightRef.current = false;
        }
      };

      screenIntervalRef.current = setInterval(sendWindow, WINDOW_INTERVAL_MS);
      staleCheckIntervalRef.current = setInterval(() => {
        if (Date.now() - lastNonEmptyTextAtRef.current > STALE_AFTER_MS) setIsTextStale(true);
      }, 1000);

      audioTracks[0].addEventListener("ended", () => stopScreenCapture());
    } catch (err: any) {
      if (err.name !== "NotAllowedError") {
        alert("Не удалось захватить аудио: " + err.message);
      }
    }
  };

  const stopScreenCapture = () => {
    clearInterval(screenIntervalRef.current);
    clearInterval(staleCheckIntervalRef.current);
    if (screenRecorderRef.current?.state === "recording") screenRecorderRef.current.stop();
    screenStreamRef.current?.getTracks().forEach((t: MediaStreamTrack) => t.stop());
    screenStreamRef.current = null;
    screenRecorderRef.current = null;
    screenChunksRef.current = [];
    screenHeaderChunkRef.current = null;
    screenSendInFlightRef.current = false;
    setIsScreenCapturing(false);
    setIsTextStale(false);
    setScreenCaptureText("");
  };

  const handleSubtitleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const content = ev.target?.result as string;
      const parsed = file.name.endsWith(".vtt") ? parseVTT(content) : parseSRT(content);
      setUserSubtitles(parsed);
      setVideoSubtitle("");
    };
    reader.readAsText(file, "utf-8");
    e.target.value = "";
  };

  const speechSimIntervalRef = useRef<any>(null);
  const runSpeechAudioSimulation = () => {
    if (speechSimIntervalRef.current) clearInterval(speechSimIntervalRef.current);
    speechSimIntervalRef.current = setInterval(() => {
      if (recognitionRef.current && isMicActive) {
        setFrequencyData([
          Math.max(4, Math.round(Math.random() * 22)),
          Math.max(4, Math.round(Math.random() * 26)),
          Math.max(4, Math.round(Math.random() * 20)),
          Math.max(4, Math.round(Math.random() * 28)),
          Math.max(4, Math.round(Math.random() * 18)),
        ]);
      } else {
        clearInterval(speechSimIntervalRef.current);
      }
    }, 100);
  };

  // Реф для отслеживания статуса записи без замыканий в колбеках Speech API
  const isMicActiveRef = useRef(false);
  useEffect(() => {
    isMicActiveRef.current = isMicActive;
  }, [isMicActive]);

  // Ref for current language so in-flight recording callbacks (created via
  // stale closures across renders) always pick up the latest choice.
  const langRef = useRef(lang);
  useEffect(() => {
    langRef.current = lang;
  }, [lang]);

  // Browser Web Speech API has no kk-KZ support in practice — Kazakh always
  // goes through Replicate/Whisper, which transcribes it correctly.
  useEffect(() => {
    if (lang === "ҚАЗ" && !useWhisper) setUseWhisper(true);
  }, [lang, useWhisper]);

  const handleLangChange = (newLang: string) => {
    const wasWhisper = useWhisper;
    const forceWhisper = newLang === "ҚАЗ";
    const nowWhisper = wasWhisper || forceWhisper;

    langRef.current = newLang;
    setLang(newLang);
    setPhraseIdx(0);
    setChars(0);
    if (forceWhisper) setUseWhisper(true);

    if (!isMicActiveRef.current) return;

    if (wasWhisper && nowWhisper) {
      // Recording keeps running uninterrupted; the next chunk already
      // picks up langRef.current, so no restart (and no audio gap) needed.
      return;
    }

    if (wasWhisper) {
      stopWhisperRecording();
    } else {
      if (recognitionRef.current) recognitionRef.current.stop();
      setIsMicActive(false);
      isMicActiveRef.current = false;
      setInterimText("");
    }

    setTimeout(() => {
      if (nowWhisper) startWhisperRecording();
      else toggleMicrophone();
    }, 400);
  };

  const toggleMicrophone = () => {
    if (typeof window === "undefined") return;

    if (isMicActiveRef.current) {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      setIsMicActive(false);
      setInterimText("");
      saveSession(history);
      return;
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("К сожалению, Web Speech API (распознавание речи) не поддерживается вашим браузером. Пожалуйста, используйте Google Chrome или Microsoft Edge.");
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;

      let recognitionLang = "ru-RU";
      if (langRef.current === "ҚАЗ") recognitionLang = "kk-KZ";
      else if (langRef.current === "ENG") recognitionLang = "en-US";
      recognition.lang = recognitionLang;

      recognition.onstart = () => {
        setIsMicActive(true);
        setInterimText("Слушаю вас...");
        runSpeechAudioSimulation();
      };

      recognition.onresult = (event: any) => {
        let interim = "";
        let final = "";

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          const result = event.results[i];
          if (result.isFinal) {
            final += result[0].transcript + " ";
          } else {
            interim += result[0].transcript;
          }
        }

        if (final.trim()) {
          const textToProcess = final.trim();
          if (useAiPunctuation) {
            setHistory((prev) => {
              const updated = [...prev, textToProcess];
              const targetIdx = updated.length - 1; // Запоминаем точный индекс фразы
              
              getPunctuationWithAI(textToProcess).then((punctuatedText) => {
                if (punctuatedText && punctuatedText !== textToProcess) {
                  setHistory((currentHistory) => {
                    const nextHistory = [...currentHistory];
                    // Обновляем только если на этом индексе все еще лежит исходный сырой текст
                    if (nextHistory[targetIdx] === textToProcess) {
                      nextHistory[targetIdx] = punctuatedText;
                    }
                    return nextHistory;
                  });
                }
              });
              return updated;
            });
          } else {
            setHistory((prev) => [...prev, textToProcess]);
          }
        }
        setInterimText(interim);
      };

      recognition.onerror = (event: any) => {
        console.error("Speech recognition error:", event.error);
        
        // Отключаем микрофон только при фатальных ошибках доступа или оборудования
        if (event.error === "not-allowed" || event.error === "audio-capture") {
          if (event.error === "not-allowed") {
            alert("Доступ к микрофону заблокирован. Пожалуйста, разрешите доступ в настройках браузера.");
          } else {
            alert("Не удалось обнаружить микрофон. Проверьте подключение устройства.");
          }
          setIsMicActive(false);
          setInterimText("");
        }
        // Ошибки тишины (no-speech) или сброса (aborted) игнорируем, onend сделает мягкий перезапуск
      };

      recognition.onend = () => {
        // Если пользователь не нажимал кнопку выключения, перезапускаем запись
        if (isMicActiveRef.current) {
          try {
            recognition.start();
          } catch (e) {
            console.warn("Попытка авто-перезапуска SpeechRecognition после onend:", e);
          }
        } else {
          setIsMicActive(false);
          setInterimText("");
        }
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (e) {
      console.error(e);
      setIsMicActive(false);
      setInterimText("");
    }
  };

  useEffect(() => {
    return () => {
      if (speechSimIntervalRef.current) clearInterval(speechSimIntervalRef.current);
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      // Stop any in-progress mic dictation or background screen/tab capture
      // so the browser's mic/tab-share indicator doesn't stay on after
      // navigating away — neither path had unmount cleanup before.
      clearInterval(whisperIntervalRef.current);
      micStreamRef.current?.getTracks().forEach((t) => t.stop());
      clearInterval(screenIntervalRef.current);
      clearInterval(staleCheckIntervalRef.current);
      if (screenRecorderRef.current?.state === "recording") screenRecorderRef.current.stop();
      screenStreamRef.current?.getTracks().forEach((t: MediaStreamTrack) => t.stop());
    };
  }, []);

  // Эффект для формирования текста субтитров для PiP-окна с тайм-аутом очистки в 8 секунд
  useEffect(() => {
    let text = "";
    if (mode === "speech") {
      if (isMicActive) {
        const lastPhrase = history[history.length - 1] || "";
        const cleanInterim = (interimText && interimText !== "Слушаю вас...") ? interimText : "";
        if (cleanInterim) {
          text = lastPhrase ? `${lastPhrase}\n${cleanInterim}` : cleanInterim;
        } else {
          text = lastPhrase;
        }
      } else {
        text = displayText;
      }
    } else {
      text = videoSubtitle;
    }

    setActivePipText(text);

    if (text && text !== "Слушаю вас..." && text !== "Ожидание начала диктовки...") {
      lastSubUpdateTimeRef.current = Date.now();
      const timer = setTimeout(() => {
        setActivePipText("");
      }, 8000);
      return () => clearTimeout(timer);
    }
  }, [displayText, interimText, videoSubtitle, history, isMicActive, mode]);

  // Эффект для синхронизации субтитров плеера с вводом микрофона при включенной записи в режиме видео
  useEffect(() => {
    if (mode === "video" && isMicActive) {
      const lastPhrase = history[history.length - 1] || "";
      const cleanInterim = (interimText && interimText !== "Слушаю вас...") ? interimText : "";
      const text = cleanInterim
        ? (lastPhrase ? `${lastPhrase}\n${cleanInterim}` : cleanInterim)
        : lastPhrase;
      setVideoSubtitle(text);
    }
  }, [history, interimText, isMicActive, mode]);

  // --- BROADCAST CHANNEL РЎРРќРҐР РћРќРР—РђР¦РРЇ ---
  const channelRef = useRef<BroadcastChannel | null>(null);

  // Реф для хранения последнего актуального состояния (во избежание stale closures)
  const stateRef = useRef({
    mode, lang, phraseIdx, chars, inputText, history, fontSize, textColor, bgOpacity, alignment, videoSubtitle, isVideoPlaying, displayText, aiSummary, aiResponse
  });

  useEffect(() => {
    stateRef.current = {
      mode, lang, phraseIdx, chars, inputText, history, fontSize, textColor, bgOpacity, alignment, videoSubtitle, isVideoPlaying, displayText, aiSummary, aiResponse
    };
  }, [mode, lang, phraseIdx, chars, inputText, history, fontSize, textColor, bgOpacity, alignment, videoSubtitle, isVideoPlaying, displayText, aiSummary, aiResponse]);

  // Функция для отправки полного состояния
  const sendStateToChannel = () => {
    if (channelRef.current) {
      const s = stateRef.current;
      channelRef.current.postMessage({
        type: "sync-state",
        payload: {
          mode: s.mode,
          lang: s.lang,
          phraseIdx: s.phraseIdx,
          chars: s.chars,
          inputText: s.inputText,
          history: s.history,
          fontSize: s.fontSize,
          textColor: s.textColor,
          bgOpacity: s.bgOpacity,
          alignment: s.alignment,
          videoSubtitle: s.videoSubtitle,
          currentTime: videoElementRef.current?.currentTime || 0,
          isVideoPlaying: s.isVideoPlaying,
          subtitlesList: userSubtitles.length > 0 ? userSubtitles : DEMO_VIDEO_SUBTITLES,
          displayText: s.displayText,
          aiSummary: s.aiSummary,
          aiResponse: s.aiResponse,
          speakerSegments,
          useDiarization,
        },
      });
    }
  };

  // РРЅРёС†РёР°Р»РёР·Р°С†РёСЏ канала и слушателей
  useEffect(() => {
    if (typeof window !== "undefined") {
      const channel = new BroadcastChannel("hearless-subtitles");
      channelRef.current = channel;

      const handleMessage = (event: MessageEvent) => {
        const { type, payload } = event.data;
        if (type === "seek-video") {
          if (videoElementRef.current) {
            videoElementRef.current.currentTime = payload.time;
          }
        } else if (type === "request-sync") {
          sendStateToChannel();
        }
      };

      channel.addEventListener("message", handleMessage);

      // Сразу шлем статус при монтировании
      sendStateToChannel();

      return () => {
        channel.removeEventListener("message", handleMessage);
        channel.close();
      };
    }
  }, []);

  // Отправка состояния при любом изменении
  useEffect(() => {
    sendStateToChannel();
  }, [mode, lang, phraseIdx, chars, inputText, history, fontSize, textColor, bgOpacity, alignment, videoSubtitle, isVideoPlaying, displayText, aiSummary, aiResponse]);

  // --- РРќРР¦РРђР›РР—РђР¦РРЇ Р ОБРАБОТКА ВЕБ-РђРЈР”РРћ ДЛЯ Р’РР—РЈРђР›РР—РђР¦РР ---
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

  // --- ОБРАБОТКА РР—РњР•РќР•РќРР™ Р’РР”Р•Рћ ---
  const handleTimeUpdate = () => {
    const video = videoElementRef.current;
    if (!video) return;
    const time = video.currentTime;

    // Если микрофон активен, субтитры генерируются микрофоном, а не файлом субтитров
    if (isMicActive) {
      if (channelRef.current) {
        channelRef.current.postMessage({
          type: "time-update",
          payload: {
            currentTime: time,
            videoSubtitle: videoSubtitle,
          }
        });
      }
      return;
    }

    // РС‰РµРј соответствующий блок субтитров для демо-видео
    const isDemoVideo = videoSrc === "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4";
    const subtitleSource = userSubtitles.length > 0 ? userSubtitles : (isDemoVideo ? DEMO_VIDEO_SUBTITLES : []);
    const subtitleText = subtitleSource.find(sub => time >= sub.start && time <= sub.end)?.text || "";
    setVideoSubtitle(subtitleText);

    // Отправляем время и активный субтитр в канал
    if (channelRef.current) {
      channelRef.current.postMessage({
        type: "time-update",
        payload: {
          currentTime: time,
          videoSubtitle: subtitleText,
        }
      });
    }
  };

  const handlePlayPause = (playing: boolean) => {
    setIsVideoPlaying(playing);
    if (playing && videoElementRef.current) {
      // РРЅРёС†РёР°Р»РёР·РёСЂСѓРµРј аудиоанализатор при первом воспроизведении
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

  // --- Р›РћР“РРљРђ ПЛАВАЮЩЕГО ОКНА (PICTURE IN PICTURE) ---
  
  // Автоперенос слов для рисования на Canvas (с поддержкой \n и автопереноса длинных строк)
  const wrapText = (ctx: CanvasRenderingContext2D, text: string, x: number, y: number, maxWidth: number, lineHeight: number) => {
    const manualLines = text.split("\n");
    const lines: string[] = [];

    manualLines.forEach((mLine) => {
      const words = mLine.split(" ");
      let line = "";
      for (let n = 0; n < words.length; n++) {
        const testLine = line + words[n] + " ";
        const metrics = ctx.measureText(testLine);
        const testWidth = metrics.width;
        if (testWidth > maxWidth && n > 0) {
          lines.push(line);
          line = words[n] + " ";
        } else {
          line = testLine;
        }
      }
      lines.push(line);
    });

    const totalHeight = lines.length * lineHeight;
    let startY = y - totalHeight / 2 + lineHeight / 2;

    lines.forEach((l) => {
      ctx.fillText(l.trim(), x, startY);
      startY += lineHeight;
    });
  };

  // Отрисовка субтитров на Canvas
  const drawPipSubtitles = () => {
    const canvas = pipCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Очистка и заливка темного фона (высококонтрастная подложка)
    ctx.fillStyle = "rgba(9, 13, 22, 0.95)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Добавляем красивую полупрозрачную рамку для эстетики
    ctx.strokeStyle = "rgba(34, 211, 238, 0.3)";
    ctx.lineWidth = 6;
    ctx.strokeRect(3, 3, canvas.width - 6, canvas.height - 6);

    // Отрисовка текста субтитров
    ctx.fillStyle = textColor;
    ctx.globalAlpha = isTextStale ? STALE_ALPHA : 1;
    ctx.font = "bold 32px sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    const text = isScreenCapturing
      ? (screenCaptureText || "Ожидание звукового потока...")
      : (activePipText || (isMicActive ? "Слушаю вас..." : "Ожидание звукового потока..."));
    wrapText(ctx, text, canvas.width / 2, canvas.height / 2, canvas.width - 60, 42);
    ctx.globalAlpha = 1;
  };

  // Переключение состояния Picture-in-Picture
  const togglePipSubtitles = async () => {
    const pipVideo = pipVideoRef.current;
    const canvas = pipCanvasRef.current;
    if (!pipVideo || !canvas) return;

    if (document.pictureInPictureElement) {
      await document.exitPictureInPicture();
      setIsPipActive(false);
    } else {
      try {
        // Отрисовываем стартовый кадр
        drawPipSubtitles();

        // Захватываем видеопоток с Canvas (10 кадров в секунду для экономии ресурсов)
        const stream = (canvas as any).captureStream(10);
        pipVideo.srcObject = stream;

        await pipVideo.play();
        await pipVideo.requestPictureInPicture();
        setIsPipActive(true);

        // Отслеживаем закрытие окна пользователем вручную
        pipVideo.addEventListener("leavepictureinpicture", () => {
          setIsPipActive(false);
        }, { once: true });
      } catch (err) {
        console.error("Ошибка запуска Picture-in-Picture: ", err);
        alert("Режим Картинка-в-картинке не поддерживается вашим браузером или заблокирован.");
      }
    }
  };

  // Реактивный перерендер плавающего окна при изменении текста или цвета
  useEffect(() => {
    if (isPipActive) {
      drawPipSubtitles();
    }
  }, [activePipText, textColor, isPipActive, mode, isMicActive, isTextStale, screenCaptureText, isScreenCapturing]);

  // Очистка анимации при размонтировании
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
    <div style={{ minHeight: "100vh" }}>
      {/* Скрытые элементы для реализации PiP хака через Canvas */}
      <canvas ref={pipCanvasRef} width="800" height="240" style={{ display: "none" }} />
      <video ref={pipVideoRef} style={{ display: "none" }} playsInline muted />

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
        @keyframes mic-pulse {
          0% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.4); }
          70% { box-shadow: 0 0 0 10px rgba(239, 68, 68, 0); }
          100% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0); }
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
              fontFamily: "'Plus Jakarta Sans', sans-serif",
              cursor: "pointer",
              background: mode === "speech" ? "var(--gradient)" : "transparent",
              color: mode === "speech" ? "white" : "var(--text)",
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
              fontFamily: "'Plus Jakarta Sans', sans-serif",
              cursor: "pointer",
              background: mode === "video" ? "var(--gradient)" : "transparent",
              color: mode === "video" ? "white" : "var(--text)",
              transition: "all 0.2s ease"
            }}
          >
            🎬 Видео и Фильмы
          </button>
        </div>

        {/* Переключатель языка субтитров — всегда виден */}
        <div style={{ display: "flex", gap: 8, marginBottom: 24, flexWrap: "wrap" }}>
          {[
            { code: "ҚАЗ", label: "KAZ 🇰🇿" },
            { code: "РУС", label: "RUS 🇷🇺" },
            { code: "ENG", label: "ENG 🇬🇧" },
          ].map(({ code, label }) => (
            <button
              key={code}
              onClick={() => handleLangChange(code)}
              style={{
                padding: "10px 26px",
                borderRadius: 50,
                border: lang === code ? "none" : "1.5px solid var(--border)",
                background: lang === code ? "var(--gradient)" : "var(--bgCard)",
                color: lang === code ? "white" : "var(--textSecondary)",
                fontFamily: "'Plus Jakarta Sans', sans-serif",
                fontWeight: 700,
                fontSize: 14,
                cursor: "pointer",
                transition: "all 0.2s",
                boxShadow: lang === code ? "0 4px 16px var(--accentGlow)" : "none",
              }}
            >
              {label}
            </button>
          ))}
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 280px", gap: 24, alignItems: "start" }} className="grid-cols-1 lg:grid-cols-[1fr_280px]">
          
          {/* ==========================================
              ЛЕВЫЙ БЛОК: ЭКРАН Р ВВОД
             ========================================== */}
          <div>
            {mode === "speech" ? (
              // --- Р Р•Р–РРњ 1: РўР РђРќРЎРљР РР‘РђР¦РРЇ Р Р•Р§Р (Р”РРљРўРћР’РљРђ) ---
              <div>
                <div className="glass-display" style={{
                  background: "var(--bgCard)",
                  borderRadius: "24px",
                  padding: "36px 32px",
                  border: "1px solid var(--border)",
                  minHeight: 220,
                  marginBottom: 24,
                  boxShadow: "var(--shadow)",
                  position: "relative",
                  overflow: "hidden",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between"
                }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
                    <span style={{ fontSize: 11, color: "var(--textMuted)", fontWeight: 600, textTransform: "uppercase", letterSpacing: 1 }}>
                      {isDemo ? "Демо-поток речи" : "Пользовательский текст"}
                    </span>
                    <div className="soundwave-indicator">
                      {frequencyData.map((height, i) => (
                        <div key={i} className="sound-bar" style={{ height, background: textColor }} />
                      ))}
                    </div>
                  </div>

                  {/* Speaker diarization view */}
                  {useDiarization && speakerSegments.length > 0 ? (
                    <div style={{ display: "flex", flexDirection: "column", gap: 10, maxHeight: 260, overflowY: "auto" }}>
                      {speakerSegments.map((seg, idx) => {
                        const si = seg.speaker % 4;
                        const isEven = seg.speaker % 2 === 0;
                        return (
                          <div key={idx} style={{ display: "flex", alignItems: "flex-start", gap: 10, flexDirection: isEven ? "row" : "row-reverse" }}>
                            <div style={{ width: 34, height: 34, borderRadius: "50%", background: SPEAKER_COLORS[si], display: "flex", alignItems: "center", justifyContent: "center", color: "white", fontWeight: 800, fontSize: 13, flexShrink: 0 }}>
                              S{seg.speaker + 1}
                            </div>
                            <div style={{ maxWidth: "72%" }}>
                              <div style={{ fontSize: 11, fontWeight: 700, color: SPEAKER_COLORS[si], marginBottom: 3, textAlign: isEven ? "left" : "right" }}>
                                {SPEAKER_LABELS[si]}
                              </div>
                              <div style={{ background: SPEAKER_BG[si], border: `1px solid ${SPEAKER_COLORS[si]}33`, borderRadius: isEven ? "4px 16px 16px 16px" : "16px 4px 16px 16px", padding: "8px 14px", fontSize: `${Math.max(14, fontSize - 4)}px`, lineHeight: 1.5, color: "var(--text)", fontWeight: 500 }}>
                                {seg.text}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                      {isMicActive && (
                        <div style={{ display: "flex", alignItems: "center", gap: 8, paddingLeft: 44 }}>
                          <span style={{ color: "var(--accent)", fontWeight: 700, fontSize: 14 }}>{interimText || "Слушаю..."}</span>
                          <span style={{ display: "inline-block", width: 3, height: 18, background: "var(--accent)", animation: "cursor-blink 0.8s step-end infinite" }} />
                        </div>
                      )}
                    </div>
                  ) : (
                  <div style={{
                    fontSize: `${fontSize}px`,
                    fontWeight: 600,
                    lineHeight: 1.6,
                    textAlign: alignment,
                    minHeight: 90,
                    color: "var(--text)"
                  }}>
                    {isMicActive ? (
                      <>
                        {history.slice(-3).map((ph, idx) => (
                          <span key={idx} style={{ color: "var(--textMuted)", marginRight: 10, fontWeight: 500 }}>
                            {ph}
                          </span>
                        ))}
                        <span style={{ color: "var(--accent)", fontWeight: 800 }}>
                          {interimText || "Слушаю вас..."}
                        </span>
                      </>
                    ) : isDemo ? (
                      <>
                        {PHRASES[lang].slice(0, phraseIdx).map((ph, idx) => (
                          <span key={idx} style={{ color: "var(--textMuted)", marginRight: 10, fontWeight: 500 }}>
                            {ph}
                          </span>
                        ))}
                        <span style={{ color: "var(--accent)", fontWeight: 800 }}>
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
                              <span key={idx} style={{ color: isLast ? "var(--accent)" : "var(--textMuted)", fontWeight: isLast ? 800 : 500, marginRight: 10 }}>
                                {line}
                              </span>
                            );
                          });
                        })()}
                      </>
                    )}
                    <span style={{ display: "inline-block", width: 3, height: fontSize - 4, background: "var(--accent)", marginLeft: 6, verticalAlign: "middle", animation: "cursor-blink 0.8s step-end infinite" }} />
                  </div>
                  )}

                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 20, paddingTop: 16, borderTop: "1px solid var(--border)" }}>
                    <span style={{ fontSize: 11, color: "var(--textMuted)" }}>
                      Язык: {lang} • Размер: {fontSize}px
                    </span>
                    <span style={{ fontSize: 11, color: "var(--textMuted)" }}>
                      Hearless v1.0
                    </span>
                  </div>
                </div>

                <div style={{ background: "var(--bgCard)", borderRadius: "20px", padding: "24px", border: "1px solid var(--border)", boxShadow: "var(--shadow)" }}>
                  <textarea value={inputText} onChange={e => setInputText(e.target.value)} placeholder={lang === "ҚАЗ" ? "Қазақша мәтін теріңіз..." : "Введите текст, чтобы симулировать речь на лету..."} rows={2}
                    style={{ width: "100%", padding: "16px 20px", borderRadius: "14px", border: "1px solid var(--border)", background: "var(--bgLight)", color: "var(--text)", fontSize: 15, fontFamily: "'Plus Jakarta Sans', sans-serif", resize: "none", outline: "none", marginBottom: 16, transition: "border 0.2s" }}
                    className="focus:border-sky-500" />

                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
                    <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
                      <button
                        onClick={() => useWhisper ? (isMicActive ? stopWhisperRecording() : startWhisperRecording()) : toggleMicrophone()}
                        disabled={isScreenCapturing}
                        className="btn"
                        style={{
                          padding: "12px 24px",
                          fontSize: 13,
                          borderRadius: 50,
                          background: isMicActive ? "var(--sos)" : "var(--gradient)",
                          color: "white",
                          boxShadow: isMicActive ? "0 4px 12px rgba(239, 68, 68, 0.3)" : "0 4px 24px var(--accentGlow)",
                          animation: isMicActive ? "mic-pulse 1.5s infinite" : "none",
                          border: "none",
                          cursor: isScreenCapturing ? "default" : "pointer",
                          opacity: isScreenCapturing ? 0.5 : 1,
                        }}
                      >
                        {isMicActive
                          ? (useWhisper ? "⏹ Остановить Replicate AI" : "🛑 Выключить микрофон")
                          : (useWhisper ? "🤖 Запустить Replicate AI" : "🎙️ Включить микрофон")}
                      </button>

                      <button 
                        onClick={() => { if (inputText.trim()) { setHistory(h => [...h, inputText.trim()]); setInputText(""); } }}
                        disabled={isMicActive}
                        className="btn btn-primary" 
                        style={{ 
                          padding: "12px 28px", 
                          fontSize: 13, 
                          borderRadius: 50,
                          opacity: isMicActive ? 0.5 : 1,
                          cursor: isMicActive ? "not-allowed" : "pointer"
                        }}
                      >
                        Добавить в историю →
                      </button>

                      <label style={{ display: "inline-flex", alignItems: "center", gap: 8, fontSize: 13, cursor: "pointer", userSelect: "none" }}>
                        <input 
                          type="checkbox" 
                          checked={useAiPunctuation} 
                          onChange={(e) => setUseAiPunctuation(e.target.checked)}
                          style={{ accentColor: "var(--accent)" }}
                        />
                        <span style={{ fontWeight: 600 }}>AI-Пунктуация 🚀</span>
                      </label>
                    </div>

                    <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                      <span style={{ padding: "6px 14px", borderRadius: 30, background: "rgba(0, 0, 0,0.08)", color: "var(--accent)", fontSize: 11, fontWeight: 600 }}>{lang}</span>
                      <span style={{ padding: "6px 14px", borderRadius: 30, background: useWhisper ? "rgba(0, 0, 0,0.12)" : "rgba(0, 0, 0,0.08)", color: "var(--textSecondary)", fontSize: 11, fontWeight: 600 }}>
                        {useWhisper ? (whisperStatus === "processing" ? "⏳ Обработка..." : "🤖 Replicate AI") : "Web Speech API"}
                      </span>
                      <button onClick={() => { if (!isMicActive && lang !== "ҚАЗ") setUseWhisper(v => !v); }} disabled={isMicActive || lang === "ҚАЗ"}
                        title={lang === "ҚАЗ" ? "Для казахского доступен только Replicate AI" : undefined}
                        style={{ padding: "4px 10px", borderRadius: 16, border: "1px solid var(--border)", background: useWhisper ? "rgba(0, 0, 0,0.12)" : "transparent", color: "var(--textSecondary)", fontSize: 11, fontWeight: 600, cursor: (isMicActive || lang === "ҚАЗ") ? "default" : "pointer", opacity: lang === "ҚАЗ" ? 0.6 : 1 }}>
                        {useWhisper ? "→ Web Speech" : "→ Replicate AI"}
                      </button>
                      {useWhisper && (
                        <button
                          onClick={() => { if (!isMicActive) { setUseDiarization(v => !v); if (useDiarization) setSpeakerSegments([]); } }}
                          disabled={isMicActive}
                          style={{ padding: "4px 10px", borderRadius: 16, border: `1px solid ${useDiarization ? SPEAKER_COLORS[0] : "var(--border)"}`, background: useDiarization ? "rgba(0, 0, 0,0.12)" : "transparent", color: useDiarization ? SPEAKER_COLORS[0] : "var(--textSecondary)", fontSize: 11, fontWeight: 600, cursor: isMicActive ? "default" : "pointer", display: "flex", alignItems: "center", gap: 4 }}>
                          👥 {useDiarization ? "Спикеры вкл" : "Спикеры"}
                        </button>
                      )}
                      {sessionSaved && <span style={{ padding: "4px 10px", borderRadius: 16, background: "rgba(34,197,94,0.1)", color: "#22c55e", fontSize: 11, fontWeight: 600 }}>✓ Сохранено</span>}
                    </div>
                  </div>
                </div>

                {/* ==========================================
                    ПАНЕЛЬ AI-РђРЎРЎРРЎРўР•РќРўРђ (GEMINI)
                   ========================================== */}
                <div style={{
                  background: "var(--bgCard)",
                  borderRadius: "20px",
                  padding: "24px",
                  border: "1px solid var(--border)",
                  boxShadow: "var(--shadow)",
                  marginTop: 24,
                }}>
                  <h3 style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 16, fontWeight: 700, color: "var(--text)", marginBottom: 12, display: "flex", alignItems: "center", gap: 8 }}>
                    ✨ AI-Ассистент Replicate
                  </h3>
                  <p style={{ fontSize: 13, color: "var(--textSecondary)", marginBottom: 16 }}>
                    РСЃРїРѕР»СЊР·СѓР№С‚Рµ интеллект Replicate для автоматического конспектирования беседы или ответов на вопросы по содержанию.
                  </p>

                  <div style={{ display: "flex", gap: 12, marginBottom: 20 }}>
                    <button 
                      onClick={generateSummary}
                      disabled={isAiLoading}
                      className="btn btn-outline"
                      style={{ 
                        padding: "10px 20px", 
                        fontSize: 12, 
                        borderRadius: 10,
                        borderColor: "var(--border)",
                        background: "transparent",
                        cursor: isAiLoading ? "not-allowed" : "pointer"
                      }}
                    >
                      {isAiLoading ? "Обработка..." : "📝 Сгенерировать конспект"}
                    </button>
                    
                    <button 
                      onClick={() => { setAiSummary(""); setAiResponse(""); }}
                      className="btn btn-outline"
                      style={{ 
                        padding: "10px 20px", 
                        fontSize: 12, 
                        borderRadius: 10,
                        borderColor: "rgba(239, 68, 68, 0.2)",
                        color: "var(--sos)",
                        background: "transparent"
                      }}
                    >
                      Очистить AI
                    </button>
                  </div>

                  {/* Вывод Конспекта */}
                  {aiSummary && (
                    <div style={{ 
                      background: "rgba(0, 0, 0, 0.05)", 
                      border: "1px solid var(--border)", 
                      borderRadius: 12, 
                      padding: 16, 
                      marginBottom: 20 
                    }}>
                      <h4 style={{ fontSize: 13, fontWeight: 700, marginBottom: 8, color: "var(--accent)" }}>📝 Краткие тезисы (AI-Конспект):</h4>
                      <div style={{ 
                        fontSize: 13, 
                        lineHeight: 1.6, 
                        whiteSpace: "pre-wrap", 
                        color: "var(--text)" 
                      }}>
                        {aiSummary}
                      </div>
                    </div>
                  )}

                  {/* Чат с ассистентом */}
                  <form onSubmit={askAiAboutTranscript} style={{ display: "flex", gap: 8 }}>
                    <input 
                      type="text" 
                      value={aiQuery} 
                      onChange={(e) => setAiQuery(e.target.value)}
                      placeholder="Спросите AI (например: 'О чем шла речь вначале?')..."
                      disabled={isAiLoading}
                      style={{ 
                        flex: 1, 
                        padding: "12px 16px", 
                        borderRadius: 10, 
                        border: "1px solid var(--border)", 
                        background: "var(--bgLight)", 
                        color: "var(--text)",
                        fontSize: 13,
                        outline: "none"
                      }}
                    />
                    <button 
                      type="submit"
                      disabled={isAiLoading || !aiQuery.trim()}
                      className="btn btn-primary"
                      style={{ 
                        padding: "12px 20px", 
                        fontSize: 12, 
                        borderRadius: 10,
                        cursor: isAiLoading ? "not-allowed" : "pointer"
                      }}
                    >
                      Спросить
                    </button>
                  </form>

                  {/* Ответ на вопрос */}
                  {aiResponse && (
                    <div style={{ 
                      background: "rgba(0, 0, 0, 0.08)", 
                      borderLeft: "3px solid var(--accent)", 
                      borderRadius: "0 10px 10px 0", 
                      padding: 12, 
                      marginTop: 12,
                      fontSize: 13,
                      lineHeight: 1.5,
                      color: "var(--text)"
                    }}>
                      <strong>Ответ AI:</strong> {aiResponse}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              // --- Р Р•Р–РРњ 2: РЎРЈР‘РўРРўР Р« ДЛЯ Р’РР”Р•Рћ Р РљРРќРћ ---
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
                <div style={{ background: "var(--bgCard)", borderRadius: "20px", padding: "24px", border: "1px solid var(--border)", boxShadow: "var(--shadow)" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20, flexWrap: "wrap", gap: 12 }}>
                    <div>
                      <h3 style={{ fontSize: 15, fontWeight: 700, color: "var(--text)", marginBottom: 4 }}>Загрузите свое видео</h3>
                      <p style={{ fontSize: 12, color: "var(--textSecondary)" }}>Поддерживаются форматы MP4, WebM (файлы обрабатываются локально).</p>
                    </div>
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                      <label className="btn btn-outline" style={{ padding: "10px 16px", fontSize: 12, borderRadius: 10, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 8 }}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12"/>
                        </svg>
                        <span>🎬 Видео</span>
                        <input type="file" accept="video/*" onChange={handleVideoUpload} style={{ display: "none" }} />
                      </label>
                      <label className="btn btn-outline" style={{ padding: "10px 16px", fontSize: 12, borderRadius: 10, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 8, borderColor: userSubtitles.length > 0 ? "var(--accent)" : undefined, color: userSubtitles.length > 0 ? "var(--accent)" : undefined }}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12"/>
                        </svg>
                        <span>{userSubtitles.length > 0 ? `✓ SRT (${userSubtitles.length})` : "📄 SRT/VTT"}</span>
                        <input type="file" accept=".srt,.vtt" onChange={handleSubtitleUpload} style={{ display: "none" }} />
                      </label>
                      {userSubtitles.length > 0 && (
                        <button onClick={() => setUserSubtitles([])} style={{ padding: "10px 12px", fontSize: 11, borderRadius: 10, border: "1px solid var(--border)", background: "transparent", color: "var(--textSecondary)", cursor: "pointer" }}>✕ Удалить SRT</button>
                      )}
                    </div>
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

                    {/* Выбор действий в видео-режиме */}
                    <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
                      <button
                        onClick={toggleMicrophone}
                        disabled={isScreenCapturing}
                        className="btn"
                        style={{
                          padding: "8px 16px",
                          fontSize: 11,
                          borderRadius: 8,
                          background: isMicActive ? "var(--sos)" : "var(--gradient)",
                          color: "white",
                          boxShadow: isMicActive ? "0 4px 12px rgba(239, 68, 68, 0.3)" : "none",
                          animation: isMicActive ? "mic-pulse 1.5s infinite" : "none",
                          cursor: isScreenCapturing ? "default" : "pointer",
                          opacity: isScreenCapturing ? 0.5 : 1,
                          border: "none",
                          fontWeight: 600
                        }}
                      >
                        {isMicActive ? "🛑 Выключить авто-субтитры" : "🎙️ Включить авто-субтитры (микрофон)"}
                      </button>

                      <button 
                        className="btn btn-outline" 
                        onClick={() => {
                          setVideoSrc("https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4");
                          setVideoSubtitle("");
                          setAudioSourceConnected(false);
                        }}
                        style={{ padding: "8px 16px", fontSize: 11, borderRadius: 8, borderColor: "var(--border)", color: "var(--text)", background: "transparent", cursor: "pointer" }}
                      >
                        Сбросить к демо-видео
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Кнопки запуска Picture-in-Picture и Открытия Транскрипта под экраном */}
            <div style={{ display: "flex", justifyContent: "flex-start", gap: 12, marginTop: 16, flexWrap: "wrap" }}>
              {/* Background Subtitles button */}
              <button
                onClick={() => isScreenCapturing ? stopScreenCapture() : startScreenCapture()}
                disabled={isMicActive}
                className="btn"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "12px 24px",
                  fontSize: 13,
                  borderRadius: 50,
                  background: isScreenCapturing ? "var(--sos)" : "var(--gradient)",
                  color: "white",
                  border: "none",
                  cursor: isMicActive ? "default" : "pointer",
                  opacity: isMicActive ? 0.5 : 1,
                  boxShadow: isScreenCapturing ? "0 4px 12px rgba(239,68,68,0.35)" : "0 4px 24px var(--accentGlow)",
                  animation: isScreenCapturing ? "mic-pulse 1.5s infinite" : "none",
                  fontWeight: 600,
                }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  {isScreenCapturing
                    ? <><rect x="3" y="3" width="18" height="18" rx="2"/><rect x="9" y="9" width="6" height="6" fill="currentColor"/></>  
                    : <><rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/></>}
                </svg>
                <span>{isScreenCapturing ? "⏹ Остановить фоновые субтитры" : "🎬 Фоновые субтитры"}</span>
              </button>

              <button 
                onClick={togglePipSubtitles}
                className="btn btn-outline" 
                style={{ 
                  display: "inline-flex", 
                  alignItems: "center", 
                  gap: 8, 
                  padding: "12px 24px", 
                  fontSize: 13, 
                  borderRadius: 50,
                  borderColor: isPipActive ? "var(--success)" : "var(--border)",
                  color: isPipActive ? "var(--success)" : "var(--text)",
                  background: isPipActive ? "rgba(34, 197, 94, 0.05)" : "transparent"
                }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                  <rect x="13" y="13" width="7" height="7"/>
                </svg>
                <span>{isPipActive ? "Закрыть плавающее окно" : "Открыть в плавающем окне (PiP)"}</span>
              </button>

              <Link 
                href="/subtitles/transcript" 
                target="_blank"
                className="btn btn-outline"
                style={{ 
                  display: "inline-flex", 
                  alignItems: "center", 
                  gap: 8, 
                  padding: "12px 24px", 
                  fontSize: 13, 
                  borderRadius: 50,
                  borderColor: "var(--border)",
                  color: "var(--text)",
                  background: "transparent",
                  transition: "all 0.3s ease"
                }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
                  <polyline points="15 3 21 3 21 9"/>
                  <line x1="10" y1="14" x2="21" y2="3"/>
                </svg>
                <span>Открыть транскрипт на весь экран</span>
              </Link>
            </div>
          </div>

          {/* ==========================================
              ПРАВЫЙ БЛОК: РќРђРЎРўР РћР™РљР РЎРўРР›Р•Р™
             ========================================== */}
          <div style={{ background: "var(--bgCard)", borderRadius: "24px", padding: "24px", border: "1px solid var(--border)", boxShadow: "var(--shadow)" }}>
            <h3 style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 16, fontWeight: 700, color: "var(--text)", marginBottom: 20 }}>
              Настройки субтитров
            </h3>

            {/* Выбор языка источника */}
            <div style={{ marginBottom: 20 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: "var(--textSecondary)", display: "block", marginBottom: 8 }}>Язык источника</label>
              <div style={{ display: "flex", gap: 6 }}>
                {["ҚАЗ", "РУС", "ENG"].map(l => (
                  <button key={l} onClick={() => handleLangChange(l)}
                    style={{ flex: 1, padding: "8px 0", borderRadius: 12, border: lang === l ? "none" : "1px solid var(--border)", background: lang === l ? "var(--gradient)" : "rgba(255,255,255,0.4)", color: lang === l ? "white" : "var(--textSecondary)", fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 600, fontSize: 12, cursor: "pointer", transition: "all 0.2s" }}>
                    {l}
                  </button>
                ))}
              </div>
            </div>

            {/* Выбор движка распознавания (только для видео) */}
            {mode === "video" && (
              <div style={{ marginBottom: 20 }}>
                <label style={{ fontSize: 12, fontWeight: 600, color: "var(--textSecondary)", display: "block", marginBottom: 8 }}>Движок РР</label>
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
                    РРјРёС‚Р°С†РёСЏ (Синхронно)
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

        {/* РСЃС‚РѕСЂРёСЏ сессии диктовки */}
        {mode === "speech" && history.length > 0 && (
          <div style={{ marginTop: 40 }}>
            <h3 style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 16, fontWeight: 700, color: "white", marginBottom: 16 }}>РСЃС‚РѕСЂРёСЏ сессии</h3>
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
            { title: "Режим Картинка-в-картинке", desc: "Запустите всегда находящийся поверх окон плавающий виджет и перетащите его на YouTube или Netflix, чтобы смотреть фильмы с субтитрами." },
            { title: "Реактивная аудио-волна", desc: "Датчик спектра Web Audio API анализирует звуковые частоты видеоролика в реальном времени." },
            { title: "Гибкая адаптация под глаза", desc: "Меняйте контрастность, размер шрифта и цветовые палитры субтитров прямо во время просмотра фильма." },
            { title: "Прямой коннект к FastAPI", desc: "Переключитесь в режим API для интеграции с вашим Whisper WebSocket сервером." },
          ].map(d => (
            <div key={d.title} style={{ background: "var(--bgCard)", borderRadius: "20px", padding: "28px 24px", border: "1px solid var(--border)", boxShadow: "var(--shadow)", transition: "transform 0.2s" }} className="hover:-translate-y-1">
              <h3 style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 15, fontWeight: 750, color: "var(--text)", marginBottom: 8 }}>{d.title}</h3>
              <p style={{ fontSize: 13, color: "var(--textSecondary)", lineHeight: 1.6 }}>{d.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

