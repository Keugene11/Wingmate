-- Add level column to profiles (xp column already exists from gamification migration)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS level integer NOT NULL DEFAULT 1;

-- Backfill existing users' level and xp from their total approach history
-- Level thresholds (XP resets each level): 1→2: 3, 2→3: 5, 3→4: 10, 4→5: 20, 5→6: 50
-- Cumulative approach thresholds: 0, 3, 8, 18, 38, 88
WITH totals AS (
  SELECT user_id, COALESCE(SUM(approaches_count), 0)::int AS total
  FROM checkins
  GROUP BY user_id
)
UPDATE profiles SET
  level = CASE
    WHEN t.total >= 88 THEN 6
    WHEN t.total >= 38 THEN 5
    WHEN t.total >= 18 THEN 4
    WHEN t.total >= 8  THEN 3
    WHEN t.total >= 3  THEN 2
    ELSE 1
  END,
  xp = CASE
    WHEN t.total >= 88 THEN 50  -- max level, xp capped
    WHEN t.total >= 38 THEN t.total - 38
    WHEN t.total >= 18 THEN t.total - 18
    WHEN t.total >= 8  THEN t.total - 8
    WHEN t.total >= 3  THEN t.total - 3
    ELSE t.total
  END
FROM totals t
WHERE profiles.id = t.user_id;
