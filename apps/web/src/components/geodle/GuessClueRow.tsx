import type {
  ClueStatus,
  Direction8,
  GeodleGuessRow,
  NumericTrend,
} from '@terrahunt/shared';

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
}

/**
 * Renders 1 guessed country row with its country card + 6 color-coded attribute cells.
 */
export function GuessClueRow({ guess }: GuessClueRowProps) {
  const { clues } = guess;

  const neighborLabel = guess.isCorrect
    ? 'Target!'
    : clues.neighborOrDirection.isNeighbor
      ? 'Yes (Borders!)'
      : `No · ${DIRECTION_ARROWS[clues.neighborOrDirection.direction ?? 'N']}`;

  return (
    <div className="grid grid-cols-2 sm:grid-cols-7 gap-2 p-2.5 sm:p-0 rounded-xl bg-navy-900/60 sm:bg-transparent border border-slate-800 sm:border-none">
      {/* Country Name Badge */}
      <div className="col-span-2 sm:col-span-1 px-3 py-2.5 rounded-xl bg-navy-800 border border-slate-700 flex items-center gap-2 min-h-[58px]">
        <span className="text-lg shrink-0">{guess.flagEmoji}</span>
        <div className="min-w-0">
          <div className="text-xs font-bold text-white truncate" title={guess.countryName}>
            {guess.countryName}
          </div>
          <div className="text-[10px] font-mono text-slate-400">#{guess.guessOrder}</div>
        </div>
      </div>

      {/* 1. Continent & Subregion */}
      <div
        className={`px-2.5 py-2 rounded-xl border flex flex-col items-center justify-center text-center min-h-[58px] ${getCellColorClasses(
          clues.continent.status,
        )}`}
      >
        <span className="text-[10px] uppercase opacity-75 sm:hidden">Continent</span>
        <span className="text-xs font-bold leading-tight">{clues.continent.region}</span>
        <span className="text-[10px] opacity-85 leading-tight truncate max-w-full">
          {clues.continent.subregion}
        </span>
      </div>

      {/* 2. Population */}
      <div
        className={`px-2.5 py-2 rounded-xl border flex flex-col items-center justify-center text-center min-h-[58px] ${getCellColorClasses(
          clues.population.status,
        )}`}
      >
        <span className="text-[10px] uppercase opacity-75 sm:hidden">Population</span>
        <span className="text-xs sm:text-sm font-mono font-extrabold">
          {formatCompactPopulation(clues.population.value)}{' '}
          {getTrendArrow(clues.population.trend)}
        </span>
        {clues.population.trend !== 'EQUAL' && (
          <span className="text-[10px] opacity-85">
            {clues.population.trend === 'HIGHER' ? 'Higher ↑' : 'Lower ↓'}
          </span>
        )}
      </div>

      {/* 3. Area km² */}
      <div
        className={`px-2.5 py-2 rounded-xl border flex flex-col items-center justify-center text-center min-h-[58px] ${getCellColorClasses(
          clues.areaKm2.status,
        )}`}
      >
        <span className="text-[10px] uppercase opacity-75 sm:hidden">Area</span>
        <span className="text-xs font-mono font-extrabold">
          {formatCompactArea(clues.areaKm2.value)} {getTrendArrow(clues.areaKm2.trend)}
        </span>
        {clues.areaKm2.trend !== 'EQUAL' && (
          <span className="text-[10px] opacity-85">
            {clues.areaKm2.trend === 'HIGHER' ? 'Bigger ↑' : 'Smaller ↓'}
          </span>
        )}
      </div>

      {/* 4. Landlocked (Binnenstaat) */}
      <div
        className={`px-2.5 py-2 rounded-xl border flex flex-col items-center justify-center text-center min-h-[58px] ${getCellColorClasses(
          clues.landlocked.status,
        )}`}
      >
        <span className="text-[10px] uppercase opacity-75 sm:hidden">Landlocked</span>
        <span className="text-xs sm:text-sm font-extrabold">
          {clues.landlocked.value ? 'Yes' : 'No'}
        </span>
        <span className="text-[10px] opacity-85">
          {clues.landlocked.value ? 'Binnenstaat' : 'Has Coast'}
        </span>
      </div>

      {/* 5. Average Temperature °C */}
      <div
        className={`px-2.5 py-2 rounded-xl border flex flex-col items-center justify-center text-center min-h-[58px] ${getCellColorClasses(
          clues.avgTempC.status,
        )}`}
      >
        <span className="text-[10px] uppercase opacity-75 sm:hidden">Avg Temp</span>
        <span className="text-xs sm:text-sm font-mono font-extrabold">
          {clues.avgTempC.value.toFixed(1)}°C {getTrendArrow(clues.avgTempC.trend)}
        </span>
        {clues.avgTempC.trend !== 'EQUAL' && (
          <span className="text-[10px] opacity-85">
            {clues.avgTempC.trend === 'HIGHER' ? 'Warmer ↑' : 'Cooler ↓'}
          </span>
        )}
      </div>

      {/* 6. Neighbor / Compass Direction */}
      <div
        className={`px-2.5 py-2 rounded-xl border flex flex-col items-center justify-center text-center min-h-[58px] ${getCellColorClasses(
          clues.neighborOrDirection.status,
        )}`}
      >
        <span className="text-[10px] uppercase opacity-75 sm:hidden">Neighbor</span>
        <span className="text-xs font-extrabold leading-tight">{neighborLabel}</span>
      </div>
    </div>
  );
}
