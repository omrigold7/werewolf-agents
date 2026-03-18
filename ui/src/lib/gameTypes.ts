// =============================================================================
// gameTypes.ts — Shared type definitions for Werewolf Observer UI
// Source of truth: synchronized with game_master.md schema definitions
// =============================================================================

// ---------------------------------------------------------------------------
// Primitive enumerations
// ---------------------------------------------------------------------------

export type PlayerRole = 'werewolf' | 'seer' | 'doctor' | 'villager';

export type GamePhase = 'setup' | 'night' | 'day' | 'end';

export type EliminationCause = 'wolves' | 'vote';

export type Winner = 'village' | 'wolves';

export type SeerResult = 'Werewolf' | 'Not a Werewolf';

// ---------------------------------------------------------------------------
// Game State (game_state.json)
// ---------------------------------------------------------------------------

export interface EliminatedPlayer {
  name: string;
  role: PlayerRole;
  round: number;
  cause: EliminationCause;
}

export interface NightEvent {
  round: number;
  wolf_target: string;
  doctor_save: string;
  saved: boolean;
  seer_investigated: string;
  seer_result: SeerResult;
}

export interface DayEvent {
  round: number;
  /** Map of player name → vote count received */
  votes: Record<string, number>;
  eliminated: string;
  role_revealed: PlayerRole;
  /** True if seer publicly revealed their knowledge during this vote */
  seer_revealed?: boolean;
}

export interface GameState {
  round: number;
  /** Ordered list of all players (never changes after setup) */
  players: string[];
  /** Full role map — all roles visible in observer mode */
  roles: Record<string, PlayerRole>;
  /** Names of currently alive players */
  alive: string[];
  eliminated: EliminatedPlayer[];
  /** Seer's accumulated investigation results */
  seer_knowledge: Record<string, SeerResult>;
  /** Name of the player the doctor saved last round (cannot repeat) */
  last_doctor_save: string | null;
  night_events: NightEvent[];
  day_events: DayEvent[];
  /** Populated when win condition is met */
  winner?: Winner;
}

// ---------------------------------------------------------------------------
// Log Entries (game_log.jsonl) — Discriminated union by `type`
// ---------------------------------------------------------------------------

/** Common fields present on every log entry */
interface BaseLogEntry {
  ts: string;       // ISO-8601 timestamp
  round: number;
  phase: GamePhase;
}

export interface GameStartEntry extends BaseLogEntry {
  type: 'game_start';
  players: string[];
  roles: Record<string, PlayerRole>;
}

export interface PhaseStartEntry extends BaseLogEntry {
  type: 'phase_start';
  /** The phase that is beginning */
  phase: GamePhase;
}

export interface NarrationEntry extends BaseLogEntry {
  type: 'narration';
  text: string;
}

export interface PlayerStatementEntry extends BaseLogEntry {
  type: 'player_statement';
  player: string;
  role: PlayerRole;
  text: string;
}

export interface VoteEntry extends BaseLogEntry {
  type: 'vote';
  voter: string;
  target: string;
}

export interface VoteTallyEntry extends BaseLogEntry {
  type: 'vote_tally';
  /** Map of player name → votes received */
  votes: Record<string, number>;
}

export interface EliminationEntry extends BaseLogEntry {
  type: 'elimination';
  player: string;
  role: PlayerRole;
  cause: EliminationCause;
  /** Votes received if eliminated by vote; omitted for wolf kills */
  vote_count?: number;
}

export interface NightSummaryEntry extends BaseLogEntry {
  type: 'night_summary';
  wolf_target: string;
  doctor_save: string;
  saved: boolean;
  seer_investigated: string;
  seer_result: SeerResult;
}

export interface GameEndEntry extends BaseLogEntry {
  type: 'game_end';
  winner: Winner;
  rounds_played: number;
  survivors: string[];
}

/** The full discriminated union of all log entry types */
export type LogEntry =
  | GameStartEntry
  | PhaseStartEntry
  | NarrationEntry
  | PlayerStatementEntry
  | VoteEntry
  | VoteTallyEntry
  | EliminationEntry
  | NightSummaryEntry
  | GameEndEntry;

/** Convenience: the string literal union of all entry type names */
export type LogEntryType = LogEntry['type'];

// ---------------------------------------------------------------------------
// SSE event payloads (what the Express server sends over the wire)
// ---------------------------------------------------------------------------

export interface SSEStateEvent {
  type: 'state';
  data: GameState;
}

export interface SSELogEvent {
  type: 'log';
  data: LogEntry;
}

export type SSEEvent = SSEStateEvent | SSELogEvent;

// ---------------------------------------------------------------------------
// UI-specific derived types
// ---------------------------------------------------------------------------

/** Per-player derived view model for PlayerCard */
export interface PlayerViewModel {
  name: string;
  role: PlayerRole;
  isAlive: boolean;
  eliminatedInfo?: EliminatedPlayer;
  currentVotes: number;
  seerResult?: SeerResult;
  isDoctorProtected: boolean;
}

/** Filter state for EventLog component */
export interface LogFilter {
  round: number | 'all';
  types: Set<LogEntryType>;
}
