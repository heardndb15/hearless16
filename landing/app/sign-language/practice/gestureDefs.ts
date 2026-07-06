export interface GestureDef {
  name: string;
  shortLabel: string;
  description: string;
  emoji: string;
  motionBased: boolean;
  features: Record<string, number>;
  referenceLandmarks: { x: number; y: number }[];
  checkRules: (features: Record<string, number>, states: Record<string, boolean>) => string[];
}

export const CONNECTIONS: [number, number][] = [
  [0, 1], [1, 2], [2, 3], [3, 4], // Большой палец
  [0, 5], [5, 6], [6, 7], [7, 8], // Указательный палец
  [0, 9], [9, 10], [10, 11], [11, 12], // Средний палец
  [0, 13], [13, 14], [14, 15], [15, 16], // Безымянный палец
  [0, 17], [17, 18], [18, 19], [19, 20], // Мизинец
  [5, 9], [9, 13], [13, 17], // Ладонь
];

// Shared placeholder for the 20 new catalog gestures below, reusing gesture
// "B"'s real calibrated values, until a human records the real ones via the
// in-app "Калибровка" panel (see docs/superpowers/specs/2026-07-06-mediapipe-hands-practice-design.md).
const PLACEHOLDER_FEATURES: Record<string, number> = {
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
};

const PLACEHOLDER_LANDMARKS: { x: number; y: number }[] = [
  { x: 50, y: 90 },
  { x: 32, y: 80 }, { x: 24, y: 70 }, { x: 20, y: 60 }, { x: 16, y: 50 },
  { x: 36, y: 52 }, { x: 34, y: 38 }, { x: 32, y: 26 }, { x: 30, y: 14 },
  { x: 48, y: 50 }, { x: 48, y: 34 }, { x: 48, y: 21 }, { x: 48, y: 8 },
  { x: 60, y: 52 }, { x: 62, y: 38 }, { x: 63, y: 26 }, { x: 64, y: 14 },
  { x: 72, y: 56 }, { x: 75, y: 44 }, { x: 77, y: 34 }, { x: 79, y: 24 },
];

// PLACEHOLDER — needs real calibration via the in-app tool. Returns no hints
// since there's no real rule logic to check against yet.
function placeholderCheckRules(): string[] {
  return [];
}

