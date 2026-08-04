import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { EventsService } from './application/events.service';
import { EventsController } from './transport/http/events.controller';

@Module({
  imports: [AuthModule],
  controllers: [EventsController],
  providers: [EventsService],
})
export class EventsModule {}
