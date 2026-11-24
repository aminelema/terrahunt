import fs from 'node:fs';
import path from 'node:path';
import turfBearing from '@turf/bearing';
import turfCentroid from '@turf/centroid';
import turfDistance from '@turf/distance';
import turfPointOnFeature from '@turf/point-on-feature';
import * as topoClient from 'topojson-client';
import * as topoServer from 'topojson-server';
import type { Feature, FeatureCollection, MultiPolygon, Polygon, Position } from 'geojson';
import type { Topology } from 'topojson-specification';
import worldCountries from 'world-countries';
import {
  bearingToDirection8,
  normalizeSearchText,
  type ConnectionType,
  type CountryRegion,
  type Direction8,
} from '../packages/shared/src';

const ROOT_DIR = path.resolve(__dirname, '..');
const DATA_DIR = path.join(ROOT_DIR, 'data');
const WEB_PUBLIC_DATA_DIR = path.join(ROOT_DIR, 'apps', 'web', 'public', 'data');

const EARTH_RADIUS_KM = 6371.0088;
const EXTRA_PLAYABLE_ISO2 = new Set(['VA', 'PS', 'TW', 'XK']);

/**
 * Standard UN land+inland-freshwater overrides where `world-countries` includes maritime waters.
 */
const AREA_KM2_OVERRIDES: Record<string, number> = {
  PH: 300000,
};

/**
 * Bounding-box filters `[minLng, minLat, maxLng, maxLat]` to separate distant overseas
 * dependencies from core sovereign territories so shapes, areas, borders, and distances agree.
 */
const CORE_TERRITORY_BBOX: Record<string, [number, number, number, number]> = {
  FR: [-6.5, 41.0, 10.5, 51.8], // Metropolitan France + Corsica (strips French Guiana, Réunion, etc.)
  NL: [3.0, 50.5, 7.5, 54.0], // European Netherlands (strips Caribbean BES islands)
  NO: [3.5, 57.5, 32.0, 71.8], // Mainland Norway (strips Svalbard & Jan Mayen)
  NZ: [165.0, -48.5, 179.9, -33.5], // North/South/Stewart Islands (strips Tokelau)
  ZA: [16.0, -35.5, 33.5, -21.5], // Mainland South Africa (strips sub-Antarctic Prince Edward Is.)
  AU: [112.0, -44.5, 154.5, -9.5], // Mainland Australia + Tasmania (strips Macquarie Island)
};

/**
 * Curated major fixed bridge/tunnel connections between playable countries for GeoRoute.
 */
const BRIDGE_TUNNEL_EDGES: Array<[string, string]> = [
  ['SE', 'DK'], // Øresund Bridge
  ['GB', 'FR'], // Channel Tunnel
  ['BH', 'SA'], // King Fahd Causeway
  ['SG', 'MY'], // Johor–Singapore Causeway
];

/**
 * High-signal common English & colloquial search aliases so players can type fast.
 */
const CURATED_ALIASES: Record<string, string[]> = {
  US: ['USA', 'United States of America', 'America', 'U.S.', 'States'],
  GB: ['UK', 'Britain', 'Great Britain', 'England'],
  AE: ['UAE', 'Emirates'],
  CD: ['DRC', 'DR Congo', 'Democratic Republic of the Congo', 'Congo-Kinshasa'],
  CG: ['Republic of the Congo', 'Congo-Brazzaville'],
  CI: ['Ivory Coast', "Cote d'Ivoire"],
  CZ: ['Czech Republic'],
  KR: ['South Korea', 'Republic of Korea', 'ROK'],
  KP: ['North Korea', 'DPRK'],
  LA: ['Laos'],
  MM: ['Burma'],
  MK: ['Macedonia'],
  SZ: ['Swaziland'],
  TL: ['East Timor'],
  CV: ['Cape Verde'],
  VA: ['Holy See', 'Vatican'],
  PS: ['State of Palestine'],
  RU: ['Russian Federation'],
  SY: ['Syrian Arab Republic'],
  IR: ['Persia'],
  NL: ['Holland'],
  TR: ['Turkiye', 'Türkiye', 'Turkey'],
  VN: ['Viet Nam'],
  BA: ['Bosnia'],
  TT: ['Trinidad'],
  VC: ['St Vincent', 'Saint Vincent'],
  KN: ['St Kitts', 'Saint Kitts'],
  LC: ['St Lucia', 'Saint Lucia'],
  AG: ['Antigua'],
  ST: ['Sao Tome'],
  FM: ['Federated States of Micronesia'],
};

