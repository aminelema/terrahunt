import type {
  ClueStatus,
  Direction8,
  GeodleGuessRow,
  NumericTrend,
} from '@terrahunt/shared';
import { CountryFlag } from './CountryFlag';

function getCellColorClasses(status: ClueStatus): string {
  if (status === 'MATCH') {
    return 'bg-emerald-600/90 border-emerald-400/60 text-white';
  }
  if (status === 'CLOSE') {
    return 'bg-amber-500/90 border-amber-300/60 text-slate-950 font-semibold';
  }
  return 'bg-rose-700/85 border-rose-500/50 text-white';
}

function getTrendArrow(trend: NumericTrend): string {
  if (trend === 'HIGHER') return '↑';
  if (trend === 'LOWER') return '↓';
  return '';
}

export function formatCompactPopulation(pop: number): string {
  if (pop >= 1_000_000_000) return `${(pop / 1_000_000_000).toFixed(2)}B`;
  if (pop >= 1_000_000) return `${(pop / 1_000_000).toFixed(1)}M`;
  if (pop >= 1_000) return `${Math.round(pop / 1_000)}K`;
  return String(pop);
}

export function formatCompactArea(km2: number): string {
  if (km2 >= 1_000_000) return `${(km2 / 1_000_000).toFixed(2)}M km²`;
  if (km2 >= 10_000) return `${Math.round(km2 / 1_000)}K km²`;
  if (km2 < 10) return `${km2.toFixed(2)} km²`;
  return `${Math.round(km2).toLocaleString('en-US')} km²`;
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
  /** Optional custom subtitle under the country name (e.g. "Answer" for the revealed row). */
  subtitleLabel?: string;
}

/**
 * Renders 1 country row in the 7-column Geodle grid (used for both guesses and the all-green answer row).
 */
export function GuessClueRow({ guess, subtitleLabel }: GuessClueRowProps) {
  const { clues } = guess;

  const neighborText = guess.isCorrect
    ? '✓ Target'
    : clues.neighborOrDirection.isNeighbor
      ? 'Borders!'
      : DIRECTION_ARROWS[clues.neighborOrDirection.direction ?? 'N'];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-7 gap-2 p-2 sm:p-0 rounded-xl bg-navy-900/60 sm:bg-transparent border border-slate-800 sm:border-none">
      {/* Country Flag + Name */}
      <div
        className={`col-span-2 sm:col-span-1 px-3 py-2 rounded-xl border flex items-center gap-2.5 min-h-[52px] ${
          guess.isCorrect
            ? 'bg-emerald-700/80 border-emerald-400 text-white'
            : 'bg-navy-800 border-slate-700'
        }`}
      >
        <CountryFlag iso2={guess.countryIso2} />
        <div className="min-w-0">
          <div className="text-xs font-bold text-white truncate" title={guess.countryName}>
            {guess.countryName}
          </div>
          <div className="text-[10px] font-mono text-slate-300/80">
            {subtitleLabel ?? `#${guess.guessOrder}`}
          </div>
        </div>
      </div>

      {/* 1. Continent */}
      <div
        className={`px-2 py-1.5 rounded-xl border flex flex-col items-center justify-center text-center min-h-[52px] ${getCellColorClasses(
          clues.continent.status,
        )}`}
      >
        <span className="text-xs font-bold leading-tight">{clues.continent.region}</span>
        <span className="text-[10px] opacity-85 truncate max-w-full">
          {clues.continent.subregion}
        </span>
      </div>

      {/* 2. Population */}
      <div
        className={`px-2 py-1.5 rounded-xl border flex items-center justify-center text-center min-h-[52px] ${getCellColorClasses(
          clues.population.status,
        )}`}
      >
        <span className="text-xs sm:text-sm font-mono font-extrabold">
          {formatCompactPopulation(clues.population.value)}{' '}
          {getTrendArrow(clues.population.trend)}
        </span>
      </div>

      {/* 3. Area */}
      <div
        className={`px-2 py-1.5 rounded-xl border flex items-center justify-center text-center min-h-[52px] ${getCellColorClasses(
          clues.areaKm2.status,
        )}`}
      >
        <span className="text-xs font-mono font-extrabold">
          {formatCompactArea(clues.areaKm2.value)} {getTrendArrow(clues.areaKm2.trend)}
        </span>
      </div>

      {/* 4. Landlocked */}
      <div
        className={`px-2 py-1.5 rounded-xl border flex items-center justify-center text-center min-h-[52px] ${getCellColorClasses(
          clues.landlocked.status,
        )}`}
      >
        <span className="text-xs sm:text-sm font-extrabold">
          {clues.landlocked.value ? 'Yes' : 'No'}
        </span>
      </div>

      {/* 5. Avg Temp */}
      <div
        className={`px-2 py-1.5 rounded-xl border flex items-center justify-center text-center min-h-[52px] ${getCellColorClasses(
          clues.avgTempC.status,
        )}`}
      >
        <span className="text-xs sm:text-sm font-mono font-extrabold">
          {clues.avgTempC.value.toFixed(1)}°C {getTrendArrow(clues.avgTempC.trend)}
        </span>
      </div>

      {/* 6. Neighbor / Compass */}
      <div
        className={`px-2 py-1.5 rounded-xl border flex items-center justify-center text-center min-h-[52px] ${getCellColorClasses(
          clues.neighborOrDirection.status,
        )}`}
      >
        <span className="text-xs font-extrabold">{neighborText}</span>
      </div>
    </div>
  );
}
