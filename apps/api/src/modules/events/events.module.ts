import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { EventsService } from './application/events.service';
import { PrismaEventListRepository } from './persistence/prisma/prisma-event-list.repository';
import { EventsController } from './transport/http/events.controller';
import { EVENT_LIST_REPOSITORY } from './application/event-list.port';

@Module({
  imports: [AuthModule],
  controllers: [EventsController],
  providers: [
    EventsService,
    {
      provide: EVENT_LIST_REPOSITORY,
      useClass: PrismaEventListRepository,
    },
  ],
})
export class EventsModule {}
