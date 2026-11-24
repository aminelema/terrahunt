import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import type { SeedCountryRecord, SeedNeighborRecord } from './build-geodata';

const DATA_DIR = path.resolve(__dirname, '..', 'data');

describe('Geodle Dataset Verification', () => {
  const countries = JSON.parse(
    fs.readFileSync(path.join(DATA_DIR, 'countries.json'), 'utf8'),
  ) as SeedCountryRecord[];

  const neighbors = JSON.parse(
    fs.readFileSync(path.join(DATA_DIR, 'country-neighbors.json'), 'utf8'),
  ) as SeedNeighborRecord[];

  const byIso2 = new Map(countries.map((c) => [c.iso2, c]));

  it('has all 197 playable countries with valid population, area, temperature, and landlocked flag', () => {
    expect(countries).toHaveLength(197);
    for (const c of countries) {
      expect(c.population).toBeGreaterThan(0);
      expect(c.areaKm2).toBeGreaterThan(0);
      expect(Number.isFinite(c.avgTempC)).toBe(true);
      expect(typeof c.isLandlocked).toBe('boolean');
      expect(c.subregion.length).toBeGreaterThan(0);
    }
  });

  it('correctly distinguishes landlocked (Binnenstaat) vs coastal countries', () => {
    expect(byIso2.get('AT')?.isLandlocked).toBe(true); // Austria
    expect(byIso2.get('CH')?.isLandlocked).toBe(true); // Switzerland
    expect(byIso2.get('DE')?.isLandlocked).toBe(false); // Germany
    expect(byIso2.get('JP')?.isLandlocked).toBe(false); // Japan (island)
  });

  it('includes German search aliases (e.g. Deutschland, Österreich, Elfenbeinküste)', () => {
    expect(byIso2.get('DE')?.aliases).toContain('Deutschland');
    expect(byIso2.get('AT')?.aliases).toContain('Österreich');
    expect(byIso2.get('CI')?.aliases).toContain('Elfenbeinküste');
  });

  it('stores symmetric land-border neighbors without overseas French Guiana bloat', () => {
    const hasEdge = (a: string, b: string) =>
      neighbors.some((n) => n.countryIso2 === a && n.neighborIso2 === b);

    expect(hasEdge('DE', 'AT')).toBe(true);
    expect(hasEdge('AT', 'DE')).toBe(true);
    expect(hasEdge('FR', 'BR')).toBe(false); // No French Guiana false border!
    expect(neighbors.some((n) => n.countryIso2 === 'JP')).toBe(false); // Island has 0 land borders
  });
});
