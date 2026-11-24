import {
  StartGeodleGameRequestSchema,
  SubmitGeodleGuessRequestSchema,
} from '@terrahunt/shared';
import { createZodDto } from 'nestjs-zod';

export class StartGeodleGameDto extends createZodDto(StartGeodleGameRequestSchema) {}

export class SubmitGeodleGuessDto extends createZodDto(SubmitGeodleGuessRequestSchema) {}
