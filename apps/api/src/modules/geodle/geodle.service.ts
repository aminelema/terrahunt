import crypto from 'node:crypto';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, type Country } from '../../generated/prisma';
import {
  evaluateGeodleGuess,
  type CountryAttributes,
  type GameMode,
  type GeodleGuessRow,
  type GeodleSession,
} from '@terrahunt/shared';
import { PrismaService } from '../../prisma/prisma.module';

@Injectable()
export class GeodleService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  /**
   * Returns today's calendar date in German time (Europe/Berlin, CET/CEST)
   * so the Daily puzzle rotates strictly at 00:00 German time.
   */
  private getTodayBerlinDate(): Date {
    const berlinDateStr = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Europe/Berlin',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(new Date()); // "YYYY-MM-DD"
    return new Date(`${berlinDateStr}T00:00:00.000Z`);
  }

  private toCountryAttributes(country: Country): CountryAttributes {
    return {
      iso2: country.iso2,
      nameEn: country.nameEn,
      flagEmoji: country.flagEmoji,
      capital: country.capital,
      region: country.region,
      subregion: country.subregion,
      population: country.population,
      areaKm2: country.areaKm2,
      isLandlocked: country.isLandlocked,
      avgTempC: country.avgTempC,
      lat: country.lat,
      lng: country.lng,
    };
  }

  private assertGuestOwner(sessionGuestId: string, requestGuestId?: string): void {
    if (!requestGuestId || sessionGuestId !== requestGuestId) {
      throw new ForbiddenException('You do not have access to this game session.');
    }
  }

  /** Picks one random country, excluding an optional set of recently used ISO2 codes. */
  private async pickRandomCountryIso2(excludedIso2: Set<string> = new Set()): Promise<string> {
    const allCountries = await this.prisma.country.findMany({
      select: { iso2: true },
      orderBy: { iso2: 'asc' },
    });

    const filtered = allCountries.filter((c) => !excludedIso2.has(c.iso2));
    const pool = filtered.length > 0 ? filtered : allCountries;
    return pool[crypto.randomInt(0, pool.length)].iso2;
  }

  /**
   * Lazily creates today's UTC Daily Challenge if none exists yet,
   * avoiding any secret country used in the last 90 days.
   */
  private async getOrCreateTodayDailyChallenge() {
    const todayBerlin = this.getTodayBerlinDate();

    const existing = await this.prisma.dailyChallenge.findUnique({
      where: { challengeDate: todayBerlin },
    });
    if (existing) return existing;

    const recent90 = await this.prisma.dailyChallenge.findMany({
      orderBy: { challengeDate: 'desc' },
      take: 90,
      select: { secretCountryIso2: true },
    });
    const excluded = new Set(recent90.map((r) => r.secretCountryIso2));
    const secretCountryIso2 = await this.pickRandomCountryIso2(excluded);

    const maxNum = await this.prisma.dailyChallenge.aggregate({
      _max: { challengeNumber: true }, // SELECT MAX(challenge_number) FROM daily_challenges;
    });
    const nextNumber = (maxNum._max.challengeNumber ?? 0) + 1;

    try {
      return await this.prisma.dailyChallenge.create({
        data: {
          challengeNumber: nextNumber,
          challengeDate: todayBerlin,
          secretCountryIso2,
        },
      });
    } catch (err) {
      // Handle simultaneous midnight requests gracefully
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
        const raced = await this.prisma.dailyChallenge.findUnique({
          where: { challengeDate: todayBerlin },
        });
        if (raced) return raced;
      }
      throw err;
    }
  }

  /**
   * Converts a database GameSession into the JSON response sent to React.
   * Anti-Cheat Rule: `secretCountry` is strictly `null` while `status === 'IN_PROGRESS'`.
   */
  private async serializeSession(sessionId: string): Promise<GeodleSession> {
    const session = await this.prisma.gameSession.findUnique({
      where: { id: sessionId },
      include: {
        dailyChallenge: true,
        secretCountry: {
          include: {
            neighborsFrom: { select: { neighborIso2: true } },
          },
        },
        guesses: {
          orderBy: { guessOrder: 'asc' },
          include: { guessedCountry: true },
        },
      },
    });

    if (!session) {
      throw new NotFoundException('Game session not found.');
    }

    const secretAttrs = this.toCountryAttributes(session.secretCountry);
    const secretNeighborSet = new Set(
      session.secretCountry.neighborsFrom.map((n) => n.neighborIso2),
    );

    const evaluatedGuesses: GeodleGuessRow[] = session.guesses.map((g) => {
      const guessAttrs = this.toCountryAttributes(g.guessedCountry);
      const isNeighbor = secretNeighborSet.has(guessAttrs.iso2);
      const { isCorrect, clues } = evaluateGeodleGuess(guessAttrs, secretAttrs, isNeighbor);

      return {
        guessOrder: g.guessOrder,
        countryIso2: g.guessedCountryIso2,
        countryName: g.guessedCountry.nameEn,
        flagEmoji: g.guessedCountry.flagEmoji,
        isCorrect,
        clues,
        createdAt: g.createdAt.toISOString(),
      };
    });

    const isFinished = session.status !== 'IN_PROGRESS';

    return {
      sessionId: session.id,
      mode: session.mode,
      dailyChallengeNumber: session.dailyChallenge?.challengeNumber ?? null,
      dailyDate: session.dailyChallenge
        ? session.dailyChallenge.challengeDate.toISOString().slice(0, 10)
        : null,
      status: session.status,
      guessCount: session.guessCount,
      guesses: evaluatedGuesses,
      secretCountry: isFinished
        ? {
            iso2: secretAttrs.iso2,
            nameEn: secretAttrs.nameEn,
            flagEmoji: secretAttrs.flagEmoji,
            capital: secretAttrs.capital,
            region: secretAttrs.region,
            subregion: secretAttrs.subregion,
            population: secretAttrs.population,
            areaKm2: secretAttrs.areaKm2,
            isLandlocked: secretAttrs.isLandlocked,
            avgTempC: secretAttrs.avgTempC,
          }
        : null,
      startedAt: session.startedAt.toISOString(),
      endedAt: session.endedAt ? session.endedAt.toISOString() : null,
    };
  }

  /** Starts a new Free Play game or starts/resumes today's shared Daily game. */
  async startOrResumeSession(mode: GameMode, guestId?: string): Promise<GeodleSession> {
    if (!guestId) {
      throw new BadRequestException('Missing guest cookie identity.');
    }

    if (mode === 'DAILY') {
      const daily = await this.getOrCreateTodayDailyChallenge();

      const existing = await this.prisma.gameSession.findUnique({
        where: {
          guestId_dailyChallengeId: {
            guestId,
            dailyChallengeId: daily.id,
          },
        },
        select: { id: true },
      });
      if (existing) {
        return this.serializeSession(existing.id);
      }

      const created = await this.prisma.gameSession.create({
        data: {
          guestId,
          mode: 'DAILY',
          dailyChallengeId: daily.id,
          secretCountryIso2: daily.secretCountryIso2,
        },
      });
      return this.serializeSession(created.id);
    }

    const secretCountryIso2 = await this.pickRandomCountryIso2();
    const created = await this.prisma.gameSession.create({
      data: {
        guestId,
        mode: 'FREEPLAY',
        secretCountryIso2,
      },
    });
    return this.serializeSession(created.id);
  }

  /**
   * Validates and records one country guess inside a row-locked DB transaction.
   * Rejects duplicate guesses in the same game with HTTP 409 Conflict.
   */
  async submitGuess(
    sessionId: string,
    countryIso2: string,
    guestId?: string,
  ): Promise<GeodleSession> {
    const countryExists = await this.prisma.country.findUnique({
      where: { iso2: countryIso2 },
      select: { iso2: true, nameEn: true },
    });
    if (!countryExists) {
      throw new BadRequestException(`Unknown country code: ${countryIso2}`);
    }

    await this.prisma.$transaction(async (tx) => {
      // Lock the session row so two simultaneous requests cannot race on guess_order
      const rows = await tx.$queryRaw<
        Array<{
          id: string;
          guest_id: string;
          secret_country_iso2: string;
          status: string;
          guess_count: number;
        }>
      >`SELECT id, guest_id, secret_country_iso2, status, guess_count
        FROM game_sessions
        WHERE id = ${sessionId}::uuid
        FOR UPDATE`;

      if (rows.length === 0) {
        throw new NotFoundException('Game session not found.');
      }

      const session = rows[0];
      this.assertGuestOwner(session.guest_id, guestId);

      if (session.status !== 'IN_PROGRESS') {
        throw new ConflictException('This game has already ended.');
      }

      const duplicate = await tx.geodleGuess.findUnique({
        where: {
          sessionId_guessedCountryIso2: {
            sessionId,
            guessedCountryIso2: countryIso2,
          },
        },
      });
      if (duplicate) {
        throw new ConflictException(`You already guessed ${countryExists.nameEn} in this game.`);
      }

      const nextOrder = session.guess_count + 1;
      const isWinningGuess = countryIso2 === session.secret_country_iso2;

      await tx.geodleGuess.create({
        data: {
          sessionId,
          guessOrder: nextOrder,
          guessedCountryIso2: countryIso2,
        },
      });

      await tx.gameSession.update({
        where: { id: sessionId },
        data: {
          guessCount: nextOrder,
          status: isWinningGuess ? 'WON' : 'IN_PROGRESS',
          endedAt: isWinningGuess ? new Date() : null,
        },
      });
    });

    return this.serializeSession(sessionId);
  }

  /** Marks an active game as GAVE_UP and reveals the secret country. */
  async giveUp(sessionId: string, guestId?: string): Promise<GeodleSession> {
    await this.prisma.$transaction(async (tx) => {
      const session = await tx.gameSession.findUnique({
        where: { id: sessionId },
      });
      if (!session) {
        throw new NotFoundException('Game session not found.');
      }
      this.assertGuestOwner(session.guestId, guestId);

      if (session.status !== 'IN_PROGRESS') {
        throw new ConflictException('This game has already ended.');
      }

      await tx.gameSession.update({
        where: { id: sessionId },
        data: {
          status: 'GAVE_UP',
          endedAt: new Date(),
        },
      });
    });

    return this.serializeSession(sessionId);
  }
}
