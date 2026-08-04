import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { CitiesController } from './cities.controller';

@Module({ imports: [AuthModule], controllers: [CitiesController] })
export class CitiesModule {}
