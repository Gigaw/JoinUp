import { Module } from '@nestjs/common';
import { CITIES_REPOSITORY } from './application/cities.repository';
import { CitiesService } from './application/cities.service';
import { CitiesController } from './cities.controller';
import { PrismaCitiesRepository } from './persistence/prisma/prisma-cities.repository';

@Module({
  controllers: [CitiesController],
  providers: [
    CitiesService,
    { provide: CITIES_REPOSITORY, useClass: PrismaCitiesRepository },
  ],
})
export class CitiesModule {}
