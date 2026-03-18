// =============================================================================
// VoteTally.tsx — Live horizontal bar chart of votes during the day phase
// =============================================================================

import { useMemo } from 'react';
import { useGameStore } from '../store/gameStore';
import type { VoteTallyEntry } from '../lib/gameTypes';

export function VoteTally() {
  const liveVotes = useGameStore((s) => s.liveVotes);
  const allLogEntries = useGameStore((s) => s.allLogEntries);
  const gameState = useGameStore((s) => s.gameState);

  // Determine if a final vote_tally entry has arrived for the current round
  const finalTally = useMemo((): VoteTallyEntry | null => {
    if (!gameState) return null;
    const tallies = allLogEntries.filter(
      (e): e is VoteTallyEntry =>
        e.type === 'vote_tally' && e.round === gameState.round,
    );
    return tallies.length > 0 ? tallies[tallies.length - 1] : null;
  }, [allLogEntries, gameState]);

  // Use the finalTally votes when available, otherwise use the live accumulation
  const votes: Record<string, number> = finalTally
    ? finalTally.votes
    : liveVotes;

  const entries = Object.entries(votes).filter(([, count]) => count > 0);

  // Nothing to render if there are no votes at all
  if (entries.length === 0) {
    return (
      <div className="flex items-center justify-center py-3 text-sm text-gray-500 italic">
        No votes recorded yet
      </div>
    );
  }

  // Sort descending by vote count
  const sorted = [...entries].sort(([, a], [, b]) => b - a);
  const maxVotes = sorted[0][1];
  // Check for tie: more than one player shares the maximum
  const leadersCount = sorted.filter(([, c]) => c === maxVotes).length;
  const isTie = leadersCount > 1;

  return (
    <div className="w-full rounded-xl border border-gray-700 bg-gray-900 px-4 py-3 shadow-lg">
      {/* Header */}
      <div className="mb-3 flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-widest text-gray-400">
          Vote Tally
        </span>
        {finalTally ? (
          <span className="rounded-full bg-red-900/60 px-2.5 py-0.5 text-xs font-semibold text-red-300">
            Final vote
          </span>
        ) : (
          <span className="flex items-center gap-1.5 text-xs text-yellow-400">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-yellow-400 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-yellow-400" />
            </span>
            Voting in progress...
          </span>
        )}
      </div>

      {/* Bars */}
      <div className="flex flex-col gap-2">
        {sorted.map(([name, count]) => {
          const isLeader = count === maxVotes && !isTie;
          const pct = maxVotes > 0 ? Math.round((count / maxVotes) * 100) : 0;

          return (
            <div key={name} className="flex items-center gap-3">
              {/* Player name */}
              <span
                className={[
                  'w-20 shrink-0 truncate text-sm font-medium',
                  isLeader ? 'text-red-400' : 'text-gray-200',
                ].join(' ')}
              >
                {name}
              </span>

              {/* Bar track */}
              <div className="relative h-5 flex-1 overflow-hidden rounded-full bg-gray-800">
                <div
                  className={[
                    'h-full rounded-full transition-all duration-500',
                    isLeader
                      ? 'bg-red-600'
                      : isTie && count === maxVotes
                        ? 'bg-orange-500'
                        : 'bg-indigo-600',
                  ].join(' ')}
                  style={{ width: `${pct}%` }}
                />
              </div>

              {/* Vote count */}
              <span
                className={[
                  'w-5 shrink-0 text-right text-sm font-bold tabular-nums',
                  isLeader ? 'text-red-400' : 'text-gray-300',
                ].join(' ')}
              >
                {count}
              </span>

              {/* Leader crown (sole leader only) */}
              {isLeader && (
                <span className="text-sm" aria-label="current leader">
                  👑
                </span>
              )}
            </div>
          );
        })}
      </div>

      {/* Tie notice */}
      {isTie && (
        <p className="mt-3 text-center text-xs text-orange-400">
          Tied — {leadersCount} players share the lead with {maxVotes} vote
          {maxVotes !== 1 ? 's' : ''}
        </p>
      )}
    </div>
  );
}
