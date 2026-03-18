// =============================================================================
// PhaseBanner.tsx — Full-width banner showing current round and phase
// =============================================================================

import { useGameStore, selectCurrentPhase } from '../store/gameStore';
import type { GameEndEntry } from '../lib/gameTypes';

// Derive winner from the last game_end log entry in the store
function useWinner(): string | null {
  return useGameStore((s) => {
    const endEntry = [...s.allLogEntries]
      .reverse()
      .find((e): e is GameEndEntry => e.type === 'game_end');
    if (!endEntry) return null;
    return endEntry.winner === 'wolves' ? 'Wolves' : 'Village';
  });
}

export function PhaseBanner() {
  const round = useGameStore((s) => s.gameState?.round ?? 0);
  const phase = useGameStore(selectCurrentPhase);
  const winner = useWinner();

  // ---------------------------------------------------------------------------
  // Derive display properties per phase
  // ---------------------------------------------------------------------------

  let bgClasses: string;
  let textClasses: string;
  let icon: string;
  let label: string;

  switch (phase) {
    case 'night':
      bgClasses = 'bg-indigo-900';
      textClasses = 'text-indigo-100';
      icon = '🌙';
      label = `Round ${round} — Night Phase`;
      break;

    case 'day':
      bgClasses = 'bg-amber-500';
      textClasses = 'text-amber-950';
      icon = '☀️';
      label = `Round ${round} — Day Phase`;
      break;

    case 'end':
      bgClasses = 'bg-purple-950';
      textClasses = 'text-purple-100';
      icon = '🏆';
      label = winner ? `Game Over — ${winner} wins!` : 'Game Over';
      break;

    case 'setup':
    default:
      bgClasses = 'bg-gray-800';
      textClasses = 'text-gray-300';
      icon = '⏳';
      label = 'Waiting for game to start…';
      break;
  }

  return (
    <div
      // Animate background transitions between phases
      className={[
        'w-full py-3 px-6 flex items-center justify-center gap-3',
        'transition-colors duration-700 ease-in-out',
        bgClasses,
      ].join(' ')}
      role="status"
      aria-live="polite"
    >
      <span className="text-2xl leading-none" aria-hidden="true">
        {icon}
      </span>
      <span className={['text-base font-semibold tracking-wide', textClasses].join(' ')}>
        {label}
      </span>
    </div>
  );
}
