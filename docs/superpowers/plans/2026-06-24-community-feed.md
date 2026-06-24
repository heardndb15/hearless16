# Community Feed Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a Community tab to the Hearless mobile app where users can post text + photo content, like posts, and comment — styled in the app's glassmorphism blue-white theme.

**Architecture:** New Supabase tables (`posts`, `post_likes`, `post_comments`) with trigger-maintained counters and RLS. FastAPI router at `/community/*` handles all CRUD. Three new React Native screens (`CommunityFeedScreen`, `PostDetailScreen`, `CreatePostScreen`) added to the existing navigation stack.

**Tech Stack:** FastAPI + Supabase Python SDK (backend), React Native + Expo SDK 51, `expo-image`, `expo-image-picker`, `@react-navigation/native-stack`, `axios` (already installed).

## Global Constraints

- Gradient colors: `['#1565C0', '#42A5F5', '#E3F2FD']`, locations `[0, 0.45, 1]` — import as `GRADIENT_COLORS`, `GRADIENT_LOCATIONS` from `mobile/src/constants/theme.ts`
- GlassCard style object: import `GlassCard` from `mobile/src/constants/theme.ts` — `backgroundColor:'rgba(255,255,255,0.72)'`, `borderRadius:20`, `borderWidth:1.5`, `borderColor:'rgba(255,255,255,0.6)'`, `shadowColor:'#0288D1'`, `shadowOpacity:0.18`, `shadowRadius:20`, `elevation:4`
- Accent color: `#0277BD`; heading text color: `#0D47A1`; secondary text: `#1E6FA8`
- Auth pattern: `Depends(get_current_user)` from `app.dependencies` for required auth; custom `get_optional_user` (defined in Task 2) for optional auth
- DB access: `get_supabase()` from `app.database`
- Mobile API base: `const API_URL = process.env.EXPO_PUBLIC_API_URL || "https://hearless16-1.onrender.com"`
- Post text max 500 chars; comment text max 300 chars; image upload max 5MB (JPEG/PNG/WebP)
- Pagination: 20 items per page via `limit` + `offset`
- `users` table has columns: `id`, `name`, `language`, `created_at` — no `avatar_url`, use initials-based avatars throughout

---

### Task 1: Database Migration + Supabase Storage Bucket

**Files:**
- Create: `backend/supabase/migration_community.sql`

**Interfaces:**
- Produces: tables `posts`, `post_likes`, `post_comments` with triggers and RLS that Tasks 2–6 depend on

- [ ] **Step 1: Create the migration file**

Create `backend/supabase/migration_community.sql` with this exact content:

```sql
-- Posts table
CREATE TABLE posts (
  id             UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id        UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  text           TEXT NOT NULL CHECK (char_length(text) BETWEEN 1 AND 500),
  image_url      TEXT,
  likes_count    INT DEFAULT 0,
  comments_count INT DEFAULT 0,
  created_at     TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_posts_created_at ON posts (created_at DESC);
CREATE INDEX idx_posts_likes      ON posts (likes_count DESC);

-- Likes (one per user per post)
CREATE TABLE post_likes (
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  post_id UUID REFERENCES posts(id) ON DELETE CASCADE,
  PRIMARY KEY (user_id, post_id)
);

-- Comments
CREATE TABLE post_comments (
  id         UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id    UUID REFERENCES posts(id) ON DELETE CASCADE NOT NULL,
  user_id    UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  text       TEXT NOT NULL CHECK (char_length(text) BETWEEN 1 AND 300),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_comments_post_id ON post_comments (post_id, created_at ASC);

-- Trigger: maintain likes_count
CREATE OR REPLACE FUNCTION update_likes_count() RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE posts SET likes_count = likes_count + 1 WHERE id = NEW.post_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE posts SET likes_count = GREATEST(likes_count - 1, 0) WHERE id = OLD.post_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_likes_count
  AFTER INSERT OR DELETE ON post_likes
  FOR EACH ROW EXECUTE FUNCTION update_likes_count();

-- Trigger: maintain comments_count
CREATE OR REPLACE FUNCTION update_comments_count() RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE posts SET comments_count = comments_count + 1 WHERE id = NEW.post_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE posts SET comments_count = GREATEST(comments_count - 1, 0) WHERE id = OLD.post_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_comments_count
  AFTER INSERT OR DELETE ON post_comments
  FOR EACH ROW EXECUTE FUNCTION update_comments_count();

-- Row-Level Security
ALTER TABLE posts         ENABLE ROW LEVEL SECURITY;
ALTER TABLE post_likes    ENABLE ROW LEVEL SECURITY;
ALTER TABLE post_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "posts_read"   ON posts FOR SELECT USING (true);
CREATE POLICY "posts_insert" ON posts FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "posts_delete" ON posts FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "likes_read"   ON post_likes FOR SELECT USING (true);
CREATE POLICY "likes_insert" ON post_likes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "likes_delete" ON post_likes FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "comments_read"   ON post_comments FOR SELECT USING (true);
CREATE POLICY "comments_insert" ON post_comments FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "comments_delete" ON post_comments FOR DELETE USING (auth.uid() = user_id);
```

- [ ] **Step 2: Run the migration in Supabase dashboard**

1. Open your Supabase project → SQL Editor
2. Paste the entire file contents and click **Run**
3. Expected: "Success. No rows returned"

- [ ] **Step 3: Create the Storage bucket**

1. In Supabase dashboard → Storage → New bucket
2. Name: `community-media`
3. Public: **YES** (toggle on)
4. Click Save

- [ ] **Step 4: Verify tables exist**

In Supabase SQL Editor run:
```sql
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN ('posts', 'post_likes', 'post_comments');
```
Expected: 3 rows returned.

- [ ] **Step 5: Commit**

```bash
git add backend/supabase/migration_community.sql
git commit -m "feat: add community tables migration (posts, post_likes, post_comments)"
```

---

### Task 2: Backend Community Router

**Files:**
- Create: `backend/app/routes/community.py`
- Modify: `backend/app/main.py`

**Interfaces:**
- Consumes: `get_supabase` from `app.database`, `get_current_user` from `app.dependencies`, `SUPABASE_URL` from `app.config`
- Produces: REST API at `/community/posts`, `/community/posts/{id}/like`, `/community/posts/{id}/comments`, `/community/comments/{id}`, `/community/upload`

