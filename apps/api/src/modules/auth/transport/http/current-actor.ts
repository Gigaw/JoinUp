import { createParamDecorator } from '@nestjs/common';
import type { ExecutionContext } from '@nestjs/common';
import type { FastifyRequest } from 'fastify';

export interface ActorContext {
  userId: string;
  sessionId: string;
}

export type AuthenticatedRequest = FastifyRequest & { actor?: ActorContext };

export const CurrentActor = createParamDecorator(
  (_data: unknown, context: ExecutionContext): ActorContext => {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    if (!request.actor) {
      throw new Error('SessionGuard did not attach an actor');
    }
    return request.actor;
  },
);
