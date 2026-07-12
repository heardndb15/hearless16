"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { FilesetResolver, HandLandmarker, DrawingUtils, HandLandmarkerResult } from "@mediapipe/tasks-vision";
import { GestureRecognizer, type RawSample } from "../../../../shared/signLanguageReader/GestureRecognizer";
import { TextComposer } from "../../../../shared/signLanguageReader/TextComposer";
import { classifyGesture } from "../../../../shared/signLanguageReader/classifyGesture";
import { SIGN_LANGUAGES, DEFAULT_SIGN_LANGUAGE, SIGN_LANGUAGE_STORAGE_KEY, type SignLanguage } from "../../../../shared/signLanguageReader/languages";

const SAMPLE_INTERVAL_MS = 300;

function withTimeout<T>(promise: Promise<T>, ms: number, message: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error(message)), ms)),
  ]);
}

type Quality = "none" | "low" | "medium" | "high";

const QUALITY_LABEL: Record<Quality, string> = {
  none: "Наведите камеру на руки",
  low: "Низкое качество",
  medium: "Среднее качество",
  high: "Хорошее качество",
};

const QUALITY_COLOR: Record<Quality, string> = {
  none: "#94A3B8",
  low: "#EF4444",
  medium: "#F59E0B",
  high: "#22C55E",
};

function qualityFor(sample: RawSample | null): Quality {
  if (!sample || sample.error) return "none";
  if (sample.confidence < 45) return "low";
  if (sample.confidence < 70) return "medium";
  return "high";
}

