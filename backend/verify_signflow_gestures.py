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

# "ru" vocabulary: 12 words, each cited to a real SLOVO constants.py class id
# (see docs/superpowers/specs/2026-07-10-russian-sign-language-switcher-design.md).
RU_CASES = {
    (0, 0, 0, 0, 0): "Да",           # id 900
    (0, 1, 0, 0, 0): "Один",         # id 555
    (0, 1, 1, 0, 0): "Два",          # id 621
    (1, 1, 1, 0, 0): "Три",          # id 707
    (0, 1, 1, 1, 1): "Четыре",       # id 737
    (1, 1, 1, 1, 1): "Привет!",      # id 476
    (1, 0, 0, 0, 0): "Хорошо",       # id 540
    (0, 0, 0, 1, 0): "Плохо",        # id 766
    (0, 1, 1, 1, 0): "Вода",         # id 662
    (0, 0, 1, 0, 0): "Еда",          # id 549
    (0, 0, 0, 0, 1): "Помочь",       # id 933
    (1, 0, 0, 0, 1): "Остановить",   # id 795
}


def check(pattern, expected, language="kz"):
    t, i, m, r, p = pattern
    fingers = {"thumb": bool(t), "index": bool(i), "middle": bool(m), "ring": bool(r), "pinky": bool(p)}
    got, _ = _classify(fingers, language)
    status = "PASS" if got == expected else "FAIL"
    print(f"{status}: language={language} pattern={pattern} -> {got!r} (want {expected!r})")
    assert got == expected, f"pattern {pattern} classified as {got!r}, expected {expected!r} (language={language})"


for pattern, expected in NEW_CASES.items():
    check(pattern, expected, "kz")

for pattern, expected in EXISTING_CASES.items():
    check(pattern, expected, "kz")

for pattern, expected in RU_CASES.items():
    check(pattern, expected, "ru")

print("All gesture classification checks passed")
