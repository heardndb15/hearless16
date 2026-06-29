# Polar.sh Payments & Feature Gating — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Подключить Polar.sh для оплаты подписок Basic/Pro и заблокировать premium-функции для free-пользователей.

**Architecture:** Polar checkout открывается в браузере через URL, созданный бэкендом. После оплаты Polar присылает вебхук на `/polar/webhook`, бэкенд обновляет поле `plan` в таблице `users`. Мобайл читает план через `GET /users/me` и кэширует в памяти. Лимит субтитров хранится в AsyncStorage.

**Tech Stack:** FastAPI (Python), React Native / Expo 51, Supabase (PostgreSQL), Polar.sh API, standard-webhooks, httpx

## Global Constraints

- Python backend: FastAPI async, psycopg2 для миграций, supabase-py для операций с БД
- Mobile: React Native 0.74.3, Expo 51, TypeScript строгий
- Polar product IDs: Basic = `6ef2aa09-da31-4355-a4a7-312d5e7ac632`, Pro = `29b406fc-ff67-4ce3-8b59-ea628a37a5d3`
- Deep link scheme: `hearless://`
- Все тексты на русском языке
- Цены: Basic 990 ₸/мес, Pro 2 490 ₸/мес
- `plan` поле: `'free' | 'basic' | 'pro'` (DEFAULT 'free')

---

### Task 1: Backend — зависимости + миграция + config

**Files:**
- Modify: `backend/requirements.txt`
- Modify: `backend/app/config.py`
- Modify: `backend/app/migrate.py`

**Interfaces:**
- Produces: `POLAR_ACCESS_TOKEN`, `POLAR_WEBHOOK_SECRET`, `POLAR_BASIC_PRODUCT_ID`, `POLAR_PRO_PRODUCT_ID` доступны через `from app.config import ...`
- Produces: колонка `polar_customer_id TEXT` в таблице `users`

- [ ] **Step 1: Добавить зависимости в requirements.txt**

```
fastapi>=0.110.0,<1.0.0
psycopg2-binary>=2.9.9
slowapi>=0.1.9
uvicorn[standard]>=0.29.0,<1.0.0
supabase>=2.5.0,<3.0.0
python-multipart>=0.0.9
pydantic>=2.5.0,<3.0.0
openai>=1.35.0,<2.0.0
python-dotenv>=1.0.1
websockets>=12.0
numpy>=1.26.0
pydub>=0.25.1
audioop-lts
faster-whisper>=1.0.0
mediapipe>=0.10.0
standard-webhooks>=1.0.0
httpx>=0.27.0
```

- [ ] **Step 2: Обновить config.py**

Полная замена файла `backend/app/config.py`:

```python
import os
from dotenv import load_dotenv

load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL", "")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_KEY", "")
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "")

POLAR_ACCESS_TOKEN = os.getenv("POLAR_ACCESS_TOKEN", "")
POLAR_WEBHOOK_SECRET = os.getenv("POLAR_WEBHOOK_SECRET", "")
POLAR_BASIC_PRODUCT_ID = os.getenv("POLAR_BASIC_PRODUCT_ID", "")
POLAR_PRO_PRODUCT_ID = os.getenv("POLAR_PRO_PRODUCT_ID", "")
```

- [ ] **Step 3: Добавить миграцию polar_customer_id в migrate.py**

В список `_MIGRATIONS` после блока `ADD COLUMN IF NOT EXISTS plan` (после строки 28) добавить новый элемент:

```python
    """
    ALTER TABLE users
      ADD COLUMN IF NOT EXISTS polar_customer_id TEXT
    """,
```

- [ ] **Step 4: Проверить вручную**

Запусти бэкенд локально и убедись что config импортируется без ошибок:
```bash
cd backend
python -c "from app.config import POLAR_ACCESS_TOKEN, POLAR_WEBHOOK_SECRET; print('ok')"
```
Ожидается: `ok`

- [ ] **Step 5: Commit**

```bash
git add backend/requirements.txt backend/app/config.py backend/app/migrate.py
git commit -m "feat: add Polar config vars and polar_customer_id migration"
```

---

### Task 2: Backend — Polar webhook + checkout роут

**Files:**
- Create: `backend/app/routes/polar.py`
- Modify: `backend/app/main.py`

**Interfaces:**
- Consumes: `POLAR_ACCESS_TOKEN`, `POLAR_WEBHOOK_SECRET`, `POLAR_BASIC_PRODUCT_ID`, `POLAR_PRO_PRODUCT_ID` из `app.config`
- Consumes: `get_current_user` из `app.dependencies`
- Produces: `POST /polar/webhook` — публичный эндпоинт для Polar
- Produces: `POST /polar/checkout` — защищённый эндпоинт, возвращает `{ "url": str }`

- [ ] **Step 1: Создать backend/app/routes/polar.py**

