import {
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  HttpCode,
  Inject,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiHeader,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import {
  EventApplicationListDto,
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
import { EventsQueryDto, parseCsv } from './events-query.dto';
import { ApplicationsQueryDto } from './applications-query.dto';
import {
  ApplicationDecisionDto,
  CreateEventDto,
  UpdateEventDto,
} from './event-mutation.dto';

@ApiTags('events')
@ApiBearerAuth()
@UseGuards(SessionGuard)
@Controller('events')
export class EventsController {
  constructor(@Inject(EventsService) private readonly events: EventsService) {}

  @Post()
  @ApiOperation({ operationId: 'createEvent' })
  @ApiHeader({ name: 'Idempotency-Key', required: true })
  @ApiCreatedResponse({ type: EventDetailsDto })
  create(
    @Body() input: CreateEventDto,
    @Headers('idempotency-key') idempotencyKey: string | undefined,
    @CurrentActor() actor: ActorContext,
  ): Promise<EventDetailsDto> {
    return this.events.create(actor.userId, idempotencyKey, input);
  }

  @Get()
  @ApiOperation({ operationId: 'listEvents' })
  @ApiOkResponse({ type: EventListDto })
  list(@Query() query: EventsQueryDto): Promise<EventListDto> {
    return this.events.list(
      query.cityId,
      query.limit,
      parseCsv(query.categoryIds) ?? [],
      query.q,
      query.cursor,
    );
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

  @Get(':eventId/applications')
  @ApiOperation({ operationId: 'listEventApplications' })
  @ApiParam({ name: 'eventId', format: 'uuid' })
  @ApiOkResponse({ type: EventApplicationListDto })
  applications(
    @Param('eventId', new ParseUUIDPipe()) eventId: string,
    @Query() query: ApplicationsQueryDto,
    @CurrentActor() actor: ActorContext,
  ): Promise<EventApplicationListDto> {
    return this.events.applications(eventId, actor.userId, query.status);
  }

  @Patch(':eventId')
  @ApiOperation({ operationId: 'updateEvent' })
  @ApiParam({ name: 'eventId', format: 'uuid' })
  @ApiHeader({ name: 'Idempotency-Key', required: true })
  @ApiOkResponse({ type: EventDetailsDto })
  update(
    @Param('eventId', new ParseUUIDPipe()) eventId: string,
    @Body() input: UpdateEventDto,
    @Headers('idempotency-key') idempotencyKey: string | undefined,
    @CurrentActor() actor: ActorContext,
  ): Promise<EventDetailsDto> {
    return this.events.update(eventId, actor.userId, idempotencyKey, input);
  }

  @Post(':eventId/cancel')
  @HttpCode(200)
  @ApiOperation({ operationId: 'cancelEvent' })
  @ApiParam({ name: 'eventId', format: 'uuid' })
  @ApiHeader({ name: 'Idempotency-Key', required: true })
  @ApiOkResponse({ type: EventDetailsDto })
  cancel(
    @Param('eventId', new ParseUUIDPipe()) eventId: string,
    @Headers('idempotency-key') idempotencyKey: string | undefined,
    @CurrentActor() actor: ActorContext,
  ): Promise<EventDetailsDto> {
    return this.events.cancel(eventId, actor.userId, idempotencyKey);
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

  @Delete(':eventId/participation')
  @HttpCode(200)
  @ApiOperation({ operationId: 'leaveEvent' })
  @ApiParam({ name: 'eventId', format: 'uuid' })
  @ApiOkResponse({ type: JoinEventDto })
  leave(
    @Param('eventId', new ParseUUIDPipe()) eventId: string,
    @CurrentActor() actor: ActorContext,
  ): Promise<JoinEventDto> {
    return this.events.leave(eventId, actor.userId);
  }

  @Put(':eventId/applications/:participationId/decision')
  @HttpCode(200)
  @ApiOperation({ operationId: 'decideEventApplication' })
  @ApiParam({ name: 'eventId', format: 'uuid' })
  @ApiParam({ name: 'participationId', format: 'uuid' })
  @ApiOkResponse({ type: JoinEventDto })
  decideApplication(
    @Param('eventId', new ParseUUIDPipe()) eventId: string,
    @Param('participationId', new ParseUUIDPipe()) participationId: string,
    @Body() input: ApplicationDecisionDto,
    @CurrentActor() actor: ActorContext,
  ): Promise<JoinEventDto> {
    return this.events.decideApplication(
      eventId,
      participationId,
      actor.userId,
      input.decision,
    );
  }
}
