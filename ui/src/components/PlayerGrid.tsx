// =============================================================================
// PlayerGrid.tsx — Responsive grid of all PlayerCard components
// =============================================================================

import { useMemo } from 'react';
import { useGameStore, selectCurrentPhase } from '../store/gameStore';
import type { PlayerViewModel } from '../lib/gameTypes';
import { PlayerCard } from './PlayerCard';

// ---------------------------------------------------------------------------
// Stable-equality helper — avoids infinite re-renders from new array refs
// ---------------------------------------------------------------------------

function viewModelsEqual(a: PlayerViewModel[], b: PlayerViewModel[]): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    const ai = a[i];
    const bi = b[i];
    if (
      ai.name !== bi.name ||
      ai.role !== bi.role ||
      ai.isAlive !== bi.isAlive ||
      ai.currentVotes !== bi.currentVotes ||
      ai.isDoctorProtected !== bi.isDoctorProtected ||
      ai.seerResult !== bi.seerResult ||
      ai.eliminatedInfo?.cause !== bi.eliminatedInfo?.cause ||
      ai.eliminatedInfo?.round !== bi.eliminatedInfo?.round
    ) {
      return false;
    }
  }
  return true;
}

export function PlayerGrid() {
  // Read raw state slices — each is stable (Object.is) unless actually changed
  const gameState = useGameStore((s) => s.gameState);
  const observerMode = useGameStore((s) => s.observerMode);
  const liveVotes = useGameStore((s) => s.liveVotes);
  const phase = useGameStore(selectCurrentPhase);
  const isDayPhase = phase === 'day';

  // Derive view models locally with useMemo — only recomputes when inputs change
  const viewModels = useMemo(() => {
    if (!gameState || !Array.isArray(gameState.players)) return [];

    return gameState.players.map((name) => {
      const isAlive = gameState.alive.includes(name);
      const eliminatedInfo = gameState.eliminated.find((e) => e.name === name);
      const role = gameState.roles[name];

      const seerResult = observerMode ? gameState.seer_knowledge[name] : undefined;

      const currentNightEvent = gameState.night_events.find(
        (n) => n.round === gameState.round,
      );
      const isDoctorProtected =
        observerMode &&
        currentNightEvent !== undefined &&
        currentNightEvent.doctor_save === name &&
        currentNightEvent.saved === true;

      const hasLiveVotes = Object.keys(liveVotes).length > 0;
      let currentVotes: number;
      if (hasLiveVotes) {
        currentVotes = liveVotes[name] ?? 0;
      } else {
        const currentDayEvent = gameState.day_events?.find(
          (d) => d.round === gameState.round,
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
      } satisfies PlayerViewModel;
    });
  }, [gameState, observerMode, liveVotes]);

  if (viewModels.length === 0) {
    return (
      <div className="flex items-center justify-center py-12 text-gray-500 text-sm">
        No players yet — waiting for the game to start…
      </div>
    );
  }

  return (
    <div
      className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4"
      aria-label="Player cards"
    >
      {viewModels.map((vm) => {
        // showRole: true when observer mode is on, OR the player was eliminated
        // by vote (role is publicly revealed on elimination by vote)
        const eliminatedByVote =
          !vm.isAlive && vm.eliminatedInfo?.cause === 'vote';
        const showRole = observerMode || !!eliminatedByVote;

        // voteCount: prefer live SSE-accumulated votes, fall back to vm.currentVotes
        const hasLiveVotes = Object.keys(liveVotes).length > 0;
        const voteCount = hasLiveVotes
          ? (liveVotes[vm.name] ?? 0)
          : vm.currentVotes;

        return (
          <PlayerCard
            key={vm.name}
            name={vm.name}
            role={vm.role}
            isAlive={vm.isAlive}
            eliminatedInfo={vm.eliminatedInfo}
            voteCount={voteCount}
            showRole={showRole}
            seerResult={vm.seerResult}
            isDoctorProtected={vm.isDoctorProtected}
            isDayPhase={isDayPhase}
          />
        );
      })}
    </div>
  );
}

// Export the equality helper in case other components need it
export { viewModelsEqual };