```python
import hashlib
import hmac
import time
import base64
from datetime import datetime, timezone

import httpx
from fastapi import APIRouter, HTTPException, Request, Depends
from pydantic import BaseModel

from app.config import (
    POLAR_ACCESS_TOKEN,
    POLAR_WEBHOOK_SECRET,
    POLAR_BASIC_PRODUCT_ID,
    POLAR_PRO_PRODUCT_ID,
)
from app.database import get_supabase
from app.dependencies import get_current_user

router = APIRouter(prefix="/polar", tags=["polar"])

POLAR_API = "https://api.polar.sh"


def _verify_webhook_signature(body: bytes, headers: dict) -> bool:
    msg_id = headers.get("webhook-id", "")
    msg_ts = headers.get("webhook-timestamp", "")
    msg_sig = headers.get("webhook-signature", "")

    if not msg_id or not msg_ts or not msg_sig:
        return False

    try:
        ts = int(msg_ts)
        if abs(time.time() - ts) > 300:
            return False
    except (ValueError, TypeError):
        return False

    signed = f"{msg_id}.{msg_ts}.{body.decode('utf-8')}"
    try:
        secret_bytes = base64.b64decode(POLAR_WEBHOOK_SECRET)
    except Exception:
        # Secret not base64 — use raw bytes
        secret_bytes = POLAR_WEBHOOK_SECRET.encode()

    digest = base64.b64encode(
        hmac.new(secret_bytes, signed.encode(), hashlib.sha256).digest()
    ).decode()
    expected = f"v1,{digest}"

    for sig in msg_sig.split(" "):
        if hmac.compare_digest(sig.strip(), expected):
            return True
    return False


@router.post("/webhook")
async def polar_webhook(request: Request):
    body = await request.body()

    if not _verify_webhook_signature(body, dict(request.headers)):
        raise HTTPException(status_code=403, detail="Invalid webhook signature")

    import json
    event = json.loads(body)
    event_type = event.get("type", "")
    data = event.get("data", {})

    user_id = (data.get("metadata") or {}).get("user_id")
    if not user_id:
        return {"ok": True, "skipped": "no user_id in metadata"}

    db = get_supabase()

    if event_type in ("subscription.created", "subscription.updated", "subscription.active"):
        product_id = data.get("product_id", "")
        if product_id == POLAR_BASIC_PRODUCT_ID:
            plan = "basic"
        elif product_id == POLAR_PRO_PRODUCT_ID:
            plan = "pro"
        else:
            return {"ok": True, "skipped": f"unknown product_id: {product_id}"}

        ends_at = data.get("current_period_end") or data.get("ends_at")
        customer_id = data.get("customer_id", "")

        db.table("users").update({
            "plan": plan,
            "plan_expires_at": ends_at,
            "polar_customer_id": customer_id,
        }).eq("id", user_id).execute()

    elif event_type in ("subscription.canceled", "subscription.revoked"):
        db.table("users").update({
            "plan": "free",
            "plan_expires_at": None,
        }).eq("id", user_id).execute()

    return {"ok": True}


class CheckoutRequest(BaseModel):
    plan: str  # "basic" | "pro"


@router.post("/checkout")
async def create_checkout(
    data: CheckoutRequest,
    current_user: dict = Depends(get_current_user),
):
    if data.plan == "basic":
        product_id = POLAR_BASIC_PRODUCT_ID
    elif data.plan == "pro":
        product_id = POLAR_PRO_PRODUCT_ID
    else:
        raise HTTPException(status_code=400, detail="Invalid plan")

    if not POLAR_ACCESS_TOKEN:
        raise HTTPException(status_code=503, detail="Polar not configured")

    async with httpx.AsyncClient() as client:
        resp = await client.post(
            f"{POLAR_API}/v1/checkouts/custom",
            headers={
                "Authorization": f"Bearer {POLAR_ACCESS_TOKEN}",
                "Content-Type": "application/json",
            },
            json={
                "product_id": product_id,
                "metadata": {"user_id": current_user["id"]},
                "success_url": "hearless://payment-success",
            },
            timeout=15.0,
        )

    if resp.status_code != 201:
        raise HTTPException(status_code=502, detail=f"Polar error: {resp.text[:200]}")

    url = resp.json().get("url")
    if not url:
        raise HTTPException(status_code=502, detail="Polar returned no checkout URL")

    return {"url": url}
```

- [ ] **Step 2: Зарегистрировать роутер в main.py**

В `backend/app/main.py` добавить импорт и регистрацию после строки `from app.routes import users, subtitles, gestures, alerts, transcribe, sos, community`:

```python
from app.routes import users, subtitles, gestures, alerts, transcribe, sos, community, polar
```

И после `app.include_router(community.router, prefix="/community")`:

```python
app.include_router(polar.router)
```

- [ ] **Step 3: Проверить вручную**

```bash
cd backend
python -c "from app.routes.polar import router; print('ok')"
```
Ожидается: `ok`

- [ ] **Step 4: Commit**

```bash
git add backend/app/routes/polar.py backend/app/main.py
git commit -m "feat: add Polar webhook handler and checkout endpoint"
```

---

### Task 3: Backend — GET /users/me + обогащение get_current_user

**Files:**
- Modify: `backend/app/routes/users.py`
- Modify: `backend/app/dependencies.py`

