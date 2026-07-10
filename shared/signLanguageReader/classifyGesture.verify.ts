import { classifyGesture, type HandLandmarkPoint } from "./classifyGesture";

type Fingers = { thumb: boolean; index: boolean; middle: boolean; ring: boolean; pinky: boolean };

function makeLandmarks(fingers: Fingers): HandLandmarkPoint[] {
  const lm: HandLandmarkPoint[] = Array.from({ length: 21 }, () => ({ x: 0, y: 0.5, z: 0 }));
  const set = (tip: number, joint: number, extended: boolean) => {
    lm[tip] = { x: 0, y: extended ? 0.3 : 0.6, z: 0 };
    lm[joint] = { x: 0, y: extended ? 0.6 : 0.3, z: 0 };
  };
  set(4, 2, fingers.thumb);
  set(8, 6, fingers.index);
  set(12, 10, fingers.middle);
  set(16, 14, fingers.ring);
  set(20, 18, fingers.pinky);
  return lm;
}

function assertEqual(actual: string, expected: string, label: string) {
  if (actual !== expected) {
    throw new Error(`FAIL ${label}: expected "${expected}", got "${actual}"`);
  }
  console.log(`PASS ${label}`);
}

function assertEqualNumber(actual: number, expected: number, label: string) {
  if (actual !== expected) {
    throw new Error(`FAIL ${label}: expected ${expected}, got ${actual}`);
  }
  console.log(`PASS ${label}`);
}

const NEW_CASES: [Fingers, string][] = [
  [{ thumb: false, index: false, middle: false, ring: false, pinky: true }, "Пожалуйста"],
  [{ thumb: false, index: false, middle: true, ring: false, pinky: false }, "Хорошо"],
  [{ thumb: false, index: false, middle: false, ring: true, pinky: false }, "Плохо"],
  [{ thumb: true, index: false, middle: false, ring: false, pinky: true }, "Помощь"],
  [{ thumb: true, index: false, middle: false, ring: true, pinky: false }, "Стоп"],
];

const EXISTING_CASES: [Fingers, string][] = [
  [{ thumb: true, index: false, middle: false, ring: false, pinky: false }, "Да"],
  [{ thumb: false, index: true, middle: false, ring: false, pinky: false }, "Нет"],
  [{ thumb: true, index: true, middle: true, ring: true, pinky: true }, "Здравствуйте"],
  [{ thumb: false, index: true, middle: true, ring: true, pinky: false }, "Вода"],
  [{ thumb: false, index: true, middle: true, ring: false, pinky: false }, "Еда"],
  [{ thumb: false, index: false, middle: false, ring: false, pinky: false }, "Спасибо"],
  [{ thumb: true, index: true, middle: false, ring: false, pinky: false }, "Один"],
  [{ thumb: true, index: true, middle: true, ring: false, pinky: false }, "Два"],
  [{ thumb: true, index: true, middle: true, ring: true, pinky: false }, "Три"],
  [{ thumb: false, index: true, middle: true, ring: true, pinky: true }, "Четыре"],
];

for (const [fingers, expected] of [...NEW_CASES, ...EXISTING_CASES]) {
  const { gesture } = classifyGesture(makeLandmarks(fingers), 1.0);
  assertEqual(gesture, expected, `${JSON.stringify(fingers)} -> ${expected}`);
}

{
  const { confidence } = classifyGesture(makeLandmarks({ thumb: true, index: false, middle: false, ring: false, pinky: false }), 1.0);
  assertEqualNumber(confidence, 92, "Да at full handedness score yields 92% confidence (0-100 scale)");
}

console.log("All classifyGesture checks passed");