- [ ] **Step 1: Create `backend/app/routes/community.py`**

```python
import uuid
from typing import Optional, Literal
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Request
from pydantic import BaseModel
from app.database import get_supabase
from app.dependencies import get_current_user

router = APIRouter(tags=["community"])


# ── Models ────────────────────────────────────────────────────────────────────

class PostCreate(BaseModel):
    text: str
    image_url: Optional[str] = None


class CommentCreate(BaseModel):
    text: str


# ── Optional auth helper ──────────────────────────────────────────────────────

async def get_optional_user(request: Request) -> Optional[dict]:
    """Returns user dict if valid Bearer token present, else None."""
    auth = request.headers.get("Authorization", "")
    if not auth.startswith("Bearer "):
        return None
    token = auth[7:]
    try:
        db = get_supabase()
        user_res = db.auth.get_user(token)
        if user_res and getattr(user_res, "user", None):
            return {"id": str(user_res.user.id)}
    except Exception:
        pass
    return None


# ── Helper: format post row from Supabase ────────────────────────────────────

def _format_post(row: dict, liked_post_ids: set) -> dict:
    author = row.get("users") or {}
    if isinstance(author, list):
        author = author[0] if author else {}
    return {
        "id": row["id"],
        "text": row["text"],
        "image_url": row.get("image_url"),
        "likes_count": row.get("likes_count", 0),
        "comments_count": row.get("comments_count", 0),
        "liked_by_me": row["id"] in liked_post_ids,
        "created_at": str(row["created_at"]),
        "author": {
            "id": author.get("id", row["user_id"]),
            "name": author.get("name", "Пользователь"),
            "avatar_url": None,
        },
    }


# ── Endpoints ─────────────────────────────────────────────────────────────────

@router.get("/posts")
async def list_posts(
    sort: Literal["new", "popular"] = "new",
    limit: int = 20,
    offset: int = 0,
    current_user: Optional[dict] = Depends(get_optional_user),
):
    db = get_supabase()
    order_col = "created_at" if sort == "new" else "likes_count"

    response = (
        db.table("posts")
        .select("id, text, image_url, likes_count, comments_count, created_at, user_id, users(id, name)")
        .order(order_col, desc=True)
        .range(offset, offset + limit - 1)
        .execute()
    )
    posts = response.data or []

    liked_set: set = set()
    if current_user and posts:
        post_ids = [p["id"] for p in posts]
        likes_res = (
            db.table("post_likes")
            .select("post_id")
            .eq("user_id", current_user["id"])
            .in_("post_id", post_ids)
            .execute()
        )
        liked_set = {l["post_id"] for l in (likes_res.data or [])}

    return [_format_post(p, liked_set) for p in posts]


@router.post("/posts")
async def create_post(data: PostCreate, current_user: dict = Depends(get_current_user)):
    if not data.text.strip():
        raise HTTPException(status_code=422, detail="Текст поста не может быть пустым")
    db = get_supabase()
    row = db.table("posts").insert({
        "user_id": current_user["id"],
        "text": data.text.strip(),
        "image_url": data.image_url,
    }).execute()
    if not row.data:
        raise HTTPException(status_code=500, detail="Не удалось создать пост")

    post = row.data[0]
    user_res = db.table("users").select("name").eq("id", current_user["id"]).single().execute()
    author_name = (user_res.data or {}).get("name", "Пользователь")

    return {
        "id": post["id"],
        "text": post["text"],
        "image_url": post.get("image_url"),
        "likes_count": 0,
        "comments_count": 0,
        "liked_by_me": False,
        "created_at": str(post["created_at"]),
        "author": {"id": current_user["id"], "name": author_name, "avatar_url": None},
    }


@router.delete("/posts/{post_id}")
async def delete_post(post_id: str, current_user: dict = Depends(get_current_user)):
    db = get_supabase()
    existing = db.table("posts").select("user_id").eq("id", post_id).single().execute()
    if not existing.data:
        raise HTTPException(status_code=404, detail="Пост не найден")
    if existing.data["user_id"] != current_user["id"]:
        raise HTTPException(status_code=403, detail="Нельзя удалить чужой пост")
    db.table("posts").delete().eq("id", post_id).execute()
    return {"ok": True}


@router.post("/posts/{post_id}/like")
async def toggle_like(post_id: str, current_user: dict = Depends(get_current_user)):
    db = get_supabase()
    existing = (
        db.table("post_likes")
        .select("user_id")
        .eq("user_id", current_user["id"])
        .eq("post_id", post_id)
        .execute()
    )
    if existing.data:
        db.table("post_likes").delete().eq("user_id", current_user["id"]).eq("post_id", post_id).execute()
        liked = False
    else:
        db.table("post_likes").insert({"user_id": current_user["id"], "post_id": post_id}).execute()
        liked = True

    post_res = db.table("posts").select("likes_count").eq("id", post_id).single().execute()
    likes_count = (post_res.data or {}).get("likes_count", 0)
    return {"liked": liked, "likes_count": likes_count}


@router.get("/posts/{post_id}/comments")
async def list_comments(post_id: str):
    db = get_supabase()
    response = (
        db.table("post_comments")
        .select("id, text, created_at, user_id, users(id, name)")
        .eq("post_id", post_id)
        .order("created_at", desc=False)
        .execute()
    )
    result = []
    for c in (response.data or []):
        author = c.get("users") or {}
        if isinstance(author, list):
            author = author[0] if author else {}
        result.append({
            "id": c["id"],
            "text": c["text"],
            "created_at": str(c["created_at"]),
            "author": {
                "id": author.get("id", c["user_id"]),
                "name": author.get("name", "Пользователь"),
                "avatar_url": None,
            },
        })
    return result


@router.post("/posts/{post_id}/comments")
async def create_comment(
    post_id: str,
    data: CommentCreate,
    current_user: dict = Depends(get_current_user),
):
    if not data.text.strip():
        raise HTTPException(status_code=422, detail="Комментарий не может быть пустым")
    db = get_supabase()
    row = db.table("post_comments").insert({
        "post_id": post_id,
        "user_id": current_user["id"],
        "text": data.text.strip(),
    }).execute()
    if not row.data:
        raise HTTPException(status_code=500, detail="Не удалось создать комментарий")
    c = row.data[0]
    user_res = db.table("users").select("name").eq("id", current_user["id"]).single().execute()
    author_name = (user_res.data or {}).get("name", "Пользователь")
    return {
        "id": c["id"],
        "text": c["text"],
        "created_at": str(c["created_at"]),
        "author": {"id": current_user["id"], "name": author_name, "avatar_url": None},
    }


@router.delete("/comments/{comment_id}")
async def delete_comment(comment_id: str, current_user: dict = Depends(get_current_user)):
    db = get_supabase()
    existing = db.table("post_comments").select("user_id").eq("id", comment_id).single().execute()
    if not existing.data:
        raise HTTPException(status_code=404, detail="Комментарий не найден")
    if existing.data["user_id"] != current_user["id"]:
        raise HTTPException(status_code=403, detail="Нельзя удалить чужой комментарий")
    db.table("post_comments").delete().eq("id", comment_id).execute()
    return {"ok": True}


@router.post("/upload")
async def upload_image(
    file: UploadFile = File(...),
    current_user: dict = Depends(get_current_user),
):
    if file.content_type not in ("image/jpeg", "image/png", "image/webp"):
        raise HTTPException(status_code=422, detail="Только JPEG, PNG, WebP")
    content = await file.read()
    if len(content) > 5 * 1024 * 1024:
        raise HTTPException(status_code=422, detail="Файл слишком большой. Максимум 5MB")

    from app.config import SUPABASE_URL
    ext = "jpg" if file.content_type == "image/jpeg" else file.content_type.split("/")[1]
    path = f"{current_user['id']}/{uuid.uuid4()}.{ext}"

    db = get_supabase()
    db.storage.from_("community-media").upload(path, content, {"content-type": file.content_type})

    image_url = f"{SUPABASE_URL}/storage/v1/object/public/community-media/{path}"
    return {"image_url": image_url}
```

