import React from 'react';
import type { GameState } from '../game/types';

interface GameUIProps {
  gameState: GameState;
  playerId: 1 | 2;
  onReset: () => void;
}

export const GameUI: React.FC<GameUIProps> = ({ gameState, onReset }) => {
  const { scores, turn, status, winner } = gameState;

  return (
    <div className="absolute inset-0 pointer-events-none p-4 flex flex-col justify-between z-10">
      {/* Top Bar */}
      <div className="flex justify-between w-full max-w-4xl mx-auto items-start pointer-events-auto">
        {/* Player 1 Score */}
        <div 
          className="px-5 py-2 rounded-[15px] border-4 border-slate-800 text-center min-w-[100px]"
          style={{
            background: 'linear-gradient(180deg, #fff 0%, #e2e8f0 100%)',
            boxShadow: '0 6px 0 #1a202c, 0 10px 10px rgba(0,0,0,0.3)'
          }}
        >
          <div className="text-xs uppercase tracking-wider mb-1 text-slate-700 font-bold">Tučňáci</div>
          <div className="text-4xl font-bold text-blue-600 leading-none">{scores.p1}</div>
        </div>

        {/* Turn Indicator */}
        <div 
          className={`px-8 py-3 rounded-[15px] border-4 text-center min-w-[280px] transition-colors duration-300 ${
            turn === 1 
              ? 'border-blue-600 text-blue-700 bg-blue-50' 
              : 'border-yellow-600 text-yellow-700 bg-yellow-50'
          }`}
          style={{
            boxShadow: '0 5px 0 #000'
          }}
        >
          <div className="text-2xl uppercase tracking-wide">
            {turn === 1 ? 'Tah Tučňáků' : 'Tah Opic'}
          </div>
          <div className="text-sm opacity-75 font-sans font-bold">
            (Jsi na řadě)
          </div>
        </div>

        {/* Player 2 Score */}
        <div 
          className="px-5 py-2 rounded-[15px] border-4 border-slate-800 text-center min-w-[100px]"
          style={{
            background: 'linear-gradient(180deg, #fff 0%, #e2e8f0 100%)',
            boxShadow: '0 6px 0 #1a202c, 0 10px 10px rgba(0,0,0,0.3)'
          }}
        >
          <div className="text-xs uppercase tracking-wider mb-1 text-slate-700 font-bold">Opice</div>
          <div className="text-4xl font-bold text-yellow-600 leading-none">{scores.p2}</div>
        </div>
      </div>

      {/* Game Over Modal */}
      {status === 'finished' && (
        <div className="absolute inset-0 bg-black/85 backdrop-blur-sm flex items-center justify-center pointer-events-auto z-50">
          <div className="text-center">
            <h1 className={`text-6xl mb-8 ${winner === 1 ? 'text-blue-400' : 'text-yellow-400'} drop-shadow-[4px_4px_0_rgba(0,0,0,1)]`}>
              {winner === 1 ? 'TUČŇÁCI VYHRÁLI!' : 'OPICE VYHRÁLY!'}
            </h1>
            <button
              onClick={onReset}
              className="px-12 py-5 text-2xl text-white rounded-[50px] border-4 border-[#1c4532] transition-transform active:translate-y-2 active:shadow-none"
              style={{
                background: 'linear-gradient(to bottom, #48bb78, #2f855a)',
                boxShadow: '0 8px 0 #1c4532, 0 15px 20px rgba(0,0,0,0.4)',
                textShadow: '2px 2px 0 rgba(0,0,0,0.3)'
              }}
            >
              ODVETA
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
