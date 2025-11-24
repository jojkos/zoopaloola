import { useCallback } from 'react';
import { usePhysics } from './usePhysics';
import type { Vector } from '../game/types';

export function useLocalGame(width: number, height: number) {
  const { gameState, shoot, isSimulating, setGameState } = usePhysics(width, height);

  // handleShoot removed


  // Actually, I'll implement `handleShoot` assuming it receives `ballId`.
  // But I need to change the signature in `useLocalGame` return.
  
  const onShoot = useCallback((ballId: number, vector: Vector, power: number) => {
     shoot(ballId, vector, power, (finalState) => {
        // Switch turn
        const nextTurn = finalState.turn === 1 ? 2 : 1;
        setGameState({ ...finalState, turn: nextTurn });
     });
  }, [shoot, setGameState]);

  return {
    gameState,
    onShoot,
    isSimulating
  };
}
