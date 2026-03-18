// =============================================================================
// useEventStream.ts — SSE connection hook for Werewolf Observer UI
// =============================================================================

import { useEffect, useRef } from 'react';
import { useGameStore } from '../store/gameStore';
import type { GameState, LogEntry } from '../lib/gameTypes';

/**
 * Opens a persistent EventSource connection to /api/stream.
 *
 * Event handling:
 *   - `state` event  → store.setGameState(parsed)
 *   - `log` event    → store.appendLogEntry(parsed)
 *                       + accumulate vote counts from `vote` entries into liveVotes
 *                       + reset liveVotes on `phase_start` entries with phase === 'day'
 *
 * Connection lifecycle:
 *   - Sets connectionStatus to 'connecting' before opening.
 *   - Sets connectionStatus to 'connected' on EventSource open.
 *   - Sets connectionStatus to 'disconnected' on error or close.
 *   - EventSource auto-reconnects natively on error; the hook mirrors
 *     the status transitions faithfully.
 *   - Closes the EventSource on component unmount.
 */
export function useEventStream(): void {
  const setGameState = useGameStore((s) => s.setGameState);
  const appendLogEntry = useGameStore((s) => s.appendLogEntry);
  const setConnectionStatus = useGameStore((s) => s.setConnectionStatus);
  const resetVotes = useGameStore((s) => s.resetVotes);
  const resetGame = useGameStore((s) => s.resetGame);

  // Keep a stable ref to the store's liveVotes setter so we can accumulate
  // vote counts without closing over a stale snapshot.
  const storeRef = useRef(useGameStore.getState());
  useEffect(() => {
    const unsub = useGameStore.subscribe((state) => {
      storeRef.current = state;
    });
    return unsub;
  }, []);

  useEffect(() => {
    setConnectionStatus('connecting');

    const es = new EventSource('/api/stream');

    es.onopen = () => {
      setConnectionStatus('connected');
    };

    // `state` event: replace full game state
    es.addEventListener('state', (event: MessageEvent<string>) => {
      try {
        const parsed = JSON.parse(event.data) as GameState;
        setGameState(parsed);
      } catch {
        // Malformed JSON from server — tolerate silently
      }
    });

    // `log` event: append entry, handle vote accumulation and phase resets
    es.addEventListener('log', (event: MessageEvent<string>) => {
      try {
        const entry = JSON.parse(event.data) as LogEntry;
        appendLogEntry(entry);

        if (entry.type === 'vote') {
          // Accumulate a vote for the target player
          const currentLiveVotes = storeRef.current.liveVotes;
          const updatedVotes: Record<string, number> = {
            ...currentLiveVotes,
            [entry.target]: (currentLiveVotes[entry.target] ?? 0) + 1,
          };
          useGameStore.setState({ liveVotes: updatedVotes });
        } else if (entry.type === 'phase_start' && entry.phase === 'day') {
          // New day phase starts — clear accumulated votes
          resetVotes();
        }
      } catch {
        // Malformed JSON from server — tolerate silently
      }
    });

    // `reset` event: server wiped the files — clear all in-memory state
    es.addEventListener('reset', () => {
      resetGame();
    });

    es.onerror = () => {
      // EventSource will attempt to reconnect automatically.
      // Reflect the degraded state to the UI while it does so.
      setConnectionStatus('disconnected');
    };

    return () => {
      es.close();
      setConnectionStatus('disconnected');
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  // Intentionally empty deps: we only want one persistent EventSource per
  // mount. The store actions are stable Zustand references.
}
