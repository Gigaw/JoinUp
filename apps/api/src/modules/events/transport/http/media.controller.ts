import { Controller, Get, Inject, Param, Res, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiProduces,
  ApiTags,
} from '@nestjs/swagger';
import type { FastifyReply } from 'fastify';
import { EventsService } from '../../application/events.service';
import {
  CurrentActor,
  type ActorContext,
} from '../../../auth/transport/http/current-actor';
import { SessionGuard } from '../../../auth/transport/http/session.guard';

@ApiTags('media')
@ApiBearerAuth()
@UseGuards(SessionGuard)
@Controller('media')
export class MediaController {
  constructor(@Inject(EventsService) private readonly events: EventsService) {}

  @Get(':mediaKey')
  @ApiOperation({ operationId: 'getMedia' })
  @ApiParam({ name: 'mediaKey' })
  @ApiProduces('image/webp')
  @ApiOkResponse({
    description: 'Нормализованное изображение WebP.',
    schema: { type: 'string', format: 'binary' },
  })
  async get(
    @Param('mediaKey') mediaKey: string,
    @CurrentActor() actor: ActorContext,
    @Res() reply: FastifyReply,
  ): Promise<void> {
    const image = await this.events.readImage(mediaKey, actor.userId);
    await reply
      .header('Cache-Control', 'private, max-age=3600')
      .type(image.contentType)
      .send(image.data);
  }
}
