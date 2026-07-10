import sys
import os

sys.path.insert(0, os.path.dirname(__file__))

from app.signflow_model import _classify

NEW_CASES = {
    (0, 0, 0, 0, 1): "Пожалуйста",  # pinky only
    (0, 0, 1, 0, 0): "Хорошо",      # middle only
    (0, 0, 0, 1, 0): "Плохо",       # ring only
    (1, 0, 0, 0, 1): "Помощь",      # thumb + pinky
    (1, 0, 0, 1, 0): "Стоп",        # thumb + ring
}

EXISTING_CASES = {
    (1, 0, 0, 0, 0): "Да",
    (0, 1, 0, 0, 0): "Нет",
    (1, 1, 1, 1, 1): "Здравствуйте",
    (0, 1, 1, 1, 0): "Вода",
    (0, 1, 1, 0, 0): "Еда",
    (0, 0, 0, 0, 0): "Спасибо",
    (1, 1, 0, 0, 0): "Один",
    (1, 1, 1, 0, 0): "Два",
    (1, 1, 1, 1, 0): "Три",
    (0, 1, 1, 1, 1): "Четыре",
}


def check(pattern, expected):
    t, i, m, r, p = pattern
    fingers = {"thumb": bool(t), "index": bool(i), "middle": bool(m), "ring": bool(r), "pinky": bool(p)}
    got, _ = _classify(fingers)
    status = "PASS" if got == expected else "FAIL"
    print(f"{status}: pattern={pattern} -> {got!r} (want {expected!r})")
    assert got == expected, f"pattern {pattern} classified as {got!r}, expected {expected!r}"


for pattern, expected in NEW_CASES.items():
    check(pattern, expected)

for pattern, expected in EXISTING_CASES.items():
    check(pattern, expected)

print("All gesture classification checks passed")
