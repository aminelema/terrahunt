import type {
  ClueStatus,
  Direction8,
  GeodleGuessRow,
  NumericTrend,
} from '@terrahunt/shared';
import { CountryFlag } from './CountryFlag';

/**
 * Precision crypto-terminal cell styling:
 * - Dark obsidian surface instead of playful full-color blocks
 * - Razor-sharp 2px left status indicator bar + subtle directional wash on MATCH / CLOSE
 */
function getTerminalCellClasses(status: ClueStatus): string {
  if (status === 'MATCH') {
    return 'bg-gradient-to-r from-emerald-500/[0.14] via-emerald-500/[0.05] to-[#0A0D15]/90 border-emerald-500/35 border-l-2 border-l-emerald-400 text-white shadow-[0_0_20px_-10px_rgba(16,185,129,0.45)]';
  }
  if (status === 'CLOSE') {
    return 'bg-gradient-to-r from-amber-400/[0.13] via-amber-400/[0.04] to-[#0A0D15]/90 border-amber-400/35 border-l-2 border-l-amber-400 text-white';
  }
  return 'bg-[#0A0D15]/85 border-white/[0.07] border-l-2 border-l-rose-500/55 text-slate-300';
}

function getStatusDotClass(status: ClueStatus): string {
  if (status === 'MATCH') return 'bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.9)]';
  if (status === 'CLOSE') return 'bg-amber-400 shadow-[0_0_6px_rgba(251,191,36,0.8)]';
  return 'bg-rose-500/70';
}

function getDeltaBadgeClass(status: ClueStatus): string {
  if (status === 'MATCH') {
    return 'bg-emerald-400/15 text-emerald-300 border-emerald-400/30';
  }
  if (status === 'CLOSE') {
    return 'bg-amber-400/15 text-amber-300 border-amber-400/30';
  }
  return 'bg-rose-500/10 text-rose-300 border-rose-500/20';
}

function getTrendArrow(trend: NumericTrend): string {
  if (trend === 'HIGHER') return '↑';
  if (trend === 'LOWER') return '↓';
  return '';
}

function formatCompactPopulation(pop: number): string {
  if (pop >= 1_000_000_000) return `${(pop / 1_000_000_000).toFixed(2)}B`;
  if (pop >= 1_000_000) return `${(pop / 1_000_000).toFixed(1)}M`;
  if (pop >= 1_000) return `${Math.round(pop / 1_000)}K`;
  return String(pop);
}

function formatCompactArea(km2: number): string {
  if (km2 >= 1_000_000) return `${(km2 / 1_000_000).toFixed(2)}M`;
  if (km2 >= 10_000) return `${Math.round(km2 / 1_000)}K`;
  if (km2 < 10) return km2.toFixed(2);
  return Math.round(km2).toLocaleString('en-US');
}

const DIRECTION_ARROWS: Record<Direction8, string> = {
  N: '↑ N',
  NE: '↗ NE',
  E: '→ E',
  SE: '↘ SE',
  S: '↓ S',
  SW: '↙ SW',
  W: '← W',
  NW: '↖ NW',
};

interface GuessClueRowProps {
  guess: GeodleGuessRow;
  subtitleLabel?: string;
}

/**
 * Renders 1 country row using sharp, institutional fintech/crypto telemetry cells.
 */