export const GESTURE_DEFS: Record<string, GestureDef> = {
  A: {
    name: "Буква А (Дактиль)",
    shortLabel: "А",
    description: "Кулак со сжатыми четырьмя пальцами и отведенным в сторону большым пальцем. Стандартная первая буква алфавита.",
    emoji: "✊",
    motionBased: false,
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
    referenceLandmarks: [
      { x: 50, y: 90 },
      { x: 36, y: 82 }, { x: 28, y: 72 }, { x: 23, y: 62 }, { x: 18, y: 50 },
      { x: 35, y: 55 }, { x: 34, y: 64 }, { x: 35, y: 70 }, { x: 38, y: 74 },
      { x: 48, y: 53 }, { x: 48, y: 62 }, { x: 48, y: 68 }, { x: 48, y: 72 },
      { x: 62, y: 55 }, { x: 62, y: 64 }, { x: 61, y: 70 }, { x: 60, y: 74 },
      { x: 73, y: 60 }, { x: 75, y: 68 }, { x: 74, y: 74 }, { x: 72, y: 78 },
    ],
    checkRules: (features, states) => {
      const hints: string[] = [];
      if (states.index) hints.push("Сожмите указательный палец");
      if (states.middle) hints.push("Сожмите средний палец");
      if (states.ring) hints.push("Сожмите безымянный палец");
      if (states.pinky) hints.push("Сожмите мизинец");
      if (features.thumb_extension < 0.75) hints.push("Отведите большой палец сбоку наружу");
      return hints;
    },
  },
  B: {
    name: "Буква В (Дактиль)",
    shortLabel: "В",
    description: "Открытая прямая ладонь, направленная пальцами вверх. Все пять пальцев полностью выпрямлены и сомкнуты.",
    emoji: "🖐️",
    motionBased: false,
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
    referenceLandmarks: [
      { x: 50, y: 90 },
      { x: 32, y: 80 }, { x: 24, y: 70 }, { x: 20, y: 60 }, { x: 16, y: 50 },
      { x: 36, y: 52 }, { x: 34, y: 38 }, { x: 32, y: 26 }, { x: 30, y: 14 },
      { x: 48, y: 50 }, { x: 48, y: 34 }, { x: 48, y: 21 }, { x: 48, y: 8 },
      { x: 60, y: 52 }, { x: 62, y: 38 }, { x: 63, y: 26 }, { x: 64, y: 14 },
      { x: 72, y: 56 }, { x: 75, y: 44 }, { x: 77, y: 34 }, { x: 79, y: 24 },
    ],
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
    },
  },
  G: {
    name: "Буква Г (Дактиль)",
    shortLabel: "Г",
    description: "Указательный палец поднят вверх, большой палец отведен вбок под углом 90 градусов. Остальные пальцы сжаты.",
    emoji: "👈",
    motionBased: false,
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
    referenceLandmarks: [
      { x: 50, y: 90 },
      { x: 34, y: 80 }, { x: 22, y: 74 }, { x: 14, y: 70 }, { x: 6, y: 66 },
      { x: 36, y: 52 }, { x: 34, y: 38 }, { x: 32, y: 26 }, { x: 30, y: 14 },
      { x: 48, y: 53 }, { x: 48, y: 62 }, { x: 48, y: 68 }, { x: 48, y: 72 },
      { x: 62, y: 55 }, { x: 62, y: 64 }, { x: 61, y: 70 }, { x: 60, y: 74 },
      { x: 73, y: 60 }, { x: 75, y: 68 }, { x: 74, y: 74 }, { x: 72, y: 78 },
    ],
    checkRules: (features, states) => {
      const hints: string[] = [];
      if (!states.index) hints.push("Поднимите указательный палец вверх");
      if (features.thumb_extension < 0.9) hints.push("Отведите большой палец сильнее в сторону");
      if (states.middle) hints.push("Сожмите средний палец в кулак");
      if (states.ring) hints.push("Сожмите безымянный палец в кулак");
      if (states.pinky) hints.push("Сожмите мизинец в кулак");
      return hints;
    },
  },
  V: {
    name: "Жест Победа (V)",
    shortLabel: "V",
    description: "Указательный и средний пальцы подняты вверх и разведены в стороны. Остальные пальцы сжаты к ладони.",
    emoji: "✌️",
    motionBased: false,
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
    referenceLandmarks: [
      { x: 50, y: 90 },
      { x: 38, y: 80 }, { x: 32, y: 73 }, { x: 28, y: 68 }, { x: 25, y: 62 },
      { x: 36, y: 52 }, { x: 30, y: 38 }, { x: 24, y: 24 }, { x: 18, y: 12 },
      { x: 48, y: 50 }, { x: 50, y: 35 }, { x: 52, y: 22 }, { x: 54, y: 9 },
      { x: 62, y: 55 }, { x: 62, y: 64 }, { x: 61, y: 70 }, { x: 60, y: 74 },
      { x: 73, y: 60 }, { x: 75, y: 68 }, { x: 74, y: 74 }, { x: 72, y: 78 },
    ],
    checkRules: (features, states) => {
      const hints: string[] = [];
      if (!states.index) hints.push("Поднимите указательный палец");
      if (!states.middle) hints.push("Поднимите средний палец");
      if (states.ring) hints.push("Сожмите безымянный палец");
      if (states.pinky) hints.push("Сожмите мизинец");
      if (features.index_middle < 0.6) hints.push("Раздвиньте указательный и средний пальцы шире");
      return hints;
    },
  },
  O: {
    name: "Буква О (Дактиль)",
    shortLabel: "О",
    description: "Пальцы округлены и их кончики соприкасаются с большим пальцем, образуя форму кольца (буквы О).",
    emoji: "👌",
    motionBased: false,
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
    referenceLandmarks: [
      { x: 50, y: 90 },
      { x: 42, y: 80 }, { x: 35, y: 70 }, { x: 34, y: 62 }, { x: 35, y: 52 },
      { x: 45, y: 55 }, { x: 38, y: 44 }, { x: 36, y: 47 }, { x: 35, y: 51 },
      { x: 48, y: 53 }, { x: 46, y: 42 }, { x: 43, y: 46 }, { x: 40, y: 51 },
      { x: 55, y: 55 }, { x: 53, y: 45 }, { x: 49, y: 49 }, { x: 45, y: 52 },
      { x: 60, y: 58 }, { x: 58, y: 48 }, { x: 54, y: 52 }, { x: 50, y: 55 },
    ],
    checkRules: (features) => {
      const hints: string[] = [];
      if (features.thumb_index > 0.42) {
        hints.push("Соедините кончики большого и указательного пальцев в кольцо");
      }
      if (features.index_extension > 1.35) hints.push("Округлите указательный палец");
      if (features.middle_extension > 1.35) hints.push("Округлите средний палец");
      if (features.ring_extension > 1.35) hints.push("Округлите безымянный палец");
      return hints;
    },
  },

  // 20 catalog gestures (backend/supabase/migration.sql). All placeholder
  // data pending human calibration via the in-app "Калибровка" panel.
  hello: {
    name: "Здравствуйте", shortLabel: "Здравствуйте", emoji: "👋", motionBased: true,
    description: "Приветственный жест: открытая ладонь поднимается от груди вперёд-вверх.",
    features: PLACEHOLDER_FEATURES, referenceLandmarks: PLACEHOLDER_LANDMARKS, checkRules: placeholderCheckRules,
  },
  thanks: {
    name: "Спасибо", shortLabel: "Спасибо", emoji: "🙏", motionBased: true,
    description: "Ладонь прикладывается к груди и слегка наклоняется вперёд в знак благодарности.",
    features: PLACEHOLDER_FEATURES, referenceLandmarks: PLACEHOLDER_LANDMARKS, checkRules: placeholderCheckRules,
  },
  bye: {
    name: "До свидания", shortLabel: "До свидания", emoji: "🖐️", motionBased: true,
    description: "Открытая ладонь покачивается из стороны в сторону на уровне плеча.",
    features: PLACEHOLDER_FEATURES, referenceLandmarks: PLACEHOLDER_LANDMARKS, checkRules: placeholderCheckRules,
  },
  please: {
    name: "Пожалуйста", shortLabel: "Пожалуйста", emoji: "🤲", motionBased: true,
    description: "Раскрытая ладонь совершает круговое движение у груди.",
    features: PLACEHOLDER_FEATURES, referenceLandmarks: PLACEHOLDER_LANDMARKS, checkRules: placeholderCheckRules,
  },
  yes: {
    name: "Да", shortLabel: "Да", emoji: "👍", motionBased: true,
    description: "Кулак несколько раз кивает вверх-вниз, как кивок головой.",
    features: PLACEHOLDER_FEATURES, referenceLandmarks: PLACEHOLDER_LANDMARKS, checkRules: placeholderCheckRules,
  },
  no: {
    name: "Нет", shortLabel: "Нет", emoji: "👎", motionBased: true,
    description: "Указательный и средний пальцы смыкаются с большим пальцем и покачиваются из стороны в сторону.",
    features: PLACEHOLDER_FEATURES, referenceLandmarks: PLACEHOLDER_LANDMARKS, checkRules: placeholderCheckRules,
  },
  mom: {
    name: "Мама", shortLabel: "Мама", emoji: "👩", motionBased: true,
    description: "Большой палец раскрытой ладони несколько раз касается щеки.",
    features: PLACEHOLDER_FEATURES, referenceLandmarks: PLACEHOLDER_LANDMARKS, checkRules: placeholderCheckRules,
  },
  dad: {
    name: "Папа", shortLabel: "Папа", emoji: "👨", motionBased: true,
    description: "Большой палец раскрытой ладони несколько раз касается лба.",
    features: PLACEHOLDER_FEATURES, referenceLandmarks: PLACEHOLDER_LANDMARKS, checkRules: placeholderCheckRules,
  },
  brother: {
    name: "Брат", shortLabel: "Брат", emoji: "👦", motionBased: true,
    description: "Указательные пальцы обеих рук соединяются и слегка постукивают друг о друга.",
    features: PLACEHOLDER_FEATURES, referenceLandmarks: PLACEHOLDER_LANDMARKS, checkRules: placeholderCheckRules,
  },
  sister: {
    name: "Сестра", shortLabel: "Сестра", emoji: "👧", motionBased: true,
    description: "Мизинцы обеих рук соединяются и слегка постукивают друг о друга.",
    features: PLACEHOLDER_FEATURES, referenceLandmarks: PLACEHOLDER_LANDMARKS, checkRules: placeholderCheckRules,
  },
  food: {
    name: "Еда", shortLabel: "Еда", emoji: "🍽️", motionBased: true,
    description: "Пальцы, собранные в щепоть, несколько раз подносятся ко рту.",
    features: PLACEHOLDER_FEATURES, referenceLandmarks: PLACEHOLDER_LANDMARKS, checkRules: placeholderCheckRules,
  },
  water: {
    name: "Вода", shortLabel: "Вода", emoji: "💧", motionBased: true,
    description: "Указательный палец несколько раз касается подбородка.",
    features: PLACEHOLDER_FEATURES, referenceLandmarks: PLACEHOLDER_LANDMARKS, checkRules: placeholderCheckRules,
  },
  tasty: {
    name: "Вкусно", shortLabel: "Вкусно", emoji: "😋", motionBased: true,
    description: "Ладонь описывает круговое движение у щеки.",
    features: PLACEHOLDER_FEATURES, referenceLandmarks: PLACEHOLDER_LANDMARKS, checkRules: placeholderCheckRules,
  },
  joy: {
    name: "Радость", shortLabel: "Радость", emoji: "😊", motionBased: true,
    description: "Обе ладони поднимаются вверх от груди.",
    features: PLACEHOLDER_FEATURES, referenceLandmarks: PLACEHOLDER_LANDMARKS, checkRules: placeholderCheckRules,
  },
  sadness: {
    name: "Грусть", shortLabel: "Грусть", emoji: "😢", motionBased: true,
    description: "Пальцы, сложенные вместе, медленно опускаются вниз от глаз.",
    features: PLACEHOLDER_FEATURES, referenceLandmarks: PLACEHOLDER_LANDMARKS, checkRules: placeholderCheckRules,
  },
  love: {
    name: "Любовь", shortLabel: "Любовь", emoji: "❤️", motionBased: true,
    description: "Скрещенные руки прикладываются к груди в области сердца.",
    features: PLACEHOLDER_FEATURES, referenceLandmarks: PLACEHOLDER_LANDMARKS, checkRules: placeholderCheckRules,
  },
  one: {
    name: "Один", shortLabel: "Один", emoji: "1️⃣", motionBased: false,
    description: "Один выпрямленный указательный палец, остальные пальцы сжаты в кулак.",
    features: PLACEHOLDER_FEATURES, referenceLandmarks: PLACEHOLDER_LANDMARKS, checkRules: placeholderCheckRules,
  },
  two: {
    name: "Два", shortLabel: "Два", emoji: "2️⃣", motionBased: false,
    description: "Указательный и средний пальцы выпрямлены и разведены, остальные сжаты.",
    features: PLACEHOLDER_FEATURES, referenceLandmarks: PLACEHOLDER_LANDMARKS, checkRules: placeholderCheckRules,
  },
  three: {
    name: "Три", shortLabel: "Три", emoji: "3️⃣", motionBased: false,
    description: "Три пальца — большой, указательный и средний — выпрямлены и разведены.",
    features: PLACEHOLDER_FEATURES, referenceLandmarks: PLACEHOLDER_LANDMARKS, checkRules: placeholderCheckRules,
  },
  hundred: {
    name: "Сто", shortLabel: "Сто", emoji: "💯", motionBased: false,
    description: "Числовой жест «сто».",
    features: PLACEHOLDER_FEATURES, referenceLandmarks: PLACEHOLDER_LANDMARKS, checkRules: placeholderCheckRules,
  },
};
