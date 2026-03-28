-- Backfill XP to be cumulative (total approaches) instead of per-level.
-- This sets profile.xp = sum of all approaches from checkins.
update profiles p
set xp = coalesce((
  select sum(c.approaches_count)
  from checkins c
  where c.user_id = p.id
), 0);

-- Recompute levels from cumulative XP using new thresholds:
-- Level 1: 0, Level 2: 3, Level 3: 10, Level 4: 20, Level 5: 50, Level 6: 100
update profiles
set level = case
  when xp >= 100 then 6
  when xp >= 50 then 5
  when xp >= 20 then 4
  when xp >= 10 then 3
  when xp >= 3 then 2
  else 1
end;
