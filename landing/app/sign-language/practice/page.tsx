"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Script from "next/script";

// ==========================================
// 1. ОПРЕДЕЛЕНИЕ ЭТАЛОННЫХ ЖЕСТОВ И ИХ ПРАВИЛ
// ==========================================
interface GestureDef {
  name: string;
  description: string;
  emoji: string;
  features: Record<string, number>;
  checkRules: (features: Record<string, number>, states: Record<string, boolean>) => string[];
}

const GESTURE_DEFS: Record<string, GestureDef> = {
  A: {
    name: "Буква А (Дактиль)",
    description: "Кулак со сжатыми четырьмя пальцами и отведенным в сторону большим пальцем. Стандартная первая буква алфавита.",
    emoji: "✊",
    // Эталонный 14-мерный вектор признаков (соотношений расстояний)
    features: {
      thumb_extension: 1.0,
      index_extension: 0.52,
      middle_extension: 0.52,
      ring_extension: 0.51,
      pinky_extension: 0.51,
      thumb_wrist: 1.25,
      index_wrist: 1.15,
      middle_wrist: 1.15,
      ring_wrist: 1.15,
      pinky_wrist: 1.15,
      thumb_index: 0.85,
      index_middle: 0.22,
      middle_ring: 0.22,
      ring_pinky: 0.22,
    },
    // Эвристическая проверка для текстовых подсказок пользователю
    checkRules: (features, states) => {
      const hints: string[] = [];
      if (states.index) hints.push("Сожмите указательный палец");
      if (states.middle) hints.push("Сожмите средний палец");
      if (states.ring) hints.push("Сожмите безымянный палец");
      if (states.pinky) hints.push("Сожмите мизинец");
      if (features.thumb_extension < 0.75) hints.push("Отведите большой палец сбоку наружу");
      return hints;
    }
  },
  B: {
    name: "Буква В (Дактиль)",
    description: "Открытая прямая ладонь, направленная пальцами вверх. Все пять пальцев полностью выпрямлены и сомкнуты.",
    emoji: "🖐️",
    features: {
      thumb_extension: 1.25,
      index_extension: 1.85,
      middle_extension: 2.05,
      ring_extension: 1.85,
      pinky_extension: 1.62,
      thumb_wrist: 1.95,
      index_wrist: 2.35,
      middle_wrist: 2.55,
      ring_wrist: 2.35,
      pinky_wrist: 1.98,
      thumb_index: 0.82,
      index_middle: 0.35,
      middle_ring: 0.35,
      ring_pinky: 0.35,
    },
    checkRules: (features, states) => {
      const hints: string[] = [];
      if (!states.index) hints.push("Выпрямите указательный палец");
      if (!states.middle) hints.push("Выпрямите средний палец");
      if (!states.ring) hints.push("Выпрямите безымянный палец");
      if (!states.pinky) hints.push("Выпрямите мизинец");
      if (features.index_middle > 0.55 || features.middle_ring > 0.55 || features.ring_pinky > 0.55) {
        hints.push("Сомкните пальцы плотнее друг к другу");
      }
      return hints;
    }
  },
  G: {
    name: "Буква Г (Дактиль)",
    description: "Указательный палец поднят вверх, большой палец отведен вбок под углом 90 градусов. Остальные пальцы сжаты.",
    emoji: "👈",
    features: {
      thumb_extension: 1.30,
      index_extension: 1.82,
      middle_extension: 0.55,
      ring_extension: 0.54,
      pinky_extension: 0.52,
      thumb_wrist: 1.92,
      index_wrist: 2.32,
      middle_wrist: 1.15,
      ring_wrist: 1.15,
      pinky_wrist: 1.15,
      thumb_index: 1.75,
      index_middle: 1.45,
      middle_ring: 0.22,
      ring_pinky: 0.22,
    },
    checkRules: (features, states) => {
      const hints: string[] = [];
      if (!states.index) hints.push("Поднимите указательный палец вверх");
      if (features.thumb_extension < 0.9) hints.push("Отведите большой палец сильнее в сторону");
      if (states.middle) hints.push("Сожмите средний палец в кулак");
      if (states.ring) hints.push("Сожмите безымянный палец в кулак");
      if (states.pinky) hints.push("Сожмите мизинец в кулак");
      return hints;
    }
  },
  V: {
    name: "Жест Победа (V)",
    description: "Указательный и средний пальцы подняты вверх и разведены в стороны. Остальные пальцы сжаты к ладони.",
    emoji: "✌️",
    features: {
      thumb_extension: 0.72,
      index_extension: 1.82,
      middle_extension: 1.82,
      ring_extension: 0.52,
      pinky_extension: 0.51,
      thumb_wrist: 1.22,
      index_wrist: 2.32,
      middle_wrist: 2.32,
      ring_wrist: 1.15,
      pinky_wrist: 1.15,
      thumb_index: 1.05,
      index_middle: 0.88,
      middle_ring: 1.45,
      ring_pinky: 0.22,
    },
    checkRules: (features, states) => {
      const hints: string[] = [];
      if (!states.index) hints.push("Поднимите указательный палец");
      if (!states.middle) hints.push("Поднимите средний палец");
      if (states.ring) hints.push("Сожмите безымянный палец");
      if (states.pinky) hints.push("Сожмите мизинец");
      if (features.index_middle < 0.6) hints.push("Раздвиньте указательный и средний пальцы шире");
      return hints;
    }
  },
  O: {
    name: "Буква О (Дактиль)",
    description: "Пальцы округлены и их кончики соприкасаются с большим пальцем, образуя форму кольца (буквы О).",
    emoji: "👌",
    features: {
      thumb_extension: 0.82,
      index_extension: 0.85,
      middle_extension: 0.85,
      ring_extension: 0.85,
      pinky_extension: 0.85,
      thumb_wrist: 1.25,
      index_wrist: 1.25,
      middle_wrist: 1.25,
      ring_wrist: 1.25,
      pinky_wrist: 1.25,
      thumb_index: 0.22,
      index_middle: 0.32,
      middle_ring: 0.32,
      ring_pinky: 0.32,
    },
    checkRules: (features, states) => {
      const hints: string[] = [];
      if (features.thumb_index > 0.42) {
        hints.push("Соедините кончики большого и указательного пальцев в кольцо");
      }
      if (features.index_extension > 1.35) hints.push("Округлите указательный палец");
      if (features.middle_extension > 1.35) hints.push("Округлите средний палец");
      if (features.ring_extension > 1.35) hints.push("Округлите безымянный палец");
      return hints;
    }
  }
};

