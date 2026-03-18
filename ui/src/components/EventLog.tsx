// =============================================================================
// EventLog.tsx — Full scrollable event history, grouped by round + phase
// =============================================================================

import { useMemo, useState } from 'react';
import { useGameStore } from '../store/gameStore';
import type { LogEntry, GamePhase } from '../lib/gameTypes';
import { LogEntryRow } from './LogEntryRow';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface EntryGroup {
  key: string;
  round: number;
  phase: GamePhase;
  entries: LogEntry[];
}

// ---------------------------------------------------------------------------
// Grouping helper
// ---------------------------------------------------------------------------

function groupEntries(entries: LogEntry[]): EntryGroup[] {
  const groups: EntryGroup[] = [];
  const seen = new Map<string, EntryGroup>();

  for (const entry of entries) {
    const key = `${entry.round}-${entry.phase}`;
    if (!seen.has(key)) {
      const group: EntryGroup = {
        key,
        round: entry.round,
        phase: entry.phase,
        entries: [],
      };
      groups.push(group);
      seen.set(key, group);
    }
    seen.get(key)!.entries.push(entry);
  }

  return groups;
}

// ---------------------------------------------------------------------------
// Phase label helper
// ---------------------------------------------------------------------------

function phaseLabel(phase: GamePhase, round: number): string {
  switch (phase) {
    case 'setup':
      return 'Setup';
    case 'night':
      return `🌙 Night ${round}`;
    case 'day':
      return `☀️ Day ${round}`;
    case 'end':
      return '🏆 Game Over';
  }
}

function phaseHeaderClass(phase: GamePhase): string {
  switch (phase) {
    case 'night':
      return 'bg-night-950 border-night-800 text-night-300';
    case 'day':
      return 'bg-day-950/60 border-day-900 text-day-300';
    case 'end':
      return 'bg-village-950/60 border-village-900 text-village-300';
    default:
      return 'bg-gray-900 border-gray-700 text-gray-400';
  }
}

// ---------------------------------------------------------------------------
// Collapsible group component
// ---------------------------------------------------------------------------

interface GroupPanelProps {
  group: EntryGroup;
  defaultOpen: boolean;
}

function GroupPanel({ group, defaultOpen }: GroupPanelProps) {
  const [open, setOpen] = useState(defaultOpen);
  const headerClass = phaseHeaderClass(group.phase);

  return (
    <div className="overflow-hidden rounded-lg border border-gray-800">
      {/* Group header */}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={[
          'flex w-full items-center justify-between border-b px-3 py-2 text-left text-xs font-semibold uppercase tracking-wider',
          'transition-colors hover:brightness-110',
          headerClass,
        ].join(' ')}
        aria-expanded={open}
      >
        <span>{phaseLabel(group.phase, group.round)}</span>
        <span className="flex items-center gap-2">
          <span className="rounded-full bg-black/30 px-1.5 py-0.5 font-mono text-xs">
            {group.entries.length}
          </span>
          <span
            aria-hidden="true"
            className={`transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
          >
            ▾
          </span>
        </span>
      </button>

      {/* Group entries */}
      {open && (
        <div className="divide-y divide-gray-800/60 bg-gray-900/50 py-0.5">
          {group.entries.map((entry, idx) => (
            <LogEntryRow
              key={`${entry.ts}-${idx}`}
              entry={entry}
              compact
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main EventLog component
// ---------------------------------------------------------------------------

export function EventLog() {
  const allLogEntries = useGameStore((s) => s.allLogEntries);
  const observerMode = useGameStore((s) => s.observerMode);
  const logFilter = useGameStore((s) => s.logFilter);
  const setLogFilterRound = useGameStore((s) => s.setLogFilterRound);
  const resetLogFilter = useGameStore((s) => s.resetLogFilter);
  const gameState = useGameStore((s) => s.gameState);

  // Filter out night_summary when not in observer mode
  const filteredByMode = useMemo(
    () =>
      allLogEntries.filter(
        (e) => observerMode || e.type !== 'night_summary',
      ),
    [allLogEntries, observerMode],
  );

  // Apply round filter from logFilter
  const filteredEntries = useMemo(
    () =>
      filteredByMode.filter(
        (e) =>
          (logFilter.round === 'all' || e.round === logFilter.round) &&
          logFilter.types.has(e.type),
      ),
    [filteredByMode, logFilter],
  );

  // Group filtered entries
  const groups = useMemo(() => groupEntries(filteredEntries), [filteredEntries]);

  // Determine the "current" group key (latest round + phase) to keep open by default
  const currentRound = gameState?.round ?? 1;
  const currentGroupKeys = useMemo(() => {
    if (groups.length === 0) return new Set<string>();
    const maxRound = Math.max(...groups.map((g) => g.round));
    return new Set(groups.filter((g) => g.round === maxRound).map((g) => g.key));
  }, [groups]);

  // Unique rounds for the filter dropdown
  const availableRounds = useMemo(() => {
    const rounds = new Set(allLogEntries.map((e) => e.round));
    return Array.from(rounds).sort((a, b) => a - b);
  }, [allLogEntries]);

  return (
    <section className="flex h-full flex-col overflow-hidden rounded-xl border border-gray-700 bg-gray-900 shadow-lg">
      {/* Panel header */}
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-b border-gray-700 px-4 py-2.5">
        <h2 className="text-xs font-semibold uppercase tracking-widest text-gray-400">
          Event Log
        </h2>

        {/* Round filter */}
        <div className="flex items-center gap-2">
          <label
            htmlFor="event-log-round"
            className="text-xs text-gray-500"
          >
            Round:
          </label>
          <select
            id="event-log-round"
            value={logFilter.round === 'all' ? 'all' : String(logFilter.round)}
            onChange={(e) =>
              e.target.value === 'all'
                ? setLogFilterRound('all')
                : setLogFilterRound(Number(e.target.value))
            }
            className="rounded bg-gray-800 px-2 py-0.5 text-xs text-gray-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          >
            <option value="all">All</option>
            {availableRounds.map((r) => (
              <option key={r} value={String(r)}>
                {r}
              </option>
            ))}
          </select>

          {logFilter.round !== 'all' && (
            <button
              type="button"
              onClick={resetLogFilter}
              className="text-xs text-indigo-400 underline hover:text-indigo-300"
            >
              Reset
            </button>
          )}

          <span className="rounded-full bg-gray-800 px-2 py-0.5 text-xs text-gray-500">
            {filteredEntries.length} entries
          </span>
        </div>
      </div>

      {/* Scrollable groups */}
      <div className="flex-1 overflow-y-auto px-2 py-2" style={{ minHeight: 0 }}>
        {groups.length === 0 ? (
          <div className="flex h-full items-center justify-center py-12 text-sm text-gray-600 italic">
            {allLogEntries.length === 0
              ? 'Waiting for game to start...'
              : 'No entries match current filter.'}
          </div>
        ) : (
          <div className="flex flex-col gap-1.5">
            {groups.map((group) => (
              <GroupPanel
                key={group.key}
                group={group}
                defaultOpen={currentGroupKeys.has(group.key)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Footer: current round indicator */}
      <div className="shrink-0 border-t border-gray-800 px-4 py-1.5 text-right text-xs text-gray-600">
        Round {currentRound}
      </div>
    </section>
  );
}
