import io
import sys
import numpy as np
import random
from PIL import Image

# The legacy `mediapipe.solutions.hands` API used here previously was removed
# entirely from the mediapipe package (mediapipe>=0.10.0 no longer ships a
# `solutions` module at all), so `mp.solutions.hands` raised AttributeError
# on every call — not caught by the old `except ImportError`, so it
# propagated up to the route handler's generic except and always fell back
# to the all-zero response. This uses the replacement Tasks API
# (`mediapipe.tasks.python.vision.HandLandmarker`), the same one already
# used by the browser-side tracker in landing/app/sign-language/practice.
_HAND_LANDMARKER_MODEL_URL = (
    "https://storage.googleapis.com/mediapipe-models/hand_landmarker/"
    "hand_landmarker/float16/1/hand_landmarker.task"
)

_hand_landmarker = None
_model_bytes = None


def _get_model_bytes():
    global _model_bytes
    if _model_bytes is None:
        import httpx
        response = httpx.get(_HAND_LANDMARKER_MODEL_URL, timeout=30.0)
        response.raise_for_status()
        _model_bytes = response.content
    return _model_bytes


def _get_hand_landmarker():
    global _hand_landmarker
    if _hand_landmarker is None:
        try:
            import mediapipe as mp

            model_bytes = _get_model_bytes()
            options = mp.tasks.vision.HandLandmarkerOptions(
                base_options=mp.tasks.BaseOptions(model_asset_buffer=model_bytes),
                running_mode=mp.tasks.vision.RunningMode.IMAGE,
                num_hands=1,
                min_hand_detection_confidence=0.5,
                min_hand_presence_confidence=0.5,
                min_tracking_confidence=0.5,
            )
            _hand_landmarker = mp.tasks.vision.HandLandmarker.create_from_options(options)
        except Exception as e:
            print(f"Failed to initialize HandLandmarker: {e}", file=sys.stderr)
            _hand_landmarker = False
    return _hand_landmarker if _hand_landmarker is not False else None


def _decode_image(frame_data: bytes):
    # Uses Pillow instead of cv2: mediapipe's own opencv-contrib-python
    # dependency needs system GUI libraries (libGL.so.1 etc.) that aren't
    # present on Render's minimal Python runtime, so cv2 always failed to
    # import there — every /gestures/recognize call silently fell back to
    # the all-zero "invalid_image" response regardless of the actual image.
    # Pillow has no such system dependency.
    try:
        img = Image.open(io.BytesIO(frame_data)).convert("RGB")
        return np.array(img)
    except Exception:
        return None


def _finger_states(lm) -> dict:
    """True = finger extended. Uses y-axis: smaller y = higher on screen = extended."""
    return {
        "thumb":  lm[4].y < lm[2].y,
        "index":  lm[8].y < lm[6].y,
        "middle": lm[12].y < lm[10].y,
        "ring":   lm[16].y < lm[14].y,
        "pinky":  lm[20].y < lm[18].y,
    }


def _classify_kz(fingers: dict) -> tuple[str, float]:
    """Rule-based classifier for the original (kz) vocabulary. Returns (gesture_name, confidence_0_to_1)."""
    t = fingers["thumb"]
    i = fingers["index"]
    m = fingers["middle"]
    r = fingers["ring"]
    p = fingers["pinky"]
    non_thumb = sum([i, m, r, p])

    # Да — thumb up only
    if t and not i and not m and not r and not p:
        return "Да", 0.92
    # Нет — index only
    if not t and i and not m and not r and not p:
        return "Нет", 0.88
    # Здравствуйте — all five extended
    if t and i and m and r and p:
        return "Здравствуйте", 0.90
    # Вода — index + middle + ring (W shape)
    if not t and i and m and r and not p:
        return "Вода", 0.85
    # Еда — index + middle only
    if not t and i and m and not r and not p:
        return "Еда", 0.82
    # Numbers by non-thumb finger count
    if non_thumb == 0 and not t:
        return "Спасибо", 0.75   # closed fist = approximate
    # Пожалуйста — pinky only
    if not t and not i and not m and not r and p:
        return "Пожалуйста", 0.80
    # Хорошо — middle only
    if not t and not i and m and not r and not p:
        return "Хорошо", 0.78
    # Плохо — ring only
    if not t and not i and not m and r and not p:
        return "Плохо", 0.78
    # Помощь — thumb + pinky ("hang loose")
    if t and not i and not m and not r and p:
        return "Помощь", 0.82
    # Стоп — thumb + ring
    if t and not i and not m and r and not p:
        return "Стоп", 0.80
    if non_thumb == 1 and i:
        return "Один", 0.90
    if non_thumb == 2 and i and m:
        return "Два", 0.88
    if non_thumb == 3 and i and m and r:
        return "Три", 0.85
    if non_thumb == 4:
        return "Четыре", 0.83
    return "Неизвестно", 0.20


