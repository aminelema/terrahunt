import { z } from 'zod';
import {
  CountryRegionSchema,
  GameModeSchema,
  SessionStatusSchema,
} from './enums';
import {
  TRUESIZE_MAX_SLIDER_RATIO,
  TRUESIZE_MIN_SLIDER_RATIO,
  TRUESIZE_ROUNDS_PER_GAME,
} from './scoring';

export const HealthResponseSchema = z.object({
  status: z.literal('ok'),
  database: z.literal('up'),
  countriesCount: z.number().int(),
  timestamp: z.string(),
});
export type HealthResponse = z.infer<typeof HealthResponseSchema>;

export const CountrySummarySchema = z.object({
  iso2: z.string().length(2),
  iso3: z.string().length(3),
  nameEn: z.string(),
  capital: z.string().nullable(),
  region: CountryRegionSchema,
  flagEmoji: z.string(),
  isMicrostate: z.boolean(),
  labelLat: z.number(),
  labelLng: z.number(),
  aliases: z.array(z.string()),
});
export type CountrySummary = z.infer<typeof CountrySummarySchema>;

export const CountriesCatalogResponseSchema = z.object({
  countries: z.array(CountrySummarySchema),
});
export type CountriesCatalogResponse = z.infer<typeof CountriesCatalogResponseSchema>;

export const TrueSizeModeSchema = GameModeSchema.extract(['DAILY', 'FREEPLAY']);
export type TrueSizeMode = z.infer<typeof TrueSizeModeSchema>;

export const CreateTrueSizeGameRequestSchema = z.object({
  mode: TrueSizeModeSchema.default('FREEPLAY'),
});
export type CreateTrueSizeGameRequest = z.infer<typeof CreateTrueSizeGameRequestSchema>;

export const SubmitTrueSizeGuessRequestSchema = z.object({
  roundNumber: z.number().int().min(1).max(TRUESIZE_ROUNDS_PER_GAME),
  guessedRatio: z
    .number()
    .min(TRUESIZE_MIN_SLIDER_RATIO * 0.5)
    .max(TRUESIZE_MAX_SLIDER_RATIO * 2),
});
export type SubmitTrueSizeGuessRequest = z.infer<typeof SubmitTrueSizeGuessRequestSchema>;

export const TrueSizeCountryRefSchema = z.object({
  iso2: z.string().length(2),
  nameEn: z.string(),
  flagEmoji: z.string(),
  capital: z.string().nullable(),
  region: CountryRegionSchema,
  labelLat: z.number(),
  labelLng: z.number(),
});
export type TrueSizeCountryRef = z.infer<typeof TrueSizeCountryRefSchema>;

export const TrueSizeRoundRevealSchema = z.object({
  guessedRatio: z.number(),
  trueRatio: z.number(),
  baseAreaKm2: z.number(),
  targetAreaKm2: z.number(),
  score: z.number().int().min(0).max(1000),
  answeredAt: z.string(),
});
export type TrueSizeRoundReveal = z.infer<typeof TrueSizeRoundRevealSchema>;

export const TrueSizeRoundSchema = z.object({
  roundNumber: z.number().int().min(1).max(TRUESIZE_ROUNDS_PER_GAME),
  baseCountry: TrueSizeCountryRefSchema,
  targetCountry: TrueSizeCountryRefSchema,
  answered: z.boolean(),
  reveal: TrueSizeRoundRevealSchema.nullable(),
});
export type TrueSizeRound = z.infer<typeof TrueSizeRoundSchema>;

export const TrueSizeSessionSchema = z.object({
  sessionId: z.string().uuid(),
  mode: TrueSizeModeSchema,
  dailyChallengeNumber: z.number().int().nullable(),
  dailyDate: z.string().nullable(),
  status: SessionStatusSchema,
  currentRound: z.number().int().min(1).max(TRUESIZE_ROUNDS_PER_GAME),
  totalScore: z.number().int().min(0).max(5000),
  maxPossibleScore: z.number().int(),
  rounds: z.array(TrueSizeRoundSchema),
  startedAt: z.string(),
  endedAt: z.string().nullable(),
});
export type TrueSizeSession = z.infer<typeof TrueSizeSessionSchema>;

export const SubmitTrueSizeGuessResponseSchema = z.object({
  round: TrueSizeRoundSchema,
  session: TrueSizeSessionSchema,
});
export type SubmitTrueSizeGuessResponse = z.infer<typeof SubmitTrueSizeGuessResponseSchema>;
