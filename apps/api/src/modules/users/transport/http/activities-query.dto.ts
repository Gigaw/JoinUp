import { Transform } from 'class-transformer';
import { IsIn, IsInt, IsOptional, Max, Min } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import type { ActivitiesScope } from '../../application/users.repository';

export class ActivitiesQueryDto {
  @ApiPropertyOptional({
    enum: ['plans', 'organizing', 'archive', 'organizing_archive'],
    default: 'plans',
  })
  @IsOptional()
  @IsIn(['plans', 'organizing', 'archive', 'organizing_archive'])
  scope: ActivitiesScope = 'plans';

  @ApiPropertyOptional({ type: Number, default: 20, minimum: 1, maximum: 50 })
  @IsOptional()
  @Transform(({ value }: { value: unknown }) => Number(value))
  @IsInt()
  @Min(1)
  @Max(50)
  limit: number = 20;
}