**Interfaces:**
- Produces: `GET /users/me` → `{ id, email, name, plan, plan_expires_at }`
- Produces: `get_current_user` возвращает dict с ключом `plan: str`

- [ ] **Step 1: Добавить GET /users/me в users.py**

В конец файла `backend/app/routes/users.py` добавить:

```python
from datetime import datetime, timezone


@router.get("/me")
async def get_me(current_user: dict = Depends(get_current_user)):
    db = get_supabase()
    result = db.table("users").select("name, plan, plan_expires_at").eq("id", current_user["id"]).single().execute()
    
    row = result.data or {}
    plan = row.get("plan", "free")
    expires = row.get("plan_expires_at")

    # Downgrade if subscription expired
    if expires:
        try:
            exp_dt = datetime.fromisoformat(expires.replace("Z", "+00:00"))
            if exp_dt < datetime.now(timezone.utc):
                plan = "free"
        except Exception:
            pass

    return {
        "id": current_user["id"],
        "email": current_user["email"],
        "name": row.get("name", ""),
        "plan": plan,
        "plan_expires_at": expires,
    }
```

- [ ] **Step 2: Обогатить get_current_user в dependencies.py**

Полная замена файла `backend/app/dependencies.py`:

```python
from fastapi import HTTPException, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from app.database import get_supabase

security = HTTPBearer(auto_error=False)


async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)) -> dict:
    if not credentials:
        raise HTTPException(status_code=401, detail="Отсутствует токен авторизации")

    token = credentials.credentials
    db = get_supabase()

    try:
        user_res = db.auth.get_user(token)
    except Exception as e:
        raise HTTPException(status_code=401, detail=f"Ошибка авторизации: {str(e)}")

    if not user_res or not getattr(user_res, "user", None):
        raise HTTPException(status_code=401, detail="Неверный или просроченный токен авторизации")

    user = user_res.user

    # Fetch plan from users table
    try:
        result = db.table("users").select("plan").eq("id", user.id).single().execute()
        plan = (result.data or {}).get("plan", "free")
    except Exception:
        plan = "free"

    return {"id": user.id, "email": user.email, "plan": plan}
```

- [ ] **Step 3: Проверить вручную**

```bash
python -c "from app.dependencies import get_current_user; from app.routes.users import router; print('ok')"
```
Ожидается: `ok`

- [ ] **Step 4: Commit**

```bash
git add backend/app/routes/users.py backend/app/dependencies.py
git commit -m "feat: add GET /users/me with plan and enrich get_current_user"
```

---

### Task 4: Mobile — типы + subscription service

**Files:**
- Modify: `shared/types.ts`
- Create: `mobile/src/services/subscription.ts`

**Interfaces:**
- Produces: `Plan = 'free' | 'basic' | 'pro'`
- Produces: `SUBTITLE_LIMITS: Record<Plan, number>`
- Produces: `getSubscription(token: string): Promise<SubscriptionInfo>`
- Produces: `refreshSubscription(token: string): Promise<SubscriptionInfo>`
- Produces: `openCheckout(plan: 'basic' | 'pro', token: string): Promise<void>`
- Produces: `Paywall` в `RootStackParamList`

- [ ] **Step 1: Обновить shared/types.ts — добавить Plan и Paywall**

В конец файла `shared/types.ts` (перед закрывающей скобкой `RootStackParamList`) добавить `Paywall`:

```typescript
export type Plan = 'free' | 'basic' | 'pro';

export interface SubscriptionInfo {
  plan: Plan;
  plan_expires_at: string | null;
}
```

И в `RootStackParamList` добавить строку:
```typescript
export type RootStackParamList = {
  Tabs: undefined;
  GesturePractice: { gestureId: string; gestureName: string };
  GestureDictionary: undefined;
  PostDetail: { post: PostResponse };
  CreatePost: undefined;
  Paywall: { requiredPlan?: 'basic' | 'pro' };
};
```

- [ ] **Step 2: Создать mobile/src/services/subscription.ts**

```typescript
import axios from "axios";
import { Linking } from "react-native";
import type { Plan, SubscriptionInfo } from "../../../shared/types";

const API_URL = process.env.EXPO_PUBLIC_API_URL || "https://hearless16-1.onrender.com";
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

export const SUBTITLE_LIMITS: Record<Plan, number> = {
  free: 30 * 60,      // 1800 sec
  basic: 2 * 60 * 60, // 7200 sec
  pro: Infinity,
};

let _cache: { data: SubscriptionInfo; at: number } | null = null;

export async function getSubscription(token: string): Promise<SubscriptionInfo> {
  if (_cache && Date.now() - _cache.at < CACHE_TTL) {
    return _cache.data;
  }
  return refreshSubscription(token);
}

export async function refreshSubscription(token: string): Promise<SubscriptionInfo> {
  try {
    const res = await axios.get<SubscriptionInfo>(`${API_URL}/users/me`, {
      headers: { Authorization: `Bearer ${token}` },
      timeout: 10000,
    });
    _cache = { data: res.data, at: Date.now() };
    return res.data;
  } catch {
    const fallback: SubscriptionInfo = { plan: "free", plan_expires_at: null };
    return fallback;
  }
}

export function invalidateSubscriptionCache(): void {
  _cache = null;
}

export async function openCheckout(plan: "basic" | "pro", token: string): Promise<void> {
  const res = await axios.post<{ url: string }>(
    `${API_URL}/polar/checkout`,
    { plan },
    { headers: { Authorization: `Bearer ${token}` }, timeout: 15000 }
  );
  await Linking.openURL(res.data.url);
}
```

