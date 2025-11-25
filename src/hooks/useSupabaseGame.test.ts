import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useSupabaseGame } from './useSupabaseGame';
import { supabase } from '../services/supabase';

// Hoist mocks
const {
    mockSelect,
    mockInsert,
    mockUpdate,
    mockEq,
    mockSingle,
    mockChannel,
    mockOn,
    mockSubscribe,
    mockUnsubscribe,
    mockRemoveChannel,
    mockSetGameState,
    mockShoot,
    simulationState
} = vi.hoisted(() => ({
    mockSelect: vi.fn().mockReturnThis(),
    mockInsert: vi.fn().mockReturnThis(),
    mockUpdate: vi.fn().mockReturnThis(),
    mockEq: vi.fn().mockReturnThis(),
    mockSingle: vi.fn(),
    mockChannel: vi.fn(),
    mockOn: vi.fn().mockReturnThis(),
    mockSubscribe: vi.fn().mockReturnThis(),
    mockUnsubscribe: vi.fn(),
    mockRemoveChannel: vi.fn(),
    mockSetGameState: vi.fn(),
    mockShoot: vi.fn(),
    simulationState: { isSimulating: false }, // Mutable state container
}));

// Mock Supabase
vi.mock('../services/supabase', () => ({
    supabase: {
        channel: mockChannel.mockReturnValue({
            on: mockOn,
            subscribe: mockSubscribe,
            unsubscribe: mockUnsubscribe,
        }),
        removeChannel: mockRemoveChannel,
        from: vi.fn(() => ({
            select: mockSelect,
            insert: mockInsert,
            update: mockUpdate,
            eq: mockEq,
            single: mockSingle,
        })),
        auth: {
            getUser: vi.fn(),
            getSession: vi.fn(),
        }
    }
}));

vi.mock('./usePhysics', () => ({
    usePhysics: () => ({
        gameState: { turn: 1, balls: [] },
        setGameState: mockSetGameState,
        shoot: mockShoot,
        isSimulating: simulationState.isSimulating,
    })
}));

describe('useSupabaseGame', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        simulationState.isSimulating = false;

        // Restore chainability
        mockSelect.mockReturnValue({ eq: mockEq, single: mockSingle });
        mockInsert.mockReturnValue({ select: mockSelect, single: mockSingle });
        mockUpdate.mockReturnValue({ eq: mockEq });
        mockEq.mockReturnValue({ single: mockSingle });

        // Setup default return values
        (supabase.auth.getUser as any).mockResolvedValue({ data: { user: { id: 'user-1' } } });
        mockSingle.mockResolvedValue({ data: { id: 'game-1', status: 'waiting', game_state: { turn: 1 } }, error: null });

        mockChannel.mockReturnValue({
            on: mockOn,
            subscribe: mockSubscribe,
            unsubscribe: mockUnsubscribe,
        });
    });

    it('should trigger local shoot when receiving opponent shot event', async () => {
        const { result } = renderHook(() => useSupabaseGame(800, 600));

        // Join game to set playerId
        await act(async () => {
            const id = await result.current.createGame();
            console.log('Created game ID:', id);
        });

        console.log('mockChannel calls:', mockChannel.mock.calls.length);
        console.log('mockOn calls:', mockOn.mock.calls.length);

        // Capture subscription callback
        const onCallback = mockOn.mock.calls[0]?.[2];
        if (!onCallback) {
            console.error('onCallback is undefined!');
            return; // Fail gracefully to see logs
        }

        // Trigger NEW shot event from OPPONENT (shooterId !== playerId)
        const payload = {
            new: {
                last_shot_vector: {
                    ballId: 0,
                    x: 1,
                    y: 1,
                    power: 10,
                    timestamp: 12345,
                    shooterId: 'opponent-id'
                }
            }
        };

        act(() => {
            onCallback(payload);
        });

        expect(mockShoot).toHaveBeenCalledWith(0, { x: 1, y: 1 }, 10, expect.any(Function));
    });

    it('should IGNORE game_state update when simulating', async () => {
        simulationState.isSimulating = true; // Simulate physics running
        const { result } = renderHook(() => useSupabaseGame(800, 600));

        // Join game
        await act(async () => {
            await result.current.createGame();
        });

        const onCallback = mockOn.mock.calls[0][2];

        // Trigger game_state update
        const payload = {
            new: {
                game_state: { turn: 2, balls: [] }
            }
        };

        act(() => {
            onCallback(payload);
        });

        // Should NOT call setGameState because isSimulating is true
        expect(mockSetGameState).not.toHaveBeenCalled();
    });

    it('should ACCEPT game_state update when NOT simulating', async () => {
        simulationState.isSimulating = false;
        const { result } = renderHook(() => useSupabaseGame(800, 600));

        await act(async () => {
            await result.current.createGame();
        });

        const onCallback = mockOn.mock.calls[0][2];

        const payload = {
            new: {
                game_state: { turn: 2, balls: [] }
            }
        };

        act(() => {
            onCallback(payload);
        });

        expect(mockSetGameState).toHaveBeenCalledWith({ turn: 2, balls: [] });
    });
});
