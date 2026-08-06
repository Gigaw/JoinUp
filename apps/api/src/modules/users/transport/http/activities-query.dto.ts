import { Transform } from 'class-transformer';
import { IsIn, IsInt, IsOptional, Max, Min } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import type { ActivitiesTab } from '../../application/users.repository';

export class ActivitiesQueryDto {
  @ApiPropertyOptional({
    enum: ['upcoming', 'applications', 'created', 'past', 'cancelled'],
    default: 'upcoming',
  })
  @IsOptional()
  @IsIn(['upcoming', 'applications', 'created', 'past', 'cancelled'])
  tab: ActivitiesTab = 'upcoming';

  @ApiPropertyOptional({ type: Number, default: 20, minimum: 1, maximum: 50 })
  @IsOptional()
  @Transform(({ value }: { value: unknown }) => Number(value))
  @IsInt()
  @Min(1)
  @Max(50)
  limit: number = 20;
}