def _classify_ru(fingers: dict) -> tuple[str, float]:
    """
    Rule-based classifier for the "ru" vocabulary — 12 words cited to real
    SLOVO (github.com/hukenovs/slovo) constants.py class ids, see
    docs/superpowers/specs/2026-07-10-russian-sign-language-switcher-design.md
    for the id each word maps to. Single-frame approximations of what are
    mostly dynamic real-world signs — same caliber of simplification as
    _classify_kz. Returns (gesture_name, confidence_0_to_1).
    """
    t = fingers["thumb"]
    i = fingers["index"]
    m = fingers["middle"]
    r = fingers["ring"]
    p = fingers["pinky"]

    # Да — closed fist (nod)
    if not t and not i and not m and not r and not p:
        return "Да", 0.92
    # Один — index only
    if not t and i and not m and not r and not p:
        return "Один", 0.90
    # Два — index + middle
    if not t and i and m and not r and not p:
        return "Два", 0.88
    # Три — thumb + index + middle (Russian counting style)
    if t and i and m and not r and not p:
        return "Три", 0.85
    # Четыре — four fingers, thumb tucked
    if not t and i and m and r and p:
        return "Четыре", 0.83
    # Привет! — all five extended, open palm
    if t and i and m and r and p:
        return "Привет!", 0.90
    # Хорошо — thumb up
    if t and not i and not m and not r and not p:
        return "Хорошо", 0.78
    # Плохо — ring only
    if not t and not i and not m and r and not p:
        return "Плохо", 0.78
    # Вода — index + middle + ring
    if not t and i and m and r and not p:
        return "Вода", 0.85
    # Еда — middle only
    if not t and not i and m and not r and not p:
        return "Еда", 0.82
    # Помочь — pinky only
    if not t and not i and not m and not r and p:
        return "Помочь", 0.80
    # Остановить — thumb + pinky
    if t and not i and not m and not r and p:
        return "Остановить", 0.80
    return "Неизвестно", 0.20


def _classify(fingers: dict, language: str = "kz") -> tuple[str, float]:
    if language == "ru":
        return _classify_ru(fingers)
    return _classify_kz(fingers)


def recognize_gesture(frame_data: bytes, target_gesture: str | None = None, language: str = "kz") -> dict:
    landmarker = _get_hand_landmarker()

    # Fallback to emulation if the model failed to load (e.g. offline, or
    # the model download failed)
    if landmarker is None:
        return recognize_emulate(target_gesture, language)

    img = _decode_image(frame_data)
    if img is None:
        return {
            "gesture": None,
            "confidence": 0,
            "components": {"hand_shape": 0, "position": 0, "movement": 0},
            "landmarks": None,
            "error": "invalid_image",
        }

    import mediapipe as mp
    mp_image = mp.Image(image_format=mp.ImageFormat.SRGB, data=img)
    result = landmarker.detect(mp_image)

    if not result.hand_landmarks:
        return {
            "gesture": None,
            "confidence": 0,
            "components": {"hand_shape": 0, "position": 0, "movement": 0},
            "landmarks": None,
            "error": "no_hand_detected",
        }

    lm = result.hand_landmarks[0]
    landmarks = [{"x": p.x, "y": p.y, "z": p.z} for p in lm]
    fingers = _finger_states(lm)
    gesture_name, base_conf = _classify(fingers, language)

    # The Tasks API's NormalizedLandmark.visibility is optional and this
    # model doesn't populate it (unlike the old legacy Solutions API), so
    # fall back to the hand's handedness classification score as the
    # closest available per-detection confidence signal.
    visibility_values = [lm_point.visibility for lm_point in lm if lm_point.visibility is not None]
    if visibility_values:
        avg_visibility = float(np.mean(visibility_values))
    elif result.handedness and result.handedness[0]:
        avg_visibility = float(result.handedness[0][0].score)
    else:
        avg_visibility = 1.0

    confidence = round(min(100.0, base_conf * avg_visibility * 100), 1)

    if target_gesture:
        if gesture_name == target_gesture:
            confidence = min(100.0, confidence * 1.1)
        else:
            confidence = round(confidence * 0.3, 1)

    return {
        "gesture": gesture_name,
        "confidence": confidence,
        "components": {
            "hand_shape": round(min(100.0, base_conf * 100), 1),
            "position":   round(min(100.0, avg_visibility * 100), 1),
            "movement":   round(confidence * 0.9, 1),
        },
        "landmarks": landmarks,
    }