export function GuessClueRow({ guess, subtitleLabel }: GuessClueRowProps) {
  const { clues } = guess;

  const neighborText = guess.isCorrect
    ? 'Target'
    : clues.neighborOrDirection.isNeighbor
      ? 'Borders!'
      : DIRECTION_ARROWS[clues.neighborOrDirection.direction ?? 'N'];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-7 gap-1.5 p-2 sm:p-0 rounded-lg bg-white/[0.015] sm:bg-transparent border border-white/[0.06] sm:border-none">
      {/* Country Identity Cell */}
      <div
        className={`col-span-2 sm:col-span-1 px-3 py-2.5 rounded-md border flex items-center gap-2.5 min-h-[52px] ${
          guess.isCorrect
            ? 'bg-emerald-500/[0.12] border-emerald-400/45 text-white'
            : 'bg-[#0C101A]/90 border-white/[0.08] text-slate-100'
        }`}
      >
        <CountryFlag iso2={guess.countryIso2} className="w-5 h-3.5" />
        <div className="min-w-0">
          <div className="text-xs font-semibold text-white truncate" title={guess.countryName}>
            {guess.countryName}
          </div>
          <div className="text-[10px] font-mono text-slate-500 truncate">
            {subtitleLabel ?? `#${String(guess.guessOrder).padStart(2, '0')}`}
          </div>
        </div>
      </div>

      {/* 1. Continent */}
      <div
        className={`px-3 py-2 rounded-md border flex flex-col justify-center min-h-[52px] ${getTerminalCellClasses(
          clues.continent.status,
        )}`}
      >
        <div className="flex items-center justify-between gap-1">
          <span className="text-[11px] font-mono font-semibold tracking-wider">
            {clues.continent.region}
          </span>
          <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${getStatusDotClass(clues.continent.status)}`} />
        </div>
        <span className="text-[10px] text-slate-400 truncate mt-0.5">
          {clues.continent.subregion}
        </span>
      </div>

      {/* 2. Population */}
      <div
        className={`px-3 py-2 rounded-md border flex items-center justify-between gap-1.5 min-h-[52px] ${getTerminalCellClasses(
          clues.population.status,
        )}`}
      >
        <span className="text-xs font-mono font-semibold tabular-nums">
          {formatCompactPopulation(clues.population.value)}
        </span>
        {clues.population.trend !== 'EQUAL' ? (
          <span
            className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-bold border ${getDeltaBadgeClass(
              clues.population.status,
            )}`}
          >
            {getTrendArrow(clues.population.trend)}
          </span>
        ) : (
          <span className={`w-1.5 h-1.5 rounded-full ${getStatusDotClass('MATCH')}`} />
        )}
      </div>

      {/* 3. Area */}
      <div
        className={`px-3 py-2 rounded-md border flex items-center justify-between gap-1.5 min-h-[52px] ${getTerminalCellClasses(
          clues.areaKm2.status,
        )}`}
      >
        <div className="min-w-0">
          <span className="text-xs font-mono font-semibold tabular-nums">
            {formatCompactArea(clues.areaKm2.value)}
          </span>
          <span className="text-[10px] font-mono text-slate-500 ml-1">km²</span>
        </div>
        {clues.areaKm2.trend !== 'EQUAL' ? (
          <span
            className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-bold border shrink-0 ${getDeltaBadgeClass(
              clues.areaKm2.status,
            )}`}
          >
            {getTrendArrow(clues.areaKm2.trend)}
          </span>
        ) : (
          <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${getStatusDotClass('MATCH')}`} />
        )}
      </div>

      {/* 4. Landlocked */}
      <div
        className={`px-3 py-2 rounded-md border flex items-center justify-between gap-1.5 min-h-[52px] ${getTerminalCellClasses(
          clues.landlocked.status,
        )}`}
      >
        <span className="text-xs font-mono font-semibold">
          {clues.landlocked.value ? 'Landlocked' : 'Coastal'}
        </span>
        <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${getStatusDotClass(clues.landlocked.status)}`} />
      </div>

      {/* 5. Avg Temp */}
      <div
        className={`px-3 py-2 rounded-md border flex items-center justify-between gap-1.5 min-h-[52px] ${getTerminalCellClasses(
          clues.avgTempC.status,
        )}`}
      >
        <span className="text-xs font-mono font-semibold tabular-nums">
          {clues.avgTempC.value.toFixed(1)}°C
        </span>
        {clues.avgTempC.trend !== 'EQUAL' ? (
          <span
            className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-bold border ${getDeltaBadgeClass(
              clues.avgTempC.status,
            )}`}
          >
            {getTrendArrow(clues.avgTempC.trend)}
          </span>
        ) : (
          <span className={`w-1.5 h-1.5 rounded-full ${getStatusDotClass('MATCH')}`} />
        )}
      </div>

      {/* 6. Neighbor / Compass */}
      <div
        className={`px-3 py-2 rounded-md border flex items-center justify-between gap-1.5 min-h-[52px] ${getTerminalCellClasses(
          clues.neighborOrDirection.status,
        )}`}
      >
        <span
          className={`px-1.5 py-0.5 rounded text-[11px] font-mono font-semibold border ${getDeltaBadgeClass(
            clues.neighborOrDirection.status,
          )}`}
        >
          {neighborText}
        </span>
        <span
          className={`w-1.5 h-1.5 rounded-full shrink-0 ${getStatusDotClass(
            clues.neighborOrDirection.status,
          )}`}
        />
      </div>
    </div>
  );
}
