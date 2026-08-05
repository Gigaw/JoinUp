import { Transform } from 'class-transformer';
import {
  IsIn,
  IsInt,
  IsISO8601,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateIf,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

const trim = ({ value }: { value: unknown }): unknown =>
  typeof value === 'string' ? value.trim() : value;

export class CreateEventDto {
  @ApiProperty({ minLength: 3, maxLength: 80 })
  @Transform(trim)
  @IsString()
  @MinLength(3)
  @MaxLength(80)
  title!: string;

  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  categoryId!: string;

  @ApiProperty({ minLength: 10, maxLength: 2000 })
  @Transform(trim)
  @IsString()
  @MinLength(10)
  @MaxLength(2000)
  description!: string;

  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  cityId!: string;

  @ApiProperty({ minLength: 3, maxLength: 300 })
  @Transform(trim)
  @IsString()
  @MinLength(3)
  @MaxLength(300)
  meetingPlace!: string;

  @ApiProperty({ format: 'date-time' })
  @IsISO8601({ strict: true })
  startsAt!: string;

  @ApiPropertyOptional({ format: 'date-time', nullable: true, type: String })
  @IsOptional()
  @ValidateIf(({ endsAt }: CreateEventDto) => endsAt !== null)
  @IsISO8601({ strict: true })
  endsAt?: string | null;

  @ApiProperty({ minimum: 2, maximum: 10000 })
  @IsInt()
  @Min(2)
  @Max(10000)
  capacity!: number;

  @ApiProperty({ enum: ['automatic', 'approval_required'] })
  @IsIn(['automatic', 'approval_required'])
  participationMode!: 'automatic' | 'approval_required';
}

export class UpdateEventDto {
  @ApiProperty({ minimum: 1 })
  @IsInt()
  @Min(1)
  expectedVersion!: number;

  @ApiPropertyOptional({ minLength: 3, maxLength: 80 })
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MinLength(3)
  @MaxLength(80)
  title?: string;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  categoryId?: string;

  @ApiPropertyOptional({ minLength: 10, maxLength: 2000 })
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MinLength(10)
  @MaxLength(2000)
  description?: string;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  cityId?: string;

  @ApiPropertyOptional({ minLength: 3, maxLength: 300 })
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MinLength(3)
  @MaxLength(300)
  meetingPlace?: string;

  @ApiPropertyOptional({ format: 'date-time' })
  @IsOptional()
  @IsISO8601({ strict: true })
  startsAt?: string;

  @ApiPropertyOptional({ format: 'date-time', nullable: true, type: String })
  @IsOptional()
  @ValidateIf(({ endsAt }: UpdateEventDto) => endsAt !== null)
  @IsISO8601({ strict: true })
  endsAt?: string | null;

  @ApiPropertyOptional({ minimum: 2, maximum: 10000 })
  @IsOptional()
  @IsInt()
  @Min(2)
  @Max(10000)
  capacity?: number;

  @ApiPropertyOptional({ enum: ['automatic', 'approval_required'] })
  @IsOptional()
  @IsIn(['automatic', 'approval_required'])
  participationMode?: 'automatic' | 'approval_required';
}

export function hasEventChanges(input: UpdateEventDto): boolean {
  return Object.keys(input).some((key) => key !== 'expectedVersion');
}
