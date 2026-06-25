-- ============================================================
-- Hearless Community Chat Migration
-- Run this in Supabase SQL Editor: https://supabase.com/dashboard
-- ============================================================

-- 1. Public chat messages
CREATE TABLE IF NOT EXISTS chat_messages (
  id          UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id     UUID        NOT NULL,
  user_name   TEXT        NOT NULL DEFAULT 'Пользователь',
  text        TEXT        NOT NULL CHECK (char_length(trim(text)) > 0 AND char_length(text) <= 500),
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Direct messages (1:1)
CREATE TABLE IF NOT EXISTS direct_messages (
  id            UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  sender_id     UUID        NOT NULL,
  sender_name   TEXT        NOT NULL DEFAULT 'Пользователь',
  receiver_id   UUID        NOT NULL,
  receiver_name TEXT        NOT NULL DEFAULT 'Пользователь',
  text          TEXT        NOT NULL CHECK (char_length(trim(text)) > 0 AND char_length(text) <= 1000),
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  read_at       TIMESTAMPTZ
);

-- 3. Row-level security
ALTER TABLE chat_messages    ENABLE ROW LEVEL SECURITY;
ALTER TABLE direct_messages  ENABLE ROW LEVEL SECURITY;

-- chat_messages policies
CREATE POLICY "Public can read chat"
  ON chat_messages FOR SELECT USING (true);

CREATE POLICY "Authenticated users can send chat"
  ON chat_messages FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own chat messages"
  ON chat_messages FOR DELETE USING (auth.uid() = user_id);

-- direct_messages policies
CREATE POLICY "DM participants can read"
  ON direct_messages FOR SELECT
  USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

CREATE POLICY "Authenticated users can send DM"
  ON direct_messages FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = sender_id);

CREATE POLICY "Sender can delete own DM"
  ON direct_messages FOR DELETE USING (auth.uid() = sender_id);

-- 4. Enable Realtime for both tables
ALTER PUBLICATION supabase_realtime ADD TABLE chat_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE direct_messages;