- [ ] **Step 3: Проверить TypeScript компиляцию**

```bash
cd mobile
npx tsc --noEmit
```
Ожидается: 0 ошибок (или только pre-existing ошибки, не связанные с новыми файлами)

- [ ] **Step 4: Commit**

```bash
git add shared/types.ts mobile/src/services/subscription.ts
git commit -m "feat: add Plan types and subscription service"
```

---

### Task 5: Mobile — хуки useSubscription и useSubtitleTimer

**Files:**
- Create: `mobile/src/hooks/useSubscription.ts`
- Create: `mobile/src/hooks/useSubtitleTimer.ts`

**Interfaces:**
- Consumes: `getSubscription`, `refreshSubscription` из `../services/subscription`
- Consumes: `SUBTITLE_LIMITS` из `../services/subscription`
- Produces: `useSubscription(): { plan: Plan; loading: boolean; token: string; refresh: () => void }`
- Produces: `useSubtitleTimer(plan: Plan): { remainingSeconds: number; recordUsage: (sec: number) => Promise<void>; isLimitReached: boolean }`

- [ ] **Step 1: Создать mobile/src/hooks/useSubscription.ts**

```typescript
import { useState, useEffect, useCallback } from "react";
import { supabase } from "../services/supabase";
import { getSubscription, refreshSubscription, invalidateSubscriptionCache } from "../services/subscription";
import type { Plan } from "../../../shared/types";

export function useSubscription(): {
  plan: Plan;
  loading: boolean;
  token: string;
  refresh: () => void;
} {
  const [plan, setPlan] = useState<Plan>("free");
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState("");

  const load = useCallback(async (tok: string) => {
    if (!tok) {
      setPlan("free");
      setLoading(false);
      return;
    }
    const sub = await getSubscription(tok);
    setPlan(sub.plan);
    setLoading(false);
  }, []);

  const refresh = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    const tok = session?.access_token ?? "";
    invalidateSubscriptionCache();
    const sub = await refreshSubscription(tok);
    setPlan(sub.plan);
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      const tok = session?.access_token ?? "";
      setToken(tok);
      load(tok);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_OUT") {
        setToken("");
        setPlan("free");
        setLoading(false);
      } else if (session?.access_token) {
        setToken(session.access_token);
        load(session.access_token);
      }
    });

    return () => subscription.unsubscribe();
  }, [load]);

  return { plan, loading, token, refresh };
}
```

- [ ] **Step 2: Создать mobile/src/hooks/useSubtitleTimer.ts**

```typescript
import { useState, useEffect } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { SUBTITLE_LIMITS } from "../services/subscription";
import type { Plan } from "../../../shared/types";

function todayKey(): string {
  return `hearless:subtitle_usage:${new Date().toISOString().slice(0, 10)}`;
}

export function useSubtitleTimer(plan: Plan): {
  remainingSeconds: number;
  recordUsage: (seconds: number) => Promise<void>;
  isLimitReached: boolean;
} {
  const limit = SUBTITLE_LIMITS[plan];
  const [usedSeconds, setUsedSeconds] = useState(0);

  useEffect(() => {
    AsyncStorage.getItem(todayKey()).then((val) => {
      setUsedSeconds(val ? parseInt(val, 10) : 0);
    });
  }, []);

  const recordUsage = async (seconds: number) => {
    const next = usedSeconds + seconds;
    setUsedSeconds(next);
    await AsyncStorage.setItem(todayKey(), String(next));
  };

  const remaining = limit === Infinity ? Infinity : Math.max(0, limit - usedSeconds);
  const isLimitReached = limit !== Infinity && usedSeconds >= limit;

  return {
    remainingSeconds: remaining,
    recordUsage,
    isLimitReached,
  };
}
```

- [ ] **Step 3: Проверить TypeScript**

```bash
cd mobile
npx tsc --noEmit
```
Ожидается: 0 новых ошибок

- [ ] **Step 4: Commit**

```bash
git add mobile/src/hooks/useSubscription.ts mobile/src/hooks/useSubtitleTimer.ts
git commit -m "feat: add useSubscription and useSubtitleTimer hooks"
```

---

### Task 6: Mobile — deep link (app.json + App.tsx)

**Files:**
- Modify: `mobile/app.json`
- Modify: `mobile/App.tsx`

**Interfaces:**
- Consumes: `invalidateSubscriptionCache`, `refreshSubscription` из `mobile/src/services/subscription`
- Produces: `hearless://payment-success` открывает приложение и обновляет план

- [ ] **Step 1: Добавить scheme в app.json**

