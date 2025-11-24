import { useState, useRef, useCallback, useEffect } from 'react';
import { GameEngine } from '../game/GameEngine';
import { audio } from '../services/audio';
import type { GameState, Vector } from '../game/types';

export function usePhysics(width: number, height: number) {
  const engine = useRef<GameEngine>(new GameEngine(width, height));
  const [gameState, setGameState] = useState<GameState | null>(null);
  const requestRef = useRef<number>(0);
  const isSimulating = useRef(false);
  const onSimulationComplete = useRef<((finalState: GameState) => void) | null>(null);
  
  // Keep track of latest state in ref for the animation loop
  const stateRef = useRef<GameState | null>(null);

  useEffect(() => {
    engine.current = new GameEngine(width, height);
    const initialState = engine.current.initGame();
    setGameState(initialState);
    stateRef.current = initialState;
  }, [width, height]);

  const simulateStep = useCallback(() => {
    if (!stateRef.current) return;

    const { state: newState, events } = engine.current.update(stateRef.current);
    
    // Play sounds
    events.forEach(e => {
      if (e.type === 'hit') audio.playSynth('hit');
      else if (e.type === 'wall') audio.playSynth('wall');
      else if (e.type === 'splash') {
        audio.play('splash');
        setTimeout(() => {
           if (e.data === 1) audio.play('monkey');
           else audio.play('funny_fail');
        }, 200);
      }
      else if (e.type === 'win') audio.play('win');
    });

    setGameState(newState);
    stateRef.current = newState;

    const moving = newState.balls.some(b => 
      (!b.isDead && (Math.abs(b.vel.x) > 0 || Math.abs(b.vel.y) > 0)) || 
      (b.isDead && b.scale > 0)
    );

    if (moving) {
      requestRef.current = requestAnimationFrame(simulateStep);
    } else {
      isSimulating.current = false;
      if (onSimulationComplete.current) {
        onSimulationComplete.current(newState);
        onSimulationComplete.current = null;
      }
    }
  }, []);

  const shoot = useCallback((ballId: number, vector: Vector, _power: number, onComplete?: (finalState: GameState) => void) => {
    if (!stateRef.current || isSimulating.current) return;
    
    // Mutate the state ref to start movement
    const ball = stateRef.current.balls.find(b => b.id === ballId);
    if (!ball) return;

    ball.vel.x = vector.x;
    ball.vel.y = vector.y;
    
    // Trigger update
    setGameState({ ...stateRef.current });
    
    isSimulating.current = true;
    onSimulationComplete.current = onComplete || null;
    requestRef.current = requestAnimationFrame(simulateStep);
  }, [simulateStep]);

  return {
    gameState,
    setGameState, // Exposed for syncing
    shoot,
    isSimulating: isSimulating.current
  };
}
