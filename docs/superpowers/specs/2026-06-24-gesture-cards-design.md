# Gesture Cards Redesign & AI Camera Verification — Design Spec

## Goal

Redesign gesture language cards with glassmorphism UI, add brief GIF-based instructions, and wire a smooth card → detail → camera practice flow.

## Architecture

**New files:**
- `mobile/src/screens/GestureDetailScreen.tsx` — dedicated gesture detail screen

**Modified files:**
- `mobile/src/screens/GestureDictionaryScreen.tsx` — glassmorphism cards with GIF in grid, remove old modal, navigate to GestureDetailScreen
- `mobile/src/screens/GesturePracticeScreen.tsx` — apply glassmorphism design
- `backend/supabase/migration_description.sql` — add `description TEXT` column to `gestures`
- `backend/app/routes/gestures.py` — include `description` in GET responses

**Navigation flow:**
```
GestureDictionaryScreen (2-col grid, GIF cards)
  → tap card →
GestureDetailScreen (large GIF + description + button)
  → "Проверить через камеру" →
GesturePracticeScreen (camera + AI + result)
```

## Global Constraints

- Expo SDK 51, React Native
- Gradient: `['#1565C0', '#42A5F5', '#E3F2FD']`, locations `[0, 0.45, 1]`
- Glass card: `backgroundColor: 'rgba(255,255,255,0.72)'`, `borderRadius: 20`, `borderWidth: 1.5`, `borderColor: 'rgba(255,255,255,0.6)'`, `shadowColor: '#0288D1'`, `shadowOpacity: 0.18`, `shadowRadius: 20`
- Accent color: `#0277BD`; heading color: `#0D47A1`; text secondary: `#1E6FA8`
- GIF display: `expo-image` with `autoplay={true}`, `contentFit="cover"` in grid / `contentFit="contain"` in detail
- GIF placeholder when `gif_url` is null: 🤟 emoji centered on `rgba(2,136,209,0.15)` background
- No new navigation libraries — use existing React Navigation stack already wired in the app
- `description` field: 1–2 sentences in Russian, plain text, no markdown
- All 20 gestures must have a `description` value in the migration SQL

---

## Section 1: Database Migration

**File:** `backend/supabase/migration_description.sql`

Add column and populate all 20 gestures:

```sql
ALTER TABLE gestures ADD COLUMN IF NOT EXISTS description TEXT;

UPDATE gestures SET description = 'Вытяните все пять пальцев и помашите рукой вправо-влево.' WHERE name = 'Здравствуйте';
UPDATE gestures SET description = 'Поднесите пальцы ко рту, затем опустите руку вперёд.' WHERE name = 'Спасибо';
UPDATE gestures SET description = 'Поднимите большой палец вверх, остальные сожмите в кулак.' WHERE name = 'Да';
UPDATE gestures SET description = 'Вытяните указательный палец и покачайте им влево-вправо.' WHERE name = 'Нет';
UPDATE gestures SET description = 'Сложите ладонь лодочкой и поднесите к губам, имитируя питьё.' WHERE name = 'Вода';
UPDATE gestures SET description = 'Сложите пальцы щепотью и поднесите ко рту, имитируя еду.' WHERE name = 'Еда';
UPDATE gestures SET description = 'Поднесите пальцы к губам и медленно раскройте ладонь вперёд.' WHERE name = 'Пожалуйста';
UPDATE gestures SET description = 'Помашите раскрытой ладонью вправо-влево на уровне плеча.' WHERE name = 'До свидания';
UPDATE gestures SET description = 'Прижмите большой палец к губам, остальные согните.' WHERE name = 'Мама';
UPDATE gestures SET description = 'Прикоснитесь большим пальцем к подбородку, остальные согните.' WHERE name = 'Папа';
UPDATE gestures SET description = 'Поднимите кулак к виску и слегка постучите.' WHERE name = 'Брат';
UPDATE gestures SET description = 'Проведите указательным пальцем по щеке сверху вниз.' WHERE name = 'Сестра';
UPDATE gestures SET description = 'Улыбнитесь и поднимите обе ладони вверх открытыми.' WHERE name = 'Радость';
UPDATE gestures SET description = 'Поднесите согнутые пальцы к сердцу и медленно опустите руку.' WHERE name = 'Грусть';
UPDATE gestures SET description = 'Скрестите руки на груди, образуя форму сердца.' WHERE name = 'Любовь';
UPDATE gestures SET description = 'Покажите большой палец вверх и сожмите кулак.' WHERE name = 'Вкусно';
UPDATE gestures SET description = 'Вытяните указательный палец вверх, остальные сожмите.' WHERE name = 'Один';
UPDATE gestures SET description = 'Вытяните указательный и средний пальцы в виде буквы V.' WHERE name = 'Два';
UPDATE gestures SET description = 'Вытяните указательный, средний и безымянный пальцы вверх.' WHERE name = 'Три';
UPDATE gestures SET description = 'Раскройте все пять пальцев и сожмите их дважды.' WHERE name = 'Сто';
```