Заменить содержимое `mobile/app.json`:

```json
{
  "expo": {
    "name": "Hearless",
    "slug": "hearless",
    "version": "1.0.0",
    "scheme": "hearless",
    "orientation": "portrait",
    "icon": "./assets/icon.png",
    "userInterfaceStyle": "automatic",
    "splash": {
      "backgroundColor": "#f3f8fc"
    },
    "assetBundlePatterns": ["**/*"],
    "ios": {
      "supportsTablet": true,
      "bundleIdentifier": "com.hearless.app"
    },
    "android": {
      "adaptiveIcon": {
        "backgroundColor": "#f3f8fc"
      },
      "package": "com.hearless.app"
    },
    "plugins": [
      "expo-av",
      [
        "expo-camera",
        {
          "cameraPermission": "Разрешите Hearless доступ к камере для распознавания жестов"
        }
      ]
    ]
  }
}
```

- [ ] **Step 2: Добавить deep link handler в App.tsx**

Заменить содержимое `mobile/App.tsx`:

```typescript
import React, { useEffect, useRef } from "react";
import { View, StyleSheet, Linking } from "react-native";
import { StatusBar } from "expo-status-bar";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { SafeAreaProvider } from "react-native-safe-area-context";
import TabNavigator from "./src/navigation/TabNavigator";
import GesturePracticeScreen from "./src/screens/GesturePracticeScreen";
import GestureDictionaryScreen from "./src/screens/GestureDictionaryScreen";
import PostDetailScreen from "./src/screens/PostDetailScreen";
import CreatePostScreen from "./src/screens/CreatePostScreen";
import PaywallScreen from "./src/screens/PaywallScreen";
import { OfflineBanner } from "./src/components/OfflineBanner";
import { useNetworkStatus } from "./src/hooks/useNetworkStatus";
import { invalidateSubscriptionCache, refreshSubscription } from "./src/services/subscription";
import { supabase } from "./src/services/supabase";
import type { RootStackParamList } from "../shared/types";

const Stack = createNativeStackNavigator<RootStackParamList>();

function AppNavigator() {
  const isOnline = useNetworkStatus();

  useEffect(() => {
    const handleUrl = async (url: string) => {
      if (url.startsWith("hearless://payment-success")) {
        invalidateSubscriptionCache();
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.access_token) {
          await refreshSubscription(session.access_token);
        }
      }
    };

    // Handle deep link when app is already open
    const subscription = Linking.addEventListener("url", ({ url }) => handleUrl(url));

    // Handle deep link that opened the app from cold start
    Linking.getInitialURL().then((url) => {
      if (url) handleUrl(url);
    });

    return () => subscription.remove();
  }, []);

  return (
    <View style={styles.root}>
      <OfflineBanner visible={!isOnline} />
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Tabs" component={TabNavigator} />
        <Stack.Screen
          name="GesturePractice"
          component={GesturePracticeScreen}
          options={{
            animation: "slide_from_bottom",
            headerShown: true,
            headerTitle: "Практика жеста",
            headerTintColor: "#ffffff",
            headerStyle: { backgroundColor: "#0277BD" },
          }}
        />
        <Stack.Screen
          name="GestureDictionary"
          component={GestureDictionaryScreen}
          options={{ animation: "slide_from_right", headerShown: false }}
        />
        <Stack.Screen
          name="PostDetail"
          component={PostDetailScreen}
          options={{ animation: "slide_from_right", headerShown: false }}
        />
        <Stack.Screen
          name="CreatePost"
          component={CreatePostScreen}
          options={{ animation: "slide_from_bottom", headerShown: false }}
        />
        <Stack.Screen
          name="Paywall"
          component={PaywallScreen}
          options={{ animation: "slide_from_bottom", headerShown: false }}
        />
      </Stack.Navigator>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
});

export default function App() {
  return (
    <SafeAreaProvider>
      <NavigationContainer>
        <StatusBar style="auto" />
        <AppNavigator />
      </NavigationContainer>
    </SafeAreaProvider>
  );
}
```

- [ ] **Step 3: Проверить TypeScript**

```bash
cd mobile
npx tsc --noEmit
```
Ожидается: 0 новых ошибок

- [ ] **Step 4: Commit**

```bash
git add mobile/app.json mobile/App.tsx
git commit -m "feat: add deep link scheme and payment-success handler"
```

---

### Task 7: Mobile — PaywallScreen + PremiumGate

**Files:**
- Create: `mobile/src/screens/PaywallScreen.tsx`
- Create: `mobile/src/components/PremiumGate.tsx`

**Interfaces:**
- Consumes: `useSubscription` из `../hooks/useSubscription`
- Consumes: `openCheckout` из `../services/subscription`
- Produces: `<PaywallScreen>` — экран выбора тарифа
- Produces: `<PremiumGate requiredPlan="basic"|"pro">` — компонент-обёртка

- [ ] **Step 1: Создать mobile/src/screens/PaywallScreen.tsx**

