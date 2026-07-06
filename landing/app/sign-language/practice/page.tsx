"use client";

import { useEffect, useRef, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { GESTURE_DEFS, CONNECTIONS } from "./gestureDefs";
import { FilesetResolver, HandLandmarker, DrawingUtils, HandLandmarkerResult, NormalizedLandmark } from "@mediapipe/tasks-vision";


function GesturePracticeContent() {
  const searchParams = useSearchParams();
  const initialGesture = searchParams.get("gesture") ?? "A";
  const [activeGesture, setActiveGesture] = useState<string>(
    Object.keys(GESTURE_DEFS).includes(initialGesture) ? initialGesture : "A"
  );
  const [similarity, setSimilarity] = useState<number>(0);
  const [isMatched, setIsMatched] = useState<boolean>(false);
  const [hints, setHints] = useState<string[]>([]);
  const [fingerStates, setFingerStates] = useState<Record<string, boolean>>({
    thumb: false, index: false, middle: false, ring: false, pinky: false
  });
  const [activeFeatures, setActiveFeatures] = useState<Record<string, number> | null>(null);
  const latestLandmarksRef = useRef<NormalizedLandmark[] | null>(null);
  // Ref с актуальным activeGesture для чтения внутри predictLoop/handleTrackingResults,
  // которые создаются один раз при монтировании и иначе видели бы "замороженное" значение
  const activeGestureRef = useRef(activeGesture);
  useEffect(() => {
    activeGestureRef.current = activeGesture;
  }, [activeGesture]);

  // Статусы камеры и модели
  const [isCameraActive, setIsCameraActive] = useState<boolean>(false);
  const [isModelLoading, setIsModelLoading] = useState<boolean>(true);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [handsTrackingActive, setHandsTrackingActive] = useState<boolean>(false);

  // Режим калибровки (для разработчика)
  const [calibrationMode, setCalibrationMode] = useState<boolean>(false);
  const [calibratedFeatures, setCalibratedFeatures] = useState<string | null>(null);

  // Референсы элементов DOM и MediaPipe
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const handLandmarkerRef = useRef<HandLandmarker | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const animationFrameIdRef = useRef<number | null>(null);
  const drawingUtilsRef = useRef<DrawingUtils | null>(null);

  // Математическая функция расчета евклидова расстояния
  const getDistance3D = (pt1: NormalizedLandmark, pt2: NormalizedLandmark) => {
    return Math.sqrt(
      Math.pow(pt1.x - pt2.x, 2) +
      Math.pow(pt1.y - pt2.y, 2) +
      Math.pow(pt1.z - pt2.z, 2)
    );
  };

  // Инициализация MediaPipe HandLandmarker
  // shouldContinue позволяет отменить инициализацию, если компонент размонтирован
  // до завершения одного из асинхронных шагов (см. useEffect ниже)
  const initMediaPipe = async (shouldContinue: () => boolean = () => true) => {
    if (typeof window === "undefined" || !videoRef.current || !canvasRef.current) return;

    setCameraError(null);
    setIsModelLoading(true);

    try {
      const vision = await FilesetResolver.forVisionTasks(
        "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.35/wasm"
      );

      const handLandmarker = await HandLandmarker.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath:
            "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task",
        },
        runningMode: "VIDEO",
        numHands: 1,
        minHandDetectionConfidence: 0.6,
        minHandPresenceConfidence: 0.6,
        minTrackingConfidence: 0.6,
      });

      if (!shouldContinue()) {
        handLandmarker.close();
        return;
      }
      handLandmarkerRef.current = handLandmarker;

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480 },
        audio: false,
      });

      if (!shouldContinue() || !videoRef.current) {
        stream.getTracks().forEach((track) => track.stop());
        return;
      }
      mediaStreamRef.current = stream;
      videoRef.current.srcObject = stream;

      await new Promise<void>((resolve) => {
        if (!videoRef.current) return resolve();
        videoRef.current.onloadeddata = () => resolve();
      });

      await videoRef.current.play();

      setIsCameraActive(true);
      setIsModelLoading(false);
      setHandsTrackingActive(true);

      const predictLoop = () => {
        if (!videoRef.current || !handLandmarkerRef.current) return;
        const results = handLandmarkerRef.current.detectForVideo(videoRef.current, performance.now());
        handleTrackingResults(results);
        animationFrameIdRef.current = requestAnimationFrame(predictLoop);
      };
      predictLoop();
    } catch (err: any) {
      console.error("Ошибка инициализации MediaPipe: ", err);
      setCameraError(`Не удалось получить доступ к веб-камере или инициализировать трекер: ${err.message}`);
      setIsModelLoading(false);
    }
  };

  // Обработчик результатов трекинга от MediaPipe
  const handleTrackingResults = (results: HandLandmarkerResult) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Очищаем canvas перед новым кадром
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Если рука найдена в кадре
    if (results.landmarks && results.landmarks.length > 0) {
      const landmarks = results.landmarks[0];

      // 1. ВЫЧИСЛЕНИЕ ВРАЩАТЕЛЬНО- И МАСШТАБНО-ИНВАРИАНТНЫХ ПРИЗНАКОВ
      // Точка 0: запястье. Точка 9: основание среднего пальца (MCP сустав)
      const p0 = landmarks[0];
      const p9 = landmarks[9];
      const palmSize = getDistance3D(p0, p9); // Масштабный коэффициент S

      const currentFeatures: Record<string, number> = {
        // Расстояние от кончиков до пястно-фаланговых суставов
        thumb_extension: getDistance3D(landmarks[4], landmarks[2]) / palmSize,
        index_extension: getDistance3D(landmarks[8], landmarks[5]) / palmSize,
        middle_extension: getDistance3D(landmarks[12], landmarks[9]) / palmSize,
        ring_extension: getDistance3D(landmarks[16], landmarks[13]) / palmSize,
        pinky_extension: getDistance3D(landmarks[20], landmarks[17]) / palmSize,

        // Относительные расстояния от кончиков пальцев до запястья (0)
        thumb_wrist: getDistance3D(landmarks[4], p0) / palmSize,
        index_wrist: getDistance3D(landmarks[8], p0) / palmSize,
        middle_wrist: getDistance3D(landmarks[12], p0) / palmSize,
        ring_wrist: getDistance3D(landmarks[16], p0) / palmSize,
        pinky_wrist: getDistance3D(landmarks[20], p0) / palmSize,

        // Расстояния между кончиками соседних пальцев
        thumb_index: getDistance3D(landmarks[4], landmarks[8]) / palmSize,
        index_middle: getDistance3D(landmarks[8], landmarks[12]) / palmSize,
        middle_ring: getDistance3D(landmarks[12], landmarks[16]) / palmSize,
        ring_pinky: getDistance3D(landmarks[16], landmarks[20]) / palmSize,
      };

      setActiveFeatures(currentFeatures);
      latestLandmarksRef.current = landmarks;

      // Бинарные состояния пальцев (выпрямлен / согнут) для простого чек-листа
      // Палец считается выпрямленным, если расстояние от кончика до запястья больше, чем от сустава PIP (второго сустава) до запястья
      const currentStates = {
        thumb: currentFeatures.thumb_extension > 0.85,
        index: getDistance3D(landmarks[8], p0) > getDistance3D(landmarks[6], p0),
        middle: getDistance3D(landmarks[12], p0) > getDistance3D(landmarks[10], p0),
        ring: getDistance3D(landmarks[16], p0) > getDistance3D(landmarks[14], p0),
        pinky: getDistance3D(landmarks[20], p0) > getDistance3D(landmarks[18], p0),
      };

      setFingerStates(currentStates);

      // 2. СРАВНЕНИЕ С ЭТАЛОНОМ ДЛЯ ВЫБРАННОГО ЖЕСТА
      const refDef = GESTURE_DEFS[activeGestureRef.current];
      if (refDef) {
        // Вычисляем евклидову дистанцию между векторами признаков
        let squareDiffSum = 0;
        let weightSum = 0;

        // Назначаем веса разным компонентам (например, сгиб неиспользуемых пальцев критичен)
        const weights: Record<string, number> = {
          thumb_extension: 1.5,
          index_extension: 1.5,
          middle_extension: 1.5,
          ring_extension: 1.5,
          pinky_extension: 1.5,
          thumb_wrist: 1.0,
          index_wrist: 1.0,
          middle_wrist: 1.0,
          ring_wrist: 1.0,
          pinky_wrist: 1.0,
          thumb_index: 2.0, // Расстояние щипка или разведения важно
          index_middle: 1.2,
          middle_ring: 1.2,
          ring_pinky: 1.2,
        };

        Object.keys(refDef.features).forEach((key) => {
          const w = weights[key] || 1.0;
          const userVal = currentFeatures[key];
          const refVal = refDef.features[key];
          squareDiffSum += w * Math.pow(userVal - refVal, 2);
          weightSum += w;
        });

        // Нормализованная взвешенная дистанция
        const distanceMetric = Math.sqrt(squareDiffSum / weightSum);
        
        // Преобразуем расстояние в процент схожести (если дистанция >= 0.35, то процент равен 0)
        const maxDistThreshold = 0.35;
        const currentSim = Math.max(0, Math.round(100 * (1 - distanceMetric / maxDistThreshold)));
        setSimilarity(currentSim);

        // Получаем текстовые подсказки
        const activeHints = refDef.checkRules(currentFeatures, currentStates);
        setHints(activeHints);

        // Жест считается усвоенным, если процент схожести >= 85% и нет критических расхождений по правилам
        const success = currentSim >= 85 && activeHints.length === 0;
        setIsMatched(success);

        // 3. ОТРИСОВКА СКЕЛЕТА РУКИ
        drawHandSkeleton(ctx, landmarks, success);
      }
    } else {
      // Если рука не видна
      setSimilarity(0);
      setIsMatched(false);
      setHints(["Направьте руку в кадр перед веб-камерой"]);
      setActiveFeatures(null);
    }
  };

  // Рисование скелета руки поверх видео
  const drawHandSkeleton = (ctx: CanvasRenderingContext2D, landmarks: NormalizedLandmark[], success: boolean) => {
    const accentColor = success ? "#22C55E" : "#1565C0"; // Зеленый при успехе, ярко-голубой при трекинге

    if (!drawingUtilsRef.current) {
      drawingUtilsRef.current = new DrawingUtils(ctx);
    }
    const drawingUtils = drawingUtilsRef.current;

    ctx.shadowBlur = success ? 15 : 6;
    ctx.shadowColor = accentColor;
    drawingUtils.drawConnectors(landmarks, HandLandmarker.HAND_CONNECTIONS, {
      color: accentColor,
      lineWidth: 4,
    });

    ctx.shadowBlur = 0;
    drawingUtils.drawLandmarks(landmarks, {
      color: accentColor,
      fillColor: "#ffffff",
      lineWidth: 2,
      radius: 5,
    });
  };

  // Переключение активного жеста
  const handleGestureChange = (gestureId: string) => {
    setActiveGesture(gestureId);
    setSimilarity(0);
    setIsMatched(false);
    setHints([]);
  };

  // Режим калибровки (сохранение текущих координат пользователя как эталонных)
  const handleCalibrate = () => {
    if (!activeFeatures || !latestLandmarksRef.current) {
      alert("Сначала покажите руку камере, чтобы зафиксировать координаты.");
      return;
    }
    // Пересчитываем 21 координату руки в 0-100 viewBox, как у GestureDef.referenceLandmarks
    const referenceLandmarks = latestLandmarksRef.current.map((pt) => ({
      x: Math.round(pt.x * 100),
      y: Math.round(pt.y * 100),
    }));
    const formatted = JSON.stringify({ features: activeFeatures, referenceLandmarks }, null, 2);
    setCalibratedFeatures(formatted);
    console.log("Калибровочные данные для жеста:", formatted);
  };

  // Инициализация трекера при монтировании, очистка при размонтировании
  useEffect(() => {
    let cancelled = false;
    initMediaPipe(() => !cancelled);

    return () => {
      cancelled = true;
      if (animationFrameIdRef.current !== null) {
        cancelAnimationFrame(animationFrameIdRef.current);
      }
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach((track) => track.stop());
        mediaStreamRef.current = null;
      }
      if (handLandmarkerRef.current) {
        handLandmarkerRef.current.close();
        handLandmarkerRef.current = null;
      }
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)", color: "var(--text)" }}>
      <div style={{ padding: "100px 24px 60px", maxWidth: 1100, margin: "0 auto" }}>
        <Link href="/sign-language" style={{ color: "var(--accent)", textDecoration: "none", fontSize: 14, display: "inline-block", marginBottom: 24, fontWeight: 600, transition: "color 0.2s" }}
          onMouseEnter={(e) => e.currentTarget.style.color = "var(--text)"}
          onMouseLeave={(e) => e.currentTarget.style.color = "var(--accent)"}>
          ← Назад к каталогу
        </Link>
        
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 16, marginBottom: 32 }}>
          <div>
            <div className="section-label">Интерактивная практика</div>
            <h1 className="section-title" style={{ margin: "4px 0 12px" }}>Тренажер Жестового Языка</h1>
            <p className="section-subtitle">
              Включите камеру и повторите предложенный жест. Алгоритм сравнит геометрию вашей руки с эталоном.
            </p>
          </div>

          {/* Кнопка калибровки без эмодзи */}
          <button 
            className="btn btn-outline" 
            onClick={() => setCalibrationMode(!calibrationMode)}
            style={{ padding: "10px 20px", borderRadius: "var(--radiusSm)", fontSize: 12, display: "flex", alignItems: "center", gap: 8 }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
            </svg>
            <span>{calibrationMode ? "Скрыть калибровку" : "Калибровка"}</span>
          </button>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 32, alignItems: "start" }}>
          
          {/* ==========================================
              ЛЕВАЯ СТОРОНА: КАМЕРА И ВИЗУАЛИЗАЦИЯ
             ========================================== */}
          <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
            <div style={{ 
              background: "var(--bgCard)", 
              borderRadius: "var(--radius)", 
              border: "1px solid var(--border)", 
              padding: 24, 
              position: "relative",
              overflow: "hidden",
              boxShadow: "0 8px 32px rgba(0, 0, 0, 0.03)"
            }}>
              {/* Окно веб-камеры с неоновой границей */}
              <div style={{ 
                position: "relative", 
                width: "100%", 
                aspectRatio: "4/3", 
                borderRadius: "var(--radiusSm)", 
                background: "#090d16", 
                overflow: "hidden",
                border: "1px solid rgba(0, 0, 0, 0.2)",
                boxShadow: isMatched ? "0 0 20px rgba(34, 197, 94, 0.2)" : "none",
                transition: "box-shadow 0.3s ease"
              }}>
                {/* Элемент видео (веб-камера, отзеркаленная для пользователя) */}
                <video 
                  ref={videoRef}
                  style={{ 
                    position: "absolute",
                    width: "100%",
                    height: "100%",
                    objectFit: "cover",
                    transform: "scaleX(-1)",
                    display: isCameraActive ? "block" : "none"
                  }}
                  width="640"
                  height="480"
                  playsInline
                  muted
                  autoPlay
                />

                {/* Canvas для рисования скелета (также отзеркален поверх видео) */}
                <canvas 
                  ref={canvasRef}
                  width="640"
                  height="480"
                  style={{ 
                    position: "absolute", 
                    top: 0, 
                    left: 0, 
                    width: "100%", 
                    height: "100%",
                    transform: "scaleX(-1)",
                    zIndex: 10
                  }}
                />

                {/* Лоадер при загрузке нейросети */}
                {isModelLoading && (
                  <div style={{ 
                    position: "absolute", 
                    inset: 0, 
                    background: "rgba(9, 13, 22, 0.9)", 
                    display: "flex", 
                    flexDirection: "column", 
                    alignItems: "center", 
                    justifyContent: "center",
                    gap: 16,
                    zIndex: 20
                  }}>
                    <div style={{ 
                      width: 44, 
                      height: 44, 
                      border: "3px solid rgba(255, 255, 255, 0.15)",
                      borderTop: "3px solid var(--accent)", 
                      borderRadius: "50%",
                      animation: "spin 0.8s linear infinite"
                    }} />
                    <span style={{ fontSize: 13, color: "rgba(240, 249, 255, 0.8)", fontFamily: "'Plus Jakarta Sans', sans-serif", letterSpacing: "0.5px" }}>
                      Инициализация трекера рук...
                    </span>
                  </div>
                )}

                {/* Сообщение об ошибке (например, нет веб-камеры) */}
                {cameraError && (
                  <div style={{ 
                    position: "absolute", 
                    inset: 0, 
                    background: "rgba(9, 13, 22, 0.95)", 
                    display: "flex", 
                    flexDirection: "column", 
                    alignItems: "center", 
                    justifyContent: "center",
                    padding: 24,
                    textAlign: "center",
                    gap: 16,
                    zIndex: 30
                  }}>
                    <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#f87171" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                      <line x1="12" y1="9" x2="12" y2="13" />
                      <line x1="12" y1="17" x2="12.01" y2="17" />
                    </svg>
                    <h3 style={{ fontSize: 15, fontWeight: 600, color: "#f87171" }}>Не удалось запустить камеру</h3>
                    <p style={{ fontSize: 13, color: "rgba(240, 249, 255, 0.7)" }}>{cameraError}</p>
                    <button className="btn btn-primary" onClick={() => initMediaPipe()} style={{ fontSize: 13, padding: "8px 20px" }}>
                      Повторить попытку
                    </button>
                  </div>
                )}
              </div>

              {/* Точность распознавания с градиентом */}
              <div style={{ marginTop: 20 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                  <span style={{ fontSize: 14, fontWeight: 600, color: "var(--text)" }}>Точность совпадения:</span>
                  <span style={{
                    fontFamily: "'Plus Jakarta Sans', sans-serif",
                    fontSize: 18,
                    fontWeight: 700,
                    color: isMatched ? "var(--success)" : "var(--accent)"
                  }}>
                    {similarity}%
                  </span>
                </div>
                {GESTURE_DEFS[activeGesture]?.motionBased && (
                  <div style={{ fontSize: 12, color: "#eab308", marginBottom: 8, display: "flex", alignItems: "center", gap: 6 }}>
                    <span>⚠</span>
                    <span>Упрощённая проверка: сравниваем финальную позу руки, точность ниже для жестов с движением</span>
                  </div>
                )}
                
                {/* Шкала схожести с градиентным заполнением */}
                <div style={{ width: "100%", height: 10, background: "rgba(0, 0, 0, 0.08)", borderRadius: 5, overflow: "hidden", border: "1px solid var(--border)" }}>
                  <div style={{ 
                    width: `${similarity}%`, 
                    height: "100%", 
                    background: isMatched ? "var(--success)" : "var(--accent)",
                    transition: "width 0.15s ease-out, background-color 0.3s ease",
                    boxShadow: isMatched ? "0 0 10px rgba(34, 197, 94, 0.4)" : "none"
                  }} />
                </div>
              </div>
            </div>

            {/* БАННЕР ОБРАТНОЙ СВЯЗИ БЕЗ ЭМОДЗИ */}
            <div style={{ 
              background: isMatched ? "rgba(34, 197, 94, 0.06)" : "rgba(0, 0, 0, 0.04)", 
              borderRadius: "var(--radius)", 
              border: isMatched ? "1px solid var(--success)" : "1px solid var(--border)", 
              padding: "20px 24px",
              transition: "all 0.3s ease",
              display: "flex",
              alignItems: "flex-start",
              gap: 16
            }}>
              {isMatched ? (
                <>
                  <div style={{ 
                    background: "rgba(34, 197, 94, 0.15)", 
                    borderRadius: "50%", 
                    width: 32, 
                    height: 32, 
                    display: "flex", 
                    alignItems: "center", 
                    justifyContent: "center", 
                    color: "var(--success)",
                    flexShrink: 0
                  }}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  </div>
                  <div>
                    <h3 style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", color: "var(--success)", fontSize: 16, fontWeight: 700, marginBottom: 4 }}>
                      Жест успешно распознан
                    </h3>
                    <p style={{ fontSize: 13, color: "var(--textSecondary)", lineHeight: 1.5 }}>Ваша рука расположена верно, геометрические погрешности не превышают допустимые 15%.</p>
                  </div>
                </>
              ) : (
                <>
                  <div style={{ 
                    background: "rgba(0, 0, 0, 0.1)", 
                    borderRadius: "50%", 
                    width: 32, 
                    height: 32, 
                    display: "flex", 
                    alignItems: "center", 
                    justifyContent: "center", 
                    color: "var(--accent)",
                    flexShrink: 0
                  }}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="11" cy="11" r="8" />
                      <line x1="21" y1="21" x2="16.65" y2="16.65" />
                    </svg>
                  </div>
                  <div style={{ flex: 1 }}>
                    <h3 style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", color: "var(--text)", fontSize: 14, fontWeight: 600, marginBottom: 6 }}>
                      Рекомендации по выполнению:
                    </h3>
                    {hints.length > 0 ? (
                      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                        {hints.map((hint, idx) => (
                          <div key={idx} style={{ fontSize: 13, color: "var(--textSecondary)", display: "flex", alignItems: "center", gap: 6 }}>
                            <span style={{ width: 4, height: 4, borderRadius: "50%", background: "var(--accent)", flexShrink: 0 }} />
                            <span>{hint}</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p style={{ fontSize: 13, color: "var(--textSecondary)" }}>Поместите руку перед камерой, чтобы запустить проверку.</p>
                    )}
                  </div>
                </>
              )}
            </div>

            {/* Панель калибровки без эмодзи */}
            {calibrationMode && (
              <div style={{ background: "var(--bgCard)", borderRadius: "var(--radius)", border: "1px solid rgba(234, 179, 8, 0.3)", padding: 20 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#eab308" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
                  </svg>
                  <h3 style={{ fontSize: 14, fontWeight: 700, color: "#eab308" }}>Панель калибровки жестов</h3>
                </div>
                <p style={{ fontSize: 12, color: "var(--textSecondary)", marginBottom: 14, lineHeight: 1.5 }}>
                  Покажите нужную конфигурацию руки камере и нажмите кнопку ниже, чтобы зафиксировать 14-мерный вектор признаков.
                </p>
                <div style={{ display: "flex", gap: 10, marginBottom: 14 }}>
                  <button className="btn btn-primary" onClick={handleCalibrate} style={{ fontSize: 12, padding: "8px 16px", background: "#eab308", border: "none" }}>
                    Записать эталон
                  </button>
                  {calibratedFeatures && (
                    <button className="btn btn-outline" onClick={() => setCalibratedFeatures(null)} style={{ fontSize: 12, padding: "8px 16px" }}>
                      Очистить
                    </button>
                  )}
                </div>
                {calibratedFeatures && (
                  <pre style={{ 
                    background: "#0a0d16", 
                    color: "var(--accent)",
                    padding: 12, 
                    borderRadius: "var(--radiusSm)", 
                    fontSize: 10, 
                    overflowX: "auto",
                    maxHeight: 180,
                    border: "1px solid rgba(234, 179, 8, 0.15)"
                  }}>
                    {calibratedFeatures}
                  </pre>
                )}
              </div>
            )}
          </div>

          {/* ==========================================
              ПРАВАЯ СТОРОНА: ВЫБОР ЖЕСТА И ЭТАЛОН
             ========================================== */}
          <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
            
            {/* Карточка выбора жеста */}
            <div style={{ background: "var(--bgCard)", borderRadius: "var(--radius)", border: "1px solid var(--border)", padding: 28 }}>
              <h3 style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 15, fontWeight: 700, color: "var(--text)", marginBottom: 16 }}>
                Выберите жест для практики:
              </h3>
              
              {/* Сетка переключателей (кнопки-таблетки) */}
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 24 }}>
                {Object.keys(GESTURE_DEFS).map((key) => {
                  const g = GESTURE_DEFS[key];
                  const isActive = activeGesture === key;
                  return (
                    <button
                      key={key}
                      onClick={() => handleGestureChange(key)}
                      style={{
                        padding: "10px 16px",
                        borderRadius: 30,
                        background: isActive ? "var(--accent)" : "rgba(0, 0, 0, 0.04)",
                        border: "1px solid",
                        borderColor: isActive ? "var(--accent)" : "var(--border)",
                        color: isActive ? "#ffffff" : "var(--text)",
                        fontFamily: "'Plus Jakarta Sans', sans-serif",
                        fontWeight: 600,
                        fontSize: 13,
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        gap: 6,
                        transition: "all 0.2s ease"
                      }}
                      onMouseEnter={(e) => {
                        if (!isActive) e.currentTarget.style.borderColor = "var(--accent)";
                      }}
                      onMouseLeave={(e) => {
                        if (!isActive) e.currentTarget.style.borderColor = "var(--border)";
                      }}
                    >
                      <span style={{ fontSize: 16 }}>{g.emoji}</span>
                      <span>{g.shortLabel}</span>
                    </button>
                  );
                })}
              </div>

              {/* Карточка-инструкция эталона */}
              {activeGesture && GESTURE_DEFS[activeGesture] && (
                <div style={{ 
                  display: "flex", 
                  gap: 20, 
                  alignItems: "center", 
                  padding: "20px", 
                  background: "rgba(0, 0, 0, 0.02)", 
                  borderRadius: "var(--radiusSm)", 
                  border: "1px solid var(--border)" 
                }}>
                  
                  {/* Векторный рендер эталона в темной рамке */}
                  <div style={{ 
                    width: 90, 
                    height: 90, 
                    background: "#090d16", 
                    borderRadius: 12, 
                    border: "1px solid var(--border)", 
                    position: "relative", 
                    flexShrink: 0 
                  }}>
                    <svg viewBox="0 0 100 100" style={{ width: "100%", height: "100%" }}>
                      {/* Отрисовка костей */}
                      {CONNECTIONS.map(([from, to], idx) => {
                        const pt1 = GESTURE_DEFS[activeGesture].referenceLandmarks[from];
                        const pt2 = GESTURE_DEFS[activeGesture].referenceLandmarks[to];
                        return (
                          <line
                            key={idx}
                            x1={pt1.x}
                            y1={pt1.y}
                            x2={pt2.x}
                            y2={pt2.y}
                            stroke="rgba(255, 255, 255, 0.5)"
                            strokeWidth="2.5"
                            strokeLinecap="round"
                          />
                        );
                      })}
                      {/* Отрисовка суставов */}
                      {GESTURE_DEFS[activeGesture].referenceLandmarks.map((pt, idx) => (
                        <circle
                          key={idx}
                          cx={pt.x}
                          cy={pt.y}
                          r="1.8"
                          fill="#ffffff"
                          stroke="var(--accent)"
                          strokeWidth="1.2"
                        />
                      ))}
                    </svg>
                    <span style={{ position: "absolute", bottom: 4, right: 6, fontSize: 8, color: "rgba(240, 249, 255, 0.4)", textTransform: "uppercase", letterSpacing: "0.5px" }}>Эталон</span>
                  </div>

                  {/* Описание */}
                  <div>
                    <h4 style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 15, fontWeight: 700, color: "var(--text)" }}>
                      {GESTURE_DEFS[activeGesture].name}
                    </h4>
                    <p style={{ fontSize: 12, color: "var(--textSecondary)", lineHeight: 1.5, marginTop: 4 }}>
                      {GESTURE_DEFS[activeGesture].description}
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Карточка состояния пальцев */}
            <div style={{ background: "var(--bgCard)", borderRadius: "var(--radius)", border: "1px solid var(--border)", padding: 28 }}>
              <h3 style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 15, fontWeight: 700, color: "var(--text)", marginBottom: 16 }}>
                Детектор суставов (Реальное время):
              </h3>
              
              {/* Список пальцев */}
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {[
                  { key: "thumb", label: "Большой палец (Thumb)", desc: "Отведен или выпрямлен" },
                  { key: "index", label: "Указательный палец (Index)", desc: "Вытянут прямо" },
                  { key: "middle", label: "Средний палец (Middle)", desc: "Вытянут прямо" },
                  { key: "ring", label: "Безымянный палец (Ring)", desc: "Вытянут прямо" },
                  { key: "pinky", label: "Мизинец (Pinky)", desc: "Вытянут прямо" },
                ].map((item) => {
                  const isActive = fingerStates[item.key];
                  return (
                    <div 
                      key={item.key} 
                      style={{ 
                        display: "flex", 
                        alignItems: "center", 
                        justifyContent: "space-between",
                        padding: "10px 16px",
                        background: isActive ? "rgba(34, 197, 94, 0.03)" : "rgba(0, 0, 0, 0.01)",
                        borderRadius: "var(--radiusSm)",
                        border: "1px solid",
                        borderColor: isActive ? "rgba(34, 197, 94, 0.2)" : "var(--border)",
                        transition: "all 0.25s ease"
                      }}
                    >
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text)" }}>{item.label}</div>
                        <div style={{ fontSize: 11, color: "var(--textSecondary)" }}>{item.desc}</div>
                      </div>
                      
                      {/* Светодиодный бейдж статуса */}
                      <span style={{ 
                        padding: "4px 12px", 
                        borderRadius: 20, 
                        fontSize: 10, 
                        fontWeight: 700, 
                        letterSpacing: "0.5px",
                        color: isActive ? "#166534" : "var(--accent)",
                        background: isActive ? "rgba(34, 197, 94, 0.12)" : "rgba(0, 0, 0, 0.08)",
                        transition: "all 0.25s ease"
                      }}>
                        {isActive ? "ВЫПРЯМЛЕН" : "СОГНУТ"}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Карточка объяснения математики */}
            <div style={{ background: "var(--bgCard)", borderRadius: "var(--radius)", border: "1px solid var(--border)", padding: 28 }}>
              <details style={{ width: "100%" }}>
                <summary style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 14, fontWeight: 600, color: "var(--text)", cursor: "pointer", outline: "none", display: "flex", alignItems: "center", gap: 8 }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10" />
                    <line x1="12" y1="16" x2="12" y2="12" />
                    <line x1="12" y1="8" x2="12.01" y2="8" />
                  </svg>
                  <span>Математическая модель сравнения жестов</span>
                </summary>
                <div style={{ fontSize: 12, color: "var(--textSecondary)", lineHeight: 1.6, marginTop: 14, display: "flex", flexDirection: "column", gap: 10 }}>
                  <p>
                    Для оценки жеста мы считываем 21 пространственный ориентир руки. Чтобы отслеживание не зависело от расстояния и положения руки в кадре, применяется алгоритм нормализации:
                  </p>
                  <p>
                    1. <strong>Центрирование:</strong> Координаты запястья (ориентир 0) вычитаются из координат остальных точек, перемещая руку в начало локальной системы координат <code>(0,0,0)</code>.
                  </p>
                  <p>
                    2. <strong>Масштабирование:</strong> Все координаты делятся на расстояние между запястьем (0) и основанием среднего пальца (9). Это делает замеры независимыми от приближения руки к камере.
                  </p>
                  <p>
                    3. <strong>Инвариантность вращения:</strong> Вместо сырых декартовых осей сравниваются 14 относительных геометрических параметров (сгибы пальцев, расстояния до запястья и расхождения кончиков пальцев).
                  </p>
                  <p>
                    4. <strong>Расчет совпадения:</strong> Вычисляется взвешенная среднеквадратичная ошибка (RMSE) между нормализованными признаками пользователя и эталона. Ошибка переводится в процентное сходство.
                  </p>
                </div>
              </details>
            </div>

          </div>

        </div>
      </div>

      {/* Анимационные CSS стили */}
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}} />
    </div>
  );
}

export default function GesturePracticePage() {
  return (
    <Suspense fallback={<div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--textSecondary)" }}>Загрузка...</div>}>
      <GesturePracticeContent />
    </Suspense>
  );
}