export default function SignLanguageReaderPage() {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const handLandmarkerRef = useRef<HandLandmarker | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const animationFrameIdRef = useRef<number | null>(null);
  const drawingUtilsRef = useRef<DrawingUtils | null>(null);
  const lastSampleAtRef = useRef(0);
  const lastVideoTimeRef = useRef<number>(-1);

  const recognizerRef = useRef(new GestureRecognizer());
  const composerRef = useRef(new TextComposer());

  const [language, setLanguageState] = useState<SignLanguage>(() => {
    if (typeof window === "undefined") return DEFAULT_SIGN_LANGUAGE;
    const stored = window.localStorage.getItem(SIGN_LANGUAGE_STORAGE_KEY);
    return stored === "kz" || stored === "ru" ? stored : DEFAULT_SIGN_LANGUAGE;
  });
  const languageRef = useRef<SignLanguage>(language);

  const [isModelLoading, setIsModelLoading] = useState(true);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [sentence, setSentence] = useState("");
  const [liveSample, setLiveSample] = useState<RawSample | null>(null);

  const handleSample = useCallback((sample: RawSample) => {
    setLiveSample(sample);
    const state = recognizerRef.current.pushSample(sample);
    if (state.changed) {
      composerRef.current.onConfirmedChange(state.confirmed);
      setSentence(composerRef.current.sentence);
    }
  }, []);

  const setLanguage = useCallback((next: SignLanguage) => {
    languageRef.current = next;
    setLanguageState(next);
    window.localStorage.setItem(SIGN_LANGUAGE_STORAGE_KEY, next);
    recognizerRef.current.reset();
    composerRef.current.clear();
    setSentence("");
  }, []);

  const handleTrackingResults = useCallback(
    (results: HandLandmarkerResult) => {
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext("2d");
      if (!canvas || !ctx) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const now = performance.now();
      const shouldSample = now - lastSampleAtRef.current >= SAMPLE_INTERVAL_MS;

      if (results.landmarks && results.landmarks.length > 0) {
        const landmarks = results.landmarks[0];
        const handednessScore = results.handedness?.[0]?.[0]?.score ?? 1;

        if (!drawingUtilsRef.current) drawingUtilsRef.current = new DrawingUtils(ctx);
        drawingUtilsRef.current.drawConnectors(landmarks, HandLandmarker.HAND_CONNECTIONS, {
          color: "#0066FF",
          lineWidth: 4,
        });
        drawingUtilsRef.current.drawLandmarks(landmarks, {
          color: "#0066FF",
          fillColor: "#ffffff",
          lineWidth: 2,
          radius: 5,
        });

        if (shouldSample) {
          lastSampleAtRef.current = now;
          const { gesture, confidence } = classifyGesture(landmarks, handednessScore, languageRef.current);
          handleSample({ gesture, confidence });
        }
      } else if (shouldSample) {
        lastSampleAtRef.current = now;
        handleSample({ gesture: null, confidence: 0, error: "no_hand_detected" });
      }
    },
    [handleSample]
  );

  useEffect(() => {
    let cancelled = false;

    async function init() {
      if (!videoRef.current || !canvasRef.current) return;
      setCameraError(null);
      setIsModelLoading(true);

      try {
        // A blocked/failed WASM or model fetch (ad-blocker, corporate proxy,
        // flaky mobile network) can leave these promises pending forever —
        // with no timeout, that left users staring at "Инициализация..."
        // indefinitely with zero feedback, no error, and no way to retry.
        const vision = await withTimeout(
          FilesetResolver.forVisionTasks(
            "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.35/wasm"
          ),
          20000,
          "Не удалось загрузить модуль трекера рук (WASM). Проверьте соединение."
        );
        const handLandmarker = await withTimeout(HandLandmarker.createFromOptions(vision, {
          baseOptions: {
            // Self-hosted (see /public/models) instead of fetched from
            // storage.googleapis.com on every page load — that host is
            // reliably slow/throttled on some ISPs (measured ~240KB/s on one,
            // sometimes not completing a ~7.8MB download inside 30s at all),
            // which left users staring at "Инициализация трекера рук..."
            // for a minute or more with no feedback and no timeout.
            modelAssetPath: "/models/hand_landmarker.task",
          },
          runningMode: "VIDEO",
          numHands: 1,
          minHandDetectionConfidence: 0.6,
          minHandPresenceConfidence: 0.6,
          minTrackingConfidence: 0.6,
        }), 20000, "Не удалось загрузить модель трекера рук. Проверьте соединение.");

        if (cancelled) {
          handLandmarker.close();
          return;
        }
        handLandmarkerRef.current = handLandmarker;

        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
        if (cancelled || !videoRef.current) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        mediaStreamRef.current = stream;
        videoRef.current.srcObject = stream;

        await new Promise<void>((resolve) => {
          if (!videoRef.current) return resolve();
          videoRef.current.onloadeddata = () => resolve();
        });
        await videoRef.current.play();

        setIsModelLoading(false);

        const loop = () => {
          if (!videoRef.current || !handLandmarkerRef.current) return;
          const video = videoRef.current;
          // Guard against re-submitting the same video frame with a new
          // timestamp (rAF can fire faster than the camera produces new
          // frames) — detectForVideo() requires strictly increasing
          // timestamps and throws otherwise, which without a try/catch
          // used to skip the requestAnimationFrame() call below and
          // permanently freeze/clear the hand-tracking overlay.
          if (video.currentTime !== lastVideoTimeRef.current) {
            lastVideoTimeRef.current = video.currentTime;
            try {
              const results = handLandmarkerRef.current.detectForVideo(video, performance.now());
              handleTrackingResults(results);
            } catch (err) {
              console.error("MediaPipe detectForVideo error:", err);
            }
          }
          animationFrameIdRef.current = requestAnimationFrame(loop);
        };
        loop();
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        setCameraError(`Не удалось получить доступ к веб-камере или инициализировать трекер: ${message}`);
        setIsModelLoading(false);
      }
    }

    init();

    return () => {
      cancelled = true;
      if (animationFrameIdRef.current !== null) cancelAnimationFrame(animationFrameIdRef.current);
      mediaStreamRef.current?.getTracks().forEach((t) => t.stop());
      mediaStreamRef.current = null;
      handLandmarkerRef.current?.close();
      handLandmarkerRef.current = null;
      if (videoRef.current) videoRef.current.srcObject = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const quality = qualityFor(liveSample);
  const hasText = sentence.length > 0;

  function handleClear() {
    composerRef.current.clear();
    recognizerRef.current.reset();
    setSentence("");
  }

  async function handleCopy() {
    if (!sentence) return;
    await navigator.clipboard.writeText(sentence);
  }

  function handleSpeak() {
    if (!sentence) return;
    const utterance = new SpeechSynthesisUtterance(sentence);
    utterance.lang = "ru-RU";
    window.speechSynthesis.speak(utterance);
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <h2 className="font-syne font-extrabold text-3xl text-slate-800">Перевод жестов</h2>
          <p className="text-slate-500 text-sm max-w-2xl font-medium">
            Покажите жест перед камерой — приложение распознает его и добавит слово в предложение.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {SIGN_LANGUAGES.map((lang) => (
            <button
              key={lang.code}
              onClick={() => setLanguage(lang.code)}
              className={
                lang.code === language
                  ? "px-4 py-2 rounded-xl bg-accent text-white text-xs font-bold"
                  : "px-4 py-2 rounded-xl bg-slate-100 text-slate-600 text-xs font-bold"
              }
            >
              {lang.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-7 bg-white/40 backdrop-blur-xl border border-white/60 shadow-xl rounded-2xl p-6">
          <div className="relative aspect-video w-full rounded-2xl border-2 border-slate-300 bg-slate-950 overflow-hidden flex items-center justify-center shadow-2xl">
            <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover scale-x-[-1]" />
            <canvas
              ref={canvasRef}
              width={640}
              height={480}
              className="absolute inset-0 w-full h-full object-cover scale-x-[-1] pointer-events-none"
            />

            {isModelLoading && !cameraError && (
              <div className="absolute inset-0 bg-slate-950/90 flex flex-col items-center justify-center gap-4">
                <div className="w-11 h-11 border-4 border-white/15 border-t-accent rounded-full animate-spin" />
                <span className="text-xs text-white/80 font-syne tracking-wide">Инициализация трекера рук...</span>
              </div>
            )}

            {cameraError && (
              <div className="absolute inset-0 bg-slate-950/95 flex flex-col items-center justify-center gap-4 p-6 text-center">
                <h3 className="text-sm font-bold text-red-400">Не удалось запустить камеру</h3>
                <p className="text-xs text-white/70">{cameraError}</p>
                <button
                  className="px-5 py-2 rounded-xl bg-accent text-white text-xs font-bold"
                  onClick={() => window.location.reload()}
                >
                  Повторить попытку
                </button>
              </div>
            )}

            {!isModelLoading && !cameraError && (
              <div className="absolute bottom-4 left-4 right-4 py-2 px-3 rounded-xl bg-black/60 border border-white/10 backdrop-blur-sm flex justify-between items-center text-white text-[11px] font-bold">
                <span className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: QUALITY_COLOR[quality] }} />
                  {liveSample?.gesture ?? "Покажите жест"}
                </span>
                {liveSample?.gesture && <span>{Math.round(liveSample.confidence)}%</span>}
              </div>
            )}
          </div>
        </div>

        <div className="lg:col-span-5 bg-white/40 backdrop-blur-xl border border-white/60 shadow-xl rounded-2xl p-6 flex flex-col gap-5">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: QUALITY_COLOR[quality] }} />
            <span className="text-xs font-bold text-slate-500">{QUALITY_LABEL[quality]}</span>
          </div>

          <div className="min-h-[100px] max-h-[220px] overflow-y-auto rounded-xl bg-slate-50/80 border border-slate-100 p-4">
            <p className={hasText ? "text-2xl font-bold text-slate-800 leading-snug" : "text-sm text-slate-400"}>
              {hasText ? sentence : "Распознанный текст появится здесь"}
            </p>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <button
              onClick={handleClear}
              disabled={!hasText}
              className="flex flex-col items-center gap-1 py-3 rounded-xl bg-slate-100 disabled:opacity-40 text-slate-700 font-semibold text-xs"
            >
              <span className="text-lg">🗑️</span>
              Очистить
            </button>
            <button
              onClick={handleCopy}
              disabled={!hasText}
              className="flex flex-col items-center gap-1 py-3 rounded-xl bg-slate-100 disabled:opacity-40 text-slate-700 font-semibold text-xs"
            >
              <span className="text-lg">📋</span>
              Копировать
            </button>
            <button
              onClick={handleSpeak}
              disabled={!hasText}
              className="flex flex-col items-center gap-1 py-3 rounded-xl bg-slate-100 disabled:opacity-40 text-slate-700 font-semibold text-xs"
            >
              <span className="text-lg">🔊</span>
              Озвучить
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
