// =============================================================================
// gameStore.ts — Zustand store for Werewolf Observer UI
// =============================================================================

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type {
  GameState,
  LogEntry,
  LogFilter,
  LogEntryType,
  PlayerViewModel,
  SeerResult,
} from '../lib/gameTypes';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Maximum number of entries kept in the ring buffer for LiveFeed */
const LIVE_FEED_CAPACITY = 500;

// ---------------------------------------------------------------------------
// Store shape
// ---------------------------------------------------------------------------

interface GameStore {
  // ---- Game state (from game_state.json) -----------------------------------
  gameState: GameState | null;

  // ---- Log entries (from game_log.jsonl) -----------------------------------
  /** Complete ordered history of all log entries — used by EventLog */
  allLogEntries: LogEntry[];
  /** Ring buffer of the most recent LIVE_FEED_CAPACITY entries — used by LiveFeed */
  logEntries: LogEntry[];

  // ---- Connection status ---------------------------------------------------
  connectionStatus: 'connected' | 'disconnected' | 'connecting';

  // ---- Observer mode (persisted to localStorage) ---------------------------
  observerMode: boolean;

  // ---- Live vote accumulation (reset on new day phase) ---------------------
  liveVotes: Record<string, number>;

  // ---- Log filter state (EventLog component) --------------------------------
  logFilter: LogFilter;

  // ---- Actions -------------------------------------------------------------
  setGameState: (state: GameState) => void;
  appendLogEntry: (entry: LogEntry) => void;
  setObserverMode: (enabled: boolean) => void;
  setConnectionStatus: (status: GameStore['connectionStatus']) => void;
  resetVotes: () => void;
  hydrateLog: (entries: LogEntry[]) => void;
  setLogFilterRound: (round: number | 'all') => void;
  toggleLogFilterType: (type: LogEntryType) => void;
  resetLogFilter: () => void;
  resetGame: () => void;
}

// ---------------------------------------------------------------------------
// Default log filter: all types, all rounds
// ---------------------------------------------------------------------------

const ALL_ENTRY_TYPES: Set<LogEntryType> = new Set([
  'game_start',
  'phase_start',
  'narration',
  'player_statement',
  'vote',
  'vote_tally',
  'elimination',
  'night_summary',
  'game_end',
]);

const DEFAULT_LOG_FILTER: LogFilter = {
  round: 'all',
  types: ALL_ENTRY_TYPES,
};

// ---------------------------------------------------------------------------
// Store implementation
// ---------------------------------------------------------------------------

export const useGameStore = create<GameStore>()(
  persist(
    (set, get) => ({
      gameState: null,
      allLogEntries: [],
      logEntries: [],
      connectionStatus: 'connecting',
      observerMode: true,
      liveVotes: {},
      logFilter: DEFAULT_LOG_FILTER,

      setGameState: (state) => set({ gameState: state }),

      appendLogEntry: (entry) => {
        const { allLogEntries } = get();
        const newAll = [...allLogEntries, entry];
        // Ring buffer: keep only the last LIVE_FEED_CAPACITY entries
        const newLive = newAll.slice(-LIVE_FEED_CAPACITY);
        set({ allLogEntries: newAll, logEntries: newLive });
      },

      setObserverMode: (enabled) => set({ observerMode: enabled }),

      setConnectionStatus: (status) => set({ connectionStatus: status }),

      resetVotes: () => set({ liveVotes: {} }),

      hydrateLog: (entries) => {
        const newLive = entries.slice(-LIVE_FEED_CAPACITY);
        set({ allLogEntries: entries, logEntries: newLive });
      },

      setLogFilterRound: (round) =>
        set((s) => ({ logFilter: { ...s.logFilter, round } })),

      toggleLogFilterType: (type) =>
        set((s) => {
          const types = new Set(s.logFilter.types);
          if (types.has(type)) {
            types.delete(type);
          } else {
            types.add(type);
          }
          return { logFilter: { ...s.logFilter, types } };
        }),

      resetLogFilter: () => set({ logFilter: DEFAULT_LOG_FILTER }),

      resetGame: () =>
        set({
          gameState: null,
          allLogEntries: [],
          logEntries: [],
          liveVotes: {},
          logFilter: DEFAULT_LOG_FILTER,
        }),
    }),
    {
      name: 'werewolf-observer-prefs',
      // Only persist user preferences — game state and logs are always
      // authoritative from the server.
      partialize: (state) => ({
        observerMode: state.observerMode,
      }),
    }
  )
);

