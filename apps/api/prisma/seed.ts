import fs from 'node:fs';
import path from 'node:path';
import { PrismaClient } from '@prisma/client';
import {
  normalizeSearchText,
  type GeodataCountryRecord,
  type GeodataDistanceRecord,
  type GeodataNeighborEdge,
} from '@terrahunt/shared';

const DATA_DIR = path.resolve(__dirname, '..', '..', '..', 'data');

export async function seedGeodata(prisma: PrismaClient): Promise<void> {
  const startedAt = Date.now();

  const countries = JSON.parse(
    fs.readFileSync(path.join(DATA_DIR, 'countries.json'), 'utf8'),
  ) as GeodataCountryRecord[];
  const neighbors = JSON.parse(
    fs.readFileSync(path.join(DATA_DIR, 'country-neighbors.json'), 'utf8'),
  ) as GeodataNeighborEdge[];
  const distances = JSON.parse(
    fs.readFileSync(path.join(DATA_DIR, 'country-distances.json'), 'utf8'),
  ) as GeodataDistanceRecord[];

  await prisma.$transaction(async (tx) => {
    for (const c of countries) {
      await tx.country.upsert({
        where: { iso2: c.iso2 },
        create: {
          iso2: c.iso2,
          iso3: c.iso3,
          isoNumeric: c.isoNumeric,
          nameEn: c.nameEn,
          capital: c.capital,
          region: c.region,
          areaKm2: c.areaKm2,
          population: BigInt(c.population),
          flagEmoji: c.flagEmoji,
          isPlayable: c.isPlayable,
          isMicrostate: c.isMicrostate,
          hasPolygon: c.hasPolygon,
          labelLat: c.labelLat,
          labelLng: c.labelLng,
        },
        update: {
          iso3: c.iso3,
          isoNumeric: c.isoNumeric,
          nameEn: c.nameEn,
          capital: c.capital,
          region: c.region,
          areaKm2: c.areaKm2,
          population: BigInt(c.population),
          flagEmoji: c.flagEmoji,
          isPlayable: c.isPlayable,
          isMicrostate: c.isMicrostate,
          hasPolygon: c.hasPolygon,
          labelLat: c.labelLat,
          labelLng: c.labelLng,
        },
      });
    }

    await tx.countryAlias.deleteMany();
    const aliasRows = countries.flatMap((c) =>
      c.aliases.map((alias) => ({
        countryIso2: c.iso2,
        alias,
        aliasNormalized: normalizeSearchText(alias),
      })),
    );
    if (aliasRows.length > 0) {
      await tx.countryAlias.createMany({ data: aliasRows });
    }

    await tx.countryNeighbor.deleteMany();
    await tx.countryNeighbor.createMany({
      data: neighbors.map((n) => ({
        countryIso2: n.countryIso2,
        neighborIso2: n.neighborIso2,
        connectionType: n.connectionType,
      })),
    });

    await tx.countryDistance.deleteMany();
    const chunkSize = 5000;
    for (let i = 0; i < distances.length; i += chunkSize) {
      const slice = distances.slice(i, i + chunkSize);
      await tx.countryDistance.createMany({
        data: slice.map((d) => ({
          fromIso2: d.fromIso2,
          toIso2: d.toIso2,
          distanceKm: d.distanceKm,
          bearingDeg: d.bearingDeg,
          direction: d.direction,
          isNeighbor: d.isNeighbor,
        })),
      });
    }
  }, { timeout: 30000 });

  console.log(
    `[prisma:seed] Seeded ${countries.length} countries, ${neighbors.length} neighbor edges, and ${distances.length} distance rows in ${Date.now() - startedAt}ms.`,
  );
}

if (require.main === module) {
  const prisma = new PrismaClient();
  seedGeodata(prisma)
    .then(async () => {
      await prisma.$disconnect();
    })
    .catch(async (err) => {
      console.error('[prisma:seed] Failed:', err);
      await prisma.$disconnect();
      process.exit(1);
    });
}
