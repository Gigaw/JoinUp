import { Controller, Get, Inject, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { CityDto } from '../../platform/http/api.dto';
import { SessionGuard } from '../auth/transport/http/session.guard';
import { PrismaService } from '../../platform/database/prisma.service';

@ApiTags('cities')
@ApiBearerAuth()
@UseGuards(SessionGuard)
@Controller('cities')
export class CitiesController {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  @Get()
  @ApiOperation({ operationId: 'listCities' })
  @ApiOkResponse({ type: [CityDto] })
  async list(): Promise<CityDto[]> {
    return this.prisma.city.findMany({
      where: { isSupported: true },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      select: { id: true, name: true, timeZone: true },
    });
  }
}
