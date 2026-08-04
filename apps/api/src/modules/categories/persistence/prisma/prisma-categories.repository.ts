import { Inject, Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../platform/database/prisma.service';
import type {
  CategoriesRepository,
  CategoryRecord,
} from '../../application/categories.repository';

@Injectable()
export class PrismaCategoriesRepository implements CategoriesRepository {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  listActive(): Promise<CategoryRecord[]> {
    return this.prisma.category.findMany({
      where: { isActive: true },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      select: { id: true, slug: true, name: true },
    });
  }
}
