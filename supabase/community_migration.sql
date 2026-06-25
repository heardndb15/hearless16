-- ============================================================
-- Hearless Community Full Migration
-- Run AFTER chat_migration.sql in Supabase SQL Editor
-- ============================================================

-- 1. Users profile table (mirrors auth.users)
CREATE TABLE IF NOT EXISTS users (
  id          UUID        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name        TEXT        NOT NULL DEFAULT 'Пользователь',
  language    TEXT        NOT NULL DEFAULT 'ru',
  avatar_url  TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Auto-create user row on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, name)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1), 'Пользователь')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 2. Posts
CREATE TABLE IF NOT EXISTS posts (
  id             UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id        UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  text           TEXT        NOT NULL CHECK (char_length(trim(text)) > 0 AND char_length(text) <= 2000),
  image_url      TEXT,
  likes_count    INTEGER     NOT NULL DEFAULT 0,
  comments_count INTEGER     NOT NULL DEFAULT 0,
  created_at     TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Post likes
CREATE TABLE IF NOT EXISTS post_likes (
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  post_id    UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (user_id, post_id)
);

-- 4. Post comments
CREATE TABLE IF NOT EXISTS post_comments (
  id         UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id    UUID        NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  user_id    UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  text       TEXT        NOT NULL CHECK (char_length(trim(text)) > 0 AND char_length(text) <= 1000),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Subtitles history (if not already created elsewhere)
CREATE TABLE IF NOT EXISTS subtitles_history (
  id         UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id    UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  text       TEXT        NOT NULL,
  language   TEXT        NOT NULL DEFAULT 'ru',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── Auto-update likes_count / comments_count ──────────────────────────────────

CREATE OR REPLACE FUNCTION update_likes_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE posts SET likes_count = likes_count + 1 WHERE id = NEW.post_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE posts SET likes_count = GREATEST(likes_count - 1, 0) WHERE id = OLD.post_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_likes_count ON post_likes;
CREATE TRIGGER trg_likes_count
  AFTER INSERT OR DELETE ON post_likes
  FOR EACH ROW EXECUTE FUNCTION update_likes_count();

CREATE OR REPLACE FUNCTION update_comments_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE posts SET comments_count = comments_count + 1 WHERE id = NEW.post_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE posts SET comments_count = GREATEST(comments_count - 1, 0) WHERE id = OLD.post_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_comments_count ON post_comments;
CREATE TRIGGER trg_comments_count
  AFTER INSERT OR DELETE ON post_comments
  FOR EACH ROW EXECUTE FUNCTION update_comments_count();

-- ── Row-Level Security ─────────────────────────────────────────────────────────

ALTER TABLE users             ENABLE ROW LEVEL SECURITY;
ALTER TABLE posts             ENABLE ROW LEVEL SECURITY;
ALTER TABLE post_likes        ENABLE ROW LEVEL SECURITY;
ALTER TABLE post_comments     ENABLE ROW LEVEL SECURITY;
ALTER TABLE subtitles_history ENABLE ROW LEVEL SECURITY;

-- users
CREATE POLICY "Anyone can read user profiles"
  ON users FOR SELECT USING (true);

CREATE POLICY "Users can update own profile"
  ON users FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON users FOR INSERT WITH CHECK (auth.uid() = id);

-- posts
CREATE POLICY "Anyone can read posts"
  ON posts FOR SELECT USING (true);

CREATE POLICY "Authenticated users can create posts"
  ON posts FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Authors can delete own posts"
  ON posts FOR DELETE USING (auth.uid() = user_id);

-- post_likes
CREATE POLICY "Anyone can read likes"
  ON post_likes FOR SELECT USING (true);

CREATE POLICY "Authenticated users can like"
  ON post_likes FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can unlike own likes"
  ON post_likes FOR DELETE USING (auth.uid() = user_id);

-- post_comments
CREATE POLICY "Anyone can read comments"
  ON post_comments FOR SELECT USING (true);

CREATE POLICY "Authenticated users can comment"
  ON post_comments FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Authors can delete own comments"
  ON post_comments FOR DELETE USING (auth.uid() = user_id);

-- subtitles_history
CREATE POLICY "Users can read own subtitle history"
  ON subtitles_history FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can save subtitles"
  ON subtitles_history FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- ── Realtime ──────────────────────────────────────────────────────────────────

ALTER PUBLICATION supabase_realtime ADD TABLE posts;
ALTER PUBLICATION supabase_realtime ADD TABLE post_likes;
ALTER PUBLICATION supabase_realtime ADD TABLE post_comments;

-- ── Storage bucket for community media ───────────────────────────────────────
-- Run in Supabase dashboard or uncomment if using service key:
-- INSERT INTO storage.buckets (id, name, public)
--   VALUES ('community-media', 'community-media', true)
--   ON CONFLICT (id) DO NOTHING;
