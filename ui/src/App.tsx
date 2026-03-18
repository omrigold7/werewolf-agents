// =============================================================================
// App.tsx — Root layout for the Werewolf Observer UI
// =============================================================================

import { useGameState } from './hooks/useGameState';
import { useEventStream } from './hooks/useEventStream';
import { useGameStore, selectCurrentPhase } from './store/gameStore';
import { PhaseBanner } from './components/PhaseBanner';
import { PlayerGrid } from './components/PlayerGrid';
import { VoteTally } from './components/VoteTally';
import { EventLog } from './components/EventLog';
import { ObserverToggle } from './components/ObserverToggle';

// ---------------------------------------------------------------------------
// Connection status indicator
// ---------------------------------------------------------------------------

function ConnectionDot() {
  const status = useGameStore((s) => s.connectionStatus);

  let dotClass: string;
  let title: string;

  switch (status) {
    case 'connected':
      dotClass = 'bg-green-400 shadow-[0_0_6px_2px_rgba(74,222,128,0.5)]';
      title = 'Connected';
      break;
    case 'connecting':
      dotClass = 'animate-pulse bg-yellow-400';
      title = 'Connecting…';
      break;
    case 'disconnected':
    default:
      dotClass = 'bg-red-500';
      title = 'Disconnected';
      break;
  }

  return (
    <span
      className={`inline-block h-2.5 w-2.5 rounded-full ${dotClass} shrink-0`}
      title={title}
      aria-label={title}
    />
  );
}

// ---------------------------------------------------------------------------
// Root App component
// ---------------------------------------------------------------------------

export function App() {
  // Hydrate store from REST on mount; poll when SSE is not connected
  useGameState();
  // Open and maintain the SSE connection
  useEventStream();

  const phase = useGameStore(selectCurrentPhase);
  const isDayPhase = phase === 'day';

  return (
    <div className="flex min-h-screen flex-col bg-gray-950 text-gray-100">
      {/* ------------------------------------------------------------------ */}
      {/* Header                                                              */}
      {/* ------------------------------------------------------------------ */}
      <header className="flex shrink-0 items-center justify-between border-b border-gray-800 bg-gray-900 px-4 py-3 shadow-md">
        <div className="flex items-center gap-2.5">
          <ConnectionDot />
          <h1 className="text-base font-bold tracking-tight text-gray-100">
            🐺 Werewolf Observer
          </h1>
        </div>
        <div className="flex items-center gap-3">
          <ObserverToggle />
        </div>
      </header>

      {/* ------------------------------------------------------------------ */}
      {/* Phase Banner — full width                                           */}
      {/* ------------------------------------------------------------------ */}
      <PhaseBanner />

      {/* ------------------------------------------------------------------ */}
      {/* Main content                                                        */}
      {/* ------------------------------------------------------------------ */}
      <main className="flex flex-1 flex-col gap-4 overflow-hidden p-4">
        {/* Player grid — centered */}
        <section aria-label="Players">
          <PlayerGrid />
        </section>

        {/* Vote tally — day phase only */}
        {isDayPhase && (
          <section aria-label="Vote tally" className="mx-auto w-full max-w-2xl">
            <VoteTally />
          </section>
        )}

        {/* Event log — full width */}
        <div className="flex min-h-0 flex-1 flex-col">
          <EventLog />
        </div>
      </main>
    </div>
  );
}
