import type {
  ClueStatus,
  CountryRegion,
  Direction8,
  GameMode,
  NumericTrend,
} from './enums';

/** Full country attributes used on the backend to compare a guess vs. the secret country. */
export interface CountryAttributes {
  iso2: string;
  nameEn: string;
  flagEmoji: string;
  capital: string | null;
  region: CountryRegion;
  subregion: string;
  population: number;
  areaKm2: number;
  isLandlocked: boolean;
  avgTempC: number;
  lat: number;
  lng: number;
}

export interface EvaluatedGuessClues {
  continent: {
    status: ClueStatus;
    region: CountryRegion;
    subregion: string;
  };
  population: {
    status: ClueStatus;
    trend: NumericTrend;
    value: number;
  };
  areaKm2: {
    status: ClueStatus;
    trend: NumericTrend;
    value: number;
  };
  landlocked: {
    status: ClueStatus;
    value: boolean;
  };
  avgTempC: {
    status: ClueStatus;
    trend: NumericTrend;
    value: number;
  };
  neighborOrDirection: {
    status: ClueStatus;
    isNeighbor: boolean;
    direction: Direction8 | null;
  };
}

/**
 * Compares positive numbers like Population or Area (km²).
 * - Exact match -> MATCH (Green)
 * - Within ±25% -> CLOSE (Yellow) + HIGHER/LOWER arrow
 * - Further off -> WRONG (Red) + HIGHER/LOWER arrow
 */
export function comparePositiveNumber(
  guessValue: number,
  secretValue: number,
  closeToleranceRatio = 0.25,
): { status: ClueStatus; trend: NumericTrend } {
  if (guessValue === secretValue) {
    return { status: 'MATCH', trend: 'EQUAL' };
  }

  const trend: NumericTrend = secretValue > guessValue ? 'HIGHER' : 'LOWER';
  const relativeDiff = Math.abs(guessValue - secretValue) / Math.max(1, secretValue);

  if (relativeDiff <= closeToleranceRatio) {
    return { status: 'CLOSE', trend };
  }
  return { status: 'WRONG', trend };
}

/**
 * Compares Average Annual Temperature in °C using absolute degree difference:
 * - Within ±1.5°C -> MATCH (Green)
 * - Within ±4.0°C -> CLOSE (Yellow) + HIGHER/LOWER arrow
 * - More than 4.0°C apart -> WRONG (Red) + HIGHER/LOWER arrow
 */
export function compareTemperature(
  guessTempC: number,
  secretTempC: number,
): { status: ClueStatus; trend: NumericTrend } {
  const diff = Math.abs(guessTempC - secretTempC);
  const trend: NumericTrend =
    diff < 0.05 ? 'EQUAL' : secretTempC > guessTempC ? 'HIGHER' : 'LOWER';

  if (diff <= 1.5) {
    return { status: 'MATCH', trend };
  }
  if (diff <= 4.0) {
    return { status: 'CLOSE', trend };
  }
  return { status: 'WRONG', trend };
}

const COMPASS_8: readonly Direction8[] = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];

/**
 * Computes the true spherical compass direction from (fromLat, fromLng) to (toLat, toLng).
 * Handles Pacific ±180° wraparound naturally via sin/cos trigonometry.
 */
export function computeCompassDirection(
  fromLat: number,
  fromLng: number,
  toLat: number,
  toLng: number,
): Direction8 {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const phi1 = toRad(fromLat);
  const phi2 = toRad(toLat);
  const deltaLambda = toRad(toLng - fromLng);

  const y = Math.sin(deltaLambda) * Math.cos(phi2);
  const x =
    Math.cos(phi1) * Math.sin(phi2) -
    Math.sin(phi1) * Math.cos(phi2) * Math.cos(deltaLambda);

  const bearingDeg = ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;
  const bucket = Math.floor(((bearingDeg + 22.5) % 360) / 45);
  return COMPASS_8[bucket];
}

/**
 * Core Geodle Brain: compares one guessed country against the secret country across all 6 columns.
 */
export function evaluateGeodleGuess(
  guess: CountryAttributes,
  secret: CountryAttributes,
  isNeighbor: boolean,
): { isCorrect: boolean; clues: EvaluatedGuessClues } {
  const isCorrect = guess.iso2 === secret.iso2;

  // Winning guess: all 6 cells turn Green (MATCH)!
  if (isCorrect) {
    return {
      isCorrect: true,
      clues: {
        continent: { status: 'MATCH', region: guess.region, subregion: guess.subregion },
        population: { status: 'MATCH', trend: 'EQUAL', value: guess.population },
        areaKm2: { status: 'MATCH', trend: 'EQUAL', value: guess.areaKm2 },
        landlocked: { status: 'MATCH', value: guess.isLandlocked },
        avgTempC: { status: 'MATCH', trend: 'EQUAL', value: guess.avgTempC },
        neighborOrDirection: { status: 'MATCH', isNeighbor: true, direction: null },
      },
    };
  }

  // Column 1: Continent & Subregion
  const continentStatus: ClueStatus =
    guess.subregion === secret.subregion
      ? 'MATCH'
      : guess.region === secret.region
        ? 'CLOSE'
        : 'WRONG';

  // Column 6: Neighbor if touching; otherwise show compass direction toward secret country
  const neighborOrDirection = isNeighbor
    ? { status: 'MATCH' as const, isNeighbor: true, direction: null }
    : {
        status: 'WRONG' as const,
        isNeighbor: false,
        direction: computeCompassDirection(guess.lat, guess.lng, secret.lat, secret.lng),
      };

  return {
    isCorrect: false,
    clues: {
      continent: {
        status: continentStatus,
        region: guess.region,
        subregion: guess.subregion,
      },
      population: {
        ...comparePositiveNumber(guess.population, secret.population),
        value: guess.population,
      },
      areaKm2: {
        ...comparePositiveNumber(guess.areaKm2, secret.areaKm2),
        value: guess.areaKm2,
      },
      landlocked: {
        status: guess.isLandlocked === secret.isLandlocked ? 'MATCH' : 'WRONG',
        value: guess.isLandlocked,
      },
      avgTempC: {
        ...compareTemperature(guess.avgTempC, secret.avgTempC),
        value: guess.avgTempC,
      },
      neighborOrDirection,
    },
  };
}

function statusToEmoji(status: ClueStatus): string {
  if (status === 'MATCH') return '🟩';
  if (status === 'CLOSE') return '🟨';
  return '🟥';
}

/** Builds a Wordle-style spoiler-free emoji summary for clipboard sharing. */
export function formatGeodleShareText(params: {
  mode: GameMode;
  dailyChallengeNumber: number | null;
  won: boolean;
  guesses: Array<{ clues: EvaluatedGuessClues }>;
}): string {
  const title =
    params.mode === 'DAILY' && params.dailyChallengeNumber
      ? `Geodle #${params.dailyChallengeNumber}`
      : 'Geodle (Free Play)';
  const outcome = params.won ? `${params.guesses.length} tries` : 'X (Gave up)';

  const grid = params.guesses
    .map(({ clues }) =>
      [
        clues.continent.status,
        clues.population.status,
        clues.areaKm2.status,
        clues.landlocked.status,
        clues.avgTempC.status,
        clues.neighborOrDirection.status,
      ]
        .map(statusToEmoji)
        .join(''),
    )
    .join('\n');

  return `${title} — ${outcome}\n${grid}`;
}

/**
 * Strips accents/diacritics and punctuation so "Côte d'Ivoire" matches "cote divoire"
 * and "Österreich" matches "osterreich".
 */
export function normalizeSearchText(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/ß/g, 'ss')
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}
