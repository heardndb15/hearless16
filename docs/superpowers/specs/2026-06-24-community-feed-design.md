# Community Feed — Design Spec (Phase 1)

## Goal

Add a community tab where users with hearing impairments can post text + photo content, like and comment on each other's posts — like Threads/Instagram, built into the Hearless app.

## Architecture

**New files:**
- `mobile/src/screens/CommunityFeedScreen.tsx` — main feed screen
- `mobile/src/screens/PostDetailScreen.tsx` — single post + comments
- `mobile/src/screens/CreatePostScreen.tsx` — create new post
- `backend/app/routes/community.py` — all community API routes
- `backend/supabase/migration_community.sql` — tables + triggers + RLS

**Modified files:**
- `backend/app/main.py` — register community router
- `mobile/src/navigation/` (or App.tsx) — add Community tab + screens to stack

**Navigation flow:**
```
Bottom Tab: Community
  CommunityFeedScreen (feed, sort toggle)
    → tap post / comments icon → PostDetailScreen
    → tap [+] button → CreatePostScreen
```

## Global Constraints

- Expo SDK 51, React Native
- Gradient: `['#1565C0', '#42A5F5', '#E3F2FD']`, locations `[0, 0.45, 1]`
- Glass card: `backgroundColor: 'rgba(255,255,255,0.72)'`, `borderRadius: 20`, `borderWidth: 1.5`, `borderColor: 'rgba(255,255,255,0.6)'`, `shadowColor: '#0288D1'`, `shadowOpacity: 0.18`, `shadowRadius: 20`
- Accent: `#0277BD`; heading: `#0D47A1`; text secondary: `#1E6FA8`
- Auth: Bearer token from `supabase.auth.getSession()` — same pattern as existing screens
- Image upload: Supabase Storage bucket `community-media`, public read
- `expo-image-picker` for photo selection (already available in Expo SDK 51)
- Pagination: 20 posts per page via `limit` + `offset` query params
- Post text max: 500 characters; comment text max: 300 characters
- Phase 2 (video, reposts, stories) is explicitly out of scope

---

## Section 1: Database Migration

**File:** `backend/supabase/migration_community.sql`

```sql
-- Posts
CREATE TABLE posts (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id     UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  text        TEXT NOT NULL CHECK (char_length(text) BETWEEN 1 AND 500),
  image_url   TEXT,
  likes_count INT DEFAULT 0,
  comments_count INT DEFAULT 0,
  created_at  TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_posts_created_at ON posts (created_at DESC);
CREATE INDEX idx_posts_likes ON posts (likes_count DESC);

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

-- Trigger: update likes_count on post
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

-- Trigger: update comments_count on post
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

-- RLS
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE post_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE post_comments ENABLE ROW LEVEL SECURITY;

-- Posts: anyone can read, authenticated users can insert own, authors can delete own
CREATE POLICY "posts_read" ON posts FOR SELECT USING (true);
CREATE POLICY "posts_insert" ON posts FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "posts_delete" ON posts FOR DELETE USING (auth.uid() = user_id);

-- Likes: anyone can read, authenticated can insert/delete own
CREATE POLICY "likes_read" ON post_likes FOR SELECT USING (true);
CREATE POLICY "likes_insert" ON post_likes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "likes_delete" ON post_likes FOR DELETE USING (auth.uid() = user_id);

-- Comments: anyone can read, authenticated can insert/delete own
CREATE POLICY "comments_read" ON post_comments FOR SELECT USING (true);
CREATE POLICY "comments_insert" ON post_comments FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "comments_delete" ON post_comments FOR DELETE USING (auth.uid() = user_id);
```

---

## Section 2: Backend Routes

**File:** `backend/app/routes/community.py`

### Pydantic models

```python
class PostCreate(BaseModel):
    text: str  # 1–500 chars validated at DB level
    image_url: Optional[str] = None

class CommentCreate(BaseModel):
    text: str  # 1–300 chars

class PostResponse(BaseModel):
    id: str
    text: str
    image_url: Optional[str]
    likes_count: int
    comments_count: int
    liked_by_me: bool
    created_at: str
    author: dict  # {id, name, avatar_url}

class CommentResponse(BaseModel):
    id: str
    text: str
    created_at: str
    author: dict  # {id, name, avatar_url}
```

