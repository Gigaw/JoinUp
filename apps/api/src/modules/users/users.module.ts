import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { USERS_REPOSITORY } from './application/users.repository';
import { UsersService } from './application/users.service';
import { PrismaUsersRepository } from './persistence/prisma/prisma-users.repository';
import {
  PublicUsersController,
  UsersController,
} from './transport/http/users.controller';

@Module({
  imports: [AuthModule],
  controllers: [UsersController, PublicUsersController],
  providers: [
    UsersService,
    { provide: USERS_REPOSITORY, useClass: PrismaUsersRepository },
  ],
})
export class UsersModule {}
