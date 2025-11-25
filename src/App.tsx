import { useState, useEffect } from 'react';
import { GameCanvas } from './components/GameCanvas';
import { GameUI } from './components/GameUI';
import { Lobby } from './components/Lobby';
import { useLocalGame } from './hooks/useLocalGame';
import { useSupabaseGame } from './hooks/useSupabaseGame';
import { audio } from './services/audio';
import { supabase } from './services/supabase';

// Fixed logical resolution for consistent physics across devices
const LOGICAL_WIDTH = 800;
const LOGICAL_HEIGHT = 600;

function App() {
  const [mode, setMode] = useState<'menu' | 'local' | 'online'>('menu');
  const [pendingAction, setPendingAction] = useState<{ type: 'create' } | { type: 'join', gameId: string } | null>(null);
  const [dimensions, setDimensions] = useState({ width: window.innerWidth, height: window.innerHeight });

  // Handle resize
  useEffect(() => {
    const handleResize = () => setDimensions({ width: window.innerWidth, height: window.innerHeight });
    window.addEventListener('resize', handleResize);

    // Check for active session
    const savedGameId = sessionStorage.getItem('zoopaloola_game_id');
    if (savedGameId) {
      setMode('online');
    }

    // Check for URL query param (Auto-join)
    const params = new URLSearchParams(window.location.search);
    const joinGameId = params.get('gameId');
    if (joinGameId) {
      setPendingAction({ type: 'join', gameId: joinGameId });
      setMode('online');
      // Clean URL
      window.history.replaceState({}, '', window.location.pathname);
    }

    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Initialize audio on first interaction (Touch or Click)
  const initAudio = () => {
    audio.init();
  };

  return (
    <div
      className="w-full h-screen overflow-hidden bg-slate-900"
      onClick={initAudio}
      onTouchStart={initAudio} // Critical for mobile audio
      role="button"
      tabIndex={0}
    >
      {mode === 'menu' && (
        <Lobby
          onCreateGame={async () => {
            setPendingAction({ type: 'create' });
            setMode('online');
            return '';
          }}
          onJoinGame={async (id) => {
            setPendingAction({ type: 'join', gameId: id });
            setMode('online');
          }}
          onStartLocal={() => setMode('local')}
          isCreating={false}
          isJoining={false}
          error={null}
        />
      )}

      {mode === 'local' && (
        <LocalGameWrapper
          width={dimensions.width}
          height={dimensions.height}
          onExit={() => setMode('menu')}
        />
      )}

      {mode === 'online' && (
        <OnlineGameWrapper
          width={dimensions.width}
          height={dimensions.height}
          onExit={() => setMode('menu')}
          initialAction={pendingAction}
        />
      )}
    </div>
  );
}

const LocalGameWrapper = ({ width, height, onExit }: { width: number, height: number, onExit: () => void }) => {
  // Use logical dimensions for physics
  const { gameState, onShoot } = useLocalGame(LOGICAL_WIDTH, LOGICAL_HEIGHT);

  if (!gameState) return <div>Loading...</div>;

  return (
    <>
      <GameCanvas
        gameState={gameState}
        playerId={gameState.turn}
        onShoot={onShoot}
        width={width}
        height={height}
        logicalWidth={LOGICAL_WIDTH}
        logicalHeight={LOGICAL_HEIGHT}
      />
      <GameUI
        gameState={gameState}
        playerId={gameState.turn}
        onReset={onExit}
      />
      <button
        onClick={onExit}
        className="absolute top-4 left-4 bg-red-500/80 hover:bg-red-600 text-white px-4 py-2 rounded-full backdrop-blur z-50 font-bold shadow-lg transition-transform active:scale-95"
      >
        LEAVE GAME
      </button>
    </>
  );
};

interface OnlineGameWrapperProps {
  width: number;
  height: number;
  onExit: () => void;
  initialAction: { type: 'create' } | { type: 'join', gameId: string } | null;
}

const OnlineGameWrapper = ({ width, height, onExit, initialAction }: OnlineGameWrapperProps) => {
  // Use logical dimensions for physics
  const {
    gameState,
    createGame,
    joinGame,
    onShoot,
    playerId,
    status,
    error,
    isSimulating,
    isProcessingShot
  } = useSupabaseGame(LOGICAL_WIDTH, LOGICAL_HEIGHT);

  const [lobbyState, setLobbyState] = useState<'initial' | 'creating' | 'joining' | 'playing'>('initial');
  const [createdId, setCreatedId] = useState<string | null>(null);
  const [hasInitialized, setHasInitialized] = useState(false);

  // Handle initial action
  useEffect(() => {
    const init = async () => {
      // Ensure auth
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        await supabase.auth.signInAnonymously();
      }

      if (hasInitialized || !initialAction) return;

      setHasInitialized(true);
      if (initialAction.type === 'create') {
        await handleCreate();
      } else if (initialAction.type === 'join') {
        setLobbyState('joining');
        await joinGame(initialAction.gameId);
      }
    };
    init();
  }, [initialAction, hasInitialized]);

  const handleCreate = async () => {
    setLobbyState('creating');
    const id = await createGame();
    if (id) {
      setCreatedId(id);
      return id;
    } else {
      setLobbyState('initial');
      return null;
    }
  };

  const handleJoin = async (id: string) => {
    setLobbyState('joining');
    await joinGame(id);
  };

  const handleExit = () => {
    sessionStorage.removeItem('zoopaloola_game_id');
    sessionStorage.removeItem('zoopaloola_player_id');
    onExit();
  };

  if (status === 'idle' || status === 'waiting') {
    return (
      <Lobby
        onCreateGame={async () => {
          const id = await handleCreate();
          return id || '';
        }}
        onJoinGame={handleJoin}
        onStartLocal={onExit} // Go back
        isCreating={lobbyState === 'creating'}
        isJoining={lobbyState === 'joining'}
        error={error}
        gameId={createdId}
      />
    );
  }

  if (!gameState || !playerId) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-white">
        <div className="text-2xl font-bold mb-4">Loading game...</div>
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
        <button
          onClick={() => {
            sessionStorage.removeItem('zoopaloola_game_id');
            sessionStorage.removeItem('zoopaloola_player_id');
            window.location.reload();
          }}
          className="mt-8 text-sm text-slate-400 hover:text-white underline"
        >
          Cancel and return home
        </button>
      </div>
    );
  }

  return (
    <>
      <GameCanvas
        gameState={gameState}
        playerId={playerId}
        onShoot={onShoot}
        width={width}
        height={height}
        logicalWidth={LOGICAL_WIDTH}
        logicalHeight={LOGICAL_HEIGHT}
        disabled={isProcessingShot}
      />
      <GameUI
        gameState={gameState}
        playerId={playerId}
        onReset={handleExit}
      />

      {/* Leave Game Button */}
      <button
        onClick={handleExit}
        className="absolute top-4 left-4 bg-red-500/80 hover:bg-red-600 text-white px-4 py-2 rounded-full backdrop-blur z-50 font-bold shadow-lg transition-transform active:scale-95"
      >
        LEAVE GAME
      </button>

      {isSimulating && (
        <div className="absolute top-4 right-4 text-white bg-black/50 px-2 rounded">
          Syncing...
        </div>
      )}
    </>
  );
};

export default App;