### Endpoints

**GET `/community/posts`**
- Query params: `sort: Literal["new", "popular"] = "new"`, `limit: int = 20`, `offset: int = 0`
- Auth: optional (token in header if present → populate `liked_by_me`)
- ORDER BY: `sort=new` → `created_at DESC`, `sort=popular` → `likes_count DESC, created_at DESC`
- JOIN with `users` table for `author.name` and `author.avatar_url`
- Returns: `list[PostResponse]`

**POST `/community/posts`**
- Auth: required
- Body: `PostCreate`
- Insert into `posts` with `user_id` from token
- Returns: `PostResponse`

**DELETE `/community/posts/{post_id}`**
- Auth: required, must be post author
- Returns: `{"ok": true}`

**POST `/community/posts/{post_id}/like`**
- Auth: required
- Toggle: if `(user_id, post_id)` exists in `post_likes` → DELETE (unlike), else → INSERT (like)
- Returns: `{"liked": bool, "likes_count": int}`

**GET `/community/posts/{post_id}/comments`**
- Auth: none
- ORDER BY `created_at ASC`
- Returns: `list[CommentResponse]`

**POST `/community/posts/{post_id}/comments`**
- Auth: required
- Body: `CommentCreate`
- Returns: `CommentResponse`

**DELETE `/community/comments/{comment_id}`**
- Auth: required, must be comment author
- Returns: `{"ok": true}`

**POST `/community/upload`**
- Auth: required
- Body: `multipart/form-data` with field `file` (JPEG/PNG, max 5MB)
- Upload to Supabase Storage bucket `community-media` with path `{user_id}/{uuid}.jpg`
- Returns: `{"image_url": "https://..."}`

### Register in main.py

```python
from app.routes import community
app.include_router(community.router, prefix="/community", tags=["community"])
```

---

## Section 3: CommunityFeedScreen

**File:** `mobile/src/screens/CommunityFeedScreen.tsx`

### Layout
```
LinearGradient (full screen)
  SafeAreaView
    Header row:
      Text "Community"  fontSize 24 fontWeight 700 color white
      TouchableOpacity [+]  → navigation.navigate('CreatePost')

    Sort toggle row:
      TouchableOpacity "Новые"    active: bg #0277BD white text
      TouchableOpacity "Популярные"  inactive: bg rgba(255,255,255,0.35) color #0D47A1
      borderRadius 20, padding 8 16

    FlatList
      data: posts[]
      keyExtractor: post.id
      onEndReached: loadMore()  (append next 20)
      onEndReachedThreshold: 0.3
      refreshControl: pull-to-refresh → reload from offset 0
      renderItem: <PostCard post={post} onLike={handleLike} onPress={openDetail} />
      ListEmptyComponent: glass card "Будьте первым — опубликуйте пост!"
```

### PostCard component (inline in same file)
```
glass card (GlassCard styles, marginHorizontal 16, marginBottom 12)
  Row: avatar circle (40×40, bg #0277BD initials) | author name + time ago
  Text: post.text  color #0D47A1  fontSize 15  lineHeight 22
  Image: if post.image_url → expo-image, width 100%, aspectRatio 16/9,
         borderRadius 12, marginTop 8, contentFit="cover"
  Row (footer):
    TouchableOpacity ♥ {likes_count}
      heart color: post.liked_by_me ? '#ef4444' : '#1E6FA8'
      optimistic update on press
    TouchableOpacity 💬 {comments_count} → openDetail
    Spacer
    if post.author.id === currentUserId: TouchableOpacity "···" → delete confirm
```

### State
```typescript
const [posts, setPosts] = useState<PostResponse[]>([]);
const [sort, setSort] = useState<'new' | 'popular'>('new');
const [offset, setOffset] = useState(0);
const [loading, setLoading] = useState(false);
const [refreshing, setRefreshing] = useState(false);
```

