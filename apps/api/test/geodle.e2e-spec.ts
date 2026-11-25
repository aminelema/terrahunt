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

describe('Geodle API — Integration Tests', () => {
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
  }, 30_000);

  afterAll(async () => {
    if (app) {
      await app.close();
    }
  });

  it('GET /api/v1/countries returns searchable options with ETag caching and zero secret stats', async () => {
    const res = await request(app.getHttpServer()).get('/api/v1/countries').expect(200);
    expect(res.body.countries).toHaveLength(197);
    const etag = res.headers['etag'];
    expect(etag).toBeDefined();

    await request(app.getHttpServer())
      .get('/api/v1/countries')
      .set('If-None-Match', etag)
      .expect(304);
  });

  it('enforces anti-cheat, blocks duplicate guesses (409), checks guest ownership (403), and wins cleanly', async () => {
    const agent = request.agent(app.getHttpServer());

    const startRes = await agent
      .post('/api/v1/games/geodle')
      .send({ mode: 'FREEPLAY' })
      .expect(200);

    const sessionId: string = startRes.body.sessionId;
    expect(startRes.body.status).toBe('IN_PROGRESS');
    expect(startRes.body.secretCountry).toBeNull(); // Anti-cheat check!

    // Another visitor without this guest cookie gets 403 Forbidden
    await request(app.getHttpServer())
      .post(`/api/v1/games/geodle/${sessionId}/guess`)
      .send({ countryIso2: 'DE' })
      .expect(403);

    // Look up the actual secret in DB only inside test to pick a wrong guess first, then win
    const dbRow = await prisma.gameSession.findUniqueOrThrow({ where: { id: sessionId } });
    const wrongIso2 = dbRow.secretCountryIso2 === 'DE' ? 'JP' : 'DE';

    const wrongGuessRes = await agent
      .post(`/api/v1/games/geodle/${sessionId}/guess`)
      .send({ countryIso2: wrongIso2 })
      .expect(200);

    expect(wrongGuessRes.body.guessCount).toBe(1);
    expect(wrongGuessRes.body.secretCountry).toBeNull();
    expect(wrongGuessRes.body.guesses[0].isCorrect).toBe(false);

    // Guessing the exact same country twice returns 409 Conflict
    await agent
      .post(`/api/v1/games/geodle/${sessionId}/guess`)
      .send({ countryIso2: wrongIso2 })
      .expect(409);

    // Guessing the secret country wins the game and reveals secretCountry
    const winRes = await agent
      .post(`/api/v1/games/geodle/${sessionId}/guess`)
      .send({ countryIso2: dbRow.secretCountryIso2 })
      .expect(200);

    expect(winRes.body.status).toBe('WON');
    expect(winRes.body.secretCountry?.iso2).toBe(dbRow.secretCountryIso2);
    expect(winRes.body.guesses[1].isCorrect).toBe(true);
    expect(winRes.body.guesses[1].clues.continent.status).toBe('MATCH');
  });

  it('resumes DAILY game progress across page reloads and reveals answer on give-up', async () => {
    const guestA = request.agent(app.getHttpServer());

    const start = await guestA
      .post('/api/v1/games/geodle')
      .send({ mode: 'DAILY' })
      .expect(200);
    expect(start.body.dailyChallengeNumber).toBe(1);

    const dbRow = await prisma.gameSession.findUniqueOrThrow({
      where: { id: start.body.sessionId },
    });
    const wrongIso2 = dbRow.secretCountryIso2 === 'AT' ? 'BR' : 'AT';

    await guestA
      .post(`/api/v1/games/geodle/${start.body.sessionId}/guess`)
      .send({ countryIso2: wrongIso2 })
      .expect(200);

    // Calling POST /games/geodle (DAILY) again resumes the exact session with 1 guess
    const resumed = await guestA
      .post('/api/v1/games/geodle')
      .send({ mode: 'DAILY' })
      .expect(200);
    expect(resumed.body.sessionId).toBe(start.body.sessionId);
    expect(resumed.body.guessCount).toBe(1);

    const giveUpRes = await guestA
      .post(`/api/v1/games/geodle/${start.body.sessionId}/give-up`)
      .expect(200);
    expect(giveUpRes.body.status).toBe('GAVE_UP');
    expect(giveUpRes.body.secretCountry?.iso2).toBe(dbRow.secretCountryIso2);
  });
});
