import { Inject, Injectable } from '@nestjs/common';
import type { CategoryDto } from '../../../platform/http/api.dto';
import {
  CATEGORIES_REPOSITORY,
  type CategoriesRepository,
} from './categories.repository';

@Injectable()
export class CategoriesService {
  constructor(
    @Inject(CATEGORIES_REPOSITORY)
    private readonly repository: CategoriesRepository,
  ) {}

  list(): Promise<CategoryDto[]> {
    return this.repository.listActive();
  }
}
