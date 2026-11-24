import type { ConnectionType, CountryRegion, Direction8 } from './enums';

export interface GeodataCountryRecord {
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

export interface GeodataNeighborEdge {
  countryIso2: string;
  neighborIso2: string;
  connectionType: ConnectionType;
}

export interface GeodataDistanceRecord {
  fromIso2: string;
  toIso2: string;
  distanceKm: number;
  bearingDeg: number | null;
  direction: Direction8 | null;
  isNeighbor: boolean;
}