```typescript
import React, { useState } from "react";
import {
  View, Text, TouchableOpacity, StyleSheet, SafeAreaView,
  ScrollView, ActivityIndicator, Alert,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { useSubscription } from "../hooks/useSubscription";
import { openCheckout } from "../services/subscription";

const PLANS = [
  {
    id: "basic" as const,
    name: "Basic",
    price: "990 ₸/мес",
    features: [
      "Субтитры до 2 часов в день",
      "Все базовые уроки жестов",
      "Уроки среднего уровня",
      "История субтитров",
    ],
    color: "#1565C0",
  },
  {
    id: "pro" as const,
    name: "Pro",
    price: "2 490 ₸/мес",
    features: [
      "Субтитры без ограничений",
      "Полный курс жестового языка",
      "Тесты и прогресс",
      "Приоритетная поддержка",
      "Ранний доступ к функциям",
    ],
    color: "#7B1FA2",
  },
];

export default function PaywallScreen() {
  const navigation = useNavigation();
  const { token } = useSubscription();
  const [loading, setLoading] = useState<"basic" | "pro" | null>(null);

  const handleSelect = async (plan: "basic" | "pro") => {
    if (!token) {
      Alert.alert("Войдите в аккаунт", "Для оформления подписки нужно войти в аккаунт.");
      return;
    }
    setLoading(plan);
    try {
      await openCheckout(plan, token);
    } catch {
      Alert.alert("Ошибка", "Не удалось открыть страницу оплаты. Попробуйте позже.");
    } finally {
      setLoading(null);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.closeBtn}>
          <Text style={styles.closeBtnText}>✕</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Улучшите план</Text>
        <Text style={styles.subtitle}>Разблокируйте все возможности Hearless</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {PLANS.map((plan) => (
          <View key={plan.id} style={[styles.card, { borderColor: plan.color }]}>
            <View style={[styles.cardHeader, { backgroundColor: plan.color }]}>
              <Text style={styles.planName}>{plan.name}</Text>
              <Text style={styles.planPrice}>{plan.price}</Text>
            </View>
            <View style={styles.cardBody}>
              {plan.features.map((f) => (
                <View key={f} style={styles.featureRow}>
                  <Text style={[styles.check, { color: plan.color }]}>✓</Text>
                  <Text style={styles.featureText}>{f}</Text>
                </View>
              ))}
              <TouchableOpacity
                style={[styles.selectBtn, { backgroundColor: plan.color }]}
                onPress={() => handleSelect(plan.id)}
                disabled={loading !== null}
              >
                {loading === plan.id ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <Text style={styles.selectBtnText}>Выбрать {plan.name}</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        ))}

        <Text style={styles.note}>
          Нажимая «Выбрать», вы перейдёте в браузер для оплаты. После успешной оплаты вернитесь в приложение.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F4F7FB" },
  header: { backgroundColor: "#1565C0", padding: 20, paddingTop: 16 },
  closeBtn: { alignSelf: "flex-end", padding: 4 },
  closeBtnText: { color: "white", fontSize: 18, fontWeight: "600" },
  title: { color: "white", fontSize: 24, fontWeight: "700", marginTop: 8 },
  subtitle: { color: "rgba(255,255,255,0.8)", fontSize: 14, marginTop: 4 },
  content: { padding: 16, gap: 16 },
  card: { backgroundColor: "white", borderRadius: 16, borderWidth: 2, overflow: "hidden", shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.07, shadowRadius: 12, elevation: 3 },
  cardHeader: { padding: 16 },
  planName: { color: "white", fontSize: 20, fontWeight: "700" },
  planPrice: { color: "rgba(255,255,255,0.9)", fontSize: 16, marginTop: 2 },
  cardBody: { padding: 16, gap: 10 },
  featureRow: { flexDirection: "row", alignItems: "flex-start", gap: 8 },
  check: { fontSize: 16, fontWeight: "700", lineHeight: 22 },
  featureText: { fontSize: 14, color: "#1A1A2E", flex: 1, lineHeight: 22 },
  selectBtn: { borderRadius: 12, padding: 14, alignItems: "center", marginTop: 8 },
  selectBtnText: { color: "white", fontWeight: "700", fontSize: 16 },
  note: { fontSize: 12, color: "#9CA3AF", textAlign: "center", lineHeight: 18, marginTop: 4 },
});
```

- [ ] **Step 2: Создать mobile/src/components/PremiumGate.tsx**

