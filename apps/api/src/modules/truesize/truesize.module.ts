import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Inject,
  Module,
  Param,
  ParseUUIDPipe,
  Post,
  Req,
} from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { SubmitTrueSizeGuessResponse, TrueSizeSession } from '@terrahunt/shared';
import type { Request } from 'express';
import { CreateTrueSizeGameDto, SubmitTrueSizeGuessDto } from './truesize.dto';
import { TrueSizeService } from './truesize.service';

@ApiTags('TrueSize Game')
@Controller('games/truesize')
export class TrueSizeController {
  constructor(@Inject(TrueSizeService) private readonly trueSizeService: TrueSizeService) {}

  @Post()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Create a new 5-round TrueSize game or resume today’s Daily session',
  })
  @ApiOkResponse({ description: 'TrueSize session state' })
  async createSession(
    @Body() dto: CreateTrueSizeGameDto,
    @Req() req: Request,
  ): Promise<TrueSizeSession> {
    return this.trueSizeService.createOrResumeSession(dto.mode ?? 'FREEPLAY', {
      userId: req.userId,
      guestId: req.guestId,
    });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get TrueSize game session state for current owner' })
  @ApiOkResponse({ description: 'TrueSize session state' })
  async getSession(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Req() req: Request,
  ): Promise<TrueSizeSession> {
    return this.trueSizeService.getSession(id, {
      userId: req.userId,
      guestId: req.guestId,
    });
  }

  @Post(':id/guess')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Submit slider size ratio guess for the active round and reveal true area',
  })
  @ApiOkResponse({ description: 'Round reveal and updated session state' })
  async submitGuess(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: SubmitTrueSizeGuessDto,
    @Req() req: Request,
  ): Promise<SubmitTrueSizeGuessResponse> {
    return this.trueSizeService.submitGuess(id, dto.roundNumber, dto.guessedRatio, {
      userId: req.userId,
      guestId: req.guestId,
    });
  }
}

@Module({
  controllers: [TrueSizeController],
  providers: [TrueSizeService],
  exports: [TrueSizeService],
})
export class TrueSizeModule {}
