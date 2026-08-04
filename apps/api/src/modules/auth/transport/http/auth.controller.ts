import {
  Body,
  Controller,
  HttpCode,
  Inject,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { SessionEnvelopeDto } from '../../../../platform/http/api.dto';
import { AuthService } from '../../application/auth.service';
import { LoginDto, RegisterDto } from './auth.dto';
import { CurrentActor, type ActorContext } from './current-actor';
import { SessionGuard } from './session.guard';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(@Inject(AuthService) private readonly auth: AuthService) {}

  @Post('register')
  @ApiOperation({ operationId: 'register' })
  @ApiCreatedResponse({ type: SessionEnvelopeDto })
  register(@Body() input: RegisterDto): Promise<SessionEnvelopeDto> {
    return this.auth.register(input);
  }

  @Post('login')
  @HttpCode(200)
  @ApiOperation({ operationId: 'login' })
  @ApiOkResponse({ type: SessionEnvelopeDto })
  login(@Body() input: LoginDto): Promise<SessionEnvelopeDto> {
    return this.auth.login(input);
  }

  @Post('logout')
  @HttpCode(204)
  @UseGuards(SessionGuard)
  @ApiBearerAuth()
  @ApiOperation({ operationId: 'logout' })
  @ApiNoContentResponse()
  logout(@CurrentActor() actor: ActorContext): Promise<void> {
    return this.auth.logout(actor.sessionId);
  }
}
