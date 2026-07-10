export interface ClassifiedGesture {
  gesture: string;
  confidence: number;
}

/**
 * Structurally compatible with @mediapipe/tasks-vision's NormalizedLandmark
 * (same x/y/z shape) without importing that package's types directly —
 * shared/ has no node_modules of its own to resolve them from (no
 * root-level node_modules in this repo), and real NormalizedLandmark[]
 * values satisfy this type structurally.
 */
export interface HandLandmarkPoint {
  x: number;
  y: number;
  z: number;
}

interface FingerStates {
  thumb: boolean;
  index: boolean;
  middle: boolean;
  ring: boolean;
  pinky: boolean;
}

function fingerStates(lm: HandLandmarkPoint[]): FingerStates {
  return {
    thumb: lm[4].y < lm[2].y,
    index: lm[8].y < lm[6].y,
    middle: lm[12].y < lm[10].y,
    ring: lm[16].y < lm[14].y,
    pinky: lm[20].y < lm[18].y,
  };
}

function classify(fingers: FingerStates): { gesture: string; baseConfidence: number } {
  const { thumb: t, index: i, middle: m, ring: r, pinky: p } = fingers;
  const nonThumb = [i, m, r, p].filter(Boolean).length;

  if (t && !i && !m && !r && !p) return { gesture: "Да", baseConfidence: 0.92 };
  if (!t && i && !m && !r && !p) return { gesture: "Нет", baseConfidence: 0.88 };
  if (t && i && m && r && p) return { gesture: "Здравствуйте", baseConfidence: 0.90 };
  if (!t && i && m && r && !p) return { gesture: "Вода", baseConfidence: 0.85 };
  if (!t && i && m && !r && !p) return { gesture: "Еда", baseConfidence: 0.82 };
  if (nonThumb === 0 && !t) return { gesture: "Спасибо", baseConfidence: 0.75 };
  if (!t && !i && !m && !r && p) return { gesture: "Пожалуйста", baseConfidence: 0.80 };
  if (!t && !i && m && !r && !p) return { gesture: "Хорошо", baseConfidence: 0.78 };
  if (!t && !i && !m && r && !p) return { gesture: "Плохо", baseConfidence: 0.78 };
  if (t && !i && !m && !r && p) return { gesture: "Помощь", baseConfidence: 0.82 };
  if (t && !i && !m && r && !p) return { gesture: "Стоп", baseConfidence: 0.80 };
  if (nonThumb === 1 && i) return { gesture: "Один", baseConfidence: 0.90 };
  if (nonThumb === 2 && i && m) return { gesture: "Два", baseConfidence: 0.88 };
  if (nonThumb === 3 && i && m && r) return { gesture: "Три", baseConfidence: 0.85 };
  if (nonThumb === 4) return { gesture: "Четыре", baseConfidence: 0.83 };
  return { gesture: "Неизвестно", baseConfidence: 0.20 };
}

/**
 * TypeScript port of backend/app/signflow_model.py's _finger_states()/_classify().
 * Keep both in sync if the vocabulary changes.
 */
export function classifyGesture(landmarks: HandLandmarkPoint[], handednessScore: number): ClassifiedGesture {
  const { gesture, baseConfidence } = classify(fingerStates(landmarks));
  const confidence = Math.round(Math.min(100, baseConfidence * handednessScore * 100) * 10) / 10;
  return { gesture, confidence };
}
