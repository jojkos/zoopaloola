import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../services/supabase';
import type { Vector } from '../game/types';
import { usePhysics } from './usePhysics';
import { GameEngine } from '../game/GameEngine';

export function useSupabaseGame(width: number, height: number) {
  const { gameState, setGameState, shoot, isSimulating } = usePhysics(width, height);
  const [gameId, setGameId] = useState<string | null>(null);
  const [playerId, setPlayerId] = useState<1 | 2 | null>(null);
  const [status, setStatus] = useState<'idle' | 'waiting' | 'playing' | 'finished'>('idle');
  const [error, setError] = useState<string | null>(null);
  const [isProcessingShot, setIsProcessingShot] = useState(false);

  // Refs for subscription callbacks to avoid stale closures and re-subscriptions
  const gameStateRef = useRef(gameState);
  // isSimulating is now a Ref from usePhysics, so we don't need a local ref for it
  const processedShotsRef = useRef<Set<number>>(new Set()); // Track processed shot timestamps

  useEffect(() => {
    gameStateRef.current = gameState;
  }, [gameState]);

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

        // 1. Handle Status Changes
        if (newData.status && newData.status !== status) {
          if (status === 'waiting' && newData.status === 'playing') {
            setStatus('playing');
          }
          if (newData.status === 'finished') {
            setStatus('finished');
            setGameState(newData.game_state); // Always sync final state
            return;
          }
        }

        // 2. Handle New Shots (Event-Driven)
        if (newData.last_shot_vector) {
          const { ballId, x, y, power, timestamp, shooterId } = newData.last_shot_vector;

          // If it's a new shot AND not from me (or I am not the one who initiated it)
          // We check shooterId !== playerId to avoid re-simulating our own shot if the echo comes back
          if (timestamp && !processedShotsRef.current.has(timestamp) && shooterId !== playerId) {
            processedShotsRef.current.add(timestamp);

            // Trigger local simulation
            shoot(ballId, { x, y }, power, (finalState) => {
              // After simulation, locally switch turn
              const nextTurn = playerId === 1 ? 2 : 1;
              // Only update if we are still on the old turn
              if (finalState.turn !== nextTurn) {
                setGameState({ ...finalState, turn: nextTurn as 1 | 2 });
              }
            });
          }
        }

        // 3. Handle Game State Sync (Conflict Resolution)
        // Only sync if we are NOT simulating.
        // This prevents "snapping" while balls are moving.
        // Use the Ref directly to get the live value
        if (newData.game_state && !isSimulating.current) {
          setGameState(newData.game_state);
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [gameId, playerId, status, shoot, setGameState, isSimulating]); // Added isSimulating (ref) to deps

  // Reconnection logic
  useEffect(() => {
    const savedGameId = sessionStorage.getItem('zoopaloola_game_id');
    const savedPlayerId = sessionStorage.getItem('zoopaloola_player_id');

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
          sessionStorage.removeItem('zoopaloola_game_id');
          sessionStorage.removeItem('zoopaloola_player_id');
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
        const engine = new GameEngine(width, height);
        initialState = engine.initGame();
      }

      const { data, error } = await supabase
        .from('games')
        .insert([{
          player1_id: user.id,
          status: 'waiting',
          game_state: initialState,
          current_turn: 1
        }])
        .select()
        .single();

      if (error) throw error;

      setGameId(data.id);
      setPlayerId(1);
      setStatus('waiting');

      sessionStorage.setItem('zoopaloola_game_id', data.id);
      sessionStorage.setItem('zoopaloola_player_id', '1');

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

      const { data: game, error: fetchError } = await supabase
        .from('games')
        .select('*')
        .eq('id', id)
        .single();

      if (fetchError || !game) throw new Error('Game not found');
      if (game.status !== 'waiting') throw new Error('Game is not available');

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

      sessionStorage.setItem('zoopaloola_game_id', id);
      sessionStorage.setItem('zoopaloola_player_id', '2');
    } catch (e: any) {
      setError(e.message);
    }
  };

  const onShoot = useCallback(async (ballId: number, vector: Vector, power: number) => {
    if (!gameId || !playerId) return;
    if (gameState?.turn !== playerId) return;
    if (isProcessingShot) return;

    try {
      setIsProcessingShot(true);
      const timestamp = Date.now();

      // 1. Broadcast Shot Event
      await supabase
        .from('games')
        .update({
          last_shot_vector: {
            ballId,
            x: vector.x,
            y: vector.y,
            power,
            timestamp,
            shooterId: playerId
          },
          status: 'playing'
        })
        .eq('id', gameId);

      // 2. Run Local Simulation
      shoot(ballId, vector, power, async (finalState) => {
        // 3. Authoritative Update
        const nextTurn = playerId === 1 ? 2 : 1;
        const updatedState = { ...finalState, turn: nextTurn as 1 | 2 };

        // Update local
        setGameState(updatedState);

        // Upload to server
        const { error } = await supabase
          .from('games')
          .update({
            game_state: updatedState,
            current_turn: nextTurn
          })
          .eq('id', gameId);

        if (error) console.error('Error uploading state:', error);

        setIsProcessingShot(false);
      });
    } catch (e) {
      console.error('Error in onShoot:', e);
      setIsProcessingShot(false);
    }
  }, [gameId, playerId, shoot, gameState?.turn, isProcessingShot]);

  return {
    gameState,
    createGame,
    joinGame,
    onShoot,
    playerId,
    status,
    error,
    isSimulating: isSimulating.current, // Return boolean value for UI
    isProcessingShot
  };
}
