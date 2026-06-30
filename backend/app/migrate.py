"""
Auto-migration: runs once on backend startup.
Requires DATABASE_URL env var (Supabase → Settings → Database → Connection string → URI).
"""
import os
import sys

# Each block is one logical unit; errors are caught per-block so one failure doesn't abort the rest.
_MIGRATIONS = [
    # ── Users ─────────────────────────────────────────────────────────────────
    """
    CREATE TABLE IF NOT EXISTS users (
      id               UUID        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
      name             TEXT        NOT NULL DEFAULT 'Пользователь',
      language         TEXT        NOT NULL DEFAULT 'ru',
      avatar_url       TEXT,
      plan             TEXT        NOT NULL DEFAULT 'free',
      plan_expires_at  TIMESTAMPTZ,
      created_at       TIMESTAMPTZ DEFAULT NOW(),
      updated_at       TIMESTAMPTZ DEFAULT NOW()
    )
    """,
    """
    ALTER TABLE users
      ADD COLUMN IF NOT EXISTS plan            TEXT        NOT NULL DEFAULT 'free',
      ADD COLUMN IF NOT EXISTS plan_expires_at TIMESTAMPTZ
    """,
    """
    ALTER TABLE users
      ADD COLUMN IF NOT EXISTS polar_customer_id TEXT
    """,
    """
    ALTER TABLE users
      ADD COLUMN IF NOT EXISTS bio TEXT
    """,
    # Storage bucket for avatars
    """
    INSERT INTO storage.buckets (id, name, public)
    VALUES ('avatars', 'avatars', true)
    ON CONFLICT (id) DO NOTHING
    """,
    """DO $$ BEGIN
      CREATE POLICY "Public read avatars" ON storage.objects
        FOR SELECT USING (bucket_id = 'avatars');
    EXCEPTION WHEN duplicate_object THEN NULL; END $$""",
    """DO $$ BEGIN
      CREATE POLICY "Users can upload own avatar" ON storage.objects
        FOR INSERT TO authenticated
        WITH CHECK (bucket_id = 'avatars' AND name LIKE auth.uid()::text || '/%');
    EXCEPTION WHEN duplicate_object THEN NULL; END $$""",
    """DO $$ BEGIN
      CREATE POLICY "Users can update own avatar" ON storage.objects
        FOR UPDATE TO authenticated
        USING (bucket_id = 'avatars' AND name LIKE auth.uid()::text || '/%');
    EXCEPTION WHEN duplicate_object THEN NULL; END $$""",
    """
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
    $$ LANGUAGE plpgsql SECURITY DEFINER
    """,
    """
    DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users
    """,
    """
    CREATE TRIGGER on_auth_user_created
      AFTER INSERT ON auth.users
      FOR EACH ROW EXECUTE FUNCTION public.handle_new_user()
    """,

    # ── Posts ──────────────────────────────────────────────────────────────────
    """
    CREATE TABLE IF NOT EXISTS posts (
      id             UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
      user_id        UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
      text           TEXT        NOT NULL CHECK (char_length(trim(text)) > 0 AND char_length(text) <= 2000),
      image_url      TEXT,
      likes_count    INTEGER     NOT NULL DEFAULT 0,
      comments_count INTEGER     NOT NULL DEFAULT 0,
      created_at     TIMESTAMPTZ DEFAULT NOW()
    )
    """,

    # ── Post likes ─────────────────────────────────────────────────────────────
    """
    CREATE TABLE IF NOT EXISTS post_likes (
      user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
      post_id    UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      PRIMARY KEY (user_id, post_id)
    )
    """,

    # ── Post comments ──────────────────────────────────────────────────────────
    """
    CREATE TABLE IF NOT EXISTS post_comments (
      id         UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
      post_id    UUID        NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
      user_id    UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
      text       TEXT        NOT NULL CHECK (char_length(trim(text)) > 0 AND char_length(text) <= 1000),
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
    """,

    # ── Subtitles history ──────────────────────────────────────────────────────
    """
    CREATE TABLE IF NOT EXISTS subtitles_history (
      id         UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
      user_id    UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
      text       TEXT        NOT NULL,
      language   TEXT        NOT NULL DEFAULT 'ru',
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
    """,

    # ── Trigger: likes_count ───────────────────────────────────────────────────
    """
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
    $$ LANGUAGE plpgsql
    """,
    """
    DROP TRIGGER IF EXISTS trg_likes_count ON post_likes
    """,
    """
    CREATE TRIGGER trg_likes_count
      AFTER INSERT OR DELETE ON post_likes
      FOR EACH ROW EXECUTE FUNCTION update_likes_count()
    """,

    # ── Trigger: comments_count ────────────────────────────────────────────────
    """
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
    $$ LANGUAGE plpgsql
    """,
    """
    DROP TRIGGER IF EXISTS trg_comments_count ON post_comments
    """,
    """
    CREATE TRIGGER trg_comments_count
      AFTER INSERT OR DELETE ON post_comments
      FOR EACH ROW EXECUTE FUNCTION update_comments_count()
    """,

    # ── RLS ────────────────────────────────────────────────────────────────────
    "ALTER TABLE users             ENABLE ROW LEVEL SECURITY",
    "ALTER TABLE posts             ENABLE ROW LEVEL SECURITY",
    "ALTER TABLE post_likes        ENABLE ROW LEVEL SECURITY",
    "ALTER TABLE post_comments     ENABLE ROW LEVEL SECURITY",
    "ALTER TABLE subtitles_history ENABLE ROW LEVEL SECURITY",

    # policies (each wrapped so duplicate errors are swallowed)
    """DO $$ BEGIN
      CREATE POLICY "Anyone can read user profiles" ON users FOR SELECT USING (true);
    EXCEPTION WHEN duplicate_object THEN NULL; END $$""",
    """DO $$ BEGIN
      CREATE POLICY "Users can update own profile" ON users FOR UPDATE USING (auth.uid() = id);
    EXCEPTION WHEN duplicate_object THEN NULL; END $$""",
    """DO $$ BEGIN
      CREATE POLICY "Users can insert own profile" ON users FOR INSERT WITH CHECK (auth.uid() = id);
    EXCEPTION WHEN duplicate_object THEN NULL; END $$""",

    """DO $$ BEGIN
      CREATE POLICY "Anyone can read posts" ON posts FOR SELECT USING (true);
    EXCEPTION WHEN duplicate_object THEN NULL; END $$""",
    """DO $$ BEGIN
      CREATE POLICY "Authenticated users can create posts" ON posts FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
    EXCEPTION WHEN duplicate_object THEN NULL; END $$""",
    """DO $$ BEGIN
      CREATE POLICY "Authors can delete own posts" ON posts FOR DELETE USING (auth.uid() = user_id);
    EXCEPTION WHEN duplicate_object THEN NULL; END $$""",

    """DO $$ BEGIN
      CREATE POLICY "Anyone can read likes" ON post_likes FOR SELECT USING (true);
    EXCEPTION WHEN duplicate_object THEN NULL; END $$""",
    """DO $$ BEGIN
      CREATE POLICY "Authenticated users can like" ON post_likes FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
    EXCEPTION WHEN duplicate_object THEN NULL; END $$""",
    """DO $$ BEGIN
      CREATE POLICY "Users can unlike own likes" ON post_likes FOR DELETE USING (auth.uid() = user_id);
    EXCEPTION WHEN duplicate_object THEN NULL; END $$""",

    """DO $$ BEGIN
      CREATE POLICY "Anyone can read comments" ON post_comments FOR SELECT USING (true);
    EXCEPTION WHEN duplicate_object THEN NULL; END $$""",
    """DO $$ BEGIN
      CREATE POLICY "Authenticated users can comment" ON post_comments FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
    EXCEPTION WHEN duplicate_object THEN NULL; END $$""",
    """DO $$ BEGIN
      CREATE POLICY "Authors can delete own comments" ON post_comments FOR DELETE USING (auth.uid() = user_id);
    EXCEPTION WHEN duplicate_object THEN NULL; END $$""",

    """DO $$ BEGIN
      CREATE POLICY "Users can read own subtitle history" ON subtitles_history FOR SELECT USING (auth.uid() = user_id);
    EXCEPTION WHEN duplicate_object THEN NULL; END $$""",
    """DO $$ BEGIN
      CREATE POLICY "Users can save subtitles" ON subtitles_history FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
    EXCEPTION WHEN duplicate_object THEN NULL; END $$""",

    # ── Chat messages (public group chat) ────────────────────────────────────
    """
    CREATE TABLE IF NOT EXISTS chat_messages (
      id          UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
      user_id     UUID        NOT NULL,
      user_name   TEXT        NOT NULL DEFAULT 'Пользователь',
      text        TEXT        NOT NULL CHECK (char_length(trim(text)) > 0 AND char_length(text) <= 500),
      created_at  TIMESTAMPTZ DEFAULT NOW()
    )
    """,

    # ── Direct messages (1:1) ─────────────────────────────────────────────────
    """
    CREATE TABLE IF NOT EXISTS direct_messages (
      id            UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
      sender_id     UUID        NOT NULL,
      sender_name   TEXT        NOT NULL DEFAULT 'Пользователь',
      receiver_id   UUID        NOT NULL,
      receiver_name TEXT        NOT NULL DEFAULT 'Пользователь',
      text          TEXT        NOT NULL CHECK (char_length(trim(text)) > 0 AND char_length(text) <= 1000),
      created_at    TIMESTAMPTZ DEFAULT NOW(),
      read_at       TIMESTAMPTZ
    )
    """,

    # ── RLS for chat tables ───────────────────────────────────────────────────
    "ALTER TABLE chat_messages   ENABLE ROW LEVEL SECURITY",
    "ALTER TABLE direct_messages ENABLE ROW LEVEL SECURITY",

    """DO $$ BEGIN
      CREATE POLICY "Public can read chat" ON chat_messages FOR SELECT USING (true);
    EXCEPTION WHEN duplicate_object THEN NULL; END $$""",
    """DO $$ BEGIN
      CREATE POLICY "Authenticated users can send chat" ON chat_messages FOR INSERT TO authenticated
        WITH CHECK (auth.uid() = user_id);
    EXCEPTION WHEN duplicate_object THEN NULL; END $$""",
    """DO $$ BEGIN
      CREATE POLICY "Users can delete own chat messages" ON chat_messages FOR DELETE USING (auth.uid() = user_id);
    EXCEPTION WHEN duplicate_object THEN NULL; END $$""",

    """DO $$ BEGIN
      CREATE POLICY "DM participants can read" ON direct_messages FOR SELECT
        USING (auth.uid() = sender_id OR auth.uid() = receiver_id);
    EXCEPTION WHEN duplicate_object THEN NULL; END $$""",
    """DO $$ BEGIN
      CREATE POLICY "Authenticated users can send DM" ON direct_messages FOR INSERT TO authenticated
        WITH CHECK (auth.uid() = sender_id);
    EXCEPTION WHEN duplicate_object THEN NULL; END $$""",
    """DO $$ BEGIN
      CREATE POLICY "Sender can delete own DM" ON direct_messages FOR DELETE USING (auth.uid() = sender_id);
    EXCEPTION WHEN duplicate_object THEN NULL; END $$""",

    # ── Realtime ───────────────────────────────────────────────────────────────
    """DO $$ BEGIN
      ALTER PUBLICATION supabase_realtime ADD TABLE posts;
    EXCEPTION WHEN OTHERS THEN NULL; END $$""",
    """DO $$ BEGIN
      ALTER PUBLICATION supabase_realtime ADD TABLE post_likes;
    EXCEPTION WHEN OTHERS THEN NULL; END $$""",
    """DO $$ BEGIN
      ALTER PUBLICATION supabase_realtime ADD TABLE post_comments;
    EXCEPTION WHEN OTHERS THEN NULL; END $$""",
    """DO $$ BEGIN
      ALTER PUBLICATION supabase_realtime ADD TABLE chat_messages;
    EXCEPTION WHEN OTHERS THEN NULL; END $$""",
    """DO $$ BEGIN
      ALTER PUBLICATION supabase_realtime ADD TABLE direct_messages;
    EXCEPTION WHEN OTHERS THEN NULL; END $$""",
]


