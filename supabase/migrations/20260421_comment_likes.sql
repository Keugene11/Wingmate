-- Add score to comments (already applied if run previously, IF NOT EXISTS is safe)
ALTER TABLE comments ADD COLUMN IF NOT EXISTS score integer NOT NULL DEFAULT 0;

-- Votes on comments. ids are text (not uuid) in this schema.
CREATE TABLE IF NOT EXISTS comment_votes (
  id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id text NOT NULL,
  comment_id text NOT NULL REFERENCES comments(id) ON DELETE CASCADE,
  direction smallint NOT NULL CHECK (direction IN (1, -1)),
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, comment_id)
);

CREATE INDEX IF NOT EXISTS idx_comment_votes_comment ON comment_votes(comment_id);

CREATE OR REPLACE FUNCTION update_comment_score()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    UPDATE comments SET score = (
      SELECT COALESCE(SUM(direction), 0) FROM comment_votes WHERE comment_id = OLD.comment_id
    ) WHERE id = OLD.comment_id;
    RETURN OLD;
  ELSE
    UPDATE comments SET score = (
      SELECT COALESCE(SUM(direction), 0) FROM comment_votes WHERE comment_id = NEW.comment_id
    ) WHERE id = NEW.comment_id;
    RETURN NEW;
  END IF;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS on_comment_vote_change ON comment_votes;
CREATE TRIGGER on_comment_vote_change
  AFTER INSERT OR UPDATE OR DELETE ON comment_votes
  FOR EACH ROW EXECUTE FUNCTION update_comment_score();
