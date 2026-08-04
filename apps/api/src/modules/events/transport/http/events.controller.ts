import {
  Controller,
  Get,
  HttpCode,
  Inject,
  Param,
  ParseUUIDPipe,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import {
  EventDetailsDto,
  EventListDto,
  JoinEventDto,
} from '../../../../platform/http/api.dto';
import { EventsService } from '../../application/events.service';
import {
  CurrentActor,
  type ActorContext,
} from '../../../auth/transport/http/current-actor';
import { SessionGuard } from '../../../auth/transport/http/session.guard';
import { EventsQueryDto } from './events-query.dto';

@ApiTags('events')
@ApiBearerAuth()
@UseGuards(SessionGuard)
@Controller('events')
export class EventsController {
  constructor(@Inject(EventsService) private readonly events: EventsService) {}

  @Get()
  @ApiOperation({ operationId: 'listEvents' })
  @ApiOkResponse({ type: EventListDto })
  list(@Query() query: EventsQueryDto): Promise<EventListDto> {
    return this.events.list(query.cityId, query.limit);
  }

  @Get(':eventId')
  @ApiOperation({ operationId: 'getEvent' })
  @ApiParam({ name: 'eventId', format: 'uuid' })
  @ApiOkResponse({ type: EventDetailsDto })
  get(
    @Param('eventId', new ParseUUIDPipe()) eventId: string,
    @CurrentActor() actor: ActorContext,
  ): Promise<EventDetailsDto> {
    return this.events.get(eventId, actor.userId);
  }

  @Put(':eventId/participation')
  @HttpCode(200)
  @ApiOperation({ operationId: 'joinEvent' })
  @ApiParam({ name: 'eventId', format: 'uuid' })
  @ApiOkResponse({ type: JoinEventDto })
  join(
    @Param('eventId', new ParseUUIDPipe()) eventId: string,
    @CurrentActor() actor: ActorContext,
  ): Promise<JoinEventDto> {
    return this.events.join(eventId, actor.userId);
  }
}
