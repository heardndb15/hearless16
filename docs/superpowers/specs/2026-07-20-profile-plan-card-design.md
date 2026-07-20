# Карточка тарифа в личном кабинете (web) — Hearless

**Date:** 2026-07-20
**Scope:** Показать текущий тариф пользователя на `/dashboard/profile` (landing web) с переходом на тарифы, без выхода из аккаунта.

## Проблема

В веб-личном кабинете (`landing/app/dashboard/**`) нигде не видно текущего плана и нет ссылки на тарифы. Единственный способ увидеть тарифы/оформить оплату — публичная страница `/pricing`, до которой из кабинета нет прямого перехода. Мобильное приложение в этом плане уже устроено правильно: `PaywallScreen` работает прямо внутри приложения.

## Решение

Добавить карточку "Тариф" на `landing/app/dashboard/profile/page.tsx`, над существующей карточкой настроек профиля.

### Данные

`ProfilePage` уже делает при монтировании:
```ts
supabase.from("users").select("name, bio, avatar_url, language").eq("id", session.user.id).single()
```
Добавить в select `plan, plan_expires_at` (колонки существуют в БД, заполняются Polar-вебхуком — см. `backend/app/routes/polar.py`). Новый локальный state:
```ts
const [plan, setPlan] = useState<"free" | "basic" | "pro">("free");
const [planExpiresAt, setPlanExpiresAt] = useState<string | null>(null);
```
Если `profile.plan` отсутствует/`null` — считается `"free"`.

### UI

Новая карточка, стиль идентичен существующей (`bg-[#12182A]/40 backdrop-blur-xl border border-white/10 shadow-xl rounded-2xl p-6 md:p-8`), размещается перед блоком настроек, внутри того же `<div className="space-y-8">`.

Содержимое (flex-row, space-between):
- Слева:
  - Лейбл мелким текстом: "Текущий тариф"
  - Название плана крупным текстом (`font-syne font-extrabold text-2xl`): "Free" / "Basic" / "Pro"
  - Если `plan !== "free"` и `planExpiresAt` задан — строка мельче: `Продлится: {дата в формате DD.MM.YYYY}`
- Справа: кнопка-ссылка (`<Link href="/pricing">`), тот же стиль, что и primary-кнопка "Сохранить изменения" (`bg-accent`, `rounded-xl`, `font-syne font-bold`):
  - `plan === "free"` → текст "Улучшить план"
  - `plan !== "free"` → текст "Сменить тариф"

### Форматирование даты

Простая утилита инлайн (без новой зависимости):
```ts
new Date(planExpiresAt).toLocaleDateString("ru-RU", { day: "2-digit", month: "2-digit", year: "numeric" })
```

## Edge cases

- Пока `loading === true` — вся страница уже не рендерит контент (существующая ранняя `return`), новая карточка автоматически не показывается раньше времени.
- `plan_expires_at === null` (типично для `free`, либо активной подписки без даты) — строка с датой просто не рендерится.
- Supabase select не возвращает `plan` (ошибка/сеть) — остаётся дефолт `"free"`, ничего не ломается.

## Вне скоупа

- Отдельная страница/раздел "Тарифы" внутри кабинета — не делаем (обсуждали, выбран минимальный вариант со ссылкой на существующую `/pricing`).
- Управление/отмена подписки из кабинета — не делаем, это отдельная фича.
- Мобильное приложение не трогаем — там `PaywallScreen` уже показывает текущий флоу через `useSubscription`.
