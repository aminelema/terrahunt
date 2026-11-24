import fs from 'node:fs';
import path from 'node:path';
import worldCountries from 'world-countries';
import { normalizeSearchText, type CountryRegion } from '../packages/shared/src';

const ROOT_DIR = path.resolve(__dirname, '..');
const DATA_DIR = path.join(ROOT_DIR, 'data');

/** Non-UN observer/widely-played countries included alongside all 193 UN members. */
const EXTRA_PLAYABLE_ISO2 = new Set(['VA', 'PS', 'TW', 'XK']);

const AREA_KM2_OVERRIDES: Record<string, number> = {
  PH: 300_000,
};

const CURATED_ALIASES: Record<string, string[]> = {
  US: ['USA', 'United States of America', 'America'],
  GB: ['UK', 'Britain', 'Great Britain', 'England', 'Großbritannien', 'Vereinigtes Königreich'],
  AE: ['UAE', 'Emirates'],
  CD: ['DRC', 'DR Congo', 'Democratic Republic of the Congo'],
  CG: ['Republic of the Congo', 'Congo-Brazzaville'],
  CI: ['Ivory Coast', "Cote d'Ivoire", 'Elfenbeinküste'],
  CZ: ['Czech Republic'],
  KR: ['South Korea', 'Republic of Korea'],
  KP: ['North Korea'],
  MM: ['Burma'],
  MK: ['Macedonia'],
  SZ: ['Swaziland'],
  TL: ['East Timor'],
  CV: ['Cape Verde'],
  VA: ['Holy See', 'Vatican'],
  NL: ['Holland'],
  TR: ['Turkey', 'Turkiye'],
};

export interface SeedCountryRecord {
  iso2: string;
  nameEn: string;
  capital: string | null;
  region: CountryRegion;
  subregion: string;
  population: number;
  areaKm2: number;
  isLandlocked: boolean;
  avgTempC: number;
  flagEmoji: string;
  lat: number;
  lng: number;
  aliases: string[];
}

export interface SeedNeighborRecord {
  countryIso2: string;
  neighborIso2: string;
}

function mapRegion(rawRegion: string): CountryRegion {
  switch (rawRegion) {
    case 'Europe':
      return 'EUROPE';
    case 'Asia':
      return 'ASIA';
    case 'Africa':
      return 'AFRICA';
    case 'Americas':
      return 'AMERICAS';
    case 'Oceania':
      return 'OCEANIA';
    default:
      return 'EUROPE';
  }
}

function main() {
  const statsLookup = JSON.parse(
    fs.readFileSync(path.join(DATA_DIR, 'country-stats.json'), 'utf8'),
  ) as Record<string, { population: number; avgTempC: number }>;

  const playableRaw = worldCountries.filter(
    (c) => c.unMember || EXTRA_PLAYABLE_ISO2.has(c.cca2),
  );

  const byIso3 = new Map(playableRaw.map((c) => [c.cca3, c]));

  const countries: SeedCountryRecord[] = playableRaw.map((c) => {
    const iso2 = c.cca2;
    const stats = statsLookup[iso2];
    if (!stats) {
      throw new Error(`Missing population/temperature stats for ${iso2} (${c.name.common})`);
    }

    // Collect English official, German common/official, and colloquial aliases
    const candidates = new Set<string>();
    if (c.name.official && c.name.official !== c.name.common) {
      candidates.add(c.name.official);
    }
    const deuCommon = c.translations?.deu?.common;
    if (deuCommon) candidates.add(deuCommon);

    for (const custom of CURATED_ALIASES[iso2] ?? []) {
      candidates.add(custom);
    }

    const seenNorm = new Set<string>([normalizeSearchText(c.name.common)]);
    const aliases: string[] = [];
    for (const alias of candidates) {
      const norm = normalizeSearchText(alias);
      if (norm.length >= 2 && !seenNorm.has(norm)) {
        seenNorm.add(norm);
        aliases.push(alias);
      }
    }

    // Use European Russia & Contiguous US interior coordinates for intuitive compass hints
    let lat = Math.round(c.latlng[0] * 100) / 100;
    let lng = Math.round(c.latlng[1] * 100) / 100;
    if (iso2 === 'RU') {
      lat = 58.5;
      lng = 55.0;
    } else if (iso2 === 'US') {
      lat = 39.5;
      lng = -98.35;
    }

    return {
      iso2,
      nameEn: c.name.common,
      capital: c.capital?.[0] ?? null,
      region: mapRegion(c.region),
      subregion: c.subregion || c.region,
      population: stats.population,
      areaKm2: AREA_KM2_OVERRIDES[iso2] ?? c.area,
      isLandlocked: Boolean(c.landlocked),
      avgTempC: stats.avgTempC,
      flagEmoji: c.flag || '🏳️',
      lat,
      lng,
      aliases,
    };
  });

  countries.sort((a, b) => a.nameEn.localeCompare(b.nameEn));

  // Build symmetric land-border pairs
  const edgeSet = new Set<string>();
  for (const c of playableRaw) {
    for (const borderIso3 of c.borders ?? []) {
      const neighbor = byIso3.get(borderIso3);
      if (!neighbor || neighbor.cca2 === c.cca2) continue;
      edgeSet.add(`${c.cca2}:${neighbor.cca2}`);
      edgeSet.add(`${neighbor.cca2}:${c.cca2}`);
    }
  }

  const neighbors: SeedNeighborRecord[] = Array.from(edgeSet)
    .sort()
    .map((pair) => {
      const [countryIso2, neighborIso2] = pair.split(':');
      return { countryIso2, neighborIso2 };
    });

  fs.writeFileSync(path.join(DATA_DIR, 'countries.json'), JSON.stringify(countries, null, 2));
  fs.writeFileSync(
    path.join(DATA_DIR, 'country-neighbors.json'),
    JSON.stringify(neighbors, null, 2),
  );

  console.log(
    `[geo:build] Wrote ${countries.length} countries and ${neighbors.length} directed land-border pairs.`,
  );
}

main();