- [ ] **Step 2: Register router in `backend/app/main.py`**

Add after the last `app.include_router(...)` line (currently `app.include_router(study.router)`):

```python
from app.routes import community
app.include_router(community.router, prefix="/community")
```

- [ ] **Step 3: Verify the server starts**

```bash
cd backend
uvicorn app.main:app --reload --port 8000
```
Expected: server starts, no import errors. Visit `http://localhost:8000/docs` — you should see a "community" section with all 8 endpoints listed.

- [ ] **Step 4: Smoke-test GET /community/posts**

```bash
curl http://localhost:8000/community/posts
```
Expected: `[]` (empty array — no posts yet).

- [ ] **Step 5: Commit**

```bash
git add backend/app/routes/community.py backend/app/main.py
git commit -m "feat: add community API routes (posts, likes, comments, upload)"
```

---

### Task 3: Navigation Types + Wiring

**Files:**
- Modify: `shared/types.ts`
- Modify: `mobile/src/navigation/TabNavigator.tsx`
- Modify: `mobile/App.tsx`

**Interfaces:**
- Consumes: `CommunityFeedScreen`, `PostDetailScreen`, `CreatePostScreen` — these screens are not yet written but the nav types must exist before Tasks 4–6 can import them
- Produces: `RootTabParamList.Community`, `RootStackParamList.PostDetail`, `RootStackParamList.CreatePost`, `PostResponse` type

- [ ] **Step 1: Update `shared/types.ts`**

The current file has `RootTabParamList` with 4 tabs and `RootStackParamList` with 3 screens. Add the following:

```typescript
// Add PostResponse interface (used by PostDetail route param and all three Community screens)
export interface PostResponse {
  id: string;
  text: string;
  image_url: string | null;
  likes_count: number;
  comments_count: number;
  liked_by_me: boolean;
  created_at: string;
  author: { id: string; name: string; avatar_url: string | null };
}

// In RootTabParamList, add:
Community: undefined;

// In RootStackParamList, add:
PostDetail: { post: PostResponse };
CreatePost: undefined;
```

The full updated file should look like:

```typescript
export interface PostResponse {
  id: string;
  text: string;
  image_url: string | null;
  likes_count: number;
  comments_count: number;
  liked_by_me: boolean;
  created_at: string;
  author: { id: string; name: string; avatar_url: string | null };
}

export type RootTabParamList = {
  Subtitles: undefined;
  Gestures: undefined;
  Study: undefined;
  Profile: undefined;
  Community: undefined;
};

export type RootStackParamList = {
  Tabs: undefined;
  GesturePractice: { gestureId: string; gestureName: string };
  GestureDictionary: undefined;
  PostDetail: { post: PostResponse };
  CreatePost: undefined;
};
```

- [ ] **Step 2: Update `mobile/src/navigation/TabNavigator.tsx`**

Add the Community tab. The full updated file:

```typescript
import React from "react";
import { Text } from "react-native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Colors } from "../constants/theme";
import SubtitlesScreen from "../screens/SubtitlesScreen";
import GesturesScreen from "../screens/GesturesScreen";
import StudyScreen from "../screens/StudyScreen";
import ProfileScreen from "../screens/ProfileScreen";
import CommunityFeedScreen from "../screens/CommunityFeedScreen";
import type { RootTabParamList } from "../../../shared/types";

const Tab = createBottomTabNavigator<RootTabParamList>();

function TabIcon({ label, focused }: { label: string; focused: boolean }) {
  const icons: Record<string, string> = {
    Субтитры: "💬",
    Жесты: "🤟",
    Учеба: "🎓",
    Профиль: "👤",
    Комьюнити: "👥",
  };
  return (
    <Text style={{ fontSize: focused ? 24 : 20, opacity: focused ? 1 : 0.6 }}>
      {icons[label] || "•"}
    </Text>
  );
}

export default function TabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: 'rgba(255, 255, 255, 0.88)',
          borderTopColor: 'rgba(255,255,255,0.5)',
          borderTopWidth: 1.5,
          paddingBottom: 4,
          height: 60,
          shadowColor: '#0288D1',
          shadowOffset: { width: 0, height: -4 },
          shadowOpacity: 0.12,
          shadowRadius: 12,
          elevation: 10,
        },
        tabBarActiveTintColor: '#0277BD',
        tabBarInactiveTintColor: '#1E6FA8',
        tabBarLabelStyle: { fontSize: 11, fontWeight: "600" },
      }}
    >
      <Tab.Screen name="Subtitles" component={SubtitlesScreen}
        options={{ tabBarLabel: "Субтитры", tabBarIcon: ({ focused }) => <TabIcon label="Субтитры" focused={focused} /> }} />
      <Tab.Screen name="Gestures" component={GesturesScreen}
        options={{ tabBarLabel: "Жесты", tabBarIcon: ({ focused }) => <TabIcon label="Жесты" focused={focused} /> }} />
      <Tab.Screen name="Study" component={StudyScreen}
        options={{ tabBarLabel: "Учеба", tabBarIcon: ({ focused }) => <TabIcon label="Учеба" focused={focused} /> }} />
      <Tab.Screen name="Community" component={CommunityFeedScreen}
        options={{ tabBarLabel: "Комьюнити", tabBarIcon: ({ focused }) => <TabIcon label="Комьюнити" focused={focused} /> }} />
      <Tab.Screen name="Profile" component={ProfileScreen}
        options={{ tabBarLabel: "Профиль", tabBarIcon: ({ focused }) => <TabIcon label="Профиль" focused={focused} /> }} />
    </Tab.Navigator>
  );
}
```

