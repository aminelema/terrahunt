import type { CountryRegion, GeodleGuessRow } from '@terrahunt/shared';
import { Compass } from 'lucide-react';
import { formatCompactArea, formatCompactPopulation } from './GuessClueRow';

export interface DetectiveNotes {
  confirmedRegion: CountryRegion | null;
  confirmedSubregion: string | null;
  eliminatedRegions: CountryRegion[];
  minPop: number | null;
  maxPop: number | null;
  exactPop: number | null;
  minArea: number | null;
  maxArea: number | null;
  exactArea: number | null;
  landlocked: boolean | null;
  minTemp: number | null;
  maxTemp: number | null;
}

/**
 * Pure helper function (zero API calls!):
 * Loops over the player's guesses so far and narrows down the known facts
 * about the secret country using simple Math.max / Math.min bounds.
 */
export function deriveDetectiveNotes(guesses: GeodleGuessRow[]): DetectiveNotes {
  let confirmedRegion: CountryRegion | null = null;
  let confirmedSubregion: string | null = null;
  const eliminatedSet = new Set<CountryRegion>();

  let minPop: number | null = null;
  let maxPop: number | null = null;
  let exactPop: number | null = null;

  let minArea: number | null = null;
  let maxArea: number | null = null;
  let exactArea: number | null = null;

  let landlocked: boolean | null = null;

  let minTemp: number | null = null;
  let maxTemp: number | null = null;

  for (const row of guesses) {
    const { clues } = row;

    // 1. Continent & Subregion
    if (clues.continent.status === 'MATCH') {
      confirmedRegion = clues.continent.region;
      confirmedSubregion = clues.continent.subregion;
    } else if (clues.continent.status === 'CLOSE') {
      confirmedRegion = clues.continent.region;
    } else {
      eliminatedSet.add(clues.continent.region);
    }

    // 2. Population bounds
    if (clues.population.trend === 'EQUAL') {
      exactPop = clues.population.value;
    } else if (clues.population.trend === 'HIGHER') {
      minPop = minPop === null ? clues.population.value : Math.max(minPop, clues.population.value);
    } else if (clues.population.trend === 'LOWER') {
      maxPop = maxPop === null ? clues.population.value : Math.min(maxPop, clues.population.value);
    }

    // 3. Area bounds
    if (clues.areaKm2.trend === 'EQUAL') {
      exactArea = clues.areaKm2.value;
    } else if (clues.areaKm2.trend === 'HIGHER') {
      minArea = minArea === null ? clues.areaKm2.value : Math.max(minArea, clues.areaKm2.value);
    } else if (clues.areaKm2.trend === 'LOWER') {
      maxArea = maxArea === null ? clues.areaKm2.value : Math.min(maxArea, clues.areaKm2.value);
    }

    // 4. Landlocked (if MATCH -> same boolean; if WRONG -> opposite boolean!)
    landlocked =
      clues.landlocked.status === 'MATCH' ? clues.landlocked.value : !clues.landlocked.value;

    // 5. Average Temperature bounds
    if (clues.avgTempC.trend === 'EQUAL') {
      minTemp = clues.avgTempC.value;
      maxTemp = clues.avgTempC.value;
    } else if (clues.avgTempC.trend === 'HIGHER') {
      minTemp = minTemp === null ? clues.avgTempC.value : Math.max(minTemp, clues.avgTempC.value);
    } else if (clues.avgTempC.trend === 'LOWER') {
      maxTemp = maxTemp === null ? clues.avgTempC.value : Math.min(maxTemp, clues.avgTempC.value);
    }
  }

  return {
    confirmedRegion,
    confirmedSubregion,
    eliminatedRegions: Array.from(eliminatedSet),
    minPop,
    maxPop,
    exactPop,
    minArea,
    maxArea,
    exactArea,
    landlocked,
    minTemp,
    maxTemp,
  };
}

function formatRange(
  min: number | null,
  max: number | null,
  exact: number | null,
  fmt: (v: number) => string,
): string {
  if (exact !== null) return fmt(exact);
  if (min !== null && max !== null) return `${fmt(min)} – ${fmt(max)}`;
  if (min !== null) return `> ${fmt(min)}`;
  if (max !== null) return `< ${fmt(max)}`;
  return 'Any';
}

interface ClueSummaryBarProps {
  guesses: GeodleGuessRow[];
}

/**
 * Live "Detective Notes" bar summarizing what the player's guesses have narrowed down so far.
 */
export function ClueSummaryBar({ guesses }: ClueSummaryBarProps) {
  const notes = deriveDetectiveNotes(guesses);

  const continentText = notes.confirmedSubregion
    ? notes.confirmedSubregion
    : notes.confirmedRegion
      ? notes.confirmedRegion
      : notes.eliminatedRegions.length > 0
        ? `Not ${notes.eliminatedRegions.join(', ')}`
        : 'Unknown';

  const popText = formatRange(
    notes.minPop,
    notes.maxPop,
    notes.exactPop,
    formatCompactPopulation,
  );
  const areaText = formatRange(notes.minArea, notes.maxArea, notes.exactArea, formatCompactArea);
  const tempText = formatRange(notes.minTemp, notes.maxTemp, null, (v) => `${v.toFixed(1)}°C`);
  const landlockedText =
    notes.landlocked === null ? 'Any' : notes.landlocked ? 'Yes' : 'No';

  const items = [
    { label: 'Region', value: continentText, known: Boolean(notes.confirmedRegion) },
    { label: 'Population', value: popText, known: popText !== 'Any' },
    { label: 'Area', value: areaText, known: areaText !== 'Any' },
    { label: 'Landlocked', value: landlockedText, known: notes.landlocked !== null },
    { label: 'Avg Temp', value: tempText, known: tempText !== 'Any' },
  ];

  return (
    <section className="rounded-2xl bg-navy-900/90 border border-slate-800 p-3 shadow-lg space-y-2">
      <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-300">
        <Compass className="w-3.5 h-3.5 text-emerald-400" />
        <span>Narrowed Clues</span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
        {items.map((item) => (
          <div
            key={item.label}
            className={`px-3 py-2 rounded-xl border ${
              item.known
                ? 'bg-emerald-950/30 border-emerald-500/35 text-emerald-200'
                : 'bg-slate-950/60 border-slate-800/80 text-slate-400'
            }`}
          >
            <div className="text-[10px] uppercase tracking-wider opacity-75">{item.label}</div>
            <div className="text-xs font-mono font-bold truncate mt-0.5" title={item.value}>
              {item.value}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
