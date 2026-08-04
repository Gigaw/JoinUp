import { Inject, Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../platform/database/prisma.service';
import type {
  CitiesRepository,
  CityRecord,
} from '../../application/cities.repository';

@Injectable()
export class PrismaCitiesRepository implements CitiesRepository {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  listSupported(): Promise<CityRecord[]> {
    return this.prisma.city.findMany({
      where: { isSupported: true },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      select: { id: true, slug: true, name: true, timeZone: true },
    });
  }
}
