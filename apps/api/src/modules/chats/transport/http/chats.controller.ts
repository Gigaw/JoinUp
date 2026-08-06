import {
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  Inject,
  Param,
  ParseUUIDPipe,
  Post,
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
  ChatListDto,
  EventMessageDto,
  EventMessageListDto,
} from '../../../../platform/http/api.dto';
import {
  CurrentActor,
  type ActorContext,
} from '../../../auth/transport/http/current-actor';
import { SessionGuard } from '../../../auth/transport/http/session.guard';
import { ChatsService } from '../../application/chats.service';
import { CreateEventMessageDto, MessagesQueryDto } from './chat.dto';

@ApiTags('chats')
@ApiBearerAuth()
@UseGuards(SessionGuard)
@Controller()
export class ChatsController {
  constructor(@Inject(ChatsService) private readonly chats: ChatsService) {}

  @Get('me/chats')
  @ApiOperation({ operationId: 'listMyChats' })
  @ApiOkResponse({ type: ChatListDto })
  list(
    @CurrentActor() actor: ActorContext,
    @Query() query: MessagesQueryDto,
  ): Promise<ChatListDto> {
    return this.chats.list(actor.userId, query.cursor, query.limit);
  }

  @Get('events/:eventId/messages')
  @ApiOperation({ operationId: 'listEventMessages' })
  @ApiParam({ name: 'eventId', format: 'uuid' })
  @ApiOkResponse({ type: EventMessageListDto })
  messages(
    @Param('eventId', new ParseUUIDPipe()) eventId: string,
    @CurrentActor() actor: ActorContext,
    @Query() query: MessagesQueryDto,
  ): Promise<EventMessageListDto> {
    return this.chats.messages(
      eventId,
      actor.userId,
      query.cursor,
      query.limit,
    );
  }

  @Post('events/:eventId/messages')
  @HttpCode(201)
  @ApiOperation({ operationId: 'createEventMessage' })
  @ApiParam({ name: 'eventId', format: 'uuid' })
  @ApiHeader({ name: 'Idempotency-Key', required: true })
  @ApiCreatedResponse({ type: EventMessageDto })
  create(
    @Param('eventId', new ParseUUIDPipe()) eventId: string,
    @Body() input: CreateEventMessageDto,
    @Headers('idempotency-key') idempotencyKey: string | undefined,
    @CurrentActor() actor: ActorContext,
  ): Promise<EventMessageDto> {
    return this.chats.create(eventId, actor.userId, idempotencyKey, input);
  }
}
