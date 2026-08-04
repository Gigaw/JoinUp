import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  ArrayMinSize,
  ArrayUnique,
  IsArray,
  IsBoolean,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  MaxLength,
} from 'class-validator';

export class PatchMeDto {
  @ApiPropertyOptional({ minLength: 1, maxLength: 80 })
  @IsOptional()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @Length(1, 80)
  displayName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  showAge?: boolean;

  @ApiPropertyOptional({ nullable: true, maxLength: 500, type: String })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  bio?: string | null;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  cityId?: string;

  @ApiPropertyOptional({ type: [String], format: 'uuid', minItems: 1 })
  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @ArrayUnique()
  @IsUUID('4', { each: true })
  categoryIds?: string[];
}
