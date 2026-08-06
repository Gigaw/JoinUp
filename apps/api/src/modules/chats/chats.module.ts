import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { ChatsService } from './application/chats.service';
import { ChatsController } from './transport/http/chats.controller';

@Module({
  imports: [AuthModule],
  controllers: [ChatsController],
  providers: [ChatsService],
})
export class ChatsModule {}
