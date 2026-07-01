"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { createClient } from "../../lib/supabase";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "https://hearless16-1.onrender.com";

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

// 1. Р”РµРјРѕ-С„СЂР°Р·С‹ РґР»СЏ СЂРµР¶РёРјР° РґРёРєС‚РѕРІРєРё
const PHRASES: Record<string, string[]> = {
  "ҚАЗ": ["Сәлем, қаліңіз қалай?", "Менің атым Әліхан.", "Сізге көмек қажет пе?", "Рахмет! Сау болыңыз."],
  "РУС": ["Привет, как дела?", "Меня зовут Алихан.", "Вам нужна помощь?", "Спасибо! До свидания."],
  "ENG": ["Hello, how are you?", "My name is Alikhan.", "Do you need help?", "Thank you! Goodbye."],
};

// 2. РЎРёРЅС…СЂРѕРЅРёР·РёСЂРѕРІР°РЅРЅС‹Рµ СЃСѓР±С‚РёС‚СЂС‹ РґР»СЏ РґРµРјРѕРЅСЃС‚СЂР°С†РёРѕРЅРЅРѕРіРѕ РІРёРґРµРѕ
const DEMO_VIDEO_SUBTITLES = [
  { start: 0, end: 3, text: "Introducing Chromecast." },
  { start: 3, end: 6, text: "The easiest way to enjoy online video and music on your TV." },
  { start: 6, end: 9, text: "For just thirty-five dollars." },
  { start: 9, end: 12, text: "Plug it in, connect to Wi-Fi, and cast." },
  { start: 12, end: 15, text: "From your phone, tablet or laptop." },
  { start: 15, end: 18, text: "No remote required. Search, browse and control." },
  { start: 18, end: 21, text: "Enjoy your favorite web content on the big screen." }
];

const SPEAKER_COLORS = ["#0EA5E9", "#10B981", "#F59E0B", "#8B5CF6"];
const SPEAKER_BG = ["rgba(14,165,233,0.10)", "rgba(16,185,129,0.10)", "rgba(245,158,11,0.10)", "rgba(139,92,246,0.10)"];
const SPEAKER_LABELS = ["Говорящий 1", "Говорящий 2", "Говорящий 3", "Говорящий 4"];

