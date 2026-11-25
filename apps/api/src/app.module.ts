import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { APP_PIPE } from '@nestjs/core';
import { ZodValidationPipe } from 'nestjs-zod';
import { GuestCookieMiddleware } from './common/guest-cookie.middleware';
import { CountriesModule } from './modules/countries/countries.module';
import { GeodleModule } from './modules/geodle/geodle.module';
import { PrismaModule } from './prisma/prisma.module';

@Module({
  imports: [PrismaModule, CountriesModule, GeodleModule],
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
