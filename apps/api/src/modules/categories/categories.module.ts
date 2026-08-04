import { Module } from '@nestjs/common';
import { CATEGORIES_REPOSITORY } from './application/categories.repository';
import { CategoriesService } from './application/categories.service';
import { PrismaCategoriesRepository } from './persistence/prisma/prisma-categories.repository';
import { CategoriesController } from './transport/http/categories.controller';

@Module({
  controllers: [CategoriesController],
  providers: [
    CategoriesService,
    { provide: CATEGORIES_REPOSITORY, useClass: PrismaCategoriesRepository },
  ],
})
export class CategoriesModule {}
