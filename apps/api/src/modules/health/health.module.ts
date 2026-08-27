import { Controller, Get, Inject, Module } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  ensureMediaRoot,
  readMediaConfig,
} from '../../platform/config/app-config';
import { PrismaService } from '../../platform/database/prisma.service';

@ApiTags('health')
@Controller('health')
class HealthController {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  @Get('live')
  @ApiOperation({ operationId: 'getLiveness' })
  liveness(): { status: string } {
    return { status: 'ok' };
  }

  @Get('ready')
  @ApiOperation({ operationId: 'getReadiness' })
  async readiness(): Promise<{ status: string }> {
    await Promise.all([
      this.prisma.$queryRaw`SELECT 1`,
      ensureMediaRoot(readMediaConfig().mediaRoot),
    ]);
    return { status: 'ok' };
  }
}

@Module({ controllers: [HealthController] })
export class HealthModule {}
