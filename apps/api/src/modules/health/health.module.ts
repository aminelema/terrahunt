import { Controller, Get, Inject, Module } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { HealthResponse } from '@terrahunt/shared';
import { PrismaService } from '../../prisma/prisma.module';

@ApiTags('Health')
@Controller('health')
export class HealthController {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  @Get()
  @ApiOperation({ summary: 'Check API and PostgreSQL database readiness' })
  @ApiOkResponse({ description: 'Service is healthy' })
  async getHealth(): Promise<HealthResponse> {
    const countriesCount = await this.prisma.country.count();
    return {
      status: 'ok',
      database: 'up',
      countriesCount,
      timestamp: new Date().toISOString(),
    };
  }
}

@Module({
  controllers: [HealthController],
})
export class HealthModule {}
