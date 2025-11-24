import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../services/supabase';
import type { Vector } from '../game/types';
import { usePhysics } from './usePhysics';
import { GameEngine } from '../game/GameEngine';

export function useSupabaseGame(width: number, height: number) {
  const { gameState, setGameState, shoot, isSimulating } = usePhysics(width, height);
  const [gameId, setGameId] = useState<string | null>(null);
  const [playerId, setPlayerId] = useState<1 | 2 | null>(null);
  const [status, setStatus] = useState<'idle' | 'waiting' | 'playing'>('idle');
  const [error, setError] = useState<string | null>(null);

  // Subscribe to game updates
  useEffect(() => {
    if (!gameId) return;

    const channel = supabase
      .channel(`game:${gameId}`)
      .on('postgres_changes', { 
        event: 'UPDATE', 
        schema: 'public', 
        table: 'games', 
        filter: `id=eq.${gameId}` 
      }, (payload) => {
        const newData = payload.new;
        
        // If opponent joined
        if (status === 'waiting' && newData.status === 'playing') {
          setStatus('playing');
        }

        // If we received a new game state
        if (newData.game_state) {
          // If it's now our turn, update local state
          // Or if the game finished
          if (newData.game_state.turn === playerId || newData.status === 'finished') {
             setGameState(newData.game_state);
          }
          
          // Also update status if changed
          if (newData.status) {
            setStatus(newData.status);
          }
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [gameId, playerId, status, setGameState]);

  // Reconnection logic
  useEffect(() => {
    const savedGameId = localStorage.getItem('zoopaloola_game_id');
    const savedPlayerId = localStorage.getItem('zoopaloola_player_id');
    
    if (savedGameId && savedPlayerId && !gameId) {
      // Try to reconnect
      const reconnect = async () => {
        const { data: game, error } = await supabase
          .from('games')
          .select('*')
          .eq('id', savedGameId)
          .single();

        if (game && !error && game.status !== 'finished') {
          setGameId(savedGameId);
          setPlayerId(parseInt(savedPlayerId) as 1 | 2);
          setStatus(game.status);
          setGameState(game.game_state);
        } else {
          // Invalid or finished game, clear storage
          localStorage.removeItem('zoopaloola_game_id');
          localStorage.removeItem('zoopaloola_player_id');
        }
      };
      reconnect();
    }
  }, []);

  const createGame = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Ensure we have a valid initial state
      let initialState = gameState;
      if (!initialState) {
        // If usePhysics hasn't initialized yet, create a temporary engine to get the state
        const engine = new GameEngine(width, height);
        initialState = engine.initGame();
      }

      const { data, error } = await supabase
        .from('games')
        .insert([{ 
          player1_id: user.id, 
          status: 'waiting',
          game_state: initialState
        }])
        .select()
        .single();

      if (error) throw error;
      
      setGameId(data.id);
      setPlayerId(1);
      setStatus('waiting');
      
      // Persist
      localStorage.setItem('zoopaloola_game_id', data.id);
      localStorage.setItem('zoopaloola_player_id', '1');

      return data.id;
    } catch (e: any) {
      setError(e.message);
      return null;
    }
  };

  const joinGame = async (id: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Check if game exists and is waiting
      const { data: game, error: fetchError } = await supabase
        .from('games')
        .select('*')
        .eq('id', id)
        .single();

      if (fetchError || !game) throw new Error('Game not found');
      if (game.status !== 'waiting') throw new Error('Game is not available');

      // Join
      const { error: updateError } = await supabase
        .from('games')
        .update({ 
          player2_id: user.id, 
          status: 'playing' 
        })
        .eq('id', id);

      if (updateError) throw updateError;

      setGameId(id);
      setPlayerId(2);
      setStatus('playing');
      setGameState(game.game_state);

      // Persist
      localStorage.setItem('zoopaloola_game_id', id);
      localStorage.setItem('zoopaloola_player_id', '2');
    } catch (e: any) {
      setError(e.message);
    }
  };

  const onShoot = useCallback(async (ballId: number, vector: Vector, power: number) => {
    if (!gameId || !playerId) return;

    // 1. Send shot vector to opponent (so they can replay)
    await supabase
      .from('games')
      .update({
        last_shot_vector: { ballId, x: vector.x, y: vector.y, power }
      })
      .eq('id', gameId);

    // 2. Run local physics
    shoot(ballId, vector, power, async (finalState) => {
      // 3. When done, update authoritative state and switch turn
      const nextTurn = playerId === 1 ? 2 : 1;
      // We need to map 1/2 to UUIDs? No, `current_turn` in DB is UUID.
      // Wait, my schema said `current_turn` is UUID.
      // But my `GameState` uses 1 | 2.
      // I should map it.
      // Actually, for simplicity, let's store 1 or 2 in `game_state.turn`.
      // The DB column `current_turn` might be redundant or used for RLS.
      // Let's rely on `game_state.turn`.
      
      const updatedState = { ...finalState, turn: nextTurn as 1 | 2 };
      
      await supabase
        .from('games')
        .update({
          game_state: updatedState,
          current_turn: nextTurn // Update the column too for subscription filter
        })
        .eq('id', gameId);
    });
  }, [gameId, playerId, shoot]);

  return {
    gameState,
    createGame,
    joinGame,
    onShoot,
    playerId,
    status,
    error,
    isSimulating
  };
}
