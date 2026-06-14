import random

GESTURE_COMPONENTS = {
    "Здравствуйте": {"hand_shape": 92, "position": 88, "movement": 85},
    "Спасибо": {"hand_shape": 85, "position": 80, "movement": 78},
    "Да": {"hand_shape": 95, "position": 90, "movement": 88},
    "Нет": {"hand_shape": 82, "position": 85, "movement": 80},
    "Помогите": {"hand_shape": 78, "position": 75, "movement": 72},
    "Вода": {"hand_shape": 88, "position": 82, "movement": 80},
    "Еда": {"hand_shape": 80, "position": 78, "movement": 75},
}


def recognize_emulate(target_gesture: str | None = None) -> dict:
    if target_gesture and target_gesture in GESTURE_COMPONENTS:
        base = GESTURE_COMPONENTS[target_gesture]
        confidence = (
            base["hand_shape"] * 0.4
            + base["position"] * 0.3
            + base["movement"] * 0.3
        )
        noise = random.uniform(-5, 5)
        confidence = max(0, min(100, confidence + noise))
        return {
            "gesture": target_gesture,
            "confidence": round(confidence, 1),
            "components": {
                "hand_shape": round(max(0, min(100, base["hand_shape"] + random.uniform(-8, 8))), 1),
                "position": round(max(0, min(100, base["position"] + random.uniform(-8, 8))), 1),
                "movement": round(max(0, min(100, base["movement"] + random.uniform(-8, 8))), 1),
            },
        }

    gesture_names = list(GESTURE_COMPONENTS.keys())
    chosen = random.choice(gesture_names)
    comps = GESTURE_COMPONENTS[chosen]
    confidence = (
        comps["hand_shape"] * 0.4
        + comps["position"] * 0.3
        + comps["movement"] * 0.3
    )
    noise = random.uniform(-15, 15)
    confidence = max(0, min(100, confidence + noise))

    return {
        "gesture": chosen,
        "confidence": round(confidence, 1),
        "components": {
            "hand_shape": round(max(0, min(100, comps["hand_shape"] + random.uniform(-8, 8))), 1),
            "position": round(max(0, min(100, comps["position"] + random.uniform(-8, 8))), 1),
            "movement": round(max(0, min(100, comps["movement"] + random.uniform(-8, 8))), 1),
        },
    }


def recognize_gesture(frame_data: bytes, target_gesture: str | None = None) -> dict:
    return recognize_emulate(target_gesture)
