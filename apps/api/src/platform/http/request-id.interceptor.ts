import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import type { FastifyReply, FastifyRequest } from 'fastify';
import { randomUUID } from 'node:crypto';
import type { Observable } from 'rxjs';

export type RequestWithId = FastifyRequest & { requestId?: string };

@Injectable()
export class RequestIdInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<RequestWithId>();
    const reply = context.switchToHttp().getResponse<FastifyReply>();
    const incoming = request.headers['x-request-id'];
    const requestId =
      typeof incoming === 'string' && incoming.length <= 128
        ? incoming
        : randomUUID();
    request.requestId = requestId;
    void reply.header('x-request-id', requestId);
    return next.handle();
  }
}
