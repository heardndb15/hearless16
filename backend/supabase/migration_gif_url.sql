-- Add gif_url column to gestures table
ALTER TABLE gestures ADD COLUMN IF NOT EXISTS gif_url TEXT;

-- Placeholder GIF URLs — replace with real Supabase Storage URLs after upload
-- Pattern: https://<project>.supabase.co/storage/v1/object/public/gesture-gifs/<id>.gif
UPDATE gestures SET gif_url = NULL WHERE gif_url IS NULL;

COMMENT ON COLUMN gestures.gif_url IS 'URL of animated GIF demonstrating the gesture. Hosted in Supabase Storage bucket gesture-gifs.';
