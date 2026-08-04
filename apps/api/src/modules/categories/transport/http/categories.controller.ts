import { Controller, Get, Inject } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CategoryDto } from '../../../../platform/http/api.dto';
import { CategoriesService } from '../../application/categories.service';

@ApiTags('categories')
@Controller('categories')
export class CategoriesController {
  constructor(
    @Inject(CategoriesService) private readonly categories: CategoriesService,
  ) {}

  @Get()
  @ApiOperation({ operationId: 'listCategories' })
  @ApiOkResponse({ type: [CategoryDto] })
  list(): Promise<CategoryDto[]> {
    return this.categories.list();
  }
}
