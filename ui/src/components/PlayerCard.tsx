// =============================================================================
// PlayerCard.tsx — Individual player status card
// =============================================================================

import type { PlayerRole, EliminatedPlayer, SeerResult } from '../lib/gameTypes';

// ---------------------------------------------------------------------------
// Role metadata — colors and icons
// ---------------------------------------------------------------------------

const ROLE_META: Record<
  PlayerRole,
  { icon: string; bgAlive: string; borderAlive: string; badgeBg: string; label: string }
> = {
  werewolf: {
    icon: '🐺',
    bgAlive: 'bg-red-950',
    borderAlive: 'border-red-700',
    badgeBg: 'bg-red-700 text-red-100',
    label: 'Werewolf',
  },
  seer: {
    icon: '🔮',
    bgAlive: 'bg-purple-950',
    borderAlive: 'border-purple-600',
    badgeBg: 'bg-purple-600 text-purple-100',
    label: 'Seer',
  },
  doctor: {
    icon: '💉',
    bgAlive: 'bg-blue-950',
    borderAlive: 'border-blue-600',
    badgeBg: 'bg-blue-600 text-blue-100',
    label: 'Doctor',
  },
  villager: {
    icon: '🏘️',
    bgAlive: 'bg-green-950',
    borderAlive: 'border-green-700',
    badgeBg: 'bg-green-700 text-green-100',
    label: 'Villager',
  },
};

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface PlayerCardProps {
  name: string;
  role: PlayerRole;
  isAlive: boolean;
  eliminatedInfo?: EliminatedPlayer;
  /** Votes against this player in the current day phase */
  voteCount: number;
  /** True when observerMode is on OR the player was eliminated by vote */
  showRole: boolean;
  seerResult?: SeerResult;
  isDoctorProtected: boolean;
  /** True when it is currently the day phase (show vote badge) */
  isDayPhase: boolean;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function PlayerCard({
  name,
  role,
  isAlive,
  eliminatedInfo,
  voteCount,
  showRole,
  seerResult,
  isDoctorProtected,
  isDayPhase,
}: PlayerCardProps) {
  const meta = ROLE_META[role] ?? ROLE_META.villager;

  // ---- Dead card -------------------------------------------------------
  if (!isAlive && eliminatedInfo) {
    const isWolfKill = eliminatedInfo.cause === 'wolves';
    return (
      <div
        className={[
          'relative flex flex-col items-center gap-2 rounded-xl border p-4',
          'border-gray-700 bg-gray-900',
          'opacity-50 grayscale',
          'transition-opacity duration-500',
        ].join(' ')}
        aria-label={`${name} — eliminated`}
      >
        {/* Cause-of-death badge */}
        <span
          className={[
            'absolute -top-2.5 left-1/2 -translate-x-1/2',
            'flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-bold',
            isWolfKill
              ? 'bg-gray-800 text-gray-300'
              : 'bg-yellow-900 text-yellow-200',
          ].join(' ')}
          title={isWolfKill ? 'Killed by wolves' : 'Voted out'}
        >
          {isWolfKill ? '💀' : '🔨'}
          <span>
            {isWolfKill
              ? `Eliminated Night ${eliminatedInfo.round}`
              : `Voted Out Round ${eliminatedInfo.round}`}
          </span>
        </span>

        {/* Role icon (always visible on dead card) */}
        <span className="text-3xl leading-none" aria-hidden="true">
          {meta.icon}
        </span>

        {/* Player name — struck through */}
        <p className="text-sm font-bold text-gray-400 line-through">{name}</p>

        {/* Role badge — always shown on dead cards */}
        <span
          className={[
            'rounded-full px-2 py-0.5 text-xs font-semibold',
            meta.badgeBg,
          ].join(' ')}
        >
          {meta.label}
        </span>
      </div>
    );
  }

  // ---- Alive card -------------------------------------------------------
  return (
    <div
      className={[
        'relative flex flex-col items-center gap-2 rounded-xl border p-4',
        // Only show role-based colours in observer mode; in player mode all
        // cards use a neutral palette so role cannot be inferred from colour.
        showRole ? meta.bgAlive : 'bg-gray-900',
        showRole ? meta.borderAlive : 'border-gray-600',
        'transition-all duration-300',
        // Hover glow effect
        'hover:shadow-lg hover:shadow-black/50 hover:brightness-110',
      ].join(' ')}
      aria-label={`${name}${showRole ? ` — ${meta.label}` : ''}`}
    >
      {/* Vote count badge — only during day phase */}
      {isDayPhase && voteCount > 0 && (
        <span
          className="absolute -top-2.5 -right-2.5 flex h-6 w-6 items-center justify-center rounded-full bg-red-600 text-xs font-bold text-white shadow"
          aria-label={`${voteCount} vote${voteCount !== 1 ? 's' : ''}`}
        >
          {voteCount}
        </span>
      )}

      {/* Doctor protection indicator (observer mode only) */}
      {isDoctorProtected && (
        <span
          className="absolute -top-2.5 left-1 text-sm"
          title="Doctor protected this round"
          aria-label="Doctor protected"
        >
          🛡️
        </span>
      )}

      {/* Role icon: shown only when showRole, otherwise placeholder */}
      <span className="text-3xl leading-none" aria-hidden="true">
        {showRole ? meta.icon : '❓'}
      </span>

      {/* Player name */}
      <p className="text-sm font-bold text-white">{name}</p>

      {/* Role badge + seer result — shown when showRole */}
      {showRole && (
        <div className="flex flex-col items-center gap-1">
          <span
            className={[
              'rounded-full px-2 py-0.5 text-xs font-semibold',
              meta.badgeBg,
            ].join(' ')}
          >
            {meta.label}
          </span>

          {seerResult && (
            <span
              className={[
                'flex items-center gap-0.5 rounded-full px-2 py-0.5 text-xs font-medium',
                seerResult === 'Werewolf'
                  ? 'bg-red-800 text-red-200'
                  : 'bg-green-800 text-green-200',
              ].join(' ')}
              title={`Seer result: ${seerResult}`}
            >
              <span aria-hidden="true">👁</span>
              {seerResult}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
