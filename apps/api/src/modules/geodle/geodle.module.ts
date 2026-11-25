import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Inject,
  Module,
  Param,
  ParseUUIDPipe,
  Post,
  Req,
} from '@nestjs/common';
import {
  ApiBody,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import type { GeodleSession } from '@terrahunt/shared';
import type { Request } from 'express';
import { StartGeodleGameDto, SubmitGeodleGuessDto } from './geodle.dto';
import { GeodleService } from './geodle.service';

@ApiTags('Geodle Game')
@Controller('games/geodle')
export class GeodleController {
  constructor(@Inject(GeodleService) private readonly geodleService: GeodleService) {}

  @Post()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Start a Free Play Geodle game or resume today’s Daily challenge' })
  @ApiBody({ type: StartGeodleGameDto })
  @ApiOkResponse({ description: 'Geodle game session' })
  async startGame(
    @Body() dto: StartGeodleGameDto,
    @Req() req: Request,
  ): Promise<GeodleSession> {
    return this.geodleService.startOrResumeSession(dto.mode ?? 'DAILY', req.guestId);
  }

  @Post(':id/guess')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Submit a country guess and receive 6 attribute comparison clues' })
  @ApiParam({ name: 'id', format: 'uuid', description: 'Geodle game session UUID' })
  @ApiBody({ type: SubmitGeodleGuessDto })
  @ApiOkResponse({ description: 'Updated Geodle session with evaluated guess' })
  async submitGuess(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: SubmitGeodleGuessDto,
    @Req() req: Request,
  ): Promise<GeodleSession> {
    return this.geodleService.submitGuess(id, dto.countryIso2, req.guestId);
  }

  @Post(':id/give-up')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Give up the current game and reveal the secret country' })
  @ApiParam({ name: 'id', format: 'uuid', description: 'Geodle game session UUID' })
  @ApiOkResponse({ description: 'Ended Geodle session with secretCountry revealed' })
  async giveUp(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Req() req: Request,
  ): Promise<GeodleSession> {
    return this.geodleService.giveUp(id, req.guestId);
  }
}

@Module({
  controllers: [GeodleController],
  providers: [GeodleService],
})
export class GeodleModule {}
