// =============================================================================
// useGameState.ts — Polling fallback hook for Werewolf Observer UI
// =============================================================================

import { useEffect, useRef } from 'react';
import { useGameStore } from '../store/gameStore';
import type { GameState } from '../lib/gameTypes';

const POLL_INTERVAL_MS = 2000;
const API_GAME_STATE_URL = '/api/game-state';

/**
 * Polls GET /api/game-state every 2000ms as a fallback when the SSE
 * connection is not active.
 *
 * Behaviour:
 *   - Fires one immediate fetch on mount for fast initial load.
 *   - Subsequent polls only execute when connectionStatus !== 'connected',
 *     avoiding redundant REST calls while SSE is healthy.
 *   - Handles 404 (game not started yet) and network errors gracefully;
 *     never throws or crashes the component tree.
 */
export function useGameState(): void {
  const setGameState = useGameStore((s) => s.setGameState);
  const connectionStatus = useGameStore((s) => s.connectionStatus);

  // Keep a ref so the interval callback always reads the latest value
  // without needing to be re-created every time connectionStatus changes.
  const connectionStatusRef = useRef(connectionStatus);
  useEffect(() => {
    connectionStatusRef.current = connectionStatus;
  }, [connectionStatus]);

  useEffect(() => {
    let cancelled = false;

    async function fetchGameState(): Promise<void> {
      // Skip REST fetch when SSE is delivering live updates.
      if (connectionStatusRef.current === 'connected') return;

      try {
        const response = await fetch(API_GAME_STATE_URL);

        if (response.status === 404) {
          // Game hasn't started yet — normal condition, not an error.
          return;
        }

        if (!response.ok) {
          // Server error (e.g. 500 parse_error while GM is mid-write).
          // Tolerate silently; the next poll will retry.
          return;
        }

        const data = (await response.json()) as GameState;

        if (!cancelled) {
          setGameState(data);
        }
      } catch {
        // Network error, JSON parse failure, etc. — tolerate silently.
      }
    }

    // Immediate fetch on mount for fast initial hydration.
    void fetchGameState();

    const intervalId = setInterval(() => {
      void fetchGameState();
    }, POLL_INTERVAL_MS);

    return () => {
      cancelled = true;
      clearInterval(intervalId);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  // Empty deps: we want a single long-lived interval. connectionStatus is
  // accessed via ref; setGameState is a stable Zustand reference.
}
