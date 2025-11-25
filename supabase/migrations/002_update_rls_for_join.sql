-- Allow users to update a game if they are joining it (player2_id is null)
create policy "Players can join games"
  on public.games for update
  using (
    (auth.uid() = player1_id) OR 
    (player2_id is null) OR
    (auth.uid() = player2_id)
  );

-- Drop the old restrictive policy if it exists (or we can just add this one, but better to replace)
-- The previous policy was:
-- create policy "Players can update their games"
--   on public.games for update
--   using (auth.uid() in (player1_id, player2_id));

-- We need to drop the old one to avoid conflicts or just update it.
-- Since I cannot easily check if it exists in a migration without PL/pgSQL, 
-- and I want to be safe, I will drop the old one and recreate it with the new logic.

drop policy if exists "Players can update their games" on public.games;

create policy "Players can update games"
  on public.games for update
  using (
    auth.uid() = player1_id OR 
    auth.uid() = player2_id OR
    (player2_id is null) -- Allow joining
  );
