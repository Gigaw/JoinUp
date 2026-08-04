import { Module } from '@nestjs/common';
import { AuthService } from './application/auth.service';
import { AuthController } from './transport/http/auth.controller';
import { SessionGuard } from './transport/http/session.guard';

@Module({
  controllers: [AuthController],
  providers: [AuthService, SessionGuard],
  exports: [SessionGuard],
})
export class AuthModule {}
