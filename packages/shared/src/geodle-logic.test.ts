import { describe, expect, it } from 'vitest';
import {
  computeCompassDirection,
  evaluateGeodleGuess,
  normalizeSearchText,
  type CountryAttributes,
} from './geodle-logic';

const AUSTRIA: CountryAttributes = {
  iso2: 'AT',
  nameEn: 'Austria',
  flagEmoji: '🇦🇹',
  capital: 'Vienna',
  region: 'EUROPE',
  subregion: 'Central Europe',
  population: 9_100_000,
  areaKm2: 83_871,
  isLandlocked: true,
  avgTempC: 7.5,
  lat: 47.33,
  lng: 13.33,
};

const GERMANY: CountryAttributes = {
  iso2: 'DE',
  nameEn: 'Germany',
  flagEmoji: '🇩🇪',
  capital: 'Berlin',
  region: 'EUROPE',
  subregion: 'Western Europe',
  population: 83_300_000,
  areaKm2: 357_114,
  isLandlocked: false,
  avgTempC: 9.6,
  lat: 51.0,
  lng: 9.0,
};

const JAPAN: CountryAttributes = {
  iso2: 'JP',
  nameEn: 'Japan',
  flagEmoji: '🇯🇵',
  capital: 'Tokyo',
  region: 'ASIA',
  subregion: 'Eastern Asia',
  population: 124_500_000,
  areaKm2: 377_930,
  isLandlocked: false,
  avgTempC: 11.8,
  lat: 36.0,
  lng: 138.0,
};

describe('Geodle evaluation logic', () => {
  it('marks all 6 cells MATCH when guessing the exact secret country', () => {
    const res = evaluateGeodleGuess(AUSTRIA, AUSTRIA, false);
    expect(res.isCorrect).toBe(true);
    expect(res.clues.continent.status).toBe('MATCH');
    expect(res.clues.population.status).toBe('MATCH');
    expect(res.clues.areaKm2.status).toBe('MATCH');
    expect(res.clues.landlocked.status).toBe('MATCH');
    expect(res.clues.avgTempC.status).toBe('MATCH');
    expect(res.clues.neighborOrDirection.status).toBe('MATCH');
  });

  it('evaluates Germany vs secret Austria accurately (same continent = CLOSE, neighbor = MATCH, arrows LOWER)', () => {
    const res = evaluateGeodleGuess(GERMANY, AUSTRIA, true);
    expect(res.isCorrect).toBe(false);
    expect(res.clues.continent.status).toBe('CLOSE'); // Both Europe, different subregion
    expect(res.clues.population).toEqual({
      status: 'WRONG',
      trend: 'LOWER', // Austria has lower population than Germany
      value: 83_300_000,
    });
    expect(res.clues.areaKm2).toEqual({
      status: 'WRONG',
      trend: 'LOWER',
      value: 357_114,
    });
    expect(res.clues.landlocked).toEqual({ status: 'WRONG', value: false });
    expect(res.clues.avgTempC.status).toBe('CLOSE'); // 9.6 vs 7.5 = 2.1°C diff
    expect(res.clues.avgTempC.trend).toBe('LOWER');
    expect(res.clues.neighborOrDirection).toEqual({
      status: 'MATCH',
      isNeighbor: true,
      direction: null,
    });
  });

  it('gives a compass direction when countries do not share a border (including islands)', () => {
    const res = evaluateGeodleGuess(GERMANY, JAPAN, false);
    expect(res.clues.neighborOrDirection.isNeighbor).toBe(false);
    expect(res.clues.neighborOrDirection.status).toBe('WRONG');
    expect(['NE', 'E']).toContain(res.clues.neighborOrDirection.direction);
  });

  it('handles Pacific ±180° compass direction (Japan -> USA points NE/E)', () => {
    const dir = computeCompassDirection(36.0, 138.0, 39.5, -98.35);
    expect(['NE', 'E']).toContain(dir);
  });

  it('normalizes German umlauts & ß and French accents for search', () => {
    expect(normalizeSearchText('Österreich')).toBe('osterreich');
    expect(normalizeSearchText('Weißrussland')).toBe('weissrussland');
    expect(normalizeSearchText("Côte d'Ivoire")).toBe('cote divoire');
  });
});
