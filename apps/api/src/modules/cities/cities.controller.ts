import { Controller, Get, Inject } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CityDto } from '../../platform/http/api.dto';
import { CitiesService } from './application/cities.service';

@ApiTags('cities')
@Controller('cities')
export class CitiesController {
  constructor(@Inject(CitiesService) private readonly cities: CitiesService) {}

  @Get()
  @ApiOperation({ operationId: 'listCities' })
  @ApiOkResponse({ type: [CityDto] })
  list(): Promise<CityDto[]> {
    return this.cities.list();
  }
}
