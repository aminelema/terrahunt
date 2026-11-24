import { z } from 'zod';

export const GameTypeSchema = z.enum(['TRUESIZE', 'GEOROUTE', 'TERRAHUNT']);
export type GameType = z.infer<typeof GameTypeSchema>;

export const GameModeSchema = z.enum(['DAILY', 'FREEPLAY', 'BLITZ']);
export type GameMode = z.infer<typeof GameModeSchema>;

export const RegionFilterSchema = z.enum([
  'WORLD',
  'EUROPE',
  'ASIA',
  'AFRICA',
  'AMERICAS',
  'OCEANIA',
]);
export type RegionFilter = z.infer<typeof RegionFilterSchema>;

export const CountryRegionSchema = z.enum([
  'EUROPE',
  'ASIA',
  'AFRICA',
  'AMERICAS',
  'OCEANIA',
  'OTHER',
]);
export type CountryRegion = z.infer<typeof CountryRegionSchema>;

export const SessionStatusSchema = z.enum([
  'IN_PROGRESS',
  'WON',
  'COMPLETED',
  'LOST_TIMEOUT',
  'ABANDONED',
]);
export type SessionStatus = z.infer<typeof SessionStatusSchema>;

export const Direction8Schema = z.enum(['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW']);
export type Direction8 = z.infer<typeof Direction8Schema>;

export const HeatTierSchema = z.enum([
  'FOUND',
  'BURNING',
  'HOT',
  'WARM',
  'COOL',
  'COLD',
  'FREEZING',
]);
export type HeatTier = z.infer<typeof HeatTierSchema>;

export const ConnectionTypeSchema = z.enum(['LAND', 'BRIDGE_TUNNEL']);
export type ConnectionType = z.infer<typeof ConnectionTypeSchema>;