```typescript
import React, { ReactNode } from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { RootStackParamList, Plan } from "../../../shared/types";

interface PremiumGateProps {
  requiredPlan: "basic" | "pro";
  currentPlan: Plan;
  children: ReactNode;
  fallback?: ReactNode;
}

const PLAN_RANK: Record<Plan, number> = { free: 0, basic: 1, pro: 2 };

export function PremiumGate({ requiredPlan, currentPlan, children, fallback }: PremiumGateProps) {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  const hasAccess = PLAN_RANK[currentPlan] >= PLAN_RANK[requiredPlan];
  if (hasAccess) return <>{children}</>;

  if (fallback) return <>{fallback}</>;

  const planLabel = requiredPlan === "basic" ? "Basic (990 ₸/мес)" : "Pro (2 490 ₸/мес)";

  return (
    <View style={styles.container}>
      <Text style={styles.lock}>🔒</Text>
      <Text style={styles.title}>Требуется план {planLabel}</Text>
      <Text style={styles.subtitle}>Улучшите подписку чтобы получить доступ</Text>
      <TouchableOpacity
        style={styles.btn}
        onPress={() => navigation.navigate("Paywall", { requiredPlan })}
      >
        <Text style={styles.btnText}>Улучшить план</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: "center", justifyContent: "center", padding: 32, gap: 12 },
  lock: { fontSize: 48 },
  title: { fontSize: 18, fontWeight: "700", color: "#1A1A2E", textAlign: "center" },
  subtitle: { fontSize: 14, color: "#9CA3AF", textAlign: "center", lineHeight: 20 },
  btn: { marginTop: 8, backgroundColor: "#1565C0", paddingHorizontal: 32, paddingVertical: 14, borderRadius: 16 },
  btnText: { color: "white", fontWeight: "700", fontSize: 16 },
});
```

- [ ] **Step 3: Проверить TypeScript**

```bash
cd mobile
npx tsc --noEmit
```
Ожидается: 0 новых ошибок

- [ ] **Step 4: Commit**

```bash
git add mobile/src/screens/PaywallScreen.tsx mobile/src/components/PremiumGate.tsx
git commit -m "feat: add PaywallScreen and PremiumGate component"
```

---

### Task 8: Mobile — лимит субтитров в SubtitlesScreen

**Files:**
- Modify: `mobile/src/screens/SubtitlesScreen.tsx`

**Interfaces:**
- Consumes: `useSubscription` из `../hooks/useSubscription`
- Consumes: `useSubtitleTimer` из `../hooks/useSubtitleTimer`

- [ ] **Step 1: Добавить импорты в SubtitlesScreen.tsx**

После строки `import { StatusBar } from "expo-status-bar";` добавить:

```typescript
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useSubscription } from "../hooks/useSubscription";
import { useSubtitleTimer } from "../hooks/useSubtitleTimer";
import type { RootStackParamList } from "../../../shared/types";
```

- [ ] **Step 2: Добавить хуки и логику в компонент SubtitlesScreen**

В начало функции `SubtitlesScreen` (после строки `export default function SubtitlesScreen() {`) добавить:

```typescript
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { plan } = useSubscription();
  const { remainingSeconds, recordUsage, isLimitReached } = useSubtitleTimer(plan);

  // Track recording duration
  const recordingStartRef = React.useRef<number | null>(null);

  React.useEffect(() => {
    if (isRecording) {
      recordingStartRef.current = Date.now();
    } else if (recordingStartRef.current !== null) {
      const elapsed = Math.floor((Date.now() - recordingStartRef.current) / 1000);
      recordUsage(elapsed);
      recordingStartRef.current = null;
    }
  }, [isRecording]);
```

- [ ] **Step 3: Заблокировать запись при исчерпании лимита**

Найти кнопку запуска записи в SubtitlesScreen (кнопка со `startStreaming` / `stopStreaming`). Обернуть её `onPress` логикой:

```typescript
onPress={() => {
  if (!isRecording && isLimitReached) {
    navigation.navigate("Paywall", { requiredPlan: "basic" });
    return;
  }
  isRecording ? stopStreaming() : startStreaming();
}}
```

- [ ] **Step 4: Показать остаток времени для free-пользователей**

В JSX над кнопкой записи добавить условный блок (показываем только для free/basic):

```typescript
{plan !== "pro" && remainingSeconds !== Infinity && (
  <Text style={styles.timerText}>
    {isLimitReached
      ? "Дневной лимит исчерпан"
      : `Осталось: ${Math.floor(remainingSeconds / 60)} мин`}
  </Text>
)}
```

И в `StyleSheet.create({...})` добавить:

```typescript
  timerText: {
    color: "rgba(255,255,255,0.8)",
    fontSize: 13,
    textAlign: "center",
    marginBottom: 8,
  },
```

- [ ] **Step 5: Проверить TypeScript**

```bash
cd mobile
npx tsc --noEmit
```
Ожидается: 0 новых ошибок

- [ ] **Step 6: Commit**

```bash
git add mobile/src/screens/SubtitlesScreen.tsx
git commit -m "feat: add subtitle daily usage limit based on plan"
```

---

### Task 9: Mobile — gate жестов по уровню в GesturesScreen

**Files:**
- Modify: `mobile/src/screens/GesturesScreen.tsx`

**Interfaces:**
- Consumes: `useSubscription` из `../hooks/useSubscription`
- Consumes: `PremiumGate` из `../components/PremiumGate`

Логика уровней:
- Free: только категория `"Базовые"` (отображается, остальные заблокированы)
- Basic: `"Базовые"`, `"Семья"`, `"Еда"`, `"Числа"`
- Pro: все включая `"Эмоции"`

- [ ] **Step 1: Добавить импорты**

После строки `import axios from "axios";` добавить:

```typescript
import { useSubscription } from "../hooks/useSubscription";
```

