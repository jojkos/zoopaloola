import React, { useState } from 'react';
import { audio } from '../services/audio';

interface LobbyProps {
  onCreateGame: () => Promise<string>; // Returns game ID
  onJoinGame: (gameId: string) => Promise<void>;
  onStartLocal: () => void;
  isCreating: boolean;
  isJoining: boolean;
  error: string | null;
  gameId?: string | null; // New prop to control the waiting screen
}

export const Lobby: React.FC<LobbyProps> = ({
  onCreateGame,
  onJoinGame,
  onStartLocal,
  isCreating,
  isJoining,
  error,
  gameId
}) => {
  const [joinId, setJoinId] = useState('');
  const [copyFeedback, setCopyFeedback] = useState(false);
  const [shareFeedback, setShareFeedback] = useState(false);

  const handleCreate = async () => {
    audio.init();
    await onCreateGame();
  };

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    audio.init();
    if (!joinId.trim()) return;
    await onJoinGame(joinId);
  };

  const copyToClipboard = () => {
    if (gameId) {
      navigator.clipboard.writeText(gameId);
      setCopyFeedback(true);
      setTimeout(() => setCopyFeedback(false), 2000);
    }
  };

  const shareLink = () => {
    if (gameId) {
      const url = `${window.location.origin}?gameId=${gameId}`;
      navigator.clipboard.writeText(url);
      setShareFeedback(true);
      setTimeout(() => setShareFeedback(false), 2000);
    }
  };

  if (gameId) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-slate-900 text-white p-4">
        <div className="bg-slate-800 p-8 rounded-2xl shadow-2xl max-w-md w-full text-center border border-slate-700">
          <h2 className="text-2xl md:text-3xl font-bold mb-6 text-blue-400">Waiting for opponent...</h2>
          <div className="animate-spin text-4xl mb-6">⏳</div>
          <p className="mb-4 text-slate-300">Send this code to your friend:</p>

          <div className="flex items-center gap-2 bg-slate-950 p-4 rounded-lg mb-6 border border-slate-600 relative">
            <code className="text-xl font-mono flex-1 tracking-wider">{gameId}</code>
            <button
              onClick={copyToClipboard}
              className="p-2 hover:bg-slate-700 rounded transition-colors relative group"
              title="Copy Code"
            >
              {copyFeedback ? '✅' : '📋'}
              {copyFeedback && (
                <span className="absolute -top-8 left-1/2 -translate-x-1/2 bg-green-500 text-white text-xs px-2 py-1 rounded shadow-lg whitespace-nowrap">
                  Copied!
                </span>
              )}
            </button>
          </div>

          <button
            onClick={shareLink}
            className="w-full py-3 mb-6 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-bold transition-colors flex items-center justify-center gap-2"
          >
            {shareFeedback ? '✅ Link Copied!' : '🔗 Share Link'}
          </button>

          <p className="text-sm text-slate-500">Game starts automatically when opponent joins.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/85 backdrop-blur-sm z-50 overflow-y-auto p-4">
      <div className="animate-[float_3s_ease-in-out_infinite] mb-8 text-center mt-8 md:mt-0">
        <h1 className="text-5xl md:text-7xl text-[#63b3ed] leading-none drop-shadow-[4px_4px_0_#2c5282] [text-shadow:4px_4px_0_#2c5282,8px_8px_0_#000] font-black tracking-tighter">
          Zoopa<span className="text-yellow-400">LOL</span>a
        </h1>
      </div>

      <p className="text-blue-200 text-lg md:text-xl mb-8 md:mb-12 font-sans text-center italic opacity-80">
        Remembering good old ICQ times 🐧🐵
      </p>

      <div className="flex flex-col gap-4 md:gap-6 items-center w-full max-w-md px-4 pb-8">
        {/* Local Game */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onStartLocal();
          }}
          className="w-full py-4 md:py-5 text-xl md:text-2xl text-white rounded-[50px] border-4 border-[#1c4532] transition-transform active:translate-y-2 active:shadow-none touch-manipulation font-bold"
          style={{
            background: 'linear-gradient(to bottom, #48bb78, #2f855a)',
            boxShadow: '0 8px 0 #1c4532, 0 15px 20px rgba(0,0,0,0.4)',
            textShadow: '2px 2px 0 rgba(0,0,0,0.3)'
          }}
        >
          PLAY LOCALLY
        </button>

        <div className="h-px w-32 bg-white/20 my-2"></div>

        {/* Create Online Game */}
        <button
          onClick={handleCreate}
          disabled={isCreating}
          className="w-full py-4 text-lg md:text-xl text-white rounded-[50px] border-4 border-[#2a4365] transition-transform active:translate-y-2 active:shadow-none disabled:opacity-50 disabled:cursor-not-allowed touch-manipulation font-bold"
          style={{
            background: 'linear-gradient(to bottom, #4299e1, #2b6cb0)',
            boxShadow: '0 6px 0 #2a4365, 0 10px 15px rgba(0,0,0,0.4)',
            textShadow: '2px 2px 0 rgba(0,0,0,0.3)'
          }}
        >
          {isCreating ? 'CREATING...' : 'CREATE ONLINE GAME'}
        </button>

        {/* Join Game */}
        <form onSubmit={handleJoin} className="flex flex-col md:flex-row gap-2 w-full">
          <input
            type="text"
            value={joinId}
            onChange={(e) => setJoinId(e.target.value)}
            placeholder="Game Code"
            className="flex-1 px-6 py-4 rounded-[50px] border-4 border-slate-600 bg-slate-800 text-white text-center text-lg md:text-xl outline-none focus:border-blue-400 placeholder-slate-500 font-mono"
          />
          <button
            type="submit"
            disabled={isJoining || !joinId}
            className="px-8 py-4 text-lg md:text-xl text-white rounded-[50px] border-4 border-[#2a4365] transition-transform active:translate-y-2 active:shadow-none disabled:opacity-50 disabled:cursor-not-allowed touch-manipulation font-bold"
            style={{
              background: 'linear-gradient(to bottom, #4299e1, #2b6cb0)',
              boxShadow: '0 6px 0 #2a4365',
              textShadow: '1px 1px 0 rgba(0,0,0,0.3)'
            }}
          >
            {isJoining ? '...' : 'JOIN'}
          </button>
        </form>

        {error && (
          <div className="mt-2 p-3 bg-red-500/20 border border-red-500/50 rounded-lg text-red-200 text-sm text-center w-full">
            {error}
          </div>
        )}
      </div>

      <a
        href="https://buymeacoffee.com/jojkos"
        target="_blank"
        rel="noopener noreferrer"
        className="beer-link"
      >
        🍺 Buy Me a Beer
      </a>
    </div>
  );
};
