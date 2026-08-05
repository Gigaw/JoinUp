import { IsIn, IsOptional } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class ApplicationsQueryDto {
  @ApiPropertyOptional({
    enum: ['pending', 'going', 'rejected', 'withdrawn', 'cancelled'],
  })
  @IsOptional()
  @IsIn(['pending', 'going', 'rejected', 'withdrawn', 'cancelled'])
  status?: 'pending' | 'going' | 'rejected' | 'withdrawn' | 'cancelled';
}
