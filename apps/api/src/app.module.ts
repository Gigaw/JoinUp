import { Module } from '@nestjs/common';
import { AuthModule } from './modules/auth/auth.module';
import { CitiesModule } from './modules/cities/cities.module';
import { EventsModule } from './modules/events/events.module';
import { HealthModule } from './modules/health/health.module';
import { DatabaseModule } from './platform/database/database.module';

@Module({
  imports: [
    DatabaseModule,
    AuthModule,
    CitiesModule,
    EventsModule,
    HealthModule,
  ],
})
export class AppModule {}
