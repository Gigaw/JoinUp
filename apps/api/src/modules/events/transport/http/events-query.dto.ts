import { Transform } from 'class-transformer';
import {
  ArrayUnique,
  IsArray,
  IsInt,
  IsString,
  MaxLength,
  IsOptional,
  IsUUID,
  Max,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { normalizeEventSearchQuery } from '../../application/event-list.port';

export function parseCsv(value: unknown): string[] | undefined {
  if (value === undefined) return undefined;
  const values: unknown[] = Array.isArray(value) ? value : [value];
  const entries = values.flatMap((entry) =>
    typeof entry === 'string' ? entry.split(',') : [entry],
  );
  const normalized = entries
    .filter((entry): entry is string => typeof entry === 'string')
    .map((entry) => entry.trim())
    .filter(Boolean);
  return normalized.length > 0 ? normalized : undefined;
}

export function normalizeSearchQuery(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  return normalizeEventSearchQuery(value);
}

export class EventsQueryDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  cityId!: string;

  @ApiPropertyOptional({
    description:
      'Comma-separated category UUIDs. Matches any selected category.',
    type: String,
  })
  @IsOptional()
  @Transform(({ value }: { value: unknown }) => parseCsv(value))
  @IsArray()
  @ArrayUnique()
  @IsUUID('4', { each: true })
  categoryIds?: string[];

  @ApiPropertyOptional({
    description:
      'Full-text search across title, description, meeting place and category.',
    maxLength: 100,
    type: String,
  })
  @IsOptional()
  @Transform(({ value }: { value: unknown }) => normalizeSearchQuery(value))
  @IsString()
  @MaxLength(100)
  q?: string;

  @ApiPropertyOptional({
    description: 'Opaque cursor for the next filtered page.',
    type: String,
  })
  @IsOptional()
  @IsString()
  cursor?: string;

  @ApiPropertyOptional({ type: Number, default: 20, minimum: 1, maximum: 50 })
  @IsOptional()
  @Transform(({ value }: { value: unknown }) => Number(value))
  @IsInt()
  @Min(1)
  @Max(50)
  limit: number = 20;
}
