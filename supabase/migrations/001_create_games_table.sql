-- Create games table
create table public.games (
  id uuid primary key default gen_random_uuid(),
  player1_id uuid references auth.users not null,
  player2_id uuid references auth.users,
  status text check (status in ('waiting', 'playing', 'finished')) default 'waiting',
  current_turn uuid, -- ID of the player whose turn it is
  game_state jsonb, -- Snapshot of balls, scores, etc.
  last_shot_vector jsonb, -- Vector of the last shot
  last_update timestamp with time zone default now(),
  created_at timestamp with time zone default now()
);

-- Enable RLS
alter table public.games enable row level security;

-- Policies
create policy "Public games are viewable by everyone"
  on public.games for select
  using (true);

create policy "Users can create games"
  on public.games for insert
  with check (auth.uid() = player1_id);

create policy "Players can update their games"
  on public.games for update
  using (auth.uid() in (player1_id, player2_id));

-- Realtime
alter publication supabase_realtime add table public.games;
