-- Add approach outcome tracking to checkins
ALTER TABLE checkins
  ADD COLUMN IF NOT EXISTS approaches_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS successes_count integer NOT NULL DEFAULT 0;

-- Backfill: if talked = true and no approaches_count set, count as 1 approach
UPDATE checkins SET approaches_count = 1 WHERE talked = true AND approaches_count = 0;
