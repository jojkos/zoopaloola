import React from 'react';
import type { GameState } from '../game/types';

interface GameUIProps {
  gameState: GameState;
  playerId: 1 | 2;
  onReset: () => void;
}

export const GameUI: React.FC<GameUIProps> = ({ gameState, playerId, onReset }) => {
  const { scores, turn, status, winner } = gameState;

  return (
    <div className="absolute inset-0 pointer-events-none p-2 md:p-4 flex flex-col justify-between z-10">
      {/* Top Bar - Centered Column */}
      <div className="flex flex-col items-center w-full max-w-4xl mx-auto pointer-events-none gap-2">

        {/* Turn Indicator (Top) */}
        <div
          className={`px-4 py-2 md:px-8 md:py-3 rounded-[15px] border-2 md:border-4 text-center min-w-[200px] md:min-w-[320px] transition-all duration-300 transform ${turn === 1
            ? 'border-blue-600 bg-blue-100 text-blue-800 shadow-[0_0_20px_rgba(37,99,235,0.3)]'
            : 'border-yellow-600 bg-yellow-100 text-yellow-800 shadow-[0_0_20px_rgba(202,138,4,0.3)]'
            }`}
          style={{
            boxShadow: turn === 1 ? '0 4px 0 #1e40af' : '0 4px 0 #854d0e',
            transform: turn === playerId ? 'scale(1.05)' : 'scale(1)'
          }}
        >
          <div className="text-lg md:text-2xl uppercase tracking-wide font-black">
            {turn === 1 ? 'Penguins Turn' : 'Monkeys Turn'}
          </div>
          <div className={`text-xs md:text-sm font-bold mt-1 ${turn === playerId ? 'animate-pulse' : 'opacity-75'}`}>
            {turn === playerId ? '👉 YOUR TURN! 👈' : '(Waiting for opponent...)'}
          </div>
        </div>

        {/* Scores (Below Turn Indicator) */}
        <div className="flex gap-4 md:gap-8">
          {/* Player 1 Score */}
          <div
            className="px-3 py-1 md:px-4 md:py-2 rounded-[12px] border-2 md:border-4 border-slate-800 text-center min-w-[60px] md:min-w-[90px]"
            style={{
              background: 'linear-gradient(180deg, #fff 0%, #e2e8f0 100%)',
              boxShadow: '0 3px 0 #1a202c, 0 4px 4px rgba(0,0,0,0.3)'
            }}
          >
            <div className="text-[9px] md:text-[10px] uppercase tracking-wider mb-0.5 text-slate-700 font-bold">Penguins</div>
            <div className="text-xl md:text-3xl font-bold text-blue-600 leading-none">{scores.p1}</div>
          </div>

          {/* Player 2 Score */}
          <div
            className="px-3 py-1 md:px-4 md:py-2 rounded-[12px] border-2 md:border-4 border-slate-800 text-center min-w-[60px] md:min-w-[90px]"
            style={{
              background: 'linear-gradient(180deg, #fff 0%, #e2e8f0 100%)',
              boxShadow: '0 3px 0 #1a202c, 0 4px 4px rgba(0,0,0,0.3)'
            }}
          >
            <div className="text-[9px] md:text-[10px] uppercase tracking-wider mb-0.5 text-slate-700 font-bold">Monkeys</div>
            <div className="text-xl md:text-3xl font-bold text-yellow-600 leading-none">{scores.p2}</div>
          </div>
        </div>

      </div>

      {/* Game Over Modal */}
      {status === 'finished' && (
        <div className="absolute inset-0 bg-black/85 backdrop-blur-sm flex items-center justify-center pointer-events-auto z-50">
          <div className="text-center p-4">
            <h1 className={`text-4xl md:text-6xl mb-8 ${winner === 1 ? 'text-blue-400' : 'text-yellow-400'} drop-shadow-[4px_4px_0_rgba(0,0,0,1)] font-black`}>
              {winner === 1 ? 'PENGUINS WIN!' : 'MONKEYS WIN!'}
            </h1>
            <button
              onClick={onReset}
              className="px-8 py-4 md:px-12 md:py-5 text-xl md:text-2xl text-white rounded-[50px] border-4 border-[#1c4532] transition-transform active:translate-y-2 active:shadow-none"
              style={{
                background: 'linear-gradient(to bottom, #48bb78, #2f855a)',
                boxShadow: '0 8px 0 #1c4532, 0 15px 20px rgba(0,0,0,0.4)',
                textShadow: '2px 2px 0 rgba(0,0,0,0.3)'
              }}
            >
              REMATCH
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
