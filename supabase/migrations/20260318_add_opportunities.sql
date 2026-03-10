-- Add opportunities tracking to checkins
ALTER TABLE checkins
  ADD COLUMN IF NOT EXISTS opportunities_count integer NOT NULL DEFAULT 0;

-- Backfill: set opportunities = approaches for existing rows
UPDATE checkins SET opportunities_count = approaches_count WHERE opportunities_count = 0 AND approaches_count > 0;
