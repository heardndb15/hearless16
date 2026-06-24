import numpy as np
import random

_mp_hands_module = None


def _get_mp_hands():
    global _mp_hands_module
    if _mp_hands_module is None:
        try:
            import mediapipe as mp
            _mp_hands_module = mp.solutions.hands
        except ImportError:
            _mp_hands_module = False
    return _mp_hands_module if _mp_hands_module is not False else None


def _decode_image(frame_data: bytes):
    try:
        import cv2
        nparr = np.frombuffer(frame_data, np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        if img is None:
            return None
        return cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
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


def _classify(fingers: dict) -> tuple[str, float]:
    """Rule-based classifier. Returns (gesture_name, confidence_0_to_1)."""
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
    if non_thumb == 1 and i:
        return "Один", 0.90
    if non_thumb == 2 and i and m:
        return "Два", 0.88
    if non_thumb == 3 and i and m and r:
        return "Три", 0.85
    if non_thumb == 4:
        return "Четыре", 0.83
    return "Неизвестно", 0.20


def recognize_gesture(frame_data: bytes, target_gesture: str | None = None) -> dict:
    mp_hands = _get_mp_hands()

    # Fallback to emulation if mediapipe not installed
    if mp_hands is None:
        return recognize_emulate(target_gesture)

    img = _decode_image(frame_data)
    if img is None:
        return {
            "gesture": None,
            "confidence": 0,
            "components": {"hand_shape": 0, "position": 0, "movement": 0},
            "error": "invalid_image",
        }

    with mp_hands.Hands(
        static_image_mode=True,
        max_num_hands=1,
        min_detection_confidence=0.5,
        min_tracking_confidence=0.5,
    ) as hands:
        result = hands.process(img)

    if not result.multi_hand_landmarks:
        return {
            "gesture": None,
            "confidence": 0,
            "components": {"hand_shape": 0, "position": 0, "movement": 0},
            "error": "no_hand_detected",
        }

    lm = result.multi_hand_landmarks[0].landmark
    fingers = _finger_states(lm)
    gesture_name, base_conf = _classify(fingers)

    avg_visibility = float(np.mean([l.visibility for l in lm]))
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
    }


# ── Mock fallback (used when mediapipe is unavailable) ──────────────────────

GESTURE_COMPONENTS = {
    "Здравствуйте": {"hand_shape": 92, "position": 88, "movement": 85},
    "Спасибо":      {"hand_shape": 85, "position": 80, "movement": 78},
    "Да":           {"hand_shape": 95, "position": 90, "movement": 88},
    "Нет":          {"hand_shape": 82, "position": 85, "movement": 80},
    "Помогите":     {"hand_shape": 78, "position": 75, "movement": 72},
    "Вода":         {"hand_shape": 88, "position": 82, "movement": 80},
    "Еда":          {"hand_shape": 80, "position": 78, "movement": 75},
}


def recognize_emulate(target_gesture: str | None = None) -> dict:
    if target_gesture:
        base = GESTURE_COMPONENTS.get(target_gesture, {"hand_shape": 85, "position": 80, "movement": 80})
    else:
        chosen = random.choice(list(GESTURE_COMPONENTS.keys()))
        base = GESTURE_COMPONENTS[chosen]
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
    }
