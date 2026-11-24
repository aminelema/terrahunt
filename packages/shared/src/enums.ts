import { z } from 'zod';

/** The 5 playable continents in Geodle. */
export const CountryRegionSchema = z.enum([
  'EUROPE',
  'ASIA',
  'AFRICA',
  'AMERICAS',
  'OCEANIA',
]);
export type CountryRegion = z.infer<typeof CountryRegionSchema>;

/** Game modes: shared UTC Daily challenge or unlimited Free Play. */
export const GameModeSchema = z.enum(['DAILY', 'FREEPLAY']);
export type GameMode = z.infer<typeof GameModeSchema>;

/** Lifecycle status of a Geodle game session. */
export const SessionStatusSchema = z.enum(['IN_PROGRESS', 'WON', 'GAVE_UP']);
export type SessionStatus = z.infer<typeof SessionStatusSchema>;

/** Color status of each attribute cell: Green (MATCH), Yellow (CLOSE), or Red (WRONG). */
export const ClueStatusSchema = z.enum(['MATCH', 'CLOSE', 'WRONG']);
export type ClueStatus = z.infer<typeof ClueStatusSchema>;

/** Arrow direction for numeric attributes (Population, Area, Temperature). */
export const NumericTrendSchema = z.enum(['EQUAL', 'HIGHER', 'LOWER']);
export type NumericTrend = z.infer<typeof NumericTrendSchema>;

/** 8-point compass direction used when two countries do not share a land border. */
export const Direction8Schema = z.enum(['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW']);
export type Direction8 = z.infer<typeof Direction8Schema>;