export interface BuiltCountryRecord {
  iso2: string;
  iso3: string;
  isoNumeric: string | null;
  nameEn: string;
  capital: string | null;
  region: CountryRegion;
  areaKm2: number;
  population: number;
  flagEmoji: string;
  isPlayable: boolean;
  isMicrostate: boolean;
  hasPolygon: boolean;
  labelLat: number;
  labelLng: number;
  aliases: string[];
}

export interface BuiltNeighborEdge {
  countryIso2: string;
  neighborIso2: string;
  connectionType: ConnectionType;
}

export interface BuiltDistanceRecord {
  fromIso2: string;
  toIso2: string;
  distanceKm: number;
  bearingDeg: number | null;
  direction: Direction8 | null;
  isNeighbor: boolean;
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
      return 'OTHER';
  }
}

function polygonMatchesBbox(
  coords: Position[][],
  bbox: [number, number, number, number],
): boolean {
  const cent = turfCentroid({ type: 'Polygon', coordinates: coords }).geometry.coordinates;
  const [lng, lat] = cent;
  return lng >= bbox[0] && lat >= bbox[1] && lng <= bbox[2] && lat <= bbox[3];
}

function toCartesian([lng, lat]: [number, number]): [number, number, number] {
  const phi = (lat * Math.PI) / 180;
  const lam = (lng * Math.PI) / 180;
  const cosPhi = Math.cos(phi);
  return [cosPhi * Math.cos(lam), cosPhi * Math.sin(lam), Math.sin(phi)];
}

/**
 * Extracts boundary sample points on the 3D unit sphere, densifying long segments (> 20km)
 * so border-to-border spherical distance is accurate even along straight latitude/meridian borders.
 */
function sampleGeometryUnitVectors(
  geom: Polygon | MultiPolygon | null,
  fallbackLngLat: [number, number],
): Float64Array {
  if (!geom) {
    const [x, y, z] = toCartesian(fallbackLngLat);
    return new Float64Array([x, y, z]);
  }

  const polys = geom.type === 'Polygon' ? [geom.coordinates] : geom.coordinates;
  const vecs: number[] = [];

  for (const rings of polys) {
    const outerRing = rings[0];
    if (!outerRing || outerRing.length === 0) continue;

    for (let i = 0; i < outerRing.length - 1; i++) {
      const a = outerRing[i] as [number, number];
      const b = outerRing[i + 1] as [number, number];
      // Guard antimeridian jump edges from naive linear interpolation
      const dLng = Math.abs(a[0] - b[0]);
      const segKm =
        dLng > 180
          ? 20
          : turfDistance(a, b, { units: 'kilometers' });
      const steps = Math.max(1, Math.min(40, Math.ceil(segKm / 20)));
      for (let s = 0; s < steps; s++) {
        const t = s / steps;
        const lng = dLng > 180 ? a[0] : a[0] + (b[0] - a[0]) * t;
        const lat = a[1] + (b[1] - a[1]) * t;
        const [x, y, z] = toCartesian([lng, lat]);
        vecs.push(x, y, z);
      }
    }
  }

  if (vecs.length === 0) {
    const [x, y, z] = toCartesian(fallbackLngLat);
    return new Float64Array([x, y, z]);
  }
  return new Float64Array(vecs);
}

function minSphericalDistanceKm(a: Float64Array, b: Float64Array): number {
  let maxDot = -1;
  for (let i = 0; i < a.length; i += 3) {
    const ax = a[i];
    const ay = a[i + 1];
    const az = a[i + 2];
    for (let j = 0; j < b.length; j += 3) {
      const dot = ax * b[j] + ay * b[j + 1] + az * b[j + 2];
      if (dot > maxDot) {
        maxDot = dot;
      }
    }
  }
  const clamped = Math.min(1, Math.max(-1, maxDot));
  return EARTH_RADIUS_KM * Math.acos(clamped);
}

