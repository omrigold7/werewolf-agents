// =============================================================================
// ObserverToggle.tsx — Toggle switch for revealing GM-level role information
// =============================================================================

import { useGameStore } from '../store/gameStore';

export function ObserverToggle() {
  const observerMode = useGameStore((s) => s.observerMode);
  const setObserverMode = useGameStore((s) => s.setObserverMode);

  return (
    <div className="flex items-center gap-2">
      {/* Badge shown when observer mode is active */}
      {observerMode && (
        <span className="flex items-center gap-1 rounded-full bg-indigo-600 px-2.5 py-0.5 text-xs font-semibold text-white">
          <span aria-hidden="true">👁</span>
          GM View
        </span>
      )}

      {/* Pill-shaped toggle */}
      <button
        type="button"
        role="switch"
        aria-checked={observerMode}
        aria-label="Toggle observer mode"
        onClick={() => setObserverMode(!observerMode)}
        className={[
          'relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full',
          'transition-colors duration-200 ease-in-out focus-visible:outline focus-visible:outline-2',
          'focus-visible:outline-offset-2 focus-visible:outline-indigo-600',
          observerMode ? 'bg-indigo-600' : 'bg-gray-500',
        ].join(' ')}
      >
        <span className="sr-only">Observer mode</span>
        <span
          aria-hidden="true"
          className={[
            'pointer-events-none inline-block h-4 w-4 rounded-full bg-white shadow-md',
            'transform transition-transform duration-200 ease-in-out',
            observerMode ? 'translate-x-6' : 'translate-x-1',
          ].join(' ')}
        />
      </button>

      <span className="text-sm font-medium text-gray-300 select-none">
        Observer
      </span>
    </div>
  );
}
