// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useSupabaseGame } from './useSupabaseGame';
import { supabase } from '../services/supabase';

// Mock Supabase
vi.mock('../services/supabase', () => ({
  supabase: {
    channel: vi.fn(() => ({
      on: vi.fn().mockReturnThis(),
      subscribe: vi.fn().mockReturnThis(),
      unsubscribe: vi.fn(),
    })),
    removeChannel: vi.fn(),
    auth: {
      getUser: vi.fn(),
    },
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn(),
    })),
  },
}));

// Mock usePhysics
const { mockSetGameState } = vi.hoisted(() => ({
  mockSetGameState: vi.fn(),
}));

vi.mock('./usePhysics', () => ({
  usePhysics: () => ({
    gameState: {
      balls: [],
      walls: [],
      turn: 1,
      scores: { p1: 0, p2: 0 },
      status: 'playing',
    },
    setGameState: mockSetGameState,
    shoot: vi.fn((_ballId, _vector, _power, callback) => {
      // Simulate physics callback immediately
      callback({
        balls: [],
        walls: [],
        turn: 1, // Physics engine doesn't switch turn automatically in this mock
        scores: { p1: 0, p2: 0 },
        status: 'playing',
      });
    }),
    isSimulating: { current: false },
  }),
}));

// Export is not needed if we use the hoisted variable in the same file scope, 
// but since we are in the same file, we can just use it directly.
// However, if we want to export it for other files (which we don't here), we could.
// The previous error was because I imported it from the same file which is circular and weird in tests.
// I will remove the import and just use the local variable.

describe('useSupabaseGame', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sessionStorage.clear();
  });

  it('should switch turn correctly when opponent shoots', async () => {
    const { result } = renderHook(() => useSupabaseGame(800, 600));

    // Mock authenticated user as Player 2
    (supabase.auth.getUser as any).mockResolvedValue({
      data: { user: { id: 'player2-id' } },
    });

    // Mock joining a game
    (supabase.from as any).mockImplementation((table: string) => {
      if (table === 'games') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({
            data: {
              id: 'game-123',
              status: 'waiting',
              game_state: { turn: 1 },
            },
            error: null,
          }),
          update: vi.fn().mockReturnThis(),
        };
      }
      return { select: vi.fn() };
    });

    await act(async () => {
      await result.current.joinGame('game-123');
    });

    expect(result.current.playerId).toBe(2);

    // Simulate receiving a shot event from Player 1
    // We need to access the subscription callback.
    // In a real integration test we would emit via supabase, but here we mock the channel.
    const onCallback = (supabase.channel as any).mock.results[0].value.on.mock.calls[0][2];

    const payload = {
      new: {
        last_shot_vector: {
          ballId: 0,
          x: 1,
          y: 1,
          power: 10,
          timestamp: Date.now(),
          shooterId: 1, // Player 1 shot
        },
        status: 'playing',
      },
    };

    await act(async () => {
      onCallback(payload);
    });

    // The physics mock calls back immediately.
    // The hook should verify if turn needs switching.
    // Current logic: const nextTurn = playerId === 1 ? 2 : 1;
    // If we are Player 2, nextTurn becomes 1.
    // BUT, if Player 1 shot, the turn should switch to Player 2.
    // So if we are Player 2, and Player 1 shot, we expect the turn to become 2.
    
    // We expect setGameState to be called with turn: 2
    expect(mockSetGameState).toHaveBeenCalledWith(expect.objectContaining({
      turn: 2
    }));
  });
});