function main() {
  const startedAt = Date.now();
  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.mkdirSync(WEB_PUBLIC_DATA_DIR, { recursive: true });

  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const rawAtlas = require('world-atlas/countries-50m.json') as Topology;
  const rawFc = topoClient.feature(
    rawAtlas,
    rawAtlas.objects.countries,
  ) as unknown as FeatureCollection<Polygon | MultiPolygon, { name?: string }>;

  const playableRaw = worldCountries.filter(
    (c) => c.unMember || EXTRA_PLAYABLE_ISO2.has(c.cca2),
  );

  const playableByCcn3 = new Map<string, (typeof playableRaw)[number]>();
  const playableByIso3 = new Map<string, (typeof playableRaw)[number]>();
  const playableByIso2 = new Map<string, (typeof playableRaw)[number]>();

  for (const c of playableRaw) {
    playableByIso2.set(c.cca2, c);
    playableByIso3.set(c.cca3, c);
    if (c.ccn3) {
      playableByCcn3.set(String(c.ccn3).padStart(3, '0'), c);
    }
  }

  const cleanedFeatures: Array<
    Feature<
      Polygon | MultiPolygon,
      { iso2: string | null; name: string; isPlayable: boolean }
    >
  > = [];
  const playableGeometryByIso2 = new Map<string, Polygon | MultiPolygon>();

  for (const feat of rawFc.features) {
    if (!feat.geometry) continue;

    const paddedId = feat.id !== undefined ? String(feat.id).padStart(3, '0') : null;
    const rawName = feat.properties?.name ?? 'Unknown';
    const matchedCountry =
      rawName === 'Kosovo'
        ? playableByIso2.get('XK')
        : paddedId
          ? playableByCcn3.get(paddedId)
          : undefined;

    if (!matchedCountry) {
      cleanedFeatures.push({
        type: 'Feature',
        id: paddedId ?? rawName,
        properties: {
          iso2: null,
          name: rawName,
          isPlayable: false,
        },
        geometry: feat.geometry,
      });
      continue;
    }

    const iso2 = matchedCountry.cca2;
    const bbox = CORE_TERRITORY_BBOX[iso2];

    if (bbox && feat.geometry.type === 'MultiPolygon') {
      const corePolys: Position[][][] = [];
      const overseasPolys: Position[][][] = [];

      for (const poly of feat.geometry.coordinates) {
        if (polygonMatchesBbox(poly, bbox)) {
          corePolys.push(poly);
        } else {
          overseasPolys.push(poly);
        }
      }

      if (corePolys.length > 0) {
        const coreGeom: Polygon | MultiPolygon =
          corePolys.length === 1
            ? { type: 'Polygon', coordinates: corePolys[0] }
            : { type: 'MultiPolygon', coordinates: corePolys };

        playableGeometryByIso2.set(iso2, coreGeom);
        cleanedFeatures.push({
          type: 'Feature',
          id: iso2,
          properties: {
            iso2,
            name: matchedCountry.name.common,
            isPlayable: true,
          },
          geometry: coreGeom,
        });
      }

      if (overseasPolys.length > 0) {
        const overseasGeom: Polygon | MultiPolygon =
          overseasPolys.length === 1
            ? { type: 'Polygon', coordinates: overseasPolys[0] }
            : { type: 'MultiPolygon', coordinates: overseasPolys };

        cleanedFeatures.push({
          type: 'Feature',
          id: `${iso2}_OVERSEAS`,
          properties: {
            iso2: null,
            name: `${matchedCountry.name.common} (Overseas)`,
            isPlayable: false,
          },
          geometry: overseasGeom,
        });
      }
    } else {
      playableGeometryByIso2.set(iso2, feat.geometry);
      cleanedFeatures.push({
        type: 'Feature',
        id: iso2,
        properties: {
          iso2,
          name: matchedCountry.name.common,
          isPlayable: true,
        },
        geometry: feat.geometry,
      });
    }
  }

  // Build cleaned TopoJSON (quantized 1e5 for crisp shapes & compact size)
  const cleanedCollection: FeatureCollection = {
    type: 'FeatureCollection',
    features: cleanedFeatures,
  };
  const cleanedTopo = topoServer.topology({ countries: cleanedCollection }, 1e5);
  const topoJsonStr = JSON.stringify(cleanedTopo);
  fs.writeFileSync(path.join(DATA_DIR, 'countries-50m.topo.json'), topoJsonStr);
  fs.writeFileSync(path.join(WEB_PUBLIC_DATA_DIR, 'countries-50m.topo.json'), topoJsonStr);

  // Build countries.json
  const countries: BuiltCountryRecord[] = [];
  for (const c of playableRaw) {
    const iso2 = c.cca2;
    const geom = playableGeometryByIso2.get(iso2) ?? null;

    // Anchor label point inside the largest polygon when available (prevents ocean centroids!)
    let labelLat = c.latlng[0];
    let labelLng = c.latlng[1];
    if (geom && !['RU', 'US', 'FJ', 'KI'].includes(iso2)) {
      let mainPoly: Polygon;
      if (geom.type === 'Polygon') {
        mainPoly = geom;
      } else {
        // Pick largest ring by vertex span/count for interior anchor
        let bestIdx = 0;
        let bestLen = 0;
        geom.coordinates.forEach((coords, idx) => {
          const ringLen = coords[0]?.length ?? 0;
          if (ringLen > bestLen) {
            bestLen = ringLen;
            bestIdx = idx;
          }
        });
        mainPoly = { type: 'Polygon', coordinates: geom.coordinates[bestIdx] };
      }
      const pt = turfPointOnFeature(mainPoly).geometry.coordinates;
      labelLng = Math.round(pt[0] * 10000) / 10000;
      labelLat = Math.round(pt[1] * 10000) / 10000;
    }

    // Curated interior points for mega/antimeridian countries
    if (iso2 === 'RU') {
      labelLat = 58.5;
      labelLng = 55.0; // Core European/Ural anchor rather than far Eastern Siberia
    } else if (iso2 === 'US') {
      labelLat = 39.5;
      labelLng = -98.35; // Contiguous US interior
    }

    const rawAliases = new Set<string>();
    if (c.name.official && c.name.official !== c.name.common) {
      rawAliases.add(c.name.official);
    }
    for (const alt of c.altSpellings ?? []) {
      if (alt.length >= 2 && alt !== c.cca2 && alt !== c.cca3 && alt !== c.name.common) {
        rawAliases.add(alt);
      }
    }
    for (const custom of CURATED_ALIASES[iso2] ?? []) {
      rawAliases.add(custom);
    }

    // Deduplicate by normalized form so we don't store trivial punctuation duplicates
    const seenNorm = new Set<string>([normalizeSearchText(c.name.common)]);
    const dedupedAliases: string[] = [];
    for (const candidate of rawAliases) {
      const norm = normalizeSearchText(candidate);
      if (norm.length >= 2 && !seenNorm.has(norm)) {
        seenNorm.add(norm);
        dedupedAliases.push(candidate);
      }
    }

    countries.push({
      iso2,
      iso3: c.cca3,
      isoNumeric: c.ccn3 ? String(c.ccn3).padStart(3, '0') : null,
      nameEn: c.name.common,
      capital: c.capital?.[0] ?? null,
      region: mapRegion(c.region),
      areaKm2: AREA_KM2_OVERRIDES[iso2] ?? c.area,
      population: (c as unknown as { population?: number }).population ?? 0,
      flagEmoji: c.flag || '🏳️',
      isPlayable: true,
      isMicrostate: c.area < 2500 || !geom,
      hasPolygon: Boolean(geom),
      labelLat,
      labelLng,
      aliases: dedupedAliases,
    });
  }

  countries.sort((a, b) => a.nameEn.localeCompare(b.nameEn));
  fs.writeFileSync(path.join(DATA_DIR, 'countries.json'), JSON.stringify(countries, null, 2));

  // Build symmetric authoritative neighbor graph (LAND + BRIDGE_TUNNEL)
  const neighborMap = new Map<string, ConnectionType>();
  const edgeKey = (a: string, b: string) => `${a}:${b}`;

  for (const c of playableRaw) {
    const a = c.cca2;
    for (const borderIso3 of c.borders ?? []) {
      const neighbor = playableByIso3.get(borderIso3);
      if (!neighbor || neighbor.cca2 === a) continue;
      const b = neighbor.cca2;
      neighborMap.set(edgeKey(a, b), 'LAND');
      neighborMap.set(edgeKey(b, a), 'LAND');
    }
  }

  for (const [a, b] of BRIDGE_TUNNEL_EDGES) {
    if (playableByIso2.has(a) && playableByIso2.has(b)) {
      if (!neighborMap.has(edgeKey(a, b))) {
        neighborMap.set(edgeKey(a, b), 'BRIDGE_TUNNEL');
      }
      if (!neighborMap.has(edgeKey(b, a))) {
        neighborMap.set(edgeKey(b, a), 'BRIDGE_TUNNEL');
      }
    }
  }

  const neighbors: BuiltNeighborEdge[] = [];
  for (const [key, connectionType] of neighborMap.entries()) {
    const [countryIso2, neighborIso2] = key.split(':');
    neighbors.push({ countryIso2, neighborIso2, connectionType });
  }
  neighbors.sort((a, b) =>
    a.countryIso2 === b.countryIso2
      ? a.neighborIso2.localeCompare(b.neighborIso2)
      : a.countryIso2.localeCompare(b.countryIso2),
  );
  fs.writeFileSync(
    path.join(DATA_DIR, 'country-neighbors.json'),
    JSON.stringify(neighbors, null, 2),
  );

  // Sample unit-sphere boundary vectors for all playable countries
  const sampledByIso2 = new Map<string, Float64Array>();
  for (const c of countries) {
    const geom = playableGeometryByIso2.get(c.iso2) ?? null;
    sampledByIso2.set(c.iso2, sampleGeometryUnitVectors(geom, [c.labelLng, c.labelLat]));
  }

  // Precompute symmetric border-to-border distances & directed spherical compass bearings
  const symmetricKm = new Map<string, number>();
  for (let i = 0; i < countries.length; i++) {
    const a = countries[i];
    const vecA = sampledByIso2.get(a.iso2)!;
    for (let j = i + 1; j < countries.length; j++) {
      const b = countries[j];
      const k1 = edgeKey(a.iso2, b.iso2);
      const k2 = edgeKey(b.iso2, a.iso2);
      if (neighborMap.has(k1)) {
        symmetricKm.set(k1, 0);
        symmetricKm.set(k2, 0);
      } else {
        const vecB = sampledByIso2.get(b.iso2)!;
        const rawKm = minSphericalDistanceKm(vecA, vecB);
        const clampedKm = Math.max(1, Math.round(rawKm));
        symmetricKm.set(k1, clampedKm);
        symmetricKm.set(k2, clampedKm);
      }
    }
  }

  const distances: BuiltDistanceRecord[] = [];
  for (const from of countries) {
    for (const to of countries) {
      if (from.iso2 === to.iso2) {
        distances.push({
          fromIso2: from.iso2,
          toIso2: to.iso2,
          distanceKm: 0,
          bearingDeg: null,
          direction: null,
          isNeighbor: false,
        });
        continue;
      }

      const key = edgeKey(from.iso2, to.iso2);
      const isNeighbor = neighborMap.has(key);
      const distanceKm = isNeighbor ? 0 : symmetricKm.get(key)!;

      if (isNeighbor) {
        distances.push({
          fromIso2: from.iso2,
          toIso2: to.iso2,
          distanceKm: 0,
          bearingDeg: null,
          direction: null,
          isNeighbor: true,
        });
      } else {
        const rawBearing = turfBearing(
          [from.labelLng, from.labelLat],
          [to.labelLng, to.labelLat],
        );
        const bearingDeg = Math.round((((rawBearing % 360) + 360) % 360) * 10) / 10;
        distances.push({
          fromIso2: from.iso2,
          toIso2: to.iso2,
          distanceKm,
          bearingDeg,
          direction: bearingToDirection8(bearingDeg),
          isNeighbor: false,
        });
      }
    }
  }

  fs.writeFileSync(
    path.join(DATA_DIR, 'country-distances.json'),
    JSON.stringify(distances),
  );

  const elapsedMs = Date.now() - startedAt;
  console.log(
    `[geo:build] Built ${countries.length} countries, ${neighbors.length} directed neighbor edges, and ${distances.length} distance pairs in ${elapsedMs}ms.`,
  );
}

main();
