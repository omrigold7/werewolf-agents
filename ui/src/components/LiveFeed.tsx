// =============================================================================
// LiveFeed.tsx — Real-time narration feed (last N log entries, auto-scroll)
// =============================================================================

import { useEffect, useRef, useState, useCallback } from 'react';
import { useGameStore } from '../store/gameStore';
import type { LogEntry } from '../lib/gameTypes';
import { LogEntryRow } from './LogEntryRow';

interface LiveFeedProps {
  maxItems?: number;
}

export function LiveFeed({ maxItems = 20 }: LiveFeedProps) {
  const logEntries = useGameStore((s) => s.logEntries);
  const observerMode = useGameStore((s) => s.observerMode);

  // Filter night_summary unless observerMode is on
  const visibleEntries: LogEntry[] = logEntries
    .filter((e) => observerMode || e.type !== 'night_summary')
    .slice(-maxItems);

  const bottomRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [showScrollButton, setShowScrollButton] = useState(false);
  // Track whether the user has manually scrolled away from the bottom
  const userScrolledUp = useRef(false);

  // ----- Scroll-position tracking -------------------------------------------
  const handleScroll = useCallback(() => {
    const el = scrollContainerRef.current;
    if (!el) return;
    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    const isNearBottom = distanceFromBottom < 60;
    userScrolledUp.current = !isNearBottom;
    setShowScrollButton(!isNearBottom);
  }, []);

  // ----- Auto-scroll on new entries -----------------------------------------
  useEffect(() => {
    if (!userScrolledUp.current) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    } else {
      // Show the "new events" nudge button whenever there are unread entries
      setShowScrollButton(true);
    }
  }, [visibleEntries.length]);

  // ----- Snap to bottom on button click -------------------------------------
  const scrollToBottom = useCallback(() => {
    userScrolledUp.current = false;
    setShowScrollButton(false);
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  return (
    <section className="flex h-full flex-col overflow-hidden rounded-xl border border-gray-700 bg-gray-900 shadow-lg">
      {/* Panel header */}
      <div className="flex shrink-0 items-center justify-between border-b border-gray-700 px-4 py-2.5">
        <h2 className="text-xs font-semibold uppercase tracking-widest text-gray-400">
          Live Feed
        </h2>
        <span className="rounded-full bg-gray-800 px-2 py-0.5 text-xs text-gray-500">
          last {maxItems}
        </span>
      </div>

      {/* Scrollable entries */}
      <div
        ref={scrollContainerRef}
        onScroll={handleScroll}
        className="relative flex-1 overflow-y-auto"
        style={{ minHeight: 0 }}
      >
        {visibleEntries.length === 0 ? (
          <div className="flex h-full items-center justify-center py-12 text-sm text-gray-600 italic">
            Waiting for game events...
          </div>
        ) : (
          <div className="divide-y divide-gray-800/60 py-1">
            {visibleEntries.map((entry, idx) => (
              <div
                key={`${entry.ts}-${idx}`}
                className="animate-fade-in"
              >
                <LogEntryRow entry={entry} />
              </div>
            ))}
          </div>
        )}
        {/* Sentinel element at the bottom */}
        <div ref={bottomRef} className="h-1" />
      </div>

      {/* "New events" sticky button */}
      {showScrollButton && (
        <div className="pointer-events-none absolute inset-x-0 bottom-0 flex justify-center pb-3">
          <button
            type="button"
            onClick={scrollToBottom}
            className="pointer-events-auto flex items-center gap-1.5 rounded-full bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white shadow-lg transition hover:bg-indigo-500 active:scale-95"
          >
            <span aria-hidden="true">↓</span> New events
          </button>
        </div>
      )}
    </section>
  );
}