def run_migrations() -> None:
    database_url = os.getenv("DATABASE_URL")
    if not database_url:
        print("[migrate] DATABASE_URL not set — skipping auto-migration", file=sys.stderr)
        return

    try:
        import psycopg2
        conn = psycopg2.connect(database_url)
        conn.autocommit = True
        cur = conn.cursor()
    except Exception as e:
        print(f"[migrate] Cannot connect to DB: {e}", file=sys.stderr)
        return

    ok = 0
    skipped = 0
    failed = 0
    for sql in _MIGRATIONS:
        stmt = sql.strip()
        if not stmt:
            continue
        try:
            cur.execute(stmt)
            ok += 1
        except Exception as e:
            msg = str(e).split("\n")[0]
            print(f"[migrate] SKIP ({msg[:80]})", file=sys.stderr)
            skipped += 1
            # reconnect after error so subsequent statements still work
            try:
                conn.close()
                conn = psycopg2.connect(database_url)
                conn.autocommit = True
                cur = conn.cursor()
            except Exception:
                failed += 1
                break

    # Signal PostgREST to reload its schema cache so new tables are immediately visible
    try:
        cur = conn.cursor()
        cur.execute("NOTIFY pgrst, 'reload schema'")
        cur.close()
    except Exception:
        pass

    conn.close()
    print(f"[migrate] Done: {ok} ok, {skipped} skipped, {failed} failed", file=sys.stderr)