// Двумерные координаты для отрисовки красивой статической схемы-подсказки
const REFERENCE_LANDMARKS: Record<string, {x: number, y: number}[]> = {
  A: [
    {x: 50, y: 90}, 
    {x: 36, y: 82}, {x: 28, y: 72}, {x: 23, y: 62}, {x: 18, y: 50}, // Большой (отведен)
    {x: 35, y: 55}, {x: 34, y: 64}, {x: 35, y: 70}, {x: 38, y: 74}, // Указательный (согнут)
    {x: 48, y: 53}, {x: 48, y: 62}, {x: 48, y: 68}, {x: 48, y: 72}, // Средний (согнут)
    {x: 62, y: 55}, {x: 62, y: 64}, {x: 61, y: 70}, {x: 60, y: 74}, // Безымянный (согнут)
    {x: 73, y: 60}, {x: 75, y: 68}, {x: 74, y: 74}, {x: 72, y: 78}  // Мизинец (согнут)
  ],
  B: [
    {x: 50, y: 90}, 
    {x: 32, y: 80}, {x: 24, y: 70}, {x: 20, y: 60}, {x: 16, y: 50}, // Большой
    {x: 36, y: 52}, {x: 34, y: 38}, {x: 32, y: 26}, {x: 30, y: 14}, // Указательный (прямой)
    {x: 48, y: 50}, {x: 48, y: 34}, {x: 48, y: 21}, {x: 48, y: 8},  // Средний (прямой)
    {x: 60, y: 52}, {x: 62, y: 38}, {x: 63, y: 26}, {x: 64, y: 14}, // Безымянный (прямой)
    {x: 72, y: 56}, {x: 75, y: 44}, {x: 77, y: 34}, {x: 79, y: 24}  // Мизинец (прямой)
  ],
  G: [
    {x: 50, y: 90}, 
    {x: 34, y: 80}, {x: 22, y: 74}, {x: 14, y: 70}, {x: 6, y: 66},  // Большой (отведен под 90)
    {x: 36, y: 52}, {x: 34, y: 38}, {x: 32, y: 26}, {x: 30, y: 14}, // Указательный (прямой)
    {x: 48, y: 53}, {x: 48, y: 62}, {x: 48, y: 68}, {x: 48, y: 72}, // Средний (согнут)
    {x: 62, y: 55}, {x: 62, y: 64}, {x: 61, y: 70}, {x: 60, y: 74}, // Безымянный (согнут)
    {x: 73, y: 60}, {x: 75, y: 68}, {x: 74, y: 74}, {x: 72, y: 78}  // Мизинец (согнут)
  ],
  V: [
    {x: 50, y: 90}, 
    {x: 38, y: 80}, {x: 32, y: 73}, {x: 28, y: 68}, {x: 25, y: 62}, // Большой (согнут)
    {x: 36, y: 52}, {x: 30, y: 38}, {x: 24, y: 24}, {x: 18, y: 12}, // Указательный (прямой, разведен)
    {x: 48, y: 50}, {x: 50, y: 35}, {x: 52, y: 22}, {x: 54, y: 9},  // Средний (прямой, разведен)
    {x: 62, y: 55}, {x: 62, y: 64}, {x: 61, y: 70}, {x: 60, y: 74}, // Безымянный (согнут)
    {x: 73, y: 60}, {x: 75, y: 68}, {x: 74, y: 74}, {x: 72, y: 78}  // Мизинец (согнут)
  ],
  O: [
    {x: 50, y: 90}, 
    {x: 42, y: 80}, {x: 35, y: 70}, {x: 34, y: 62}, {x: 35, y: 52}, // Большой
    {x: 45, y: 55}, {x: 38, y: 44}, {x: 36, y: 47}, {x: 35, y: 51}, // Указательный
    {x: 48, y: 53}, {x: 46, y: 42}, {x: 43, y: 46}, {x: 40, y: 51}, // Средний
    {x: 55, y: 55}, {x: 53, y: 45}, {x: 49, y: 49}, {x: 45, y: 52}, // Безымянный
    {x: 60, y: 58}, {x: 58, y: 48}, {x: 54, y: 52}, {x: 50, y: 55}  // Мизинец
  ]
};

