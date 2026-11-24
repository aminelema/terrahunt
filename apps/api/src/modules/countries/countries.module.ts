import crypto from 'node:crypto';
import { Controller, Get, Header, Inject, Injectable, Module, Req, Res } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { CountriesCatalogResponse } from '@terrahunt/shared';
import type { Request, Response } from 'express';
import { PrismaService } from '../../prisma/prisma.module';

@Injectable()
export class CountriesService {
  private cachedPayload: CountriesCatalogResponse | null = null;
  private cachedEtag: string | null = null;

  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async getCatalog(): Promise<{ payload: CountriesCatalogResponse; etag: string }> {
    if (this.cachedPayload && this.cachedEtag) {
      return { payload: this.cachedPayload, etag: this.cachedEtag };
    }

    const rows = await this.prisma.country.findMany({
      where: { isPlayable: true },
      orderBy: { nameEn: 'asc' },
      include: {
        aliases: {
          select: { alias: true },
          orderBy: { id: 'asc' },
        },
      },
    });

    const payload: CountriesCatalogResponse = {
      countries: rows.map((c) => ({
        iso2: c.iso2,
        iso3: c.iso3,
        nameEn: c.nameEn,
        capital: c.capital,
        region: c.region,
        flagEmoji: c.flagEmoji,
        isMicrostate: c.isMicrostate,
        labelLat: c.labelLat,
        labelLng: c.labelLng,
        aliases: c.aliases.map((a) => a.alias),
      })),
    };

    const hash = crypto
      .createHash('sha1')
      .update(JSON.stringify(payload))
      .digest('hex')
      .slice(0, 16);
    const etag = `"countries-${hash}"`;

    this.cachedPayload = payload;
    this.cachedEtag = etag;
    return { payload, etag };
  }
}

@ApiTags('Countries')
@Controller('countries')
export class CountriesController {
  constructor(@Inject(CountriesService) private readonly countriesService: CountriesService) {}

  @Get()
  @Header('Cache-Control', 'public, max-age=3600')
  @ApiOperation({
    summary: 'Return playable countries catalog (omits areaKm2 for TrueSize anti-cheat)',
  })
  @ApiOkResponse({ description: 'Playable countries list' })
  async listCountries(@Req() req: Request, @Res() res: Response): Promise<void> {
    const { payload, etag } = await this.countriesService.getCatalog();
    res.setHeader('ETag', etag);
    if (req.headers['if-none-match'] === etag) {
      res.status(304).end();
      return;
    }
    res.status(200).json(payload);
  }
}

@Module({
  controllers: [CountriesController],
  providers: [CountriesService],
  exports: [CountriesService],
})
export class CountriesModule {}
