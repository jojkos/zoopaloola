-- Change current_turn from uuid to integer to match game logic (1 or 2)
alter table public.games 
  alter column current_turn type integer using null; -- Reset to null or default

-- Set default to 1 for new games if needed, but we handle it in code
