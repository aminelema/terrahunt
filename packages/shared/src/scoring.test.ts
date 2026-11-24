import { describe, expect, it } from 'vitest';
import {
  bearingToDirection8,
  computeHeatTier,
  computeTrueSizeRoundScore,
  formatTrueSizeShareText,
  normalizeSearchText,
} from './scoring';

describe('@terrahunt/shared scoring & helpers', () => {
  it('awards 1000 points for exact or within-tolerance TrueSize guesses', () => {
    expect(computeTrueSizeRoundScore(0.44, 0.44)).toBe(1000);
    expect(computeTrueSizeRoundScore(0.448, 0.44)).toBe(1000); // ~1.8% error
  });

  it('scores 2x overestimate and 2x underestimate symmetrically at 500 pts', () => {
    const over = computeTrueSizeRoundScore(2.0, 1.0);
    const under = computeTrueSizeRoundScore(0.5, 1.0);
    expect(over).toBe(500);
    expect(under).toBe(500);
  });

  it('clamps extreme errors to 0 points', () => {
    expect(computeTrueSizeRoundScore(10.0, 0.2)).toBe(0);
    expect(computeTrueSizeRoundScore(-1, 1)).toBe(0);
  });

  it('formats spoiler-free TrueSize share text with emojis', () => {
    const text = formatTrueSizeShareText({
      mode: 'DAILY',
      dailyChallengeNumber: 12,
      totalScore: 4120,
      roundScores: [1000, 860, 720, 940, 600],
    });
    expect(text).toContain('TerraHunt TrueSize #12 — 4,120/5,000');
    expect(text).toContain('🟩🟩🟨🟩🟨');
  });

  it('maps compass bearings including 360 wraparound accurately', () => {
    expect(bearingToDirection8(0)).toBe('N');
    expect(bearingToDirection8(359)).toBe('N');
    expect(bearingToDirection8(45)).toBe('NE');
    expect(bearingToDirection8(135)).toBe('SE');
    expect(bearingToDirection8(225)).toBe('SW');
    expect(bearingToDirection8(-45)).toBe('NW');
  });

  it('computes heat tiers cleanly', () => {
    expect(computeHeatTier(0, true, true)).toBe('FOUND');
    expect(computeHeatTier(0, true, false)).toBe('BURNING');
    expect(computeHeatTier(1200, false, false)).toBe('HOT');
    expect(computeHeatTier(12000, false, false)).toBe('FREEZING');
  });

  it('normalizes diacritics and punctuation for country search', () => {
    expect(normalizeSearchText("Côte d'Ivoire")).toBe('cote divoire');
    expect(normalizeSearchText('São Tomé & Príncipe')).toBe('sao tome and principe');
  });
});
