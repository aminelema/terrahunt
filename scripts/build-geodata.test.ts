import fs from 'node:fs';
import path from 'node:path';
import * as d3Geo from 'd3-geo';
import * as topoClient from 'topojson-client';
import type { Topology } from 'topojson-specification';
import { describe, expect, it } from 'vitest';
import type {
  BuiltCountryRecord,
  BuiltDistanceRecord,
  BuiltNeighborEdge,
} from './build-geodata';

const DATA_DIR = path.resolve(__dirname, '..', 'data');

describe('Generated Geodata Verification Suite', () => {
  const countries = JSON.parse(
    fs.readFileSync(path.join(DATA_DIR, 'countries.json'), 'utf8'),
  ) as BuiltCountryRecord[];

  const neighbors = JSON.parse(
    fs.readFileSync(path.join(DATA_DIR, 'country-neighbors.json'), 'utf8'),
  ) as BuiltNeighborEdge[];

  const distances = JSON.parse(
    fs.readFileSync(path.join(DATA_DIR, 'country-distances.json'), 'utf8'),
  ) as BuiltDistanceRecord[];

  const topo = JSON.parse(
    fs.readFileSync(path.join(DATA_DIR, 'countries-50m.topo.json'), 'utf8'),
  ) as Topology;

  const byIso2 = new Map(countries.map((c) => [c.iso2, c]));
  const distMap = new Map(distances.map((d) => [`${d.fromIso2}:${d.toIso2}`, d]));

  it('includes ~197 playable countries with metropolitan core areas', () => {
    expect(countries.length).toBeGreaterThanOrEqual(195);
    expect(byIso2.get('FR')?.areaKm2).toBeGreaterThan(540_000);
    expect(byIso2.get('FR')?.areaKm2).toBeLessThan(560_000);
    expect(byIso2.get('DK')?.areaKm2).toBeLessThan(50_000); // No Greenland bloat!
    expect(byIso2.get('GR')?.areaKm2).toBeCloseTo(131990, -3);
    expect(byIso2.get('PH')?.areaKm2).toBe(300000);
  });

  it('preserves valid D3 spherical winding order on every TopoJSON feature', () => {
    const fc = topoClient.feature(topo, topo.objects.countries) as unknown as {
      features: Array<GeoJSON.Feature>;
    };
    expect(fc.features.length).toBeGreaterThan(200);
    for (const f of fc.features) {
      expect(d3Geo.geoArea(f)).toBeLessThan(Math.PI);
    }
  });

  it('guarantees true land & bridge neighbors have distanceKm = 0 and direction = null', () => {
    const deFr = distMap.get('DE:FR')!;
    expect(deFr.distanceKm).toBe(0);
    expect(deFr.isNeighbor).toBe(true);
    expect(deFr.direction).toBeNull();

    const ruCn = distMap.get('RU:CN')!;
    expect(ruCn.distanceKm).toBe(0);
    expect(ruCn.isNeighbor).toBe(true);

    // Kaliningrad & Northern Ireland & Nakhchivan preserved
    expect(distMap.get('RU:PL')?.distanceKm).toBe(0);
    expect(distMap.get('GB:IE')?.distanceKm).toBe(0);
    expect(distMap.get('AZ:TR')?.distanceKm).toBe(0);

    // Øresund Bridge & Channel Tunnel included for GeoRoute
    expect(neighbors.some((n) => n.countryIso2 === 'SE' && n.neighborIso2 === 'DK')).toBe(
      true,
    );
    expect(neighbors.some((n) => n.countryIso2 === 'GB' && n.neighborIso2 === 'FR')).toBe(
      true,
    );
  });

  it('strips French Guiana so Brazil <-> France is > 6,000 km (not 0 km!)', () => {
    const brFr = distMap.get('BR:FR')!;
    expect(brFr.isNeighbor).toBe(false);
    expect(brFr.distanceKm).toBeGreaterThan(6000);
    expect(brFr.direction).toBe('NE');
  });

  it('handles Pacific antimeridian bearings cleanly (Japan -> US points NE/E, not West)', () => {
    const jpUs = distMap.get('JP:US')!;
    expect(['NE', 'E']).toContain(jpUs.direction);

    const deMa = distMap.get('DE:MA')!;
    expect(deMa.direction).toBe('SW');
  });

  it('flags microstates (< 2500 km2) accurately with valid coordinates', () => {
    for (const code of ['SG', 'MT', 'MC', 'MV', 'VA']) {
      const m = byIso2.get(code);
      expect(m, `Expected ${code} to exist`).toBeDefined();
      expect(m!.isMicrostate).toBe(true);
      expect(Number.isFinite(m!.labelLat)).toBe(true);
      expect(Number.isFinite(m!.labelLng)).toBe(true);
    }
  });
});
