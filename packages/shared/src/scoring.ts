import type { Direction8, HeatTier } from './enums';

export const TRUESIZE_ROUNDS_PER_GAME = 5;
export const TRUESIZE_MAX_ROUND_SCORE = 1000;
export const TRUESIZE_MIN_SLIDER_RATIO = 0.1;
export const TRUESIZE_MAX_SLIDER_RATIO = 10.0;

/**
 * Computes a symmetric 0..1000 score for a TrueSize slider guess.
 * Using |log2(guessedRatio / trueRatio)| ensures guessing 2x too large (ratio * 2)
 * and 2x too small (ratio / 2) receive the exact same score (500 pts).
 * Within ~2.8% ratio error (|log2| <= 0.04), awards a full 1000 "Pinpoint!" score.
 */
export function computeTrueSizeRoundScore(guessedRatio: number, trueRatio: number): number {
  if (
    !Number.isFinite(guessedRatio) ||
    !Number.isFinite(trueRatio) ||
    guessedRatio <= 0 ||
    trueRatio <= 0
  ) {
    return 0;
  }

  const logError = Math.abs(Math.log2(guessedRatio / trueRatio));
  if (logError <= 0.04) {
    return TRUESIZE_MAX_ROUND_SCORE;
  }

  const normalized = Math.max(0, 1 - logError / 2.0);
  return Math.round(TRUESIZE_MAX_ROUND_SCORE * normalized);
}

export interface TrueSizeRatingMeta {
  label: string;
  emoji: string;
  badgeColor: string;
}

export function getTrueSizeRoundRating(score: number): TrueSizeRatingMeta {
  if (score >= 950) {
    return { label: 'Pinpoint!', emoji: '🟩', badgeColor: '#16A34A' };
  }
  if (score >= 800) {
    return { label: 'Spot On', emoji: '🟩', badgeColor: '#22C55E' };
  }
  if (score >= 600) {
    return { label: 'Close', emoji: '🟨', badgeColor: '#EAB308' };
  }
  if (score >= 350) {
    return { label: 'Off', emoji: '🟧', badgeColor: '#F97316' };
  }
  if (score > 0) {
    return { label: 'Way Off', emoji: '🟥', badgeColor: '#EF4444' };
  }
  return { label: 'Missed', emoji: '⬛', badgeColor: '#334155' };
}

export function formatTrueSizeShareText(params: {
  mode: 'DAILY' | 'FREEPLAY';
  dailyChallengeNumber?: number | null;
  totalScore: number;
  roundScores: number[];
}): string {
  const header =
    params.mode === 'DAILY' && params.dailyChallengeNumber
      ? `TerraHunt TrueSize #${params.dailyChallengeNumber}`
      : `TerraHunt TrueSize (Free Play)`;
  const emojis = params.roundScores.map((s) => getTrueSizeRoundRating(s).emoji).join('');
  return `${header} — ${params.totalScore.toLocaleString('en-US')}/5,000\n${emojis}`;
}

export interface HeatTierMeta {
  tier: HeatTier;
  fillHex: string;
  label: string;
  emoji: string;
}

export const HEAT_TIERS: Record<HeatTier, HeatTierMeta> = {
  FOUND: { tier: 'FOUND', fillHex: '#16A34A', label: 'Found', emoji: '🟩' },
  BURNING: { tier: 'BURNING', fillHex: '#DC2626', label: 'Burning', emoji: '🟥' },
  HOT: { tier: 'HOT', fillHex: '#F97316', label: 'Hot', emoji: '🟧' },
  WARM: { tier: 'WARM', fillHex: '#EAB308', label: 'Warm', emoji: '🟨' },
  COOL: { tier: 'COOL', fillHex: '#38BDF8', label: 'Cool', emoji: '🩵' },
  COLD: { tier: 'COLD', fillHex: '#2563EB', label: 'Cold', emoji: '🟦' },
  FREEZING: { tier: 'FREEZING', fillHex: '#1E3A8A', label: 'Freezing', emoji: '⬛' },
};

export function computeHeatTier(
  distanceKm: number,
  isNeighbor: boolean,
  isCorrect: boolean,
): HeatTier {
  if (isCorrect) return 'FOUND';
  if (isNeighbor || distanceKm < 500) return 'BURNING';
  if (distanceKm < 1500) return 'HOT';
  if (distanceKm < 3500) return 'WARM';
  if (distanceKm < 6500) return 'COOL';
  if (distanceKm < 10500) return 'COLD';
  return 'FREEZING';
}

const DIRECTIONS_8: readonly Direction8[] = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];

export function bearingToDirection8(bearingDeg: number): Direction8 {
  const normalized = ((bearingDeg % 360) + 360) % 360;
  const idx = Math.floor(((normalized + 22.5) % 360) / 45);
  return DIRECTIONS_8[idx];
}

/**
 * Normalizes country names & aliases for diacritic-insensitive, punctuation-tolerant matching.
 * e.g. "Côte d'Ivoire" -> "cote divoire", "St. Kitts & Nevis" -> "st kitts and nevis"
 */
export function normalizeSearchText(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}
