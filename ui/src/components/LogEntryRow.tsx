// =============================================================================
// LogEntryRow.tsx — Shared renderer for a single LogEntry
// Used by both LiveFeed and EventLog
// =============================================================================

import { useGameStore } from '../store/gameStore';
import type { LogEntry, PlayerRole } from '../lib/gameTypes';

// ---------------------------------------------------------------------------
// Role color helpers
// ---------------------------------------------------------------------------

function roleBadgeClass(role: PlayerRole): string {
  switch (role) {
    case 'werewolf':
      return 'bg-wolf-900 text-wolf-300 border border-wolf-700';
    case 'seer':
      return 'bg-seer-900 text-seer-300 border border-seer-700';
    case 'doctor':
      return 'bg-doctor-900 text-doctor-300 border border-doctor-700';
    case 'villager':
      return 'bg-gray-800 text-gray-300 border border-gray-600';
  }
}

function roleLabel(role: PlayerRole): string {
  switch (role) {
    case 'werewolf':
      return '🐺 Werewolf';
    case 'seer':
      return '👁 Seer';
    case 'doctor':
      return '💊 Doctor';
    case 'villager':
      return 'Villager';
  }
}

// ---------------------------------------------------------------------------
// Timestamp formatter
// ---------------------------------------------------------------------------

function formatTime(ts: string): string {
  try {
    const d = new Date(ts);
    return d.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    });
  } catch {
    return '';
  }
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface LogEntryRowProps {
  entry: LogEntry;
  /** When true, show the rounded bg-card treatment (used in EventLog) */
  compact?: boolean;
}

// ---------------------------------------------------------------------------
// Main renderer
// ---------------------------------------------------------------------------