- [ ] **Step 2: Добавить хук и категории с уровнями доступа**

В начало функции компонента (где объявлен `GesturesScreen`) добавить:

```typescript
  const { plan } = useSubscription();

  const FREE_CATEGORIES = ["Базовые"];
  const BASIC_CATEGORIES = ["Базовые", "Семья", "Еда", "Числа"];
  // Pro gets all categories

  const isCategoryLocked = (category: string): boolean => {
    if (plan === "pro") return false;
    if (plan === "basic") return !BASIC_CATEGORIES.includes(category);
    return !FREE_CATEGORIES.includes(category);
  };

  const requiredPlanForCategory = (category: string): "basic" | "pro" => {
    if (BASIC_CATEGORIES.includes(category)) return "basic";
    return "pro";
  };
```

- [ ] **Step 3: Заблокировать недоступные категории в UI**

В месте где рендерится список категорий (кнопки фильтра), добавить визуальную индикацию замка для заблокированных:

```typescript
{CATEGORIES.filter(c => c !== "Все").map((cat) => {
  const locked = isCategoryLocked(cat);
  return (
    <TouchableOpacity
      key={cat}
      style={[styles.categoryBtn, selectedCategory === cat && styles.categoryBtnActive]}
      onPress={() => {
        if (locked) {
          navigation.navigate("Paywall", { requiredPlan: requiredPlanForCategory(cat) });
          return;
        }
        setSelectedCategory(cat);
      }}
    >
      <Text style={styles.categoryBtnText}>
        {locked ? "🔒 " : ""}{cat}
      </Text>
    </TouchableOpacity>
  );
})}
```

- [ ] **Step 4: Добавить импорт navigation**

```typescript
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../../../shared/types";
```

И в начале компонента:
```typescript
const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
```

- [ ] **Step 5: Проверить TypeScript**

```bash
cd mobile
npx tsc --noEmit
```
Ожидается: 0 новых ошибок

- [ ] **Step 6: Commit**

```bash
git add mobile/src/screens/GesturesScreen.tsx
git commit -m "feat: gate gesture categories by subscription plan"
```

---

### Task 10: Mobile — gate истории лекций в StudyScreen

**Files:**
- Modify: `mobile/src/screens/StudyScreen.tsx`

**Interfaces:**
- Consumes: `useSubscription` из `../hooks/useSubscription`
- Consumes: `PremiumGate` из `../components/PremiumGate`

Логика: Free-пользователи не видят список лекций (`viewMode === "list"`). При входе на экран их сразу переводим в `viewMode === "record"`. Список (`viewMode === "list"`) доступен только Basic+.

- [ ] **Step 1: Добавить импорты**

После `import type { StudyLecture } from "../../../shared/types";` добавить:

```typescript
import { useSubscription } from "../hooks/useSubscription";
import { PremiumGate } from "../components/PremiumGate";
```

- [ ] **Step 2: Добавить хук в компонент**

В начало функции `StudyScreen` добавить:

```typescript
  const { plan } = useSubscription();
  const canViewHistory = plan === "basic" || plan === "pro";
```

- [ ] **Step 3: Перенаправить free-пользователей на запись**

В `useEffect` где инициализируется `viewMode` (после `setUserId`) добавить:

```typescript
    if (!canViewHistory) {
      setViewMode("record");
      setLoading(false);
    }
```

- [ ] **Step 4: Обернуть список лекций в PremiumGate**

Найти JSX блок где рендерится список лекций (`viewMode === "list"`) и обернуть:

```typescript
{viewMode === "list" && (
  <PremiumGate requiredPlan="basic" currentPlan={plan}>
    {/* существующий JSX списка лекций */}
  </PremiumGate>
)}
```

- [ ] **Step 5: Скрыть кнопку "История" в навигации для free**

Если в StudyScreen есть кнопка переключения между "list" и "record", добавить:

```typescript
{canViewHistory && (
  <TouchableOpacity onPress={() => setViewMode("list")}>
    <Text>История</Text>
  </TouchableOpacity>
)}
```

- [ ] **Step 6: Проверить TypeScript**

```bash
cd mobile
npx tsc --noEmit
```
Ожидается: 0 новых ошибок

- [ ] **Step 7: Финальный коммит**

```bash
git add mobile/src/screens/StudyScreen.tsx
git commit -m "feat: gate lecture history by subscription plan"
```

---

## Итоговая проверка после всех задач

1. Запустить бэкенд — убедиться что `/health`, `/users/me`, `/polar/webhook`, `/polar/checkout` доступны
2. В Polar dashboard настроить вебхук URL: `https://hearless16-1.onrender.com/polar/webhook`
3. В приложении: зайти как free-пользователь и убедиться что:
   - Субтитры показывают оставшееся время (30 мин)
   - Категории жестов кроме "Базовые" показывают замок
   - StudyScreen открывается сразу на записи
4. Нажать кнопку платного контента → открывается PaywallScreen
5. Нажать "Выбрать Basic" → открывается браузер с Polar checkout
6. После оплаты → `hearless://payment-success` → план обновляется
