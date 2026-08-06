import {
  Body,
  Controller,
  Get,
  Inject,
  Patch,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { ActivitiesListDto, MeDto } from '../../../../platform/http/api.dto';
import {
  CurrentActor,
  type ActorContext,
} from '../../../auth/transport/http/current-actor';
import { SessionGuard } from '../../../auth/transport/http/session.guard';
import { UsersService } from '../../application/users.service';
import { PatchMeDto } from './profile.dto';
import { ActivitiesQueryDto } from './activities-query.dto';

@ApiTags('profile')
@ApiBearerAuth()
@UseGuards(SessionGuard)
@Controller('me')
export class UsersController {
  constructor(@Inject(UsersService) private readonly users: UsersService) {}

  @Get()
  @ApiOperation({ operationId: 'getMe' })
  @ApiOkResponse({ type: MeDto })
  getMe(@CurrentActor() actor: ActorContext): Promise<MeDto> {
    return this.users.getMe(actor.userId);
  }

  @Get('activities')
  @ApiOperation({ operationId: 'getMyActivities' })
  @ApiOkResponse({ type: ActivitiesListDto })
  getActivities(
    @CurrentActor() actor: ActorContext,
    @Query() query: ActivitiesQueryDto,
  ): Promise<ActivitiesListDto> {
    return this.users.getActivities(actor.userId, query.tab, query.limit);
  }

  @Patch()
  @ApiOperation({ operationId: 'updateMe' })
  @ApiOkResponse({ type: MeDto })
  updateMe(
    @CurrentActor() actor: ActorContext,
    @Body() input: PatchMeDto,
  ): Promise<MeDto> {
    return this.users.updateMe(actor.userId, input);
  }
}