- [ ] **Step 3: Update `mobile/App.tsx`**

Add `PostDetailScreen` and `CreatePostScreen` imports and `Stack.Screen` entries. Full updated file:

```typescript
import React from "react";
import { StatusBar } from "expo-status-bar";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { SafeAreaProvider } from "react-native-safe-area-context";
import TabNavigator from "./src/navigation/TabNavigator";
import GesturePracticeScreen from "./src/screens/GesturePracticeScreen";
import GestureDictionaryScreen from "./src/screens/GestureDictionaryScreen";
import PostDetailScreen from "./src/screens/PostDetailScreen";
import CreatePostScreen from "./src/screens/CreatePostScreen";
import type { RootStackParamList } from "../shared/types";

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function App() {
  return (
    <SafeAreaProvider>
      <NavigationContainer>
        <StatusBar style="auto" />
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          <Stack.Screen name="Tabs" component={TabNavigator} />
          <Stack.Screen name="GesturePractice" component={GesturePracticeScreen}
            options={{ animation: "slide_from_bottom", headerShown: true, headerTitle: "Практика жеста", headerTintColor: "#ffffff", headerStyle: { backgroundColor: "#0277BD" } }} />
          <Stack.Screen name="GestureDictionary" component={GestureDictionaryScreen}
            options={{ animation: "slide_from_right", headerShown: false }} />
          <Stack.Screen name="PostDetail" component={PostDetailScreen}
            options={{ animation: "slide_from_right", headerShown: false }} />
          <Stack.Screen name="CreatePost" component={CreatePostScreen}
            options={{ animation: "slide_from_bottom", headerShown: false }} />
        </Stack.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}
```

- [ ] **Step 4: Verify TypeScript compiles**

```bash
cd mobile
npx tsc --noEmit
```
Expected: no errors (or only pre-existing errors unrelated to these files).

- [ ] **Step 5: Commit**

```bash
git add shared/types.ts mobile/src/navigation/TabNavigator.tsx mobile/App.tsx
git commit -m "feat: wire Community tab and PostDetail/CreatePost screens in navigation"
```

---

### Task 4: CommunityFeedScreen

**Files:**
- Create: `mobile/src/screens/CommunityFeedScreen.tsx`

**Interfaces:**
- Consumes: `PostResponse` from `../../../shared/types`, `GlassCard`, `Colors`, `GRADIENT_COLORS`, `GRADIENT_LOCATIONS` from `../constants/theme`, `RootStackParamList` from `shared/types`
- Produces: `CommunityFeedScreen` default export (used by `TabNavigator.tsx`)

- [ ] **Step 1: Create `mobile/src/screens/CommunityFeedScreen.tsx`**

```typescript
import React, { useState, useCallback, useEffect, useRef } from "react";
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  RefreshControl, Alert, ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Image } from "expo-image";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import axios from "axios";
import { supabase } from "../services/supabase";
import { GlassCard, Colors, GRADIENT_COLORS, GRADIENT_LOCATIONS } from "../constants/theme";
import type { RootStackParamList, PostResponse } from "../../../shared/types";

const API_URL = process.env.EXPO_PUBLIC_API_URL || "https://hearless16-1.onrender.com";

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "только что";
  if (mins < 60) return `${mins}м`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}ч`;
  return `${Math.floor(hours / 24)}д`;
}

function initials(name: string): string {
  const parts = name.trim().split(" ");
  return parts.length >= 2 ? (parts[0][0] + parts[1][0]).toUpperCase() : name.slice(0, 2).toUpperCase();
}

interface PostCardProps {
  post: PostResponse;
  currentUserId: string | null;
  onLike: (postId: string) => void;
  onPress: (post: PostResponse) => void;
  onDelete: (postId: string) => void;
}

function PostCard({ post, currentUserId, onLike, onPress, onDelete }: PostCardProps) {
  return (
    <TouchableOpacity activeOpacity={0.9} onPress={() => onPress(post)}>
      <View style={[GlassCard, styles.card]}>
        <View style={styles.authorRow}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initials(post.author.name)}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.authorName}>{post.author.name}</Text>
            <Text style={styles.timeText}>{timeAgo(post.created_at)}</Text>
          </View>
          {currentUserId === post.author.id && (
            <TouchableOpacity
              onPress={() =>
                Alert.alert("Удалить пост?", "Это действие нельзя отменить.", [
                  { text: "Отмена", style: "cancel" },
                  { text: "Удалить", style: "destructive", onPress: () => onDelete(post.id) },
                ])
              }
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Text style={styles.moreText}>···</Text>
            </TouchableOpacity>
          )}
        </View>

        <Text style={styles.postText}>{post.text}</Text>

        {post.image_url ? (
          <Image source={{ uri: post.image_url }} style={styles.postImage} contentFit="cover" />
        ) : null}

        <View style={styles.footer}>
          <TouchableOpacity style={styles.footerBtn} onPress={() => onLike(post.id)}>
            <Text style={[styles.footerIcon, { color: post.liked_by_me ? "#ef4444" : "#1E6FA8" }]}>♥</Text>
            <Text style={styles.footerCount}>{post.likes_count}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.footerBtn} onPress={() => onPress(post)}>
            <Text style={[styles.footerIcon, { color: "#1E6FA8" }]}>💬</Text>
            <Text style={styles.footerCount}>{post.comments_count}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  );
}

