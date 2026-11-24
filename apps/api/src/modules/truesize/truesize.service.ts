import crypto from 'node:crypto';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, type Country } from '@prisma/client';
import {
  computeTrueSizeRoundScore,
  TRUESIZE_MAX_ROUND_SCORE,
  TRUESIZE_ROUNDS_PER_GAME,
  type SubmitTrueSizeGuessResponse,
  type TrueSizeCountryRef,
  type TrueSizeMode,
  type TrueSizeRound,
  type TrueSizeSession,
} from '@terrahunt/shared';
import { PrismaService } from '../../prisma/prisma.module';

export interface TrueSizePairSpec {
  baseIso2: string;
  targetIso2: string;
}

interface DailyTrueSizeConfig {
  pairs: TrueSizePairSpec[];
}

export interface PlayerActor {
  userId?: string;
  guestId?: string;
}

const MIN_ELIGIBLE_AREA_KM2 = 10_000;
const MIN_TRUE_RATIO = 0.14;
const MAX_TRUE_RATIO = 7.0;
const MIN_LOG2_SEPARATION = 0.18; // >= ~13% area difference so rounds aren't near-identical 1.0x

@Injectable()
export class TrueSizeService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  private getTodayUtcDate(): Date {
    const now = new Date();
    return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  }

  private formatDateOnly(d: Date): string {
    return d.toISOString().slice(0, 10);
  }

  private assertOwner(
    session: { userId: string | null; guestId: string | null },
    actor: PlayerActor,
  ): void {
    if (session.userId) {
      if (actor.userId !== session.userId) {
        throw new ForbiddenException('You do not own this game session.');
      }
      return;
    }
    if (!actor.guestId || session.guestId !== actor.guestId) {
      throw new ForbiddenException('You do not own this guest game session.');
    }
  }

  private toCountryRef(c: Country): TrueSizeCountryRef {
    return {
      iso2: c.iso2,
      nameEn: c.nameEn,
      flagEmoji: c.flagEmoji,
      capital: c.capital,
      region: c.region,
      labelLat: c.labelLat,
      labelLng: c.labelLng,
    };
  }

  /**
   * Generates 5 distinct country pairs with meaningful size ratios inside [0.14x, 7.0x],
   * favoring cross-latitude pairs that challenge flat-map (Mercator) intuition.
   */
  async pickFivePairs(excludedPairKeys: Set<string> = new Set()): Promise<TrueSizePairSpec[]> {
    const eligible = await this.prisma.country.findMany({
      where: {
        isPlayable: true,
        hasPolygon: true,
        areaKm2: { gte: MIN_ELIGIBLE_AREA_KM2 },
      },
      orderBy: { iso2: 'asc' },
    });

    if (eligible.length < TRUESIZE_ROUNDS_PER_GAME * 2) {
      throw new BadRequestException('Insufficient eligible countries seeded for TrueSize.');
    }

    const usedCountries = new Set<string>();
    const chosenPairs: TrueSizePairSpec[] = [];

    // Shuffle pool using crypto randomness
    const shuffled = [...eligible];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = crypto.randomInt(0, i + 1);
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }

    for (let i = 0; i < shuffled.length && chosenPairs.length < TRUESIZE_ROUNDS_PER_GAME; i++) {
      const base = shuffled[i];
      if (usedCountries.has(base.iso2)) continue;

      // Prefer candidates with >15 deg latitude difference (Mercator illusion!)
      const candidates = shuffled.filter((target) => {
        if (target.iso2 === base.iso2 || usedCountries.has(target.iso2)) return false;
        const ratio = target.areaKm2 / base.areaKm2;
        if (ratio < MIN_TRUE_RATIO || ratio > MAX_TRUE_RATIO) return false;
        if (Math.abs(Math.log2(ratio)) < MIN_LOG2_SEPARATION) return false;
        const pairKey = [base.iso2, target.iso2].sort().join(':');
        if (excludedPairKeys.has(pairKey)) return false;
        return true;
      });

      if (candidates.length === 0) continue;

      const mercatorFoil = candidates.filter(
        (t) => Math.abs(Math.abs(t.labelLat) - Math.abs(base.labelLat)) >= 15,
      );
      const pool = mercatorFoil.length > 0 ? mercatorFoil : candidates;
      const picked = pool[crypto.randomInt(0, pool.length)];

      usedCountries.add(base.iso2);
      usedCountries.add(picked.iso2);
      chosenPairs.push({ baseIso2: base.iso2, targetIso2: picked.iso2 });
    }

    // Fallback relaxation if excludedPairKeys was overly restrictive
    if (chosenPairs.length < TRUESIZE_ROUNDS_PER_GAME && excludedPairKeys.size > 0) {
      return this.pickFivePairs(new Set());
    }

    return chosenPairs;
  }

  private async getOrCreateTodayDailyChallenge() {
    const todayUtc = this.getTodayUtcDate();

    const existing = await this.prisma.dailyChallenge.findUnique({
      where: {
        gameType_challengeDate: {
          gameType: 'TRUESIZE',
          challengeDate: todayUtc,
        },
      },
    });
    if (existing) return existing;

    // Collect pairs used in the last 30 daily challenges so daily pairs stay fresh
    const recentChallenges = await this.prisma.dailyChallenge.findMany({
      where: { gameType: 'TRUESIZE' },
      orderBy: { challengeDate: 'desc' },
      take: 30,
    });

    const excludedPairKeys = new Set<string>();
    for (const ch of recentChallenges) {
      const cfg = ch.config as unknown as DailyTrueSizeConfig | null;
      for (const p of cfg?.pairs ?? []) {
        excludedPairKeys.add([p.baseIso2, p.targetIso2].sort().join(':'));
      }
    }

    const pairs = await this.pickFivePairs(excludedPairKeys);
    const maxNumberAgg = await this.prisma.dailyChallenge.aggregate({
      where: { gameType: 'TRUESIZE' },
      _max: { challengeNumber: true },
    });
    const nextNumber = (maxNumberAgg._max.challengeNumber ?? 0) + 1;

    try {
      return await this.prisma.dailyChallenge.create({
        data: {
          gameType: 'TRUESIZE',
          challengeNumber: nextNumber,
          challengeDate: todayUtc,
          config: { pairs } as unknown as Prisma.InputJsonValue,
        },
      });
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
        const raced = await this.prisma.dailyChallenge.findUnique({
          where: {
            gameType_challengeDate: {
              gameType: 'TRUESIZE',
              challengeDate: todayUtc,
            },
          },
        });
        if (raced) return raced;
      }
      throw err;
    }
  }

  private async serializeSession(sessionId: string): Promise<TrueSizeSession> {
    const session = await this.prisma.gameSession.findUnique({
      where: { id: sessionId },
      include: {
        dailyChallenge: true,
        trueSizeRounds: {
          orderBy: { roundNumber: 'asc' },
          include: {
            baseCountry: true,
            targetCountry: true,
          },
        },
      },
    });

    if (!session) {
      throw new NotFoundException('TrueSize game session not found.');
    }

    const rounds: TrueSizeRound[] = session.trueSizeRounds.map((r) => {
      const answered = r.answeredAt !== null && r.guessedRatio !== null && r.score !== null;
      return {
        roundNumber: r.roundNumber,
        baseCountry: this.toCountryRef(r.baseCountry),
        targetCountry: this.toCountryRef(r.targetCountry),
        answered,
        // STRICT ANTI-CHEAT: trueRatio and areaKm2 are null until answered!
        reveal: answered
          ? {
              guessedRatio: r.guessedRatio!,
              trueRatio: r.trueRatio,
              baseAreaKm2: r.baseCountry.areaKm2,
              targetAreaKm2: r.targetCountry.areaKm2,
              score: r.score!,
              answeredAt: r.answeredAt!.toISOString(),
            }
          : null,
      };
    });

    const currentRound = Math.min(TRUESIZE_ROUNDS_PER_GAME, session.stepCount + 1);

    return {
      sessionId: session.id,
      mode: session.mode as TrueSizeMode,
      dailyChallengeNumber: session.dailyChallenge?.challengeNumber ?? null,
      dailyDate: session.dailyChallenge
        ? this.formatDateOnly(session.dailyChallenge.challengeDate)
        : null,
      status: session.status,
      currentRound,
      totalScore: session.score,
      maxPossibleScore: TRUESIZE_ROUNDS_PER_GAME * TRUESIZE_MAX_ROUND_SCORE,
      rounds,
      startedAt: session.startedAt.toISOString(),
      endedAt: session.endedAt ? session.endedAt.toISOString() : null,
    };
  }

  async createOrResumeSession(
    mode: TrueSizeMode,
    actor: PlayerActor,
  ): Promise<TrueSizeSession> {
    if (!actor.userId && !actor.guestId) {
      throw new BadRequestException('Missing player or guest identity.');
    }

    let dailyChallengeId: number | null = null;
    let pairs: TrueSizePairSpec[];

    if (mode === 'DAILY') {
      const daily = await this.getOrCreateTodayDailyChallenge();
      dailyChallengeId = daily.id;

      const existingSession = await this.prisma.gameSession.findFirst({
        where: actor.userId
          ? { userId: actor.userId, dailyChallengeId: daily.id }
          : { guestId: actor.guestId, userId: null, dailyChallengeId: daily.id },
        select: { id: true },
      });

      if (existingSession) {
        return this.serializeSession(existingSession.id);
      }

      const cfg = daily.config as unknown as DailyTrueSizeConfig;
      pairs = cfg.pairs;
    } else {
      pairs = await this.pickFivePairs();
    }

    const isoSet = Array.from(new Set(pairs.flatMap((p) => [p.baseIso2, p.targetIso2])));
    const countries = await this.prisma.country.findMany({
      where: { iso2: { in: isoSet } },
    });
    const byIso2 = new Map(countries.map((c) => [c.iso2, c]));

    const createdId = await this.prisma.$transaction(async (tx) => {
      const session = await tx.gameSession.create({
        data: {
          userId: actor.userId ?? null,
          guestId: actor.userId ? null : (actor.guestId ?? null),
          gameType: 'TRUESIZE',
          mode,
          dailyChallengeId,
          status: 'IN_PROGRESS',
          score: 0,
          stepCount: 0,
          targetData: { pairs } as unknown as Prisma.InputJsonValue,
        },
      });

      await tx.trueSizeRound.createMany({
        data: pairs.map((p, idx) => {
          const base = byIso2.get(p.baseIso2)!;
          const target = byIso2.get(p.targetIso2)!;
          const trueRatio = Number((target.areaKm2 / base.areaKm2).toFixed(6));
          return {
            sessionId: session.id,
            roundNumber: idx + 1,
            baseIso2: base.iso2,
            targetIso2: target.iso2,
            trueRatio,
          };
        }),
      });

      return session.id;
    });

    return this.serializeSession(createdId);
  }

  async getSession(sessionId: string, actor: PlayerActor): Promise<TrueSizeSession> {
    const raw = await this.prisma.gameSession.findUnique({
      where: { id: sessionId },
      select: { id: true, gameType: true, userId: true, guestId: true },
    });
    if (!raw || raw.gameType !== 'TRUESIZE') {
      throw new NotFoundException('TrueSize game session not found.');
    }
    this.assertOwner(raw, actor);
    return this.serializeSession(sessionId);
  }

  async submitGuess(
    sessionId: string,
    roundNumber: number,
    guessedRatio: number,
    actor: PlayerActor,
  ): Promise<SubmitTrueSizeGuessResponse> {
    await this.prisma.$transaction(async (tx) => {
      // Acquire row-level lock on game_sessions to eliminate concurrent guess race conditions
      const lockedRows = await tx.$queryRaw<
        Array<{
          id: string;
          game_type: string;
          user_id: string | null;
          guest_id: string | null;
          status: string;
          score: number;
          step_count: number;
          started_at: Date;
        }>
      >`SELECT id, game_type, user_id, guest_id, status, score, step_count, started_at
        FROM game_sessions
        WHERE id = ${sessionId}::uuid
        FOR UPDATE`;

      if (lockedRows.length === 0 || lockedRows[0].game_type !== 'TRUESIZE') {
        //404
        throw new NotFoundException('TrueSize game session not found.');
      }

      const locked = lockedRows[0];
      this.assertOwner({ userId: locked.user_id, guestId: locked.guest_id }, actor);

      if (locked.status !== 'IN_PROGRESS') {
        throw new ConflictException('This TrueSize game session is already completed.');
      }

      const expectedRound = locked.step_count + 1;
      if (roundNumber !== expectedRound) {
        throw new ConflictException(
          `Expected guess for round ${expectedRound}, received round ${roundNumber}.`,
        );
      }

      const round = await tx.trueSizeRound.findUnique({
        where: {
          sessionId_roundNumber: {
            sessionId,
            roundNumber,
          },
        },
      });

      if (!round) {
        throw new NotFoundException('Round not found.');
      }
      if (round.answeredAt !== null) {
        throw new ConflictException(`Round ${roundNumber} has already been answered.`);
      }

      const roundScore = computeTrueSizeRoundScore(guessedRatio, round.trueRatio);
      const now = new Date();
      const normalizedGuess = Number(guessedRatio.toFixed(4));

      await tx.trueSizeRound.update({
        where: {
          sessionId_roundNumber: {
            sessionId,
            roundNumber,
          },
        },
        data: {
          guessedRatio: normalizedGuess,
          score: roundScore,
          answeredAt: now,
        },
      });

      const nextStepCount = locked.step_count + 1;
      const isFinished = nextStepCount >= TRUESIZE_ROUNDS_PER_GAME;

      await tx.gameSession.update({
        where: { id: sessionId },
        data: {
          score: locked.score + roundScore,
          stepCount: nextStepCount,
          status: isFinished ? 'COMPLETED' : 'IN_PROGRESS',
          endedAt: isFinished ? now : null,
          durationMs: isFinished
            ? Math.max(0, now.getTime() - locked.started_at.getTime())
            : null,
        },
      });
    });

    const updatedSession = await this.serializeSession(sessionId);
    const updatedRound = updatedSession.rounds.find((r) => r.roundNumber === roundNumber)!;
    return {
      round: updatedRound,
      session: updatedSession,
    };
  }
}