export function LogEntryRow({ entry, compact = false }: LogEntryRowProps) {
  const observerMode = useGameStore((s) => s.observerMode);
  const timeLabel = formatTime(entry.ts);

  const wrapperBase = compact
    ? 'flex gap-2 items-start rounded-lg px-3 py-2 text-sm'
    : 'flex gap-2 items-start px-2 py-1.5 text-sm';

  switch (entry.type) {
    // -------------------------------------------------------------------------
    case 'narration':
      return (
        <div className={`${wrapperBase} text-gray-400 italic`}>
          <time
            className="mt-0.5 shrink-0 font-mono text-xs text-gray-600"
            dateTime={entry.ts}
            title={entry.ts}
          >
            {timeLabel}
          </time>
          <span>{entry.text}</span>
        </div>
      );

    // -------------------------------------------------------------------------
    case 'player_statement':
      return (
        <div className={`${wrapperBase} items-start`}>
          <time
            className="mt-0.5 shrink-0 font-mono text-xs text-gray-600"
            dateTime={entry.ts}
            title={entry.ts}
          >
            {timeLabel}
          </time>
          <div className="min-w-0">
            <span className="font-bold text-gray-100">{entry.player}</span>
            {observerMode && (
              <>
                <span className="mx-1 text-gray-500">·</span>
                <span
                  className={`rounded px-1.5 py-0.5 text-xs font-semibold ${roleBadgeClass(entry.role)}`}
                >
                  {roleLabel(entry.role)}
                </span>
              </>
            )}
            <p className="mt-0.5 text-gray-300 before:content-['&quot;'] after:content-['&quot;']">
              {entry.text}
            </p>
          </div>
        </div>
      );

    // -------------------------------------------------------------------------
    case 'vote':
      return (
        <div className={`${wrapperBase} items-center text-gray-400`}>
          <time
            className="shrink-0 font-mono text-xs text-gray-600"
            dateTime={entry.ts}
            title={entry.ts}
          >
            {timeLabel}
          </time>
          <span className="text-xs" aria-hidden="true">
            🗳️
          </span>
          <span className="text-xs">
            <span className="font-medium text-gray-200">{entry.voter}</span>
            <span className="mx-1 text-gray-500">→</span>
            <span className="font-medium text-gray-200">{entry.target}</span>
          </span>
        </div>
      );

    // -------------------------------------------------------------------------
    case 'vote_tally': {
      const tallySorted = Object.entries(entry.votes).sort(
        ([, a], [, b]) => b - a,
      );
      return (
        <div className={`${wrapperBase} flex-col`}>
          <div className="flex items-center gap-2">
            <time
              className="shrink-0 font-mono text-xs text-gray-600"
              dateTime={entry.ts}
              title={entry.ts}
            >
              {timeLabel}
            </time>
            <span className="rounded-full bg-amber-900/50 px-2 py-0.5 text-xs font-semibold uppercase tracking-wide text-amber-300">
              Final Tally
            </span>
          </div>
          <div className="ml-16 mt-1 flex flex-wrap gap-2">
            {tallySorted.map(([name, count]) => (
              <span
                key={name}
                className="rounded bg-gray-800 px-2 py-0.5 text-xs text-gray-200"
              >
                <span className="font-semibold">{name}</span>
                <span className="ml-1 text-gray-400">{count}</span>
              </span>
            ))}
          </div>
        </div>
      );
    }

    // -------------------------------------------------------------------------
    case 'elimination': {
      const byVote = entry.cause === 'vote';
      return (
        <div
          className={`${wrapperBase} rounded-lg border ${
            byVote
              ? 'border-orange-900/50 bg-orange-950/30'
              : 'border-red-900/50 bg-red-950/30'
          }`}
        >
          <time
            className="mt-0.5 shrink-0 font-mono text-xs text-gray-600"
            dateTime={entry.ts}
            title={entry.ts}
          >
            {timeLabel}
          </time>
          <div>
            <span className="font-bold text-red-400">
              {byVote ? '🗳️' : '☠️'} {entry.player}
            </span>
            <span className="ml-2 text-xs text-gray-400">
              eliminated by {byVote ? 'vote' : 'wolves'}
            </span>
            <span
              className={`ml-2 rounded px-1.5 py-0.5 text-xs font-semibold ${roleBadgeClass(entry.role)}`}
            >
              {roleLabel(entry.role)}
            </span>
            {entry.vote_count !== undefined && (
              <span className="ml-1 text-xs text-gray-500">
                ({entry.vote_count} vote{entry.vote_count !== 1 ? 's' : ''})
              </span>
            )}
          </div>
        </div>
      );
    }

    // -------------------------------------------------------------------------
    case 'phase_start': {
      const isNight = entry.phase === 'night';
      const isDay = entry.phase === 'day';
      const icon = isNight ? '🌙' : isDay ? '☀️' : '🎯';
      const label = isNight
        ? `Night ${entry.round} begins`
        : isDay
          ? `Day ${entry.round} begins`
          : `Phase: ${entry.phase}`;
      return (
        <div
          className={`${wrapperBase} items-center gap-2 font-semibold ${
            isNight
              ? 'text-night-300'
              : isDay
                ? 'text-day-400'
                : 'text-gray-400'
          }`}
        >
          <time
            className="shrink-0 font-mono text-xs text-gray-600"
            dateTime={entry.ts}
            title={entry.ts}
          >
            {timeLabel}
          </time>
          <span aria-hidden="true">{icon}</span>
          <span>{label}</span>
        </div>
      );
    }

    // -------------------------------------------------------------------------
    case 'game_start':
      return (
        <div
          className={`${wrapperBase} items-center gap-2 font-bold text-village-400`}
        >
          <time
            className="shrink-0 font-mono text-xs text-gray-600"
            dateTime={entry.ts}
            title={entry.ts}
          >
            {timeLabel}
          </time>
          <span aria-hidden="true">🐺</span>
          <span>
            Game begins! {entry.players.length} players
          </span>
        </div>
      );

    // -------------------------------------------------------------------------
    case 'game_end': {
      const villageWins = entry.winner === 'village';
      return (
        <div
          className={`${wrapperBase} items-center gap-2 rounded-lg border p-3 font-bold ${
            villageWins
              ? 'border-village-700 bg-village-950/40 text-village-300'
              : 'border-wolf-700 bg-wolf-950/40 text-wolf-300'
          }`}
        >
          <time
            className="shrink-0 font-mono text-xs opacity-60"
            dateTime={entry.ts}
            title={entry.ts}
          >
            {timeLabel}
          </time>
          <span aria-hidden="true">{villageWins ? '🏆' : '🐺'}</span>
          <span>
            {villageWins ? 'Village wins!' : 'Wolves win!'}{' '}
            <span className="font-normal text-sm opacity-75">
              ({entry.rounds_played} round{entry.rounds_played !== 1 ? 's' : ''})
            </span>
          </span>
        </div>
      );
    }

    // -------------------------------------------------------------------------
    case 'night_summary':
      return (
        <div
          className={`${wrapperBase} flex-col rounded-lg border border-night-700/50 bg-night-950/50`}
        >
          <div className="flex items-center gap-2">
            <time
              className="shrink-0 font-mono text-xs text-gray-600"
              dateTime={entry.ts}
              title={entry.ts}
            >
              {timeLabel}
            </time>
            <span className="rounded-full bg-night-800 px-2 py-0.5 text-xs font-semibold uppercase tracking-wide text-night-300">
              Night Summary
            </span>
          </div>
          <div className="ml-16 mt-1 space-y-0.5 text-xs text-gray-400">
            <div>
              🐺 Wolves targeted:{' '}
              <span className="font-semibold text-wolf-400">
                {entry.wolf_target}
              </span>
            </div>
            <div>
              💊 Doctor saved:{' '}
              <span
                className={
                  entry.saved ? 'font-semibold text-doctor-400' : 'text-gray-500'
                }
              >
                {entry.doctor_save || 'no one'}{' '}
                {entry.saved ? '(protected!)' : ''}
              </span>
            </div>
            <div>
              👁 Seer investigated:{' '}
              <span className="font-semibold text-seer-400">
                {entry.seer_investigated}
              </span>{' '}
              →{' '}
              <span
                className={
                  entry.seer_result === 'Werewolf'
                    ? 'text-wolf-400'
                    : 'text-village-400'
                }
              >
                {entry.seer_result}
              </span>
            </div>
          </div>
        </div>
      );

    default:
      return null;
  }
}