export default function SubtitlesPage() {
  const [mode, setMode] = useState<"speech" | "video">("speech"); // "speech" (РґРёРєС‚РѕРІРєР°) РёР»Рё "video" (РІРёРґРµРѕ)
  const [lang, setLang] = useState("РУС");
  const [phraseIdx, setPhraseIdx] = useState(0);
  const [chars, setChars] = useState(0);
  const [inputText, setInputText] = useState("");
  const [history, setHistory] = useState<string[]>([]);
  const [isMicActive, setIsMicActive] = useState(false);
  const [interimText, setInterimText] = useState("");
  const recognitionRef = useRef<any>(null);
  const isDemo = inputText.trim() === "" && !isMicActive;

  // РЎРѕСЃС‚РѕСЏРЅРёСЏ РґР»СЏ Replicate AI
  const [aiSummary, setAiSummary] = useState("");
  const [aiQuery, setAiQuery] = useState("");
  const [aiResponse, setAiResponse] = useState("");
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [useAiPunctuation, setUseAiPunctuation] = useState(false);

  // РќР°СЃС‚СЂРѕР№РєРё РґРёСЃРїР»РµСЏ (СЃРѕРІРїР°РґР°СЋС‰РёРµ СЃ РјРѕР±РёР»СЊРЅС‹Рј РєР»РёРµРЅС‚РѕРј)
  const [fontSize, setFontSize] = useState(24);
  const [textColor, setTextColor] = useState("#22d3ee");
  const [bgOpacity, setBgOpacity] = useState(0.85);
  const [alignment, setAlignment] = useState<"center" | "left">("center");

  // РЎРѕСЃС‚РѕСЏРЅРёСЏ РґР»СЏ РїР»РµРµСЂР° РІРёРґРµРѕ
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
  const screenIntervalRef = useRef<any>(null);

  // Map display lang labels to ISO codes for backend API
  const toLangCode = (l: string): string =>
    l === "ENG" ? "en" : l.startsWith("T") || l.startsWith("Т") || l.startsWith("Ч") ? "kk" : "ru";

  // New: speaker diarization
  const [useDiarization, setUseDiarization] = useState(false);
  const useDiarizationRef = useRef(false);
  useEffect(() => { useDiarizationRef.current = useDiarization; }, [useDiarization]);
  interface SpeakerSegment { text: string; speaker: number; }
  const [speakerSegments, setSpeakerSegments] = useState<SpeakerSegment[]>([]);
  const diarizationStateRef = useRef({ current_speaker: 0, last_end: 0.0 });

  //РЎРѕСЃС‚РѕСЏРЅРёСЏ РґР»СЏ РїР»Р°РІР°СЋС‰РµРіРѕ РѕРєРЅР° (Picture-in-Picture)
  const [isPipActive, setIsPipActive] = useState(false);
  const [activePipText, setActivePipText] = useState("");
  const lastSubUpdateTimeRef = useRef<number>(Date.now());

  // Р РµС„РµСЂРµРЅСЃС‹ РґР»СЏ РІРёРґРµРѕ Рё РІРµР±-Р°СѓРґРёРѕ
  const videoElementRef = useRef<HTMLVideoElement | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sourceRef = useRef<MediaElementAudioSourceNode | null>(null);
  const animationRef = useRef<number | null>(null);

  // Р РµС„РµСЂРµРЅСЃС‹ РґР»СЏ Picture-in-Picture
  const pipCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const pipVideoRef = useRef<HTMLVideoElement | null>(null);

  // --- Р­Р¤Р¤Р•РљРў Р”Р›РЇ Р Р•Р–РРњРђ Р”РРљРўРћР’РљР ---
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

  // РњРµС‚РѕРґ РґР»СЏ Р°РІС‚РѕРјР°С‚РёС‡РµСЃРєРѕР№ РїСѓРЅРєС‚СѓР°С†РёРё С„СЂР°Р·С‹
  const getPunctuationWithAI = async (rawText: string) => {
    const prompt = "РўС‹ вЂ” AI-СЂРµРґР°РєС‚РѕСЂ. РўРІРѕСЏ Р·Р°РґР°С‡Р° вЂ” СЂР°СЃСЃС‚Р°РІРёС‚СЊ Р·РЅР°РєРё РїСЂРµРїРёРЅР°РЅРёСЏ, РёСЃРїСЂР°РІРёС‚СЊ Р·Р°РіР»Р°РІРЅС‹Рµ Р±СѓРєРІС‹ Рё РјРµР»РєРёРµ РѕРїРµС‡Р°С‚РєРё РІ РїСЂРµРґР»РѕР¶РµРЅРЅРѕРј С‚РµРєСЃС‚Рµ СЂР°СЃРїРѕР·РЅР°РЅРЅРѕР№ СЂСѓСЃСЃРєРѕР№, РєР°Р·Р°С…СЃРєРѕР№ РёР»Рё Р°РЅРіР»РёР№СЃРєРѕР№ СЂРµС‡Рё. Р’РµСЂРЅРё РўРћР›Р¬РљРћ РёСЃРїСЂР°РІР»РµРЅРЅС‹Р№ С‚РµРєСЃС‚, Р±РµР· РєР°РєРёС…-Р»РёР±Рѕ РІРІРѕРґРЅС‹С… СЃР»РѕРІ РёР»Рё РєР°РІС‹С‡РµРє.";
    const cleaned = await callReplicateAI(prompt, rawText);
    return cleaned || rawText;
  };

  // Р“РµРЅРµСЂР°С†РёСЏ РєРѕРЅСЃРїРµРєС‚Р°
  const generateSummary = async () => {
    const fullTranscript = [...history, displayText].filter(Boolean).join("\n");
    if (!fullTranscript.trim()) {
      alert("РСЃС‚РѕСЂРёСЏ С‚СЂР°РЅСЃРєСЂРёРїС‚Р° РїСѓСЃС‚Р°. РџРѕР¶Р°Р»СѓР№СЃС‚Р°, РЅР°РіРѕРІРѕСЂРёС‚Рµ РёР»Рё РІРІРµРґРёС‚Рµ С‚РµРєСЃС‚ СЃРЅР°С‡Р°Р»Р°.");
      return;
    }
    
    setIsAiLoading(true);
    const prompt = "РўС‹ вЂ” РїСЂРѕС„РµСЃСЃРёРѕРЅР°Р»СЊРЅС‹Р№ Р°СЃСЃРёСЃС‚РµРЅС‚ РїРѕ РґРѕСЃС‚СѓРїРЅРѕСЃС‚Рё. РЎРґРµР»Р°Р№ РєСЂР°С‚РєРѕРµ РєРѕРЅСЃРїРµРєС‚РёСЂРѕРІР°РЅРёРµ (РІ РІРёРґРµ С‚РµР·РёСЃРѕРІ Рё bullet points РЅР° СЂСѓСЃСЃРєРѕРј СЏР·С‹РєРµ) РґР»СЏ РїСЂРµРґР»РѕР¶РµРЅРЅРѕРіРѕ С‚СЂР°РЅСЃРєСЂРёРїС‚Р°. Р’С‹РґРµР»Рё РіР»Р°РІРЅС‹Рµ РјС‹СЃР»Рё, СЂРµС€РµРЅРёСЏ Рё РєР»СЋС‡РµРІС‹Рµ С„Р°РєС‚С‹.";
    const result = await callReplicateAI(prompt, fullTranscript);
    if (result) {
      setAiSummary(result);
    } else {
      alert("РќРµ СѓРґР°Р»РѕСЃСЊ СЃРіРµРЅРµСЂРёСЂРѕРІР°С‚СЊ РєРѕРЅСЃРїРµРєС‚. РџСЂРѕРІРµСЂСЊС‚Рµ СЃРѕРµРґРёРЅРµРЅРёРµ СЃ РёРЅС‚РµСЂРЅРµС‚РѕРј РёР»Рё РЅР°СЃС‚СЂРѕР№РєРё РєР»СЋС‡Р°.");
    }
    setIsAiLoading(false);
  };

  // Р§Р°С‚ СЃ AI РїРѕ СЃРѕРґРµСЂР¶Р°РЅРёСЋ
  const askAiAboutTranscript = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!aiQuery.trim()) return;
    
    const fullTranscript = [...history, displayText].filter(Boolean).join("\n");
    if (!fullTranscript.trim()) {
      alert("РСЃС‚РѕСЂРёСЏ РїСѓСЃС‚Р°. Р—Р°РґР°РІР°С‚СЊ РІРѕРїСЂРѕСЃС‹ РїРѕРєР° РЅРµ РїРѕ С‡РµРјСѓ.");
      return;
    }
    
    setIsAiLoading(true);
    setAiResponse("AI РґСѓРјР°РµС‚...");
    const prompt = `РџРѕР»СЊР·РѕРІР°С‚РµР»СЊ Р·Р°РґР°РµС‚ РІРѕРїСЂРѕСЃ: "${aiQuery}". РћС‚РІРµС‚СЊ РЅР° РЅРµРіРѕ РєРѕСЂРѕС‚РєРѕ Рё СЃРѕРґРµСЂР¶Р°С‚РµР»СЊРЅРѕ, РѕСЃРЅРѕРІС‹РІР°СЏСЃСЊ РёСЃРєР»СЋС‡РёС‚РµР»СЊРЅРѕ РЅР° СЃРѕРґРµСЂР¶Р°РЅРёРё РїСЂРµРґР»РѕР¶РµРЅРЅРѕРіРѕ С‚СЂР°РЅСЃРєСЂРёРїС‚Р°. Р•СЃР»Рё РІ С‚РµРєСЃС‚Рµ РЅРµС‚ РѕС‚РІРµС‚Р° РЅР° СЌС‚РѕС‚ РІРѕРїСЂРѕСЃ, С‚Р°Рє Рё СЃРєР°Р¶Рё.`;
    const result = await callReplicateAI(prompt, fullTranscript);
    if (result) {
      setAiResponse(result);
    } else {
      setAiResponse("РћС€РёР±РєР° РїСЂРё РїРѕР»СѓС‡РµРЅРёРё РѕС‚РІРµС‚Р° РѕС‚ AI.");
    }
    setIsAiLoading(false);
  };

  // --- Р›РћР“РРљРђ Р РђР‘РћРўР« РњРРљР РћР¤РћРќРђ (WEB SPEECH API) ---
  // Load auth token for backend Whisper
  useEffect(() => {
    createClient().auth.getSession().then(({ data: { session } }) => {
      setToken(session?.access_token ?? "");
    });
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
      setWhisperStatus("recording");
      setIsMicActive(true);
      isMicActiveRef.current = true;
      audioChunksRef.current = [];

      // Browser SpeechRecognition runs in parallel for real-time interim display
      const SpeechRecognitionAPI = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognitionAPI) {
        const interimRec = new SpeechRecognitionAPI();
        interimRec.continuous = true;
        interimRec.interimResults = true;
        const lc = toLangCode(lang);
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
          fd.append("language", toLangCode(lang));
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
        if (!isMicActiveRef.current) { clearInterval(whisperIntervalRef.current); stream.getTracks().forEach(t => t.stop()); return; }
        if (mediaRecorderRef.current?.state === "recording") {
          mediaRecorderRef.current.stop();
          await new Promise<void>(r => { mediaRecorderRef.current!.onstop = () => r(); });
          await sendChunk();
          if (isMicActiveRef.current) startRecorder();
        }
      }, 3000);
    } catch { setIsMicActive(false); isMicActiveRef.current = false; setWhisperStatus("idle"); alert("Нет доступа к микрофону"); }
  };

  const stopWhisperRecording = () => {
    clearInterval(whisperIntervalRef.current);
    isMicActiveRef.current = false;
    if (mediaRecorderRef.current?.state === "recording") mediaRecorderRef.current.stop();
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
      setIsScreenCapturing(true);

      // Открываем PiP автоматически
      if (!document.pictureInPictureElement) {
        setTimeout(() => togglePipSubtitles(), 300);
      }

      const startRecorder = () => {
        const mr = new MediaRecorder(audioStream, { mimeType: "audio/webm" });
        mr.ondataavailable = (e: BlobEvent) => { if (e.data.size > 0) screenChunksRef.current.push(e.data); };
        mr.start();
        screenRecorderRef.current = mr;
      };

      const sendChunk = async () => {
        const chunks = [...screenChunksRef.current];
        screenChunksRef.current = [];
        if (chunks.length === 0) return;
        const blob = new Blob(chunks, { type: "audio/webm" });
        try {
          const fd = new FormData();
          fd.append("file", blob, "audio.webm");
          fd.append("language", toLangCode(lang));
          const res = await fetch("/api/transcribe", { method: "POST", body: fd });
          if (res.ok) {
            const data = await res.json();
            if (data.text?.trim()) {
              setHistory(prev => [...prev, data.text.trim()]);
              setActivePipText(data.text.trim());
            }
          }
        } catch {}
      };

      startRecorder();
      screenIntervalRef.current = setInterval(async () => {
        if (!screenStreamRef.current) {
          clearInterval(screenIntervalRef.current);
          return;
        }
        if (screenRecorderRef.current?.state === "recording") {
          screenRecorderRef.current.stop();
          await new Promise<void>(r => { screenRecorderRef.current!.onstop = () => r(); });
          await sendChunk();
          if (screenStreamRef.current) startRecorder();
        }
      }, 3000);

      audioTracks[0].addEventListener("ended", () => stopScreenCapture());
    } catch (err: any) {
      if (err.name !== "NotAllowedError") {
        alert("Не удалось захватить аудио: " + err.message);
      }
    }
  };

  const stopScreenCapture = () => {
    clearInterval(screenIntervalRef.current);
    if (screenRecorderRef.current?.state === "recording") screenRecorderRef.current.stop();
    screenStreamRef.current?.getTracks().forEach((t: MediaStreamTrack) => t.stop());
    screenStreamRef.current = null;
    screenRecorderRef.current = null;
    setIsScreenCapturing(false);
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

  // Р РµС„ РґР»СЏ РѕС‚СЃР»РµР¶РёРІР°РЅРёСЏ СЃС‚Р°С‚СѓСЃР° Р·Р°РїРёСЃРё Р±РµР· Р·Р°РјС‹РєР°РЅРёР№ РІ РєРѕР»Р±РµРєР°С… Speech API
  const isMicActiveRef = useRef(false);
  useEffect(() => {
    isMicActiveRef.current = isMicActive;
  }, [isMicActive]);

  const handleLangChange = (newLang: string) => {
    setLang(newLang);
    setPhraseIdx(0);
    setChars(0);
    
    if (isMicActiveRef.current) {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      setIsMicActive(false);
      isMicActiveRef.current = false;
      setInterimText("");
      
      setTimeout(() => {
        toggleMicrophone();
      }, 400);
    }
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
      alert("Рљ СЃРѕР¶Р°Р»РµРЅРёСЋ, Web Speech API (СЂР°СЃРїРѕР·РЅР°РІР°РЅРёРµ СЂРµС‡Рё) РЅРµ РїРѕРґРґРµСЂР¶РёРІР°РµС‚СЃСЏ РІР°С€РёРј Р±СЂР°СѓР·РµСЂРѕРј. РџРѕР¶Р°Р»СѓР№СЃС‚Р°, РёСЃРїРѕР»СЊР·СѓР№С‚Рµ Google Chrome РёР»Рё Microsoft Edge.");
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;

      let recognitionLang = "ru-RU";
      if (lang === "ҚАЗ") recognitionLang = "kk-KZ";
      else if (lang === "ENG") recognitionLang = "en-US";
      recognition.lang = recognitionLang;

      recognition.onstart = () => {
        setIsMicActive(true);
        setInterimText("РЎР»СѓС€Р°СЋ РІР°СЃ...");
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
              const targetIdx = updated.length - 1; // Р—Р°РїРѕРјРёРЅР°РµРј С‚РѕС‡РЅС‹Р№ РёРЅРґРµРєСЃ С„СЂР°Р·С‹
              
              getPunctuationWithAI(textToProcess).then((punctuatedText) => {
                if (punctuatedText && punctuatedText !== textToProcess) {
                  setHistory((currentHistory) => {
                    const nextHistory = [...currentHistory];
                    // РћР±РЅРѕРІР»СЏРµРј С‚РѕР»СЊРєРѕ РµСЃР»Рё РЅР° СЌС‚РѕРј РёРЅРґРµРєСЃРµ РІСЃРµ РµС‰Рµ Р»РµР¶РёС‚ РёСЃС…РѕРґРЅС‹Р№ СЃС‹СЂРѕР№ С‚РµРєСЃС‚
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
        
        // РћС‚РєР»СЋС‡Р°РµРј РјРёРєСЂРѕС„РѕРЅ С‚РѕР»СЊРєРѕ РїСЂРё С„Р°С‚Р°Р»СЊРЅС‹С… РѕС€РёР±РєР°С… РґРѕСЃС‚СѓРїР° РёР»Рё РѕР±РѕСЂСѓРґРѕРІР°РЅРёСЏ
        if (event.error === "not-allowed" || event.error === "audio-capture") {
          if (event.error === "not-allowed") {
            alert("Р”РѕСЃС‚СѓРї Рє РјРёРєСЂРѕС„РѕРЅСѓ Р·Р°Р±Р»РѕРєРёСЂРѕРІР°РЅ. РџРѕР¶Р°Р»СѓР№СЃС‚Р°, СЂР°Р·СЂРµС€РёС‚Рµ РґРѕСЃС‚СѓРї РІ РЅР°СЃС‚СЂРѕР№РєР°С… Р±СЂР°СѓР·РµСЂР°.");
          } else {
            alert("РќРµ СѓРґР°Р»РѕСЃСЊ РѕР±РЅР°СЂСѓР¶РёС‚СЊ РјРёРєСЂРѕС„РѕРЅ. РџСЂРѕРІРµСЂСЊС‚Рµ РїРѕРґРєР»СЋС‡РµРЅРёРµ СѓСЃС‚СЂРѕР№СЃС‚РІР°.");
          }
          setIsMicActive(false);
          setInterimText("");
        }
        // РћС€РёР±РєРё С‚РёС€РёРЅС‹ (no-speech) РёР»Рё СЃР±СЂРѕСЃР° (aborted) РёРіРЅРѕСЂРёСЂСѓРµРј, onend СЃРґРµР»Р°РµС‚ РјСЏРіРєРёР№ РїРµСЂРµР·Р°РїСѓСЃРє
      };

      recognition.onend = () => {
        // Р•СЃР»Рё РїРѕР»СЊР·РѕРІР°С‚РµР»СЊ РЅРµ РЅР°Р¶РёРјР°Р» РєРЅРѕРїРєСѓ РІС‹РєР»СЋС‡РµРЅРёСЏ, РїРµСЂРµР·Р°РїСѓСЃРєР°РµРј Р·Р°РїРёСЃСЊ
        if (isMicActiveRef.current) {
          try {
            recognition.start();
          } catch (e) {
            console.warn("РџРѕРїС‹С‚РєР° Р°РІС‚Рѕ-РїРµСЂРµР·Р°РїСѓСЃРєР° SpeechRecognition РїРѕСЃР»Рµ onend:", e);
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
    };
  }, []);

  // Р­С„С„РµРєС‚ РґР»СЏ С„РѕСЂРјРёСЂРѕРІР°РЅРёСЏ С‚РµРєСЃС‚Р° СЃСѓР±С‚РёС‚СЂРѕРІ РґР»СЏ PiP-РѕРєРЅР° СЃ С‚Р°Р№Рј-Р°СѓС‚РѕРј РѕС‡РёСЃС‚РєРё РІ 8 СЃРµРєСѓРЅРґ
  useEffect(() => {
    let text = "";
    if (mode === "speech") {
      if (isMicActive) {
        const lastPhrase = history[history.length - 1] || "";
        const cleanInterim = (interimText && interimText !== "РЎР»СѓС€Р°СЋ РІР°СЃ...") ? interimText : "";
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

    if (text && text !== "РЎР»СѓС€Р°СЋ РІР°СЃ..." && text !== "РћР¶РёРґР°РЅРёРµ РЅР°С‡Р°Р»Р° РґРёРєС‚РѕРІРєРё...") {
      lastSubUpdateTimeRef.current = Date.now();
      const timer = setTimeout(() => {
        setActivePipText("");
      }, 8000);
      return () => clearTimeout(timer);
    }
  }, [displayText, interimText, videoSubtitle, history, isMicActive, mode]);

  // Р­С„С„РµРєС‚ РґР»СЏ СЃРёРЅС…СЂРѕРЅРёР·Р°С†РёРё СЃСѓР±С‚РёС‚СЂРѕРІ РїР»РµРµСЂР° СЃ РІРІРѕРґРѕРј РјРёРєСЂРѕС„РѕРЅР° РїСЂРё РІРєР»СЋС‡РµРЅРЅРѕР№ Р·Р°РїРёСЃРё РІ СЂРµР¶РёРјРµ РІРёРґРµРѕ
  useEffect(() => {
    if (mode === "video" && isMicActive) {
      const lastPhrase = history[history.length - 1] || "";
      const cleanInterim = (interimText && interimText !== "РЎР»СѓС€Р°СЋ РІР°СЃ...") ? interimText : "";
      const text = cleanInterim
        ? (lastPhrase ? `${lastPhrase}\n${cleanInterim}` : cleanInterim)
        : lastPhrase;
      setVideoSubtitle(text);
    }
  }, [history, interimText, isMicActive, mode]);

  // --- BROADCAST CHANNEL РЎРРќРҐР РћРќРР—РђР¦РРЇ ---
  const channelRef = useRef<BroadcastChannel | null>(null);

  // Р РµС„ РґР»СЏ С…СЂР°РЅРµРЅРёСЏ РїРѕСЃР»РµРґРЅРµРіРѕ Р°РєС‚СѓР°Р»СЊРЅРѕРіРѕ СЃРѕСЃС‚РѕСЏРЅРёСЏ (РІРѕ РёР·Р±РµР¶Р°РЅРёРµ stale closures)
  const stateRef = useRef({
    mode, lang, phraseIdx, chars, inputText, history, fontSize, textColor, bgOpacity, alignment, videoSubtitle, isVideoPlaying, displayText, aiSummary, aiResponse
  });

  useEffect(() => {
    stateRef.current = {
      mode, lang, phraseIdx, chars, inputText, history, fontSize, textColor, bgOpacity, alignment, videoSubtitle, isVideoPlaying, displayText, aiSummary, aiResponse
    };
  }, [mode, lang, phraseIdx, chars, inputText, history, fontSize, textColor, bgOpacity, alignment, videoSubtitle, isVideoPlaying, displayText, aiSummary, aiResponse]);

  // Р¤СѓРЅРєС†РёСЏ РґР»СЏ РѕС‚РїСЂР°РІРєРё РїРѕР»РЅРѕРіРѕ СЃРѕСЃС‚РѕСЏРЅРёСЏ
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

  // РРЅРёС†РёР°Р»РёР·Р°С†РёСЏ РєР°РЅР°Р»Р° Рё СЃР»СѓС€Р°С‚РµР»РµР№
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

      // РЎСЂР°Р·Сѓ С€Р»РµРј СЃС‚Р°С‚СѓСЃ РїСЂРё РјРѕРЅС‚РёСЂРѕРІР°РЅРёРё
      sendStateToChannel();

      return () => {
        channel.removeEventListener("message", handleMessage);
        channel.close();
      };
    }
  }, []);

  // РћС‚РїСЂР°РІРєР° СЃРѕСЃС‚РѕСЏРЅРёСЏ РїСЂРё Р»СЋР±РѕРј РёР·РјРµРЅРµРЅРёРё
  useEffect(() => {
    sendStateToChannel();
  }, [mode, lang, phraseIdx, chars, inputText, history, fontSize, textColor, bgOpacity, alignment, videoSubtitle, isVideoPlaying, displayText, aiSummary, aiResponse]);

  // --- РРќРР¦РРђР›РР—РђР¦РРЇ Р РћР‘Р РђР‘РћРўРљРђ Р’Р•Р‘-РђРЈР”РРћ Р”Р›РЇ Р’РР—РЈРђР›РР—РђР¦РР ---
  const initAudioAnalyser = (videoEl: HTMLVideoElement) => {
    if (audioSourceConnected || typeof window === "undefined") return;
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      const audioCtx = new AudioContextClass();
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 32; // РќРµР±РѕР»СЊС€РѕР№ СЂР°Р·РјРµСЂ РґР»СЏ 5 СЃС‚РѕР»Р±РёРєРѕРІ

      // РЎРѕР·РґР°РµРј РёСЃС‚РѕС‡РЅРёРє Р·РІСѓРєР° РёР· РІРёРґРµРѕ (С‚СЂРµР±СѓРµС‚ crossOrigin="anonymous" РґР»СЏ CORS РёСЃС‚РѕС‡РЅРёРєРѕРІ)
      const source = audioCtx.createMediaElementSource(videoEl);
      source.connect(analyser);
      analyser.connect(audioCtx.destination);

      audioCtxRef.current = audioCtx;
      analyserRef.current = analyser;
      sourceRef.current = source;
      setAudioSourceConnected(true);
      
      // Р—Р°РїСѓСЃРє С†РёРєР»Р° Р°РЅРёРјР°С†РёРё
      updateFrequencyBars(analyser);
    } catch (err) {
      console.warn("Web Audio API РѕРіСЂР°РЅРёС‡РµРЅРѕ РїРѕР»РёС‚РёРєРѕР№ CORS РґР»СЏ СЌС‚РѕРіРѕ РІРёРґРµРѕ. Р—Р°РїСѓСЃРєР°РµС‚СЃСЏ СЃРёРјСѓР»СЏС†РёСЏ Р°СѓРґРёРѕ-РІРѕР»РЅС‹.", err);
      runAudioSimulation();
    }
  };

  // Р¦РёРєР» С‡С‚РµРЅРёСЏ С‡Р°СЃС‚РѕС‚ СЃ РјРёРєСЂРѕС„РѕРЅР°/Р°СѓРґРёРѕРґРѕСЂРѕР¶РєРё РІРёРґРµРѕ
  const updateFrequencyBars = (analyser: AnalyserNode) => {
    const dataArray = new Uint8Array(analyser.frequencyBinCount);
    const render = () => {
      analyser.getByteFrequencyData(dataArray);
      // РњР°РїРїРёРј РґР°РЅРЅС‹Рµ С‡Р°СЃС‚РѕС‚ РІ РІС‹СЃРѕС‚С‹ СЃС‚РѕР»Р±РёРєРѕРІ (5 С€С‚СѓРє)
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

  // РЎРёРјСѓР»СЏС†РёСЏ СЃРїРµРєС‚СЂР° РїСЂРё CORS РѕРіСЂР°РЅРёС‡РµРЅРёСЏС…
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
        setFrequencyData([4, 4, 4, 4, 4]); // РЎР±СЂРѕСЃ РІ С‚РёС€РёРЅСѓ РїСЂРё РїР°СѓР·Рµ
      }
      animationRef.current = requestAnimationFrame(render);
    };
    render();
  };

  // --- РћР‘Р РђР‘РћРўРљРђ РР—РњР•РќР•РќРР™ Р’РР”Р•Рћ ---
  const handleTimeUpdate = () => {
    const video = videoElementRef.current;
    if (!video) return;
    const time = video.currentTime;

    // Р•СЃР»Рё РјРёРєСЂРѕС„РѕРЅ Р°РєС‚РёРІРµРЅ, СЃСѓР±С‚РёС‚СЂС‹ РіРµРЅРµСЂРёСЂСѓСЋС‚СЃСЏ РјРёРєСЂРѕС„РѕРЅРѕРј, Р° РЅРµ С„Р°Р№Р»РѕРј СЃСѓР±С‚РёС‚СЂРѕРІ
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

    // РС‰РµРј СЃРѕРѕС‚РІРµС‚СЃС‚РІСѓСЋС‰РёР№ Р±Р»РѕРє СЃСѓР±С‚РёС‚СЂРѕРІ РґР»СЏ РґРµРјРѕ-РІРёРґРµРѕ
    const isDemoVideo = videoSrc === "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4";
    const subtitleSource = userSubtitles.length > 0 ? userSubtitles : (isDemoVideo ? DEMO_VIDEO_SUBTITLES : []);
    const subtitleText = subtitleSource.find(sub => time >= sub.start && time <= sub.end)?.text || "";
    setVideoSubtitle(subtitleText);

    // РћС‚РїСЂР°РІР»СЏРµРј РІСЂРµРјСЏ Рё Р°РєС‚РёРІРЅС‹Р№ СЃСѓР±С‚РёС‚СЂ РІ РєР°РЅР°Р»
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
      // РРЅРёС†РёР°Р»РёР·РёСЂСѓРµРј Р°СѓРґРёРѕР°РЅР°Р»РёР·Р°С‚РѕСЂ РїСЂРё РїРµСЂРІРѕРј РІРѕСЃРїСЂРѕРёР·РІРµРґРµРЅРёРё
      initAudioAnalyser(videoElementRef.current);
    }
  };

  // Р—Р°РіСЂСѓР·РєР° РїРѕР»СЊР·РѕРІР°С‚РµР»СЊСЃРєРѕРіРѕ РІРёРґРµРѕ
  const handleVideoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setVideoSrc(url);
      setVideoSubtitle("");
      setAudioSourceConnected(false); // РЎР±СЂР°СЃС‹РІР°РµРј Р°РЅР°Р»РёР·Р°С‚РѕСЂ РґР»СЏ РЅРѕРІРѕРіРѕ РёСЃС‚РѕС‡РЅРёРєР°
    }
  };

  // --- Р›РћР“РРљРђ РџР›РђР’РђР®Р©Р•Р“Рћ РћРљРќРђ (PICTURE IN PICTURE) ---
  
  // РђРІС‚РѕРїРµСЂРµРЅРѕСЃ СЃР»РѕРІ РґР»СЏ СЂРёСЃРѕРІР°РЅРёСЏ РЅР° Canvas (СЃ РїРѕРґРґРµСЂР¶РєРѕР№ \n Рё Р°РІС‚РѕРїРµСЂРµРЅРѕСЃР° РґР»РёРЅРЅС‹С… СЃС‚СЂРѕРє)
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

  // РћС‚СЂРёСЃРѕРІРєР° СЃСѓР±С‚РёС‚СЂРѕРІ РЅР° Canvas
  const drawPipSubtitles = () => {
    const canvas = pipCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // РћС‡РёСЃС‚РєР° Рё Р·Р°Р»РёРІРєР° С‚РµРјРЅРѕРіРѕ С„РѕРЅР° (РІС‹СЃРѕРєРѕРєРѕРЅС‚СЂР°СЃС‚РЅР°СЏ РїРѕРґР»РѕР¶РєР°)
    ctx.fillStyle = "rgba(9, 13, 22, 0.95)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Р”РѕР±Р°РІР»СЏРµРј РєСЂР°СЃРёРІСѓСЋ РїРѕР»СѓРїСЂРѕР·СЂР°С‡РЅСѓСЋ СЂР°РјРєСѓ РґР»СЏ СЌСЃС‚РµС‚РёРєРё
    ctx.strokeStyle = "rgba(34, 211, 238, 0.3)";
    ctx.lineWidth = 6;
    ctx.strokeRect(3, 3, canvas.width - 6, canvas.height - 6);

    // РћС‚СЂРёСЃРѕРІРєР° С‚РµРєСЃС‚Р° СЃСѓР±С‚РёС‚СЂРѕРІ
    ctx.fillStyle = textColor;
    ctx.font = "bold 32px sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    const text = activePipText || (isMicActive ? "РЎР»СѓС€Р°СЋ РІР°СЃ..." : "РћР¶РёРґР°РЅРёРµ Р·РІСѓРєРѕРІРѕРіРѕ РїРѕС‚РѕРєР°...");
    wrapText(ctx, text, canvas.width / 2, canvas.height / 2, canvas.width - 60, 42);
  };

  // РџРµСЂРµРєР»СЋС‡РµРЅРёРµ СЃРѕСЃС‚РѕСЏРЅРёСЏ Picture-in-Picture
  const togglePipSubtitles = async () => {
    const pipVideo = pipVideoRef.current;
    const canvas = pipCanvasRef.current;
    if (!pipVideo || !canvas) return;

    if (document.pictureInPictureElement) {
      await document.exitPictureInPicture();
      setIsPipActive(false);
    } else {
      try {
        // РћС‚СЂРёСЃРѕРІС‹РІР°РµРј СЃС‚Р°СЂС‚РѕРІС‹Р№ РєР°РґСЂ
        drawPipSubtitles();

        // Р—Р°С…РІР°С‚С‹РІР°РµРј РІРёРґРµРѕРїРѕС‚РѕРє СЃ Canvas (10 РєР°РґСЂРѕРІ РІ СЃРµРєСѓРЅРґСѓ РґР»СЏ СЌРєРѕРЅРѕРјРёРё СЂРµСЃСѓСЂСЃРѕРІ)
        const stream = (canvas as any).captureStream(10);
        pipVideo.srcObject = stream;

        await pipVideo.play();
        await pipVideo.requestPictureInPicture();
        setIsPipActive(true);

        // РћС‚СЃР»РµР¶РёРІР°РµРј Р·Р°РєСЂС‹С‚РёРµ РѕРєРЅР° РїРѕР»СЊР·РѕРІР°С‚РµР»РµРј РІСЂСѓС‡РЅСѓСЋ
        pipVideo.addEventListener("leavepictureinpicture", () => {
          setIsPipActive(false);
        }, { once: true });
      } catch (err) {
        console.error("РћС€РёР±РєР° Р·Р°РїСѓСЃРєР° Picture-in-Picture: ", err);
        alert("Р РµР¶РёРј РљР°СЂС‚РёРЅРєР°-РІ-РєР°СЂС‚РёРЅРєРµ РЅРµ РїРѕРґРґРµСЂР¶РёРІР°РµС‚СЃСЏ РІР°С€РёРј Р±СЂР°СѓР·РµСЂРѕРј РёР»Рё Р·Р°Р±Р»РѕРєРёСЂРѕРІР°РЅ.");
      }
    }
  };

  // Р РµР°РєС‚РёРІРЅС‹Р№ РїРµСЂРµСЂРµРЅРґРµСЂ РїР»Р°РІР°СЋС‰РµРіРѕ РѕРєРЅР° РїСЂРё РёР·РјРµРЅРµРЅРёРё С‚РµРєСЃС‚Р° РёР»Рё С†РІРµС‚Р°
  useEffect(() => {
    if (isPipActive) {
      drawPipSubtitles();
    }
  }, [activePipText, textColor, isPipActive, mode, isMicActive]);

  // РћС‡РёСЃС‚РєР° Р°РЅРёРјР°С†РёРё РїСЂРё СЂР°Р·РјРѕРЅС‚РёСЂРѕРІР°РЅРёРё
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
      {/* РЎРєСЂС‹С‚С‹Рµ СЌР»РµРјРµРЅС‚С‹ РґР»СЏ СЂРµР°Р»РёР·Р°С†РёРё PiP С…Р°РєР° С‡РµСЂРµР· Canvas */}
      <canvas ref={pipCanvasRef} width="800" height="240" style={{ display: "none" }} />
      <video ref={pipVideoRef} style={{ display: "none" }} playsInline muted />

      {/* РЎС‚РёР»Рё Р·РІСѓРєРѕРІРѕР№ РІРѕР»РЅС‹ */}
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
          в†ђ РќР° РіР»Р°РІРЅСѓСЋ
        </Link>
        <div className="section-label">Р”РѕСЃС‚СѓРїРЅРѕСЃС‚СЊ РјРµРґРёР°</div>
        <h1 className="section-title">AI-СЃСѓР±С‚РёС‚СЂС‹ РІ СЂРµР°Р»СЊРЅРѕРј РІСЂРµРјРµРЅРё</h1>
        <p className="section-subtitle" style={{ maxWidth: 650, marginBottom: 40 }}>
          РўСЂР°РЅСЃРєСЂРёР±РёСЂСѓР№С‚Рµ СѓСЃС‚РЅСѓСЋ СЂРµС‡СЊ РёР»Рё СЃРјРѕС‚СЂРёС‚Рµ РІРёРґРµРѕСЂРѕР»РёРєРё СЃ РјРіРЅРѕРІРµРЅРЅРѕР№ РіРµРЅРµСЂР°С†РёРµР№ РІС‹СЃРѕРєРѕРєРѕРЅС‚СЂР°СЃС‚РЅС‹С… СЃСѓР±С‚РёС‚СЂРѕРІ.
        </p>

        {/* РџРµСЂРµРєР»СЋС‡Р°С‚РµР»СЊ СЂРµР¶РёРјРѕРІ */}
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
            рџ—ЈпёЏ Р РµР¶РёРј РґРёРєС‚РѕРІРєРё
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
            рџЋ¬ Р’РёРґРµРѕ Рё Р¤РёР»СЊРјС‹
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
              Р›Р•Р’Р«Р™ Р‘Р›РћРљ: Р­РљР РђРќ Р Р’Р’РћР”
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
                      {isDemo ? "Р”РµРјРѕ-РїРѕС‚РѕРє СЂРµС‡Рё" : "РџРѕР»СЊР·РѕРІР°С‚РµР»СЊСЃРєРёР№ С‚РµРєСЃС‚"}
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
                      РЇР·С‹Рє: {lang} вЂў Р Р°Р·РјРµСЂ: {fontSize}px
                    </span>
                    <span style={{ fontSize: 11, color: "var(--textMuted)" }}>
                      Hearless v1.0
                    </span>
                  </div>
                </div>

                <div style={{ background: "var(--bgCard)", borderRadius: "20px", padding: "24px", border: "1px solid var(--border)", boxShadow: "var(--shadow)" }}>
                  <textarea value={inputText} onChange={e => setInputText(e.target.value)} placeholder="Р’РІРµРґРёС‚Рµ С‚РµРєСЃС‚, С‡С‚РѕР±С‹ СЃС‹РјРёС‚РёСЂРѕРІР°С‚СЊ СЂРµС‡СЊ РЅР° Р»РµС‚Сѓ..." rows={2}
                    style={{ width: "100%", padding: "16px 20px", borderRadius: "14px", border: "1px solid var(--border)", background: "var(--bgLight)", color: "var(--text)", fontSize: 15, fontFamily: "'Plus Jakarta Sans', sans-serif", resize: "none", outline: "none", marginBottom: 16, transition: "border 0.2s" }}
                    className="focus:border-sky-500" />

                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
                    <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
                      <button
                        onClick={() => useWhisper ? (isMicActive ? stopWhisperRecording() : startWhisperRecording()) : toggleMicrophone()}
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
                          cursor: "pointer",
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
                        Р”РѕР±Р°РІРёС‚СЊ РІ РёСЃС‚РѕСЂРёСЋ в†’
                      </button>

                      <label style={{ display: "inline-flex", alignItems: "center", gap: 8, fontSize: 13, cursor: "pointer", userSelect: "none" }}>
                        <input 
                          type="checkbox" 
                          checked={useAiPunctuation} 
                          onChange={(e) => setUseAiPunctuation(e.target.checked)}
                          style={{ accentColor: "var(--accent)" }}
                        />
                        <span style={{ fontWeight: 600 }}>AI-РџСѓРЅРєС‚СѓР°С†РёСЏ рџљЂ</span>
                      </label>
                    </div>

                    <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                      <span style={{ padding: "6px 14px", borderRadius: 30, background: "rgba(2,132,199,0.08)", color: "var(--accent)", fontSize: 11, fontWeight: 600 }}>{lang}</span>
                      <span style={{ padding: "6px 14px", borderRadius: 30, background: useWhisper ? "rgba(14,165,233,0.12)" : "rgba(56,189,248,0.08)", color: "var(--textSecondary)", fontSize: 11, fontWeight: 600 }}>
                        {useWhisper ? (whisperStatus === "processing" ? "⏳ Обработка..." : "🤖 Replicate AI") : "Web Speech API"}
                      </span>
                      <button onClick={() => { if (!isMicActive) setUseWhisper(v => !v); }} disabled={isMicActive}
                        style={{ padding: "4px 10px", borderRadius: 16, border: "1px solid var(--border)", background: useWhisper ? "rgba(14,165,233,0.12)" : "transparent", color: "var(--textSecondary)", fontSize: 11, fontWeight: 600, cursor: isMicActive ? "default" : "pointer" }}>
                        {useWhisper ? "→ Web Speech" : "→ Replicate AI"}
                      </button>
                      {useWhisper && (
                        <button
                          onClick={() => { if (!isMicActive) { setUseDiarization(v => !v); if (useDiarization) setSpeakerSegments([]); } }}
                          disabled={isMicActive}
                          style={{ padding: "4px 10px", borderRadius: 16, border: `1px solid ${useDiarization ? SPEAKER_COLORS[0] : "var(--border)"}`, background: useDiarization ? "rgba(14,165,233,0.12)" : "transparent", color: useDiarization ? SPEAKER_COLORS[0] : "var(--textSecondary)", fontSize: 11, fontWeight: 600, cursor: isMicActive ? "default" : "pointer", display: "flex", alignItems: "center", gap: 4 }}>
                          👥 {useDiarization ? "Спикеры вкл" : "Спикеры"}
                        </button>
                      )}
                      {sessionSaved && <span style={{ padding: "4px 10px", borderRadius: 16, background: "rgba(34,197,94,0.1)", color: "#22c55e", fontSize: 11, fontWeight: 600 }}>✓ Сохранено</span>}
                    </div>
                  </div>
                </div>

                {/* ==========================================
                    РџРђРќР•Р›Р¬ AI-РђРЎРЎРРЎРўР•РќРўРђ (GEMINI)
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
                    вњЁ AI-РђСЃСЃРёСЃС‚РµРЅС‚ Replicate
                  </h3>
                  <p style={{ fontSize: 13, color: "var(--textSecondary)", marginBottom: 16 }}>
                    РСЃРїРѕР»СЊР·СѓР№С‚Рµ РёРЅС‚РµР»Р»РµРєС‚ Replicate РґР»СЏ Р°РІС‚РѕРјР°С‚РёС‡РµСЃРєРѕРіРѕ РєРѕРЅСЃРїРµРєС‚РёСЂРѕРІР°РЅРёСЏ Р±РµСЃРµРґС‹ РёР»Рё РѕС‚РІРµС‚РѕРІ РЅР° РІРѕРїСЂРѕСЃС‹ РїРѕ СЃРѕРґРµСЂР¶Р°РЅРёСЋ.
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
                      {isAiLoading ? "РћР±СЂР°Р±РѕС‚РєР°..." : "рџ“ќ РЎРіРµРЅРµСЂРёСЂРѕРІР°С‚СЊ РєРѕРЅСЃРїРµРєС‚"}
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
                      РћС‡РёСЃС‚РёС‚СЊ AI
                    </button>
                  </div>

                  {/* Р’С‹РІРѕРґ РљРѕРЅСЃРїРµРєС‚Р° */}
                  {aiSummary && (
                    <div style={{ 
                      background: "rgba(14, 165, 233, 0.05)", 
                      border: "1px solid var(--border)", 
                      borderRadius: 12, 
                      padding: 16, 
                      marginBottom: 20 
                    }}>
                      <h4 style={{ fontSize: 13, fontWeight: 700, marginBottom: 8, color: "var(--accent)" }}>рџ“ќ РљСЂР°С‚РєРёРµ С‚РµР·РёСЃС‹ (AI-РљРѕРЅСЃРїРµРєС‚):</h4>
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

                  {/* Р§Р°С‚ СЃ Р°СЃСЃРёСЃС‚РµРЅС‚РѕРј */}
                  <form onSubmit={askAiAboutTranscript} style={{ display: "flex", gap: 8 }}>
                    <input 
                      type="text" 
                      value={aiQuery} 
                      onChange={(e) => setAiQuery(e.target.value)}
                      placeholder="РЎРїСЂРѕСЃРёС‚Рµ AI (РЅР°РїСЂРёРјРµСЂ: 'Рћ С‡РµРј С€Р»Р° СЂРµС‡СЊ РІРЅР°С‡Р°Р»Рµ?')..."
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
                      РЎРїСЂРѕСЃРёС‚СЊ
                    </button>
                  </form>

                  {/* РћС‚РІРµС‚ РЅР° РІРѕРїСЂРѕСЃ */}
                  {aiResponse && (
                    <div style={{ 
                      background: "rgba(14, 165, 233, 0.08)", 
                      borderLeft: "3px solid var(--accent)", 
                      borderRadius: "0 10px 10px 0", 
                      padding: 12, 
                      marginTop: 12,
                      fontSize: 13,
                      lineHeight: 1.5,
                      color: "var(--text)"
                    }}>
                      <strong>РћС‚РІРµС‚ AI:</strong> {aiResponse}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              // --- Р Р•Р–РРњ 2: РЎРЈР‘РўРРўР Р« Р”Р›РЇ Р’РР”Р•Рћ Р РљРРќРћ ---
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
                  {/* РџР»РµРµСЂ РІРёРґРµРѕ */}
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

                  {/* РћРІРµСЂР»РµР№ СЃСѓР±С‚РёС‚СЂРѕРІ (РґРёРЅР°РјРёС‡РµСЃРєРё СѓРїСЂР°РІР»СЏРµРјС‹Р№ РЅР°СЃС‚СЂРѕР№РєР°РјРё) */}
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

                {/* РџР°РЅРµР»СЊ СѓРїСЂР°РІР»РµРЅРёСЏ РІРёРґРµРѕ-СЂРµР¶РёРјРѕРј */}
                <div style={{ background: "var(--bgCard)", borderRadius: "20px", padding: "24px", border: "1px solid var(--border)", boxShadow: "var(--shadow)" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20, flexWrap: "wrap", gap: 12 }}>
                    <div>
                      <h3 style={{ fontSize: 15, fontWeight: 700, color: "var(--text)", marginBottom: 4 }}>Р—Р°РіСЂСѓР·РёС‚Рµ СЃРІРѕРµ РІРёРґРµРѕ</h3>
                      <p style={{ fontSize: 12, color: "var(--textSecondary)" }}>РџРѕРґРґРµСЂР¶РёРІР°СЋС‚СЃСЏ С„РѕСЂРјР°С‚С‹ MP4, WebM (С„Р°Р№Р»С‹ РѕР±СЂР°Р±Р°С‚С‹РІР°СЋС‚СЃСЏ Р»РѕРєР°Р»СЊРЅРѕ).</p>
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
                    {/* Р—РІСѓРєРѕРІР°СЏ РІРѕР»РЅР° РІРёРґРµРѕ */}
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <span style={{ fontSize: 12, color: "var(--textSecondary)", fontWeight: 500 }}>РђСѓРґРёРѕРґРѕСЂРѕР¶РєР°:</span>
                      <div className="soundwave-indicator">
                        {frequencyData.map((height, i) => (
                          <div key={i} className="sound-bar" style={{ height, background: isVideoPlaying ? textColor : "var(--border)" }} />
                        ))}
                      </div>
                    </div>

                    {/* Р’С‹Р±РѕСЂ РґРµР№СЃС‚РІРёР№ РІ РІРёРґРµРѕ-СЂРµР¶РёРјРµ */}
                    <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
                      <button 
                        onClick={toggleMicrophone}
                        className="btn"
                        style={{ 
                          padding: "8px 16px", 
                          fontSize: 11, 
                          borderRadius: 8,
                          background: isMicActive ? "var(--sos)" : "var(--gradient)",
                          color: "white",
                          boxShadow: isMicActive ? "0 4px 12px rgba(239, 68, 68, 0.3)" : "none",
                          animation: isMicActive ? "mic-pulse 1.5s infinite" : "none",
                          cursor: "pointer",
                          border: "none",
                          fontWeight: 600
                        }}
                      >
                        {isMicActive ? "рџ›‘ Р’С‹РєР»СЋС‡РёС‚СЊ Р°РІС‚Рѕ-СЃСѓР±С‚РёС‚СЂС‹" : "рџЋ™пёЏ Р’РєР»СЋС‡РёС‚СЊ Р°РІС‚Рѕ-СЃСѓР±С‚РёС‚СЂС‹ (РјРёРєСЂРѕС„РѕРЅ)"}
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
                        РЎР±СЂРѕСЃРёС‚СЊ Рє РґРµРјРѕ-РІРёРґРµРѕ
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* РљРЅРѕРїРєРё Р·Р°РїСѓСЃРєР° Picture-in-Picture Рё РћС‚РєСЂС‹С‚РёСЏ РўСЂР°РЅСЃРєСЂРёРїС‚Р° РїРѕРґ СЌРєСЂР°РЅРѕРј */}
            <div style={{ display: "flex", justifyContent: "flex-start", gap: 12, marginTop: 16, flexWrap: "wrap" }}>
              {/* Background Subtitles button */}
              <button
                onClick={() => isScreenCapturing ? stopScreenCapture() : startScreenCapture()}
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
                  cursor: "pointer",
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
                <span>{isPipActive ? "Р—Р°РєСЂС‹С‚СЊ РїР»Р°РІР°СЋС‰РµРµ РѕРєРЅРѕ" : "РћС‚РєСЂС‹С‚СЊ РІ РїР»Р°РІР°СЋС‰РµРј РѕРєРЅРµ (PiP)"}</span>
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
                <span>РћС‚РєСЂС‹С‚СЊ С‚СЂР°РЅСЃРєСЂРёРїС‚ РЅР° РІРµСЃСЊ СЌРєСЂР°РЅ</span>
              </Link>
            </div>
          </div>

          {/* ==========================================
              РџР РђР’Р«Р™ Р‘Р›РћРљ: РќРђРЎРўР РћР™РљР РЎРўРР›Р•Р™
             ========================================== */}
          <div style={{ background: "var(--bgCard)", borderRadius: "24px", padding: "24px", border: "1px solid var(--border)", boxShadow: "var(--shadow)" }}>
            <h3 style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 16, fontWeight: 700, color: "var(--text)", marginBottom: 20 }}>
              РќР°СЃС‚СЂРѕР№РєРё СЃСѓР±С‚РёС‚СЂРѕРІ
            </h3>

            {/* Р’С‹Р±РѕСЂ СЏР·С‹РєР° РёСЃС‚РѕС‡РЅРёРєР° */}
            <div style={{ marginBottom: 20 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: "var(--textSecondary)", display: "block", marginBottom: 8 }}>РЇР·С‹Рє РёСЃС‚РѕС‡РЅРёРєР°</label>
              <div style={{ display: "flex", gap: 6 }}>
                {["ҚАЗ", "РУС", "ENG"].map(l => (
                  <button key={l} onClick={() => handleLangChange(l)}
                    style={{ flex: 1, padding: "8px 0", borderRadius: 12, border: lang === l ? "none" : "1px solid var(--border)", background: lang === l ? "var(--gradient)" : "rgba(255,255,255,0.4)", color: lang === l ? "white" : "var(--textSecondary)", fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 600, fontSize: 12, cursor: "pointer", transition: "all 0.2s" }}>
                    {l}
                  </button>
                ))}
              </div>
            </div>

            {/* Р’С‹Р±РѕСЂ РґРІРёР¶РєР° СЂР°СЃРїРѕР·РЅР°РІР°РЅРёСЏ (С‚РѕР»СЊРєРѕ РґР»СЏ РІРёРґРµРѕ) */}
            {mode === "video" && (
              <div style={{ marginBottom: 20 }}>
                <label style={{ fontSize: 12, fontWeight: 600, color: "var(--textSecondary)", display: "block", marginBottom: 8 }}>Р”РІРёР¶РѕРє РР</label>
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
                    РРјРёС‚Р°С†РёСЏ (РЎРёРЅС…СЂРѕРЅРЅРѕ)
                  </button>
                  <button 
                    onClick={() => {
                      setIsApiConnecting(true);
                      alert("РџРѕРґРєР»СЋС‡РµРЅРёРµ Рє FastAPI СЃРµСЂРІРµСЂСѓ СЃСѓР±С‚РёС‚СЂРѕРІ /ws/transcribe. Р”Р»СЏ СЂР°Р±РѕС‚С‹ РІ СЂРµР°Р»СЊРЅРѕРј РІСЂРµРјРµРЅРё СѓР±РµРґРёС‚РµСЃСЊ, С‡С‚Рѕ Р±СЌРєРµРЅРґ Р·Р°РїСѓС‰РµРЅ.");
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
                    API РЎРµСЂРІРµСЂ Hearless
                  </button>
                </div>
              </div>
            )}

            {/* Р Р°Р·РјРµСЂ С€СЂРёС„С‚Р° */}
            <div style={{ marginBottom: 20 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: "var(--textSecondary)", display: "block", marginBottom: 8 }}>Р Р°Р·РјРµСЂ С‚РµРєСЃС‚Р°</label>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 6 }}>
                {[18, 22, 24, 28].map((sz) => (
                  <button key={sz} onClick={() => setFontSize(sz)}
                    style={{ padding: "8px 0", borderRadius: 12, border: fontSize === sz ? "none" : "1px solid var(--border)", background: fontSize === sz ? "var(--gradient)" : "rgba(255,255,255,0.4)", color: fontSize === sz ? "white" : "var(--textSecondary)", fontWeight: 600, fontSize: 12, cursor: "pointer", transition: "all 0.2s" }}>
                    {sz}
                  </button>
                ))}
              </div>
            </div>

            {/* Р¦РІРµС‚ С‚РµРєСЃС‚Р° */}
            <div style={{ marginBottom: 20 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: "var(--textSecondary)", display: "block", marginBottom: 8 }}>Р¦РІРµС‚ СЃСѓР±С‚РёС‚СЂРѕРІ</label>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 6 }}>
                {[
                  { code: "#ffffff", name: "Р‘РµР»С‹Р№" },
                  { code: "#fdeb47", name: "Р–РµР»С‚С‹Р№" },
                  { code: "#22d3ee", name: "Р¦РёР°РЅ" },
                  { code: "#4ade80", name: "Р—РµР»РµРЅС‹Р№" }
                ].map((c) => (
                  <button key={c.code} onClick={() => setTextColor(c.code)}
                    style={{ padding: "8px 0", borderRadius: 12, border: textColor === c.code ? "2px solid var(--accent)" : "1px solid var(--border)", background: "rgba(15, 23, 42, 0.95)", color: c.code, fontWeight: 600, fontSize: 12, cursor: "pointer", transition: "all 0.2s" }}>
                    {c.name}
                  </button>
                ))}
              </div>
            </div>

            {/* РЎС‚РёР»СЊ С„РѕРЅР° */}
            <div style={{ marginBottom: 20 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: "var(--textSecondary)", display: "block", marginBottom: 8 }}>Р—Р°РґРЅРёР№ С„РѕРЅ РґРёСЃРїР»РµСЏ</label>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {[
                  { opacity: 0.85, label: "РЎРїР»РѕС€РЅРѕР№ С‚РµРјРЅС‹Р№" },
                  { opacity: 0.5, label: "РџРѕР»СѓРїСЂРѕР·СЂР°С‡РЅС‹Р№" },
                  { opacity: 0, label: "Р‘РµР· С„РѕРЅР°" }
                ].map((bg) => (
                  <button key={bg.opacity} onClick={() => setBgOpacity(bg.opacity)}
                    style={{ width: "100%", padding: "10px", borderRadius: 12, border: bgOpacity === bg.opacity ? "none" : "1px solid var(--border)", background: bgOpacity === bg.opacity ? "var(--gradient)" : "rgba(255,255,255,0.4)", color: bgOpacity === bg.opacity ? "white" : "var(--textSecondary)", fontWeight: 600, fontSize: 12, cursor: "pointer", transition: "all 0.2s", textAlign: "left", paddingLeft: 16 }}>
                    {bg.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Р’С‹СЂР°РІРЅРёРІР°РЅРёРµ */}
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: "var(--textSecondary)", display: "block", marginBottom: 8 }}>Р’С‹СЂР°РІРЅРёРІР°РЅРёРµ С‚РµРєСЃС‚Р°</label>
              <div style={{ display: "flex", gap: 6 }}>
                {[
                  { key: "center", label: "Р¦РµРЅС‚СЂ" },
                  { key: "left", label: "РџРѕ Р»РµРІРѕРјСѓ РєСЂР°СЋ" }
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

        {/* РСЃС‚РѕСЂРёСЏ СЃРµСЃСЃРёРё РґРёРєС‚РѕРІРєРё */}
        {mode === "speech" && history.length > 0 && (
          <div style={{ marginTop: 40 }}>
            <h3 style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 16, fontWeight: 700, color: "white", marginBottom: 16 }}>РСЃС‚РѕСЂРёСЏ СЃРµСЃСЃРёРё</h3>
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

        {/* РћРїРёСЃР°РЅРёРµ С‚РµС…РЅРѕР»РѕРіРёР№ */}
        <div style={{ marginTop: 64, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 20 }}>
          {[
            { title: "Р РµР¶РёРј РљР°СЂС‚РёРЅРєР°-РІ-РєР°СЂС‚РёРЅРєРµ", desc: "Р—Р°РїСѓСЃС‚РёС‚Рµ РІСЃРµРіРґР° РЅР°С…РѕРґСЏС‰РёР№СЃСЏ РїРѕРІРµСЂС… РѕРєРѕРЅ РїР»Р°РІР°СЋС‰РёР№ РІРёРґР¶РµС‚ Рё РїРµСЂРµС‚Р°С‰РёС‚Рµ РµРіРѕ РЅР° YouTube РёР»Рё Netflix, С‡С‚РѕР±С‹ СЃРјРѕС‚СЂРµС‚СЊ С„РёР»СЊРјС‹ СЃ СЃСѓР±С‚РёС‚СЂР°РјРё." },
            { title: "Р РµР°РєС‚РёРІРЅР°СЏ Р°СѓРґРёРѕ-РІРѕР»РЅР°", desc: "Р”Р°С‚С‡РёРє СЃРїРµРєС‚СЂР° Web Audio API Р°РЅР°Р»РёР·РёСЂСѓРµС‚ Р·РІСѓРєРѕРІС‹Рµ С‡Р°СЃС‚РѕС‚С‹ РІРёРґРµРѕСЂРѕР»РёРєР° РІ СЂРµР°Р»СЊРЅРѕРј РІСЂРµРјРµРЅРё." },
            { title: "Р“РёР±РєР°СЏ Р°РґР°РїС‚Р°С†РёСЏ РїРѕРґ РіР»Р°Р·Р°", desc: "РњРµРЅСЏР№С‚Рµ РєРѕРЅС‚СЂР°СЃС‚РЅРѕСЃС‚СЊ, СЂР°Р·РјРµСЂ С€СЂРёС„С‚Р° Рё С†РІРµС‚РѕРІС‹Рµ РїР°Р»РёС‚СЂС‹ СЃСѓР±С‚РёС‚СЂРѕРІ РїСЂСЏРјРѕ РІРѕ РІСЂРµРјСЏ РїСЂРѕСЃРјРѕС‚СЂР° С„РёР»СЊРјР°." },
            { title: "РџСЂСЏРјРѕР№ РєРѕРЅРЅРµРєС‚ Рє FastAPI", desc: "РџРµСЂРµРєР»СЋС‡РёС‚РµСЃСЊ РІ СЂРµР¶РёРј API РґР»СЏ РёРЅС‚РµРіСЂР°С†РёРё СЃ РІР°С€РёРј Whisper WebSocket СЃРµСЂРІРµСЂРѕРј." },
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

