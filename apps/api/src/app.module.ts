import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { APP_PIPE } from '@nestjs/core';
import { ZodValidationPipe } from 'nestjs-zod';
import { GuestCookieMiddleware } from './common/guest-cookie.middleware';
import { CountriesModule } from './modules/countries/countries.module';
import { HealthModule } from './modules/health/health.module';
import { TrueSizeModule } from './modules/truesize/truesize.module';
import { PrismaModule } from './prisma/prisma.module';

@Module({
  imports: [PrismaModule, HealthModule, CountriesModule, TrueSizeModule],
  providers: [
    {
      provide: APP_PIPE,
      useClass: ZodValidationPipe,
    },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(GuestCookieMiddleware).forRoutes('*');
  }
}
