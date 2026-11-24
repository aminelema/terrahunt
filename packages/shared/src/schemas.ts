import { z } from 'zod';
import {
  ClueStatusSchema,
  CountryRegionSchema,
  Direction8Schema,
  GameModeSchema,
  NumericTrendSchema,
  SessionStatusSchema,
} from './enums';

export const HealthResponseSchema = z.object({
  status: z.literal('ok'),
  database: z.literal('up'),
  countriesCount: z.number().int(),
  timestamp: z.string(),
});
export type HealthResponse = z.infer<typeof HealthResponseSchema>;

/** Public country item used by the frontend search dropdown. */
export const CountryOptionSchema = z.object({
  iso2: z.string().length(2),
  nameEn: z.string(),
  flagEmoji: z.string(),
  region: CountryRegionSchema,
  aliases: z.array(z.string()),
});
export type CountryOption = z.infer<typeof CountryOptionSchema>;

export const CountriesCatalogResponseSchema = z.object({
  countries: z.array(CountryOptionSchema),
});
export type CountriesCatalogResponse = z.infer<typeof CountriesCatalogResponseSchema>;

export const StartGeodleGameRequestSchema = z.object({
  mode: GameModeSchema.default('DAILY'),
});
export type StartGeodleGameRequest = z.infer<typeof StartGeodleGameRequestSchema>;

export const SubmitGeodleGuessRequestSchema = z.object({
  countryIso2: z
    .string()
    .trim()
    .length(2)
    .transform((v) => v.toUpperCase()),
});
export type SubmitGeodleGuessRequest = z.infer<typeof SubmitGeodleGuessRequestSchema>;

export const GeodleGuessCluesSchema = z.object({
  continent: z.object({
    status: ClueStatusSchema,
    region: CountryRegionSchema,
    subregion: z.string(),
  }),
  population: z.object({
    status: ClueStatusSchema,
    trend: NumericTrendSchema,
    value: z.number(),
  }),
  areaKm2: z.object({
    status: ClueStatusSchema,
    trend: NumericTrendSchema,
    value: z.number(),
  }),
  landlocked: z.object({
    status: ClueStatusSchema,
    value: z.boolean(),
  }),
  avgTempC: z.object({
    status: ClueStatusSchema,
    trend: NumericTrendSchema,
    value: z.number(),
  }),
  neighborOrDirection: z.object({
    status: ClueStatusSchema,
    isNeighbor: z.boolean(),
    direction: Direction8Schema.nullable(),
  }),
});

export const GeodleGuessRowSchema = z.object({
  guessOrder: z.number().int().min(1),
  countryIso2: z.string().length(2),
  countryName: z.string(),
  flagEmoji: z.string(),
  isCorrect: z.boolean(),
  clues: GeodleGuessCluesSchema,
  createdAt: z.string(),
});
export type GeodleGuessRow = z.infer<typeof GeodleGuessRowSchema>;

export const SecretCountryRevealSchema = z.object({
  iso2: z.string().length(2),
  nameEn: z.string(),
  flagEmoji: z.string(),
  capital: z.string().nullable(),
  region: CountryRegionSchema,
  subregion: z.string(),
  population: z.number(),
  areaKm2: z.number(),
  isLandlocked: z.boolean(),
  avgTempC: z.number(),
});
export type SecretCountryReveal = z.infer<typeof SecretCountryRevealSchema>;

export const GeodleSessionSchema = z.object({
  sessionId: z.string().uuid(),
  mode: GameModeSchema,
  dailyChallengeNumber: z.number().int().nullable(),
  dailyDate: z.string().nullable(),
  status: SessionStatusSchema,
  guessCount: z.number().int().min(0),
  guesses: z.array(GeodleGuessRowSchema),
  /** Strictly null while status === 'IN_PROGRESS' so nobody can cheat via DevTools! */
  secretCountry: SecretCountryRevealSchema.nullable(),
  startedAt: z.string(),
  endedAt: z.string().nullable(),
});
export type GeodleSession = z.infer<typeof GeodleSessionSchema>;
