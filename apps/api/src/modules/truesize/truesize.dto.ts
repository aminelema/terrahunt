import {
  CreateTrueSizeGameRequestSchema,
  SubmitTrueSizeGuessRequestSchema,
} from '@terrahunt/shared';
import { createZodDto } from 'nestjs-zod';

export class CreateTrueSizeGameDto extends createZodDto(CreateTrueSizeGameRequestSchema) {}

export class SubmitTrueSizeGuessDto extends createZodDto(SubmitTrueSizeGuessRequestSchema) {}