// ---------------------------------------------------------------------------
// Selector: selectPlayerViewModels
// Derives PlayerViewModel[] from gameState + observerMode.
// Call inside a component: const vms = useGameStore(selectPlayerViewModels);
// ---------------------------------------------------------------------------

export const selectPlayerViewModels = (state: GameStore): PlayerViewModel[] => {
  const { gameState, observerMode, liveVotes } = state;
  if (!gameState || !Array.isArray(gameState.players)) return [];

  return gameState.players.map((name) => {
    const isAlive = gameState.alive.includes(name);
    const eliminatedInfo = gameState.eliminated.find((e) => e.name === name);

    // Role is always populated in observer mode; hide in player mode
    const role = observerMode
      ? gameState.roles[name]
      : isAlive
        ? gameState.roles[name]  // In a real player-facing UI this would be hidden
        : (eliminatedInfo?.role ?? gameState.roles[name]);

    // Seer result is only shown in observer mode
    const seerResult: SeerResult | undefined = observerMode
      ? gameState.seer_knowledge[name]
      : undefined;

    // Doctor protection: check the current round's night event
    const currentNightEvent = gameState.night_events.find(
      (n) => n.round === gameState.round
    );
    const isDoctorProtected =
      observerMode &&
      currentNightEvent !== undefined &&
      currentNightEvent.doctor_save === name &&
      currentNightEvent.saved === true;

    // Current votes: prefer liveVotes (accumulated from SSE vote entries),
    // fall back to day_events for the current round.
    const hasLiveVotes = Object.keys(liveVotes).length > 0;
    let currentVotes: number;
    if (hasLiveVotes) {
      currentVotes = liveVotes[name] ?? 0;
    } else {
      const currentDayEvent = gameState.day_events?.find(
        (d) => d.round === gameState.round
      );
      currentVotes = currentDayEvent?.votes[name] ?? 0;
    }

    return {
      name,
      role,
      isAlive,
      eliminatedInfo,
      currentVotes,
      seerResult,
      isDoctorProtected,
    };
  });
};

// ---------------------------------------------------------------------------
// Selector: selectCurrentPhase
// Derives 'night' | 'day' | 'setup' | 'end' from the most recent
// phase_start log entry. Falls back to 'setup' if no phase entries exist.
// ---------------------------------------------------------------------------

export const selectCurrentPhase = (
  state: GameStore
): 'night' | 'day' | 'setup' | 'end' => {
  const phaseEntries = state.allLogEntries.filter(
    (e) => e.type === 'phase_start'
  );
  if (phaseEntries.length === 0) return 'setup';
  const last = phaseEntries[phaseEntries.length - 1];
  // last is a PhaseStartEntry, so last.phase is GamePhase
  return last.phase as 'night' | 'day' | 'setup' | 'end';
};

// ---------------------------------------------------------------------------
// Selector: selectFilteredLog
// Filtered log entries based on current logFilter.
// ---------------------------------------------------------------------------

export const selectFilteredLog = (state: GameStore): LogEntry[] => {
  const { allLogEntries, logFilter } = state;
  return allLogEntries.filter((entry) => {
    const roundMatch =
      logFilter.round === 'all' || entry.round === logFilter.round;
    const typeMatch = logFilter.types.has(entry.type);
    return roundMatch && typeMatch;
  });
};