export default function CommunityFeedScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [posts, setPosts] = useState<PostResponse[]>([]);
  const [sort, setSort] = useState<"new" | "popular">("new");
  const [offset, setOffset] = useState(0);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [token, setToken] = useState<string>("");
  const loadingRef = useRef(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setCurrentUserId(session?.user?.id ?? null);
      setToken(session?.access_token ?? "");
    });
  }, []);

  const fetchPosts = useCallback(async (
    newSort: "new" | "popular",
    newOffset: number,
    append: boolean,
  ) => {
    if (loadingRef.current) return;
    loadingRef.current = true;
    setLoading(true);
    try {
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      const res = await axios.get<PostResponse[]>(`${API_URL}/community/posts`, {
        params: { sort: newSort, limit: 20, offset: newOffset },
        headers,
      });
      const data = res.data;
      setPosts((prev) => append ? [...prev, ...data] : data);
      setHasMore(data.length === 20);
      setOffset(newOffset + data.length);
    } catch {
      // silent — user sees empty state
    } finally {
      loadingRef.current = false;
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    setOffset(0);
    fetchPosts(sort, 0, false);
  }, [sort, token]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchPosts(sort, 0, false);
    setRefreshing(false);
  }, [sort, fetchPosts]);

  const handleLoadMore = useCallback(() => {
    if (!loadingRef.current && hasMore) {
      fetchPosts(sort, offset, true);
    }
  }, [sort, offset, hasMore, fetchPosts]);

  const handleLike = useCallback(async (postId: string) => {
    if (!token) {
      Alert.alert("Войдите в аккаунт", "Чтобы ставить лайки, нужно войти.");
      return;
    }
    setPosts((prev) =>
      prev.map((p) =>
        p.id === postId
          ? { ...p, liked_by_me: !p.liked_by_me, likes_count: p.liked_by_me ? p.likes_count - 1 : p.likes_count + 1 }
          : p
      )
    );
    try {
      await axios.post(`${API_URL}/community/posts/${postId}/like`, {}, {
        headers: { Authorization: `Bearer ${token}` },
      });
    } catch {
      // revert optimistic update
      setPosts((prev) =>
        prev.map((p) =>
          p.id === postId
            ? { ...p, liked_by_me: !p.liked_by_me, likes_count: p.liked_by_me ? p.likes_count - 1 : p.likes_count + 1 }
            : p
        )
      );
    }
  }, [token]);

  const handleDelete = useCallback(async (postId: string) => {
    try {
      await axios.delete(`${API_URL}/community/posts/${postId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setPosts((prev) => prev.filter((p) => p.id !== postId));
    } catch {
      Alert.alert("Ошибка", "Не удалось удалить пост");
    }
  }, [token]);

  const openDetail = useCallback((post: PostResponse) => {
    navigation.navigate("PostDetail", { post });
  }, [navigation]);

  return (
    <LinearGradient colors={GRADIENT_COLORS} locations={GRADIENT_LOCATIONS} style={{ flex: 1 }}>
      <SafeAreaView style={{ flex: 1 }}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Community</Text>
          <TouchableOpacity
            style={styles.addBtn}
            onPress={() => {
              if (!token) {
                Alert.alert("Войдите в аккаунт", "Чтобы публиковать посты, нужно войти.");
                return;
              }
              navigation.navigate("CreatePost");
            }}
          >
            <Text style={styles.addBtnText}>+</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.sortRow}>
          {(["new", "popular"] as const).map((s) => (
            <TouchableOpacity
              key={s}
              style={[styles.sortBtn, sort === s && styles.sortBtnActive]}
              onPress={() => setSort(s)}
            >
              <Text style={[styles.sortBtnText, sort === s && styles.sortBtnTextActive]}>
                {s === "new" ? "Новые" : "Популярные"}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <FlatList
          data={posts}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <PostCard
              post={item}
              currentUserId={currentUserId}
              onLike={handleLike}
              onPress={openDetail}
              onDelete={handleDelete}
            />
          )}
          contentContainerStyle={{ paddingBottom: 20, paddingTop: 8 }}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor="white" />
          }
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.3}
          ListEmptyComponent={
            loading ? (
              <ActivityIndicator color="white" size="large" style={{ marginTop: 40 }} />
            ) : (
              <View style={[GlassCard, styles.emptyCard]}>
                <Text style={{ fontSize: 32 }}>👋</Text>
                <Text style={styles.emptyText}>Будьте первым — опубликуйте пост!</Text>
              </View>
            )
          }
          ListFooterComponent={
            loading && posts.length > 0 ? (
              <ActivityIndicator color="white" style={{ marginVertical: 16 }} />
            ) : null
          }
        />
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, paddingVertical: 12 },
  headerTitle: { fontSize: 24, fontWeight: "700", color: "white" },
  addBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: "#0277BD", alignItems: "center", justifyContent: "center" },
  addBtnText: { color: "white", fontSize: 24, lineHeight: 28, fontWeight: "600" },
  sortRow: { flexDirection: "row", paddingHorizontal: 20, gap: 8, marginBottom: 4 },
  sortBtn: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: "rgba(255,255,255,0.35)" },
  sortBtnActive: { backgroundColor: "#0277BD" },
  sortBtnText: { fontSize: 14, fontWeight: "600", color: Colors.heading },
  sortBtnTextActive: { color: "white" },
  card: { marginHorizontal: 16, marginBottom: 12, padding: 16, borderRadius: 20 },
  authorRow: { flexDirection: "row", alignItems: "center", marginBottom: 10, gap: 10 },
  avatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: "#0277BD", alignItems: "center", justifyContent: "center" },
  avatarText: { color: "white", fontSize: 14, fontWeight: "700" },
  authorName: { fontSize: 14, fontWeight: "600", color: Colors.heading },
  timeText: { fontSize: 12, color: "#1E6FA8", marginTop: 1 },
  moreText: { fontSize: 18, color: Colors.heading, letterSpacing: 1, paddingHorizontal: 4 },
  postText: { fontSize: 15, color: Colors.heading, lineHeight: 22, marginBottom: 8 },
  postImage: { width: "100%", aspectRatio: 16 / 9, borderRadius: 12, marginBottom: 10 },
  footer: { flexDirection: "row", gap: 16, marginTop: 4 },
  footerBtn: { flexDirection: "row", alignItems: "center", gap: 4 },
  footerIcon: { fontSize: 18 },
  footerCount: { fontSize: 14, color: "#1E6FA8", fontWeight: "600" },
  emptyCard: { marginHorizontal: 16, marginTop: 40, padding: 28, borderRadius: 20, alignItems: "center", gap: 10 },
  emptyText: { fontSize: 16, color: Colors.heading, textAlign: "center", fontWeight: "500" },
});
```

- [ ] **Step 2: Verify the tab appears**

Run `npx expo start` in the `mobile/` directory. Open the app. You should see a "Комьюнити 👥" tab in the bottom bar. Tapping it shows the gradient screen with sort toggles and an empty state card.

- [ ] **Step 3: Commit**

```bash
git add mobile/src/screens/CommunityFeedScreen.tsx
git commit -m "feat: add CommunityFeedScreen with PostCard, sort toggle, optimistic likes"
```

---

### Task 5: PostDetailScreen

**Files:**
- Create: `mobile/src/screens/PostDetailScreen.tsx`

**Interfaces:**
- Consumes: `PostResponse` from `shared/types`, `RootStackParamList` from `shared/types`, `GlassCard`, `Colors`, `GRADIENT_COLORS`, `GRADIENT_LOCATIONS` from `../constants/theme`
- Produces: `PostDetailScreen` default export (used by `App.tsx`)

- [ ] **Step 1: Create `mobile/src/screens/PostDetailScreen.tsx`**

```typescript
import React, { useState, useEffect, useCallback } from "react";
import {
  View, Text, ScrollView, TouchableOpacity, TextInput,
  StyleSheet, KeyboardAvoidingView, Platform, Alert, ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Image } from "expo-image";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import axios from "axios";
import { supabase } from "../services/supabase";
import { GlassCard, Colors, GRADIENT_COLORS, GRADIENT_LOCATIONS } from "../constants/theme";
import type { RootStackParamList, PostResponse } from "../../../shared/types";

const API_URL = process.env.EXPO_PUBLIC_API_URL || "https://hearless16-1.onrender.com";

interface CommentResponse {
  id: string;
  text: string;
  created_at: string;
  author: { id: string; name: string; avatar_url: string | null };
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "только что";
  if (mins < 60) return `${mins}м`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}ч`;
  return `${Math.floor(hours / 24)}д`;
}

function initials(name: string): string {
  const parts = name.trim().split(" ");
  return parts.length >= 2 ? (parts[0][0] + parts[1][0]).toUpperCase() : name.slice(0, 2).toUpperCase();
}

export default function PostDetailScreen() {
  const navigation = useNavigation();
  const route = useRoute<RouteProp<RootStackParamList, "PostDetail">>();
  const [post, setPost] = useState<PostResponse>(route.params.post);
  const [comments, setComments] = useState<CommentResponse[]>([]);
  const [commentText, setCommentText] = useState("");
  const [sending, setSending] = useState(false);
  const [loadingComments, setLoadingComments] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [token, setToken] = useState<string>("");

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setCurrentUserId(session?.user?.id ?? null);
      setToken(session?.access_token ?? "");
    });
  }, []);

  useEffect(() => {
    axios
      .get<CommentResponse[]>(`${API_URL}/community/posts/${post.id}/comments`)
      .then((r) => setComments(r.data))
      .catch(() => {})
      .finally(() => setLoadingComments(false));
  }, [post.id]);

  const handleLike = useCallback(async () => {
    if (!token) return;
    setPost((p) => ({
      ...p,
      liked_by_me: !p.liked_by_me,
      likes_count: p.liked_by_me ? p.likes_count - 1 : p.likes_count + 1,
    }));
    try {
      await axios.post(
        `${API_URL}/community/posts/${post.id}/like`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
    } catch {
      setPost((p) => ({
        ...p,
        liked_by_me: !p.liked_by_me,
        likes_count: p.liked_by_me ? p.likes_count - 1 : p.likes_count + 1,
      }));
    }
  }, [token, post.id]);

  const handleSendComment = useCallback(async () => {
    if (!commentText.trim() || !token || sending) return;
    setSending(true);
    try {
      const res = await axios.post<CommentResponse>(
        `${API_URL}/community/posts/${post.id}/comments`,
        { text: commentText.trim() },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setComments((prev) => [...prev, res.data]);
      setPost((p) => ({ ...p, comments_count: p.comments_count + 1 }));
      setCommentText("");
    } catch {
      Alert.alert("Ошибка", "Не удалось отправить комментарий");
    } finally {
      setSending(false);
    }
  }, [commentText, token, sending, post.id]);

  const handleDeleteComment = useCallback(async (commentId: string) => {
    try {
      await axios.delete(`${API_URL}/community/comments/${commentId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setComments((prev) => prev.filter((c) => c.id !== commentId));
      setPost((p) => ({ ...p, comments_count: Math.max(0, p.comments_count - 1) }));
    } catch {
      Alert.alert("Ошибка", "Не удалось удалить комментарий");
    }
  }, [token]);

  return (
    <LinearGradient colors={GRADIENT_COLORS} locations={GRADIENT_LOCATIONS} style={{ flex: 1 }}>
      <SafeAreaView style={{ flex: 1 }}>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Text style={styles.backText}>← Назад</Text>
          </TouchableOpacity>

          <ScrollView contentContainerStyle={{ paddingBottom: 16 }}>
            {/* Post */}
            <View style={[GlassCard, styles.card]}>
              <View style={styles.authorRow}>
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>{initials(post.author.name)}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.authorName}>{post.author.name}</Text>
                  <Text style={styles.timeText}>{timeAgo(post.created_at)}</Text>
                </View>
              </View>
              <Text style={styles.postText}>{post.text}</Text>
              {post.image_url ? (
                <Image source={{ uri: post.image_url }} style={styles.postImage} contentFit="cover" />
              ) : null}
              <View style={styles.footer}>
                <TouchableOpacity style={styles.footerBtn} onPress={handleLike}>
                  <Text style={[styles.footerIcon, { color: post.liked_by_me ? "#ef4444" : "#1E6FA8" }]}>♥</Text>
                  <Text style={styles.footerCount}>{post.likes_count}</Text>
                </TouchableOpacity>
                <View style={styles.footerBtn}>
                  <Text style={[styles.footerIcon, { color: "#1E6FA8" }]}>💬</Text>
                  <Text style={styles.footerCount}>{post.comments_count}</Text>
                </View>
              </View>
            </View>

            {/* Comments */}
            <Text style={styles.sectionTitle}>Комментарии</Text>
            {loadingComments ? (
              <ActivityIndicator color="white" style={{ marginTop: 20 }} />
            ) : comments.length === 0 ? (
              <Text style={styles.emptyComments}>Комментариев пока нет</Text>
            ) : (
              comments.map((c) => (
                <View key={c.id} style={[GlassCard, styles.commentCard]}>
                  <View style={styles.authorRow}>
                    <View style={[styles.avatar, styles.avatarSm]}>
                      <Text style={[styles.avatarText, { fontSize: 11 }]}>{initials(c.author.name)}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.authorName}>{c.author.name}</Text>
                      <Text style={styles.timeText}>{timeAgo(c.created_at)}</Text>
                    </View>
                    {currentUserId === c.author.id && (
                      <TouchableOpacity
                        onPress={() =>
                          Alert.alert("Удалить комментарий?", "", [
                            { text: "Отмена", style: "cancel" },
                            { text: "Удалить", style: "destructive", onPress: () => handleDeleteComment(c.id) },
                          ])
                        }
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      >
                        <Text style={{ color: "#ef4444", fontSize: 18, fontWeight: "700" }}>×</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                  <Text style={styles.commentText}>{c.text}</Text>
                </View>
              ))
            )}
          </ScrollView>

          {/* Comment input */}
          <View style={styles.inputRow}>
            {token ? (
              <>
                <TextInput
                  style={[GlassCard, styles.commentInput]}
                  placeholder="Написать комментарий..."
                  placeholderTextColor="#1E6FA8"
                  value={commentText}
                  onChangeText={setCommentText}
                  multiline
                  maxLength={300}
                />
                <TouchableOpacity
                  style={[styles.sendBtn, (!commentText.trim() || sending) && { opacity: 0.5 }]}
                  onPress={handleSendComment}
                  disabled={!commentText.trim() || sending}
                >
                  <Text style={styles.sendBtnText}>→</Text>
                </TouchableOpacity>
              </>
            ) : (
              <Text style={styles.loginPrompt}>Войдите, чтобы оставить комментарий</Text>
            )}
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  backBtn: { paddingHorizontal: 20, paddingVertical: 12 },
  backText: { color: "white", fontSize: 16, fontWeight: "600" },
  card: { marginHorizontal: 16, marginBottom: 12, padding: 16, borderRadius: 20 },
  authorRow: { flexDirection: "row", alignItems: "center", marginBottom: 10, gap: 10 },
  avatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: "#0277BD", alignItems: "center", justifyContent: "center" },
  avatarSm: { width: 32, height: 32, borderRadius: 16 },
  avatarText: { color: "white", fontSize: 14, fontWeight: "700" },
  authorName: { fontSize: 14, fontWeight: "600", color: Colors.heading },
  timeText: { fontSize: 12, color: "#1E6FA8", marginTop: 1 },
  postText: { fontSize: 15, color: Colors.heading, lineHeight: 22, marginBottom: 8 },
  postImage: { width: "100%", aspectRatio: 16 / 9, borderRadius: 12, marginBottom: 10 },
  footer: { flexDirection: "row", gap: 16, marginTop: 4 },
  footerBtn: { flexDirection: "row", alignItems: "center", gap: 4 },
  footerIcon: { fontSize: 18 },
  footerCount: { fontSize: 14, color: "#1E6FA8", fontWeight: "600" },
  sectionTitle: { fontSize: 18, fontWeight: "600", color: "white", marginLeft: 16, marginBottom: 8, marginTop: 4 },
  emptyComments: { color: "rgba(255,255,255,0.7)", textAlign: "center", marginTop: 20, fontSize: 14 },
  commentCard: { marginHorizontal: 16, marginBottom: 8, padding: 12, borderRadius: 16 },
  commentText: { fontSize: 14, color: Colors.heading, lineHeight: 20, marginTop: 2 },
  inputRow: { flexDirection: "row", alignItems: "flex-end", paddingHorizontal: 16, paddingVertical: 8, gap: 8, borderTopWidth: 1, borderTopColor: "rgba(255,255,255,0.2)" },
  commentInput: { flex: 1, borderRadius: 16, paddingHorizontal: 14, paddingVertical: 10, fontSize: 15, color: Colors.heading, maxHeight: 80 },
  sendBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: "#0277BD", alignItems: "center", justifyContent: "center" },
  sendBtnText: { color: "white", fontSize: 20, fontWeight: "700" },
  loginPrompt: { flex: 1, textAlign: "center", color: "rgba(255,255,255,0.7)", fontSize: 14, paddingVertical: 12 },
});
```

- [ ] **Step 2: Manual test**

Tap any post card in the feed → `PostDetailScreen` opens. You see the post at top, "Комментарии" heading, empty state text. If logged in, a comment input is pinned at the bottom.

- [ ] **Step 3: Commit**

```bash
git add mobile/src/screens/PostDetailScreen.tsx
git commit -m "feat: add PostDetailScreen with comments list and inline comment input"
```

---

### Task 6: CreatePostScreen

**Files:**
- Create: `mobile/src/screens/CreatePostScreen.tsx`

**Interfaces:**
- Consumes: `GlassCard`, `Colors`, `GRADIENT_COLORS`, `GRADIENT_LOCATIONS` from `../constants/theme`
- Produces: `CreatePostScreen` default export (used by `App.tsx`)

- [ ] **Step 1: Create `mobile/src/screens/CreatePostScreen.tsx`**

```typescript
import React, { useState, useCallback } from "react";
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, KeyboardAvoidingView, Platform, Alert, ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Image } from "expo-image";
import { useNavigation } from "@react-navigation/native";
import * as ImagePicker from "expo-image-picker";
import axios from "axios";
import { supabase } from "../services/supabase";
import { GlassCard, Colors, GRADIENT_COLORS, GRADIENT_LOCATIONS } from "../constants/theme";

const API_URL = process.env.EXPO_PUBLIC_API_URL || "https://hearless16-1.onrender.com";

export default function CreatePostScreen() {
  const navigation = useNavigation();
  const [text, setText] = useState("");
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [posting, setPosting] = useState(false);

  const pickImage = useCallback(async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Нет доступа", "Разрешите доступ к галерее в настройках телефона.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
    });
    if (result.canceled || !result.assets[0]) return;

    const asset = result.assets[0];
    setImageUri(asset.uri);
    setImageUrl(null);
    setUploading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token ?? "";
      const formData = new FormData();
      formData.append("file", {
        uri: asset.uri,
        type: asset.mimeType || "image/jpeg",
        name: "photo.jpg",
      } as any);
      const res = await axios.post<{ image_url: string }>(
        `${API_URL}/community/upload`,
        formData,
        { headers: { Authorization: `Bearer ${token}`, "Content-Type": "multipart/form-data" } }
      );
      setImageUrl(res.data.image_url);
    } catch {
      Alert.alert("Ошибка", "Не удалось загрузить фото. Попробуйте ещё раз.");
      setImageUri(null);
    } finally {
      setUploading(false);
    }
  }, []);

  const removeImage = useCallback(() => {
    setImageUri(null);
    setImageUrl(null);
  }, []);

  const handlePublish = useCallback(async () => {
    if (!text.trim() || posting) return;
    setPosting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token ?? "";
      await axios.post(
        `${API_URL}/community/posts`,
        { text: text.trim(), image_url: imageUrl },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      navigation.goBack();
    } catch {
      Alert.alert("Ошибка", "Не удалось опубликовать пост. Попробуйте ещё раз.");
    } finally {
      setPosting(false);
    }
  }, [text, imageUrl, posting, navigation]);

  const isLoading = uploading || posting;
  const canPublish = text.trim().length > 0 && !isLoading;

  return (
    <LinearGradient colors={GRADIENT_COLORS} locations={GRADIENT_LOCATIONS} style={{ flex: 1 }}>
      <SafeAreaView style={{ flex: 1 }}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} disabled={isLoading}>
            <Text style={[styles.cancelBtn, isLoading && { opacity: 0.4 }]}>Отмена</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Новый пост</Text>
          <TouchableOpacity onPress={handlePublish} disabled={!canPublish}>
            <Text style={[styles.publishBtn, !canPublish && { opacity: 0.4 }]}>
              Опубликовать
            </Text>
          </TouchableOpacity>
        </View>

        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          <ScrollView contentContainerStyle={{ paddingBottom: 24 }}>
            {/* Text input card */}
            <View style={[GlassCard, styles.textCard]}>
              <TextInput
                placeholder="Что у вас нового?"
                placeholderTextColor="#1E6FA8"
                value={text}
                onChangeText={setText}
                multiline
                maxLength={500}
                style={styles.textInput}
                autoFocus
              />
              <Text style={styles.charCount}>{text.length}/500</Text>
            </View>

            {/* Image preview */}
            {imageUri ? (
              <View style={styles.previewWrap}>
                <Image source={{ uri: imageUri }} style={styles.previewImage} contentFit="cover" />
                {uploading && (
                  <View style={styles.uploadOverlay}>
                    <ActivityIndicator color="white" size="large" />
                    <Text style={styles.uploadText}>Загрузка фото...</Text>
                  </View>
                )}
                {!uploading && (
                  <TouchableOpacity style={styles.removeImgBtn} onPress={removeImage}>
                    <Text style={styles.removeImgText}>✕ Удалить фото</Text>
                  </TouchableOpacity>
                )}
              </View>
            ) : (
              <TouchableOpacity
                style={[GlassCard, styles.addPhotoBtn]}
                onPress={pickImage}
                disabled={isLoading}
              >
                <Text style={styles.addPhotoText}>📷 Добавить фото</Text>
              </TouchableOpacity>
            )}
          </ScrollView>
        </KeyboardAvoidingView>

        {/* Full-screen posting overlay */}
        {posting && (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator color="white" size="large" />
            <Text style={styles.uploadText}>Публикация...</Text>
          </View>
        )}
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, paddingVertical: 12 },
  cancelBtn: { color: "white", fontSize: 16 },
  headerTitle: { color: "white", fontSize: 17, fontWeight: "700" },
  publishBtn: { color: "#0277BD", fontSize: 15, fontWeight: "700", backgroundColor: "white", paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20 },
  textCard: { marginHorizontal: 16, marginTop: 16, padding: 16, borderRadius: 20 },
  textInput: { fontSize: 16, color: Colors.heading, minHeight: 120, textAlignVertical: "top" },
  charCount: { textAlign: "right", fontSize: 12, color: "#1E6FA8", marginTop: 8 },
  previewWrap: { marginHorizontal: 16, marginTop: 12, borderRadius: 12, overflow: "hidden" },
  previewImage: { width: "100%", aspectRatio: 16 / 9 },
  uploadOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.55)", alignItems: "center", justifyContent: "center", gap: 10 },
  uploadText: { color: "white", fontSize: 15, fontWeight: "600" },
  removeImgBtn: { padding: 12, alignItems: "center" },
  removeImgText: { color: "#ef4444", fontSize: 14, fontWeight: "600" },
  addPhotoBtn: { marginHorizontal: 16, marginTop: 12, padding: 18, borderRadius: 20, alignItems: "center" },
  addPhotoText: { color: "#0277BD", fontSize: 16, fontWeight: "600" },
  loadingOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.5)", alignItems: "center", justifyContent: "center", gap: 10 },
});
```

- [ ] **Step 2: End-to-end manual test**

1. Tap Community tab → tap "+" button
2. `CreatePostScreen` opens (slides from bottom)
3. Type text → char counter updates
4. Tap "Добавить фото" → gallery opens → pick a photo → uploading overlay appears → photo preview appears
5. Tap "Опубликовать" → "Публикация..." overlay → screen closes → new post appears at top of feed

- [ ] **Step 3: Push to GitHub and deploy backend**

```bash
git add mobile/src/screens/CreatePostScreen.tsx
git commit -m "feat: add CreatePostScreen with text input, photo picker, upload"
git push origin master
```

Then deploy the backend (Render auto-deploys on push to master, or trigger manually from Render dashboard).