---

## Section 2: Backend — `GET /gestures/` and `GET /gestures/{id}`

**File:** `backend/app/routes/gestures.py`

Add `description: Optional[str]` to the Pydantic response model and include it in the SELECT query / returned dict. No new endpoints needed.

---

## Section 3: GestureDictionaryScreen Redesign

**File:** `mobile/src/screens/GestureDictionaryScreen.tsx`

### Layout
- Gradient background (`LinearGradient` with `GRADIENT_COLORS`)
- Search bar: glass input (`rgba(255,255,255,0.72)`, `borderRadius: 16`, blue border on focus)
- Category chips: horizontal scroll, inactive = `rgba(255,255,255,0.35)`, active = `#0277BD` white text
- 2-column `FlatList` with `numColumns={2}`, `columnWrapperStyle={{ gap: 12 }}`

### Gesture Card (inline, replaces old component)
```
┌────────────────────┐
│  [GIF / placeholder]│  height: 130, borderRadius top 20
│  Здравствуйте       │  fontSize 14, fontWeight 600, color #0D47A1
│  Базовые  Лёгкий   │  small chips, color #1E6FA8
└────────────────────┘
glass card styles, margin 6
```

- `onPress` → `navigation.navigate('GestureDetail', { gesture })` — passes full gesture object
- Remove old modal and modal state entirely
- If `gif_url` is null: render `View` with `rgba(2,136,209,0.15)` bg + 🤟 `Text` centered, same height

---

## Section 4: GestureDetailScreen (New)

**File:** `mobile/src/screens/GestureDetailScreen.tsx`

### Props / Route Params
```typescript
type GestureDetailParams = {
  gesture: {
    id: string;
    name: string;
    category: string;
    difficulty: 'easy' | 'medium' | 'hard';
    gif_url?: string | null;
    description?: string | null;
  };
};
```

### Layout
```
GradientBg (LinearGradient full screen)
  SafeAreaView
    ← back button (top-left, white, fontSize 16)
    difficulty badge (top-right chip: Лёгкий/Средний/Сложный)

    Image/GIF  280×280, borderRadius 20, centered, contentFit="contain"
    (placeholder: 120×120 🤟 on rgba(2,136,209,0.15) card if no gif_url)

    glass card (GlassCard styles, marginHorizontal 20, padding 20)
      name: fontSize 24, fontWeight 700, color #0D47A1
      category chip: rgba(2,136,209,0.15) bg, color #0277BD
      description: fontSize 16, color #1E6FA8, lineHeight 24, marginTop 12
      if best_accuracy > 0: "Мой рекорд: {best_accuracy}% ✓" in green

    button "Проверить через камеру" 
      full-width, backgroundColor #0277BD, borderRadius 16, height 52
      white text fontSize 16 fontWeight 600
      onPress → navigation.navigate('GesturePractice', { gestureName: gesture.name })
```

### Best accuracy
- On mount: fetch from `GET /gestures/progress/{userId}` (same call GesturesScreen makes), find matching `gesture_id`, show `best_accuracy`
- If user not authenticated: skip fetch, hide record row

### Difficulty badge colors
- easy → `rgba(34,197,94,0.15)` bg, `#16a34a` text — "Лёгкий"
- medium → `rgba(234,179,8,0.15)` bg, `#ca8a04` text — "Средний"
- hard → `rgba(239,68,68,0.15)` bg, `#dc2626` text — "Сложный"

---

## Section 5: GesturePracticeScreen Glassmorphism

**File:** `mobile/src/screens/GesturePracticeScreen.tsx`

Replace dark background colors with gradient + glass:

| Old | New |
|-----|-----|
| Dark bg `#0f172a` / `#1e293b` | `LinearGradient` GRADIENT_COLORS |
| Dark result card | GlassCard (`rgba(255,255,255,0.72)`) |
| Gray progress bars | Blue `#0277BD` fill on `rgba(2,136,209,0.15)` track |
| Dark buttons | `#0277BD` primary, `rgba(255,255,255,0.72)` secondary |
| Countdown text dark | White text on gradient |
| Header text | White, `fontWeight 700` |

Confidence % color stays: `≥80%` → `#16a34a` (green), `<80%` → `#dc2626` (red).
Camera preview stays full-screen behind glass overlay — no change to camera logic.

---

## Section 6: Navigation Wiring

The app uses React Navigation. `GestureDetailScreen` must be added to the navigator.

**File:** wherever the gesture navigator stack is defined (likely `mobile/src/navigation/` or `App.tsx`) — add:
```typescript
<Stack.Screen name="GestureDetail" component={GestureDetailScreen} options={{ headerShown: false }} />
```

`GesturePracticeScreen` is already in the stack as `'GesturePractice'`.

---

## Out of Scope

- Generating descriptions with AI at runtime (descriptions are static SQL data)
- Video tutorials or multi-step illustrated instructions
- Redesigning GesturesScreen (the main learning hub with progress/streaks)
- Adding new gestures beyond the existing 20
