import { Inject, Injectable } from '@nestjs/common';
import type { CityDto } from '../../../platform/http/api.dto';
import { CITIES_REPOSITORY, type CitiesRepository } from './cities.repository';

@Injectable()
export class CitiesService {
  constructor(
    @Inject(CITIES_REPOSITORY) private readonly repository: CitiesRepository,
  ) {}

  list(): Promise<CityDto[]> {
    return this.repository.listSupported();
  }
}
