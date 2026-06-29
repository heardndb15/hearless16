# Polar.sh Payments & Feature Gating — Hearless

**Date:** 2026-06-29
**Scope:** Интеграция Polar.sh + ограничение функций по тарифу

## Тарифы

| Функция | Free | Basic (990 ₸/мес) | Pro (2490 ₸/мес) |
|---|---|---|---|
| Субтитры | 30 мин/день | 2 часа/день | Без лимита |
| Базовые уроки жестов | ✓ | ✓ | ✓ |
| Уроки среднего уровня | ✗ | ✓ | ✓ |
| Полный курс жестов | ✗ | ✗ | ✓ |
| История субтитров | ✗ | ✓ | ✓ |
| Тесты и прогресс | ✗ | ✗ | ✓ |
| Приоритетная поддержка | ✗ | ✗ | ✓ |

## Checkout flow

1. Пользователь нажимает "Выбрать Basic/Pro" в PaywallScreen
2. Приложение открывает браузер: Polar checkout URL + `?metadata[user_id]={supabase_uid}`
3. Пользователь оплачивает на странице Polar
4. Polar редиректит на `hearless://payment-success`
5. App.tsx перехватывает deep link → вызывает `refreshSubscription()`
6. Приложение обновляет план и открывает закрытые функции

## База данных

Миграция к таблице `users`:
```sql
ALTER TABLE users
  ADD COLUMN plan TEXT NOT NULL DEFAULT 'free'
    CHECK (plan IN ('free', 'basic', 'pro')),
  ADD COLUMN plan_expires_at TIMESTAMPTZ NULL,
  ADD COLUMN polar_customer_id TEXT NULL;
```

## Бэкенд

### Новые env переменные (`backend/.env`)
```
POLAR_ACCESS_TOKEN=...
POLAR_WEBHOOK_SECRET=...
POLAR_BASIC_PRODUCT_ID=6ef2aa09-da31-4355-a4a7-312d5e7ac632
POLAR_PRO_PRODUCT_ID=29b406fc-ff67-4ce3-8b59-ea628a37a5d3
```

### `backend/app/config.py`
Добавить чтение четырёх Polar переменных из os.getenv.

### `backend/app/routes/polar.py` (новый файл)

**`POST /polar/webhook`**
- Читает тело запроса как bytes
- Проверяет `X-Polar-Signature-256` через HMAC-SHA256 с `POLAR_WEBHOOK_SECRET`
- Если подпись неверна → 403
- Обрабатывает события:
  - `subscription.created` / `subscription.updated`:
    - `product_id == POLAR_BASIC_PRODUCT_ID` → `plan = 'basic'`
    - `product_id == POLAR_PRO_PRODUCT_ID` → `plan = 'pro'`
    - `plan_expires_at = event.data.current_period_end`
    - `polar_customer_id = event.data.customer_id`
    - UPDATE users SET plan, plan_expires_at, polar_customer_id WHERE id = metadata['user_id']
  - `subscription.canceled` / `subscription.revoked`:
    - UPDATE users SET plan='free', plan_expires_at=NULL WHERE id = metadata['user_id']
- Возвращает `{"ok": true}`

### `backend/app/routes/users.py`

**`GET /users/me`** (новый эндпоинт)
- Требует авторизацию (`get_current_user`)
- Читает из таблицы `users`: `plan`, `plan_expires_at`, `name`
- Если `plan_expires_at < now()` → возвращает `plan = 'free'` (даунгрейд на лету)
- Возвращает `{ id, email, name, plan, plan_expires_at }`

### `backend/app/dependencies.py`
`get_current_user` обогащается планом: делает SELECT plan FROM users WHERE id=... и добавляет `plan` в возвращаемый dict.

### `backend/app/main.py`
Подключить `polar.router` с префиксом `/polar`.

## Мобайл

### `mobile/src/services/subscription.ts` (новый файл)

```typescript
type Plan = 'free' | 'basic' | 'pro'

interface Subscription {
  plan: Plan
  plan_expires_at: string | null
}

// Кэш на 5 минут
let cache: { data: Subscription; at: number } | null = null

async function getSubscription(token: string): Promise<Subscription>
async function refreshSubscription(token: string): Promise<Subscription>
async function openCheckout(plan: 'basic' | 'pro', userId: string): Promise<void>

// Лимиты субтитров в секундах
export const SUBTITLE_LIMITS: Record<Plan, number> = {
  free: 1800,    // 30 мин
  basic: 7200,   // 2 часа
  pro: Infinity,
}
```

`openCheckout` открывает Polar checkout URL через `Linking.openURL` с параметром `?metadata[user_id]=...&success_url=hearless://payment-success`.

### `mobile/src/hooks/useSubscription.ts` (новый файл)

```typescript
function useSubscription(): { plan: Plan; loading: boolean; refresh: () => void }
```

Внутри:
- Вызывает `getSubscription(token)` при монтировании
- Использует токен из `supabase.auth.getSession()`
- Если не авторизован → `plan = 'free'`

### `mobile/src/hooks/useSubtitleTimer.ts` (новый файл)

```typescript
function useSubtitleTimer(plan: Plan): {
  remainingSeconds: number
  recordUsage: (seconds: number) => Promise<void>
  isLimitReached: boolean
}
```

- Ключ AsyncStorage: `hearless:subtitle_usage:YYYY-MM-DD`
- При старте читает накопленное время за сегодня
- `recordUsage(n)` добавляет n секунд к счётчику
- `isLimitReached = used >= SUBTITLE_LIMITS[plan]`
- Для `pro` всегда `isLimitReached = false`

### `mobile/app.json`
Добавить deep link схему:
```json
{
  "expo": {
    "scheme": "hearless"
  }
}
```

### `mobile/App.tsx`
Добавить `Linking.addEventListener('url', handler)` — при получении `hearless://payment-success` вызывает `refreshSubscription()`.

### `mobile/src/components/PremiumGate.tsx` (новый файл)

```typescript
interface PremiumGateProps {
  requiredPlan: 'basic' | 'pro'
  children: ReactNode
  fallback?: ReactNode  // опционально — кастомная заглушка
}
```

Если `plan` пользователя не соответствует `requiredPlan` → рендерит заглушку с кнопкой "Улучшить план" (открывает PaywallScreen). Иначе — рендерит `children`.

### `mobile/src/screens/PaywallScreen.tsx` (новый файл)

Экран с двумя карточками (Basic / Pro):
- Список фич каждого тарифа
- Кнопка "Выбрать" → `openCheckout(plan, userId)`
- Кнопка "Закрыть" / стрелка назад

Открывается через `navigation.navigate('Paywall')` из `PremiumGate` или при исчерпании лимита субтитров.

### `mobile/src/navigation` (изменение)
Добавить `Paywall` в `RootStackParamList` и `Stack.Screen` в `App.tsx`.

## Где применяются gates

| Экран | Gate | requiredPlan |
|---|---|---|
| SubtitlesScreen | таймер исчерпан → PaywallScreen | basic / pro |
| GesturesScreen | уроки среднего уровня | basic |
| GesturesScreen | полный курс | pro |
| StudyScreen | история лекций | basic |
| StudyScreen | тесты и прогресс | pro |

## Порядок реализации

1. Миграция БД (ALTER TABLE users)
2. Бэкенд: config, polar.py, users/me, dependencies
3. Мобайл: subscription.ts, useSubscription, useSubtitleTimer
4. Мобайл: deep link (app.json + App.tsx)
5. Мобайл: PaywallScreen + PremiumGate
6. Мобайл: применить gates в существующих экранах