### Like handler (optimistic)
```typescript
const handleLike = async (postId: string) => {
  // 1. Toggle liked_by_me and adjust likes_count immediately in state
  setPosts(prev => prev.map(p =>
    p.id === postId
      ? { ...p, liked_by_me: !p.liked_by_me, likes_count: p.liked_by_me ? p.likes_count - 1 : p.likes_count + 1 }
      : p
  ));
  // 2. Send to backend; on error revert
  try {
    await api.post(`/community/posts/${postId}/like`);
  } catch {
    setPosts(prev => prev.map(p =>
      p.id === postId
        ? { ...p, liked_by_me: !p.liked_by_me, likes_count: p.liked_by_me ? p.likes_count - 1 : p.likes_count + 1 }
        : p
    ));
  }
};
```

---

## Section 4: PostDetailScreen

**File:** `mobile/src/screens/PostDetailScreen.tsx`

### Route params
```typescript
type PostDetailParams = { post: PostResponse };
```

### Layout
```
LinearGradient
  SafeAreaView
    ← back button (white, top-left)

    KeyboardAvoidingView (behavior="padding")
      ScrollView
        PostCard (full post, same component, likes work here too)

        Text "Комментарии" fontSize 18 fontWeight 600 color white marginLeft 16

        comments.map(c =>
          glass card marginHorizontal 16 marginBottom 8
            Row: avatar | author name + time
            Text: c.text  color #0D47A1
            if c.author.id === currentUserId: delete button (red ×)
        )

        if comments.length === 0:
          Text "Комментариев пока нет" color rgba(255,255,255,0.7) centered

      Comment input row (pinned bottom):
        TextInput placeholder "Написать комментарий..."
          glass style, flex 1, multiline, maxHeight 80
        TouchableOpacity "→" send button
          bg #0277BD, 44×44, borderRadius 22
          disabled + opacity 0.5 if text empty
```

### State
```typescript
const [comments, setComments] = useState<CommentResponse[]>([]);
const [commentText, setCommentText] = useState('');
const [sending, setSending] = useState(false);
```

---

## Section 5: CreatePostScreen

**File:** `mobile/src/screens/CreatePostScreen.tsx`

### Layout
```
LinearGradient
  SafeAreaView
    Header row:
      TouchableOpacity "Отмена" (white) | Text "Новый пост" | TouchableOpacity "Опубликовать" (#0277BD, disabled if text empty)

    KeyboardAvoidingView
      ScrollView
        glass card marginHorizontal 16 marginTop 16
          TextInput
            placeholder "Что у вас нового?"
            multiline, maxLength 500
            fontSize 16 color #0D47A1
            minHeight 120

          Text "{text.length}/500"  right-aligned  color #1E6FA8  fontSize 12

        if imageUri:
          Image preview 100% width aspectRatio 16/9 borderRadius 12 marginHorizontal 16
          TouchableOpacity "✕ Удалить фото" color #ef4444

        TouchableOpacity "📷 Добавить фото"
          glass card style, marginHorizontal 16, marginTop 8
          centered text color #0277BD

    ActivityIndicator overlay while uploading/posting
```

### Flow
1. User taps "Добавить фото" → `ImagePicker.launchImageLibraryAsync({ mediaTypes: 'Images', quality: 0.8 })`
2. On pick → `POST /community/upload` with `FormData` → store returned `image_url`
3. User taps "Опубликовать" → `POST /community/posts` with `{ text, image_url }`
4. On success → `navigation.goBack()`, parent feed refetches

---

## Section 6: Navigation Wiring

Add `Community` tab to bottom tab navigator and register screens in the stack.

**Tab icon:** 👥 or a community SVG icon, label "Community"

**Stack screens to add:**
```typescript
<Stack.Screen name="CreatePost" component={CreatePostScreen} options={{ headerShown: false }} />
<Stack.Screen name="PostDetail" component={PostDetailScreen} options={{ headerShown: false }} />
```

The `CommunityFeedScreen` is the tab root component.

---

## Out of Scope (Phase 2)

- Video posts
- Reposts / shares
- Stories
- Push notifications for likes/comments
- Mentions (@user) and hashtags
- Post editing
