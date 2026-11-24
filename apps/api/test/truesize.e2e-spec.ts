import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { seedGeodata } from '../prisma/seed';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/main';
import { PrismaService } from '../src/prisma/prisma.module';

const TEST_DB_URL =
  process.env.TEST_DATABASE_URL ??
  'postgresql://terrahunt:terrahunt_dev_password@localhost:5432/terrahunt_test?schema=public';

describe('TerraHunt API — Health, Countries & TrueSize E2E', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  beforeAll(async () => {
    process.env.DATABASE_URL = TEST_DB_URL;

    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();
    configureApp(app);
    await app.init();

    prisma = app.get(PrismaService);
    await prisma.gameSession.deleteMany();
    await prisma.dailyChallenge.deleteMany();
    const count = await prisma.country.count();
    if (count < 190) {
      await seedGeodata(prisma);
    }
  }, 60_000);

  afterAll(async () => {
    if (app) {
      await app.close();
    }
  });

  it('GET /api/v1/health returns database up and seeded country count', async () => {
    const res = await request(app.getHttpServer()).get('/api/v1/health').expect(200);
    expect(res.body.status).toBe('ok');
    expect(res.body.database).toBe('up');
    expect(res.body.countriesCount).toBeGreaterThanOrEqual(195);
  });

  it('GET /api/v1/countries returns ETag-cached catalog and never leaks areaKm2', async () => {
    const res = await request(app.getHttpServer()).get('/api/v1/countries').expect(200);
    expect(res.body.countries.length).toBeGreaterThanOrEqual(195);
    const etag = res.headers['etag'];
    expect(etag).toBeDefined();

    for (const c of res.body.countries) {
      expect(c).not.toHaveProperty('areaKm2');
    }

    await request(app.getHttpServer())
      .get('/api/v1/countries')
      .set('If-None-Match', etag)
      .expect(304);
  });

  it('plays a complete 5-round FREEPLAY TrueSize session with strict anti-cheat & ownership checks', async () => {
    const agent = request.agent(app.getHttpServer());

    const startRes = await agent
      .post('/api/v1/games/truesize')
      .send({ mode: 'FREEPLAY' })
      .expect(200);

    const setCookieHeader = startRes.headers['set-cookie'] as unknown as string[] | undefined;
    expect(setCookieHeader?.some((c) => c.startsWith('th_guest_id='))).toBe(true);
    expect(setCookieHeader?.some((c) => c.includes('SameSite=Strict'))).toBe(true);

    const sessionId: string = startRes.body.sessionId;
    expect(startRes.body.status).toBe('IN_PROGRESS');
    expect(startRes.body.rounds).toHaveLength(5);

    // Anti-cheat: unanswered rounds must have reveal = null (no trueRatio or areaKm2)
    for (const round of startRes.body.rounds) {
      expect(round.answered).toBe(false);
      expect(round.reveal).toBeNull();
      expect(round.baseCountry).not.toHaveProperty('areaKm2');
      expect(round.targetCountry).not.toHaveProperty('areaKm2');
    }

    // Different guest cannot read this session
    await request(app.getHttpServer())
      .get(`/api/v1/games/truesize/${sessionId}`)
      .expect(403);

    // Cannot skip ahead to round 2
    await agent
      .post(`/api/v1/games/truesize/${sessionId}/guess`)
      .send({ roundNumber: 2, guessedRatio: 1.0 })
      .expect(409);

    // Play all 5 rounds sequentially
    for (let r = 1; r <= 5; r++) {
      const guessRes = await agent
        .post(`/api/v1/games/truesize/${sessionId}/guess`)
        .send({ roundNumber: r, guessedRatio: 1.25 })
        .expect(200);

      expect(guessRes.body.round.answered).toBe(true);
      expect(guessRes.body.round.reveal).not.toBeNull();
      expect(guessRes.body.round.reveal.trueRatio).toBeGreaterThan(0);
      expect(guessRes.body.round.reveal.baseAreaKm2).toBeGreaterThan(0);
      expect(guessRes.body.round.reveal.targetAreaKm2).toBeGreaterThan(0);

      if (r < 5) {
        expect(guessRes.body.session.status).toBe('IN_PROGRESS');
        expect(guessRes.body.session.currentRound).toBe(r + 1);
      } else {
        expect(guessRes.body.session.status).toBe('COMPLETED');
        expect(guessRes.body.session.endedAt).not.toBeNull();
      }
    }

    // Cannot submit once completed
    await agent
      .post(`/api/v1/games/truesize/${sessionId}/guess`)
      .send({ roundNumber: 5, guessedRatio: 1.0 })
      .expect(409);
  });

  it('creates one shared DAILY challenge for all players and resumes progress per guest', async () => {
    const guestA = request.agent(app.getHttpServer());
    const guestB = request.agent(app.getHttpServer());

    const aStart = await guestA
      .post('/api/v1/games/truesize')
      .send({ mode: 'DAILY' })
      .expect(200);
    expect(aStart.body.mode).toBe('DAILY');
    expect(aStart.body.dailyChallengeNumber).toBe(1);

    await guestA
      .post(`/api/v1/games/truesize/${aStart.body.sessionId}/guess`)
      .send({ roundNumber: 1, guessedRatio: 0.8 })
      .expect(200);

    // Reloading / re-calling POST /games/truesize with DAILY resumes guestA's session at round 2
    const aResume = await guestA
      .post('/api/v1/games/truesize')
      .send({ mode: 'DAILY' })
      .expect(200);
    expect(aResume.body.sessionId).toBe(aStart.body.sessionId);
    expect(aResume.body.currentRound).toBe(2);
    expect(aResume.body.rounds[0].answered).toBe(true);

    // GuestB receives the exact same 5 country pairs in their own fresh session
    const bStart = await guestB
      .post('/api/v1/games/truesize')
      .send({ mode: 'DAILY' })
      .expect(200);
    expect(bStart.body.sessionId).not.toBe(aStart.body.sessionId);
    expect(
      bStart.body.rounds.map((r: { baseCountry: { iso2: string }; targetCountry: { iso2: string } }) => `${r.baseCountry.iso2}:${r.targetCountry.iso2}`),
    ).toEqual(
      aStart.body.rounds.map((r: { baseCountry: { iso2: string }; targetCountry: { iso2: string } }) => `${r.baseCountry.iso2}:${r.targetCountry.iso2}`),
    );
  });
});
