import fs from 'node:fs';
import path from 'node:path';
import { PrismaClient } from '../src/generated/prisma';
import { normalizeSearchText, type CountryRegion } from '@terrahunt/shared';

interface SeedCountry {
  iso2: string;
  nameEn: string;
  capital: string | null;
  region: CountryRegion;
  subregion: string;
  population: number;
  areaKm2: number;
  isLandlocked: boolean;
  avgTempC: number;
  flagEmoji: string;
  lat: number;
  lng: number;
  aliases: string[];
}

interface SeedNeighbor {
  countryIso2: string;
  neighborIso2: string;
}

const DATA_DIR = path.resolve(__dirname, '..', '..', '..', 'data');

export async function seedGeodata(prisma: PrismaClient): Promise<void> {
  const startedAt = Date.now();

  const countries = JSON.parse(
    fs.readFileSync(path.join(DATA_DIR, 'countries.json'), 'utf8'),
  ) as SeedCountry[];

  const neighbors = JSON.parse(
    fs.readFileSync(path.join(DATA_DIR, 'country-neighbors.json'), 'utf8'),
  ) as SeedNeighbor[];

  await prisma.$transaction(
    async (tx) => {
      for (const c of countries) {
        await tx.country.upsert({
          where: { iso2: c.iso2 },
          create: {
            iso2: c.iso2,
            nameEn: c.nameEn,
            capital: c.capital,
            region: c.region,
            subregion: c.subregion,
            population: c.population,
            areaKm2: c.areaKm2,
            isLandlocked: c.isLandlocked,
            avgTempC: c.avgTempC,
            flagEmoji: c.flagEmoji,
            lat: c.lat,
            lng: c.lng,
          },
          update: {
            nameEn: c.nameEn,
            capital: c.capital,
            region: c.region,
            subregion: c.subregion,
            population: c.population,
            areaKm2: c.areaKm2,
            isLandlocked: c.isLandlocked,
            avgTempC: c.avgTempC,
            flagEmoji: c.flagEmoji,
            lat: c.lat,
            lng: c.lng,
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
      await tx.countryNeighbor.createMany({ data: neighbors });
    },
    { timeout: 20_000 },
  );

  console.log(
    `[prisma:seed] Seeded ${countries.length} countries and ${neighbors.length} land borders in ${Date.now() - startedAt}ms.`,
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