const CONNECTIONS = [
  [0, 1], [1, 2], [2, 3], [3, 4], // Большой палец
  [0, 5], [5, 6], [6, 7], [7, 8], // Указательный палец
  [0, 9], [9, 10], [10, 11], [11, 12], // Средний палец
  [0, 13], [13, 14], [14, 15], [15, 16], // Безымянный палец
  [0, 17], [17, 18], [18, 19], [19, 20], // Мизинец
  [5, 9], [9, 13], [13, 17] // Ладонь
];

export default function GesturePracticePage() {
  const [activeGesture, setActiveGesture] = useState<string>("A");
  const [similarity, setSimilarity] = useState<number>(0);
  const [isMatched, setIsMatched] = useState<boolean>(false);
  const [hints, setHints] = useState<string[]>([]);
  const [fingerStates, setFingerStates] = useState<Record<string, boolean>>({
    thumb: false, index: false, middle: false, ring: false, pinky: false
  });
  const [activeFeatures, setActiveFeatures] = useState<Record<string, number> | null>(null);

  // Статусы камеры и скриптов
  const [scriptsLoaded, setScriptsLoaded] = useState({ camera: false, hands: false });
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
  const handsInstanceRef = useRef<any>(null);
  const cameraInstanceRef = useRef<any>(null);
  const animationFrameIdRef = useRef<number | null>(null);

  // Математическая функция расчета евклидова расстояния
  const getDistance3D = (pt1: any, pt2: any) => {
    return Math.sqrt(
      Math.pow(pt1.x - pt2.x, 2) +
      Math.pow(pt1.y - pt2.y, 2) +
      Math.pow(pt1.z - pt2.z, 2)
    );
  };

  // Инициализация MediaPipe Hands
  const initMediaPipe = () => {
    if (typeof window === "undefined" || !videoRef.current || !canvasRef.current) return;
    
    setCameraError(null);
    setIsModelLoading(true);

    try {
      const Hands = (window as any).Hands;
      const Camera = (window as any).Camera;

      if (!Hands || !Camera) {
        throw new Error("Библиотеки MediaPipe не найдены в глобальной области видимости.");
      }

      // Создаем экземпляр детектора рук
      const hands = new Hands({
        locateFile: (file: string) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`
      });

      hands.setOptions({
        maxNumHands: 1,
        modelComplexity: 1,
        minDetectionConfidence: 0.6,
        minTrackingConfidence: 0.6
      });

      hands.onResults(handleTrackingResults);
      handsInstanceRef.current = hands;

      // Создаем обертку для веб-камеры
      const camera = new Camera(videoRef.current, {
        onFrame: async () => {
          if (videoRef.current) {
            await hands.send({ image: videoRef.current });
          }
        },
        width: 640,
        height: 480
      });

      cameraInstanceRef.current = camera;
      camera.start()
        .then(() => {
          setIsCameraActive(true);
          setIsModelLoading(false);
          setHandsTrackingActive(true);
        })
        .catch((err: any) => {
          console.error("Ошибка запуска камеры: ", err);
          setCameraError("Не удалось получить доступ к веб-камере. Пожалуйста, проверьте разрешения в настройках браузера.");
          setIsModelLoading(false);
        });

    } catch (err: any) {
      console.error("Ошибка инициализации MediaPipe: ", err);
      setCameraError(`Критическая ошибка инициализации трекера: ${err.message}`);
      setIsModelLoading(false);
    }
  };

  // Обработчик результатов трекинга от MediaPipe
  const handleTrackingResults = (results: any) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Очищаем canvas перед новым кадром
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Если рука найдена в кадре
    if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
      const landmarks = results.multiHandLandmarks[0];

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
      const refDef = GESTURE_DEFS[activeGesture];
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
  const drawHandSkeleton = (ctx: CanvasRenderingContext2D, landmarks: any[], success: boolean) => {
    const isDark = true;
    const accentColor = success ? "#22C55E" : "#38bdf8"; // Зеленый при успехе, ярко-голубой при трекинге
    const pointColor = "#ffffff";

    // 1. Отрисовка костей
    ctx.strokeStyle = accentColor;
    ctx.lineWidth = 4;
    ctx.lineCap = "round";
    ctx.shadowBlur = success ? 15 : 6;
    ctx.shadowColor = accentColor;

    CONNECTIONS.forEach(([from, to]) => {
      const pt1 = landmarks[from];
      const pt2 = landmarks[to];
      if (pt1 && pt2) {
        ctx.beginPath();
        ctx.moveTo(pt1.x * ctx.canvas.width, pt1.y * ctx.canvas.height);
        ctx.lineTo(pt2.x * ctx.canvas.width, pt2.y * ctx.canvas.height);
        ctx.stroke();
      }
    });

    // Сбрасываем тень для суставов
    ctx.shadowBlur = 0;

    // 2. Отрисовка суставов (точек)
    landmarks.forEach((pt) => {
      ctx.beginPath();
      ctx.arc(pt.x * ctx.canvas.width, pt.y * ctx.canvas.height, 5, 0, 2 * Math.PI);
      ctx.fillStyle = pointColor;
      ctx.fill();
      ctx.strokeStyle = accentColor;
      ctx.lineWidth = 2;
      ctx.stroke();
    });
  };

  // Обработка загрузки сторонних скриптов MediaPipe
  const handleScriptLoad = (type: "camera" | "hands") => {
    setScriptsLoaded(prev => {
      const updated = { ...prev, [type]: true };
      if (updated.camera && updated.hands) {
        // Ожидаем отрисовку элементов DOM
        setTimeout(() => {
          initMediaPipe();
        }, 100);
      }
      return updated;
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
    if (!activeFeatures) {
      alert("Сначала покажите руку камере, чтобы зафиксировать координаты.");
      return;
    }
    const formatted = JSON.stringify(activeFeatures, null, 2);
    setCalibratedFeatures(formatted);
    console.log("Калибровочные данные для жеста:", formatted);
  };

  // Очистка веб-камеры и детектора при размонтировании
  useEffect(() => {
    // При монтировании проверяем, не загружены ли скрипты уже в глобальный контекст (для переходов без перезагрузки)
    if (typeof window !== "undefined") {
      const hasCamera = !!(window as any).Camera;
      const hasHands = !!(window as any).Hands;
      if (hasCamera && hasHands) {
        setScriptsLoaded({ camera: true, hands: true });
        setIsModelLoading(true);
        const timer = setTimeout(() => {
          initMediaPipe();
        }, 500);
        
        return () => {
          clearTimeout(timer);
          // Полное освобождение камеры
          if (cameraInstanceRef.current) {
            cameraInstanceRef.current.stop();
          }
          if (handsInstanceRef.current) {
            handsInstanceRef.current.close();
          }
          if (videoRef.current && videoRef.current.srcObject) {
            const stream = videoRef.current.srcObject as MediaStream;
            stream.getTracks().forEach((track) => track.stop());
            videoRef.current.srcObject = null;
          }
        };
      }
    }

    return () => {
      // Полное освобождение камеры при обычном выходе
      if (cameraInstanceRef.current) {
        cameraInstanceRef.current.stop();
      }
      if (handsInstanceRef.current) {
        handsInstanceRef.current.close();
      }
      if (videoRef.current && videoRef.current.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach((track) => track.stop());
        videoRef.current.srcObject = null;
      }
    };
  }, []);

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)", color: "var(--text)" }}>
      {/* Загрузка скриптов MediaPipe через Next.js Script */}
      <Script
        src="https://cdn.jsdelivr.net/npm/@mediapipe/camera_utils/camera_utils.js"
        strategy="afterInteractive"
        onLoad={() => handleScriptLoad("camera")}
      />
      <Script
        src="https://cdn.jsdelivr.net/npm/@mediapipe/hands/hands.js"
        strategy="afterInteractive"
        onLoad={() => handleScriptLoad("hands")}
      />

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
              boxShadow: "0 8px 32px rgba(2, 132, 199, 0.03)"
            }}>
              {/* Окно веб-камеры с неоновой границей */}
              <div style={{ 
                position: "relative", 
                width: "100%", 
                aspectRatio: "4/3", 
                borderRadius: "var(--radiusSm)", 
                background: "#090d16", 
                overflow: "hidden",
                border: "1px solid rgba(2, 132, 199, 0.2)",
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
                      border: "3px solid rgba(56, 189, 248, 0.15)", 
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
                    <button className="btn btn-primary" onClick={initMediaPipe} style={{ fontSize: 13, padding: "8px 20px" }}>
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
                
                {/* Шкала схожести с градиентным заполнением */}
                <div style={{ width: "100%", height: 10, background: "rgba(2, 132, 199, 0.08)", borderRadius: 5, overflow: "hidden", border: "1px solid var(--border)" }}>
                  <div style={{ 
                    width: `${similarity}%`, 
                    height: "100%", 
                    background: isMatched ? "linear-gradient(90deg, #4ade80 0%, #22c55e 100%)" : "linear-gradient(90deg, #38bdf8 0%, #0284c7 100%)",
                    transition: "width 0.15s ease-out, background-color 0.3s ease",
                    boxShadow: isMatched ? "0 0 10px rgba(34, 197, 94, 0.4)" : "none"
                  }} />
                </div>
              </div>
            </div>

            {/* БАННЕР ОБРАТНОЙ СВЯЗИ БЕЗ ЭМОДЗИ */}
            <div style={{ 
              background: isMatched ? "rgba(34, 197, 94, 0.06)" : "rgba(2, 132, 199, 0.04)", 
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
                    background: "rgba(2, 132, 199, 0.1)", 
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
                    color: "#38bdf8", 
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
                        background: isActive ? "var(--accent)" : "rgba(2, 132, 199, 0.04)",
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
                      <span>{g.name.split(" ")[1]}</span>
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
                  background: "rgba(2, 132, 199, 0.02)", 
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
                        const pt1 = REFERENCE_LANDMARKS[activeGesture][from];
                        const pt2 = REFERENCE_LANDMARKS[activeGesture][to];
                        return (
                          <line
                            key={idx}
                            x1={pt1.x}
                            y1={pt1.y}
                            x2={pt2.x}
                            y2={pt2.y}
                            stroke="rgba(56, 189, 248, 0.5)"
                            strokeWidth="2.5"
                            strokeLinecap="round"
                          />
                        );
                      })}
                      {/* Отрисовка суставов */}
                      {REFERENCE_LANDMARKS[activeGesture].map((pt, idx) => (
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
                        background: isActive ? "rgba(34, 197, 94, 0.03)" : "rgba(2, 132, 199, 0.01)",
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
                        color: isActive ? "#166534" : "#0369a1",
                        background: isActive ? "rgba(34, 197, 94, 0.12)" : "rgba(2, 132, 199, 0.08)",
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
