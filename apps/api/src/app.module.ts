import { Module } from '@nestjs/common';
import { AuthModule } from './modules/auth/auth.module';
import { CategoriesModule } from './modules/categories/categories.module';
import { ChatsModule } from './modules/chats/chats.module';
import { CitiesModule } from './modules/cities/cities.module';
import { EventsModule } from './modules/events/events.module';
import { HealthModule } from './modules/health/health.module';
import { UsersModule } from './modules/users/users.module';
import { DatabaseModule } from './platform/database/database.module';

@Module({
  imports: [
    DatabaseModule,
    AuthModule,
    UsersModule,
    CitiesModule,
    CategoriesModule,
    ChatsModule,
    EventsModule,
    HealthModule,
  ],
})
export class AppModule {}