# ── Mock fallback (used when mediapipe is unavailable) ──────────────────────

GESTURE_COMPONENTS_KZ = {
    "Здравствуйте": {"hand_shape": 92, "position": 88, "movement": 85},
    "Спасибо":      {"hand_shape": 85, "position": 80, "movement": 78},
    "Да":           {"hand_shape": 95, "position": 90, "movement": 88},
    "Нет":          {"hand_shape": 82, "position": 85, "movement": 80},
    "Помогите":     {"hand_shape": 78, "position": 75, "movement": 72},
    "Вода":         {"hand_shape": 88, "position": 82, "movement": 80},
    "Еда":          {"hand_shape": 80, "position": 78, "movement": 75},
    "Пожалуйста":   {"hand_shape": 80, "position": 78, "movement": 75},
    "Хорошо":       {"hand_shape": 78, "position": 76, "movement": 74},
    "Плохо":        {"hand_shape": 78, "position": 75, "movement": 73},
    "Помощь":       {"hand_shape": 82, "position": 80, "movement": 77},
    "Стоп":         {"hand_shape": 80, "position": 79, "movement": 76},
}

GESTURE_COMPONENTS_RU = {
    "Да":           {"hand_shape": 90, "position": 88, "movement": 85},
    "Один":         {"hand_shape": 88, "position": 85, "movement": 80},
    "Два":          {"hand_shape": 86, "position": 84, "movement": 80},
    "Три":          {"hand_shape": 84, "position": 82, "movement": 78},
    "Четыре":       {"hand_shape": 82, "position": 80, "movement": 76},
    "Привет!":      {"hand_shape": 90, "position": 87, "movement": 84},
    "Хорошо":       {"hand_shape": 80, "position": 78, "movement": 75},
    "Плохо":        {"hand_shape": 78, "position": 76, "movement": 73},
    "Вода":         {"hand_shape": 84, "position": 80, "movement": 78},
    "Еда":          {"hand_shape": 80, "position": 77, "movement": 74},
    "Помочь":       {"hand_shape": 79, "position": 76, "movement": 73},
    "Остановить":   {"hand_shape": 81, "position": 78, "movement": 75},
}

GESTURE_COMPONENTS_BY_LANGUAGE = {
    "kz": GESTURE_COMPONENTS_KZ,
    "ru": GESTURE_COMPONENTS_RU,
}


def recognize_emulate(target_gesture: str | None = None, language: str = "kz") -> dict:
    table = GESTURE_COMPONENTS_BY_LANGUAGE.get(language, GESTURE_COMPONENTS_KZ)

    if target_gesture:
        base = table.get(target_gesture, {"hand_shape": 85, "position": 80, "movement": 80})
    else:
        chosen = random.choice(list(table.keys()))
        base = table[chosen]
        target_gesture = chosen

    noise = random.uniform(-5, 5)
    confidence = max(0, min(100, (
        base["hand_shape"] * 0.4 + base["position"] * 0.3 + base["movement"] * 0.3
    ) + noise))

    return {
        "gesture": target_gesture,
        "confidence": round(confidence, 1),
        "components": {
            "hand_shape": round(max(0, min(100, base["hand_shape"] + random.uniform(-8, 8))), 1),
            "position":   round(max(0, min(100, base["position"]   + random.uniform(-8, 8))), 1),
            "movement":   round(max(0, min(100, base["movement"]   + random.uniform(-8, 8))), 1),
        },
        "landmarks": None,
    }
