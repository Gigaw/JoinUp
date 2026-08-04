import {
  CanActivate,
  ExecutionContext,
  Inject,
  Injectable,
} from '@nestjs/common';
import { PrismaService } from '../../../../platform/database/prisma.service';
import { DomainError } from '../../../../platform/http/domain.error';
import { hashSessionToken } from '../../application/token';
import type { AuthenticatedRequest } from './current-actor';

@Injectable()
export class SessionGuard implements CanActivate {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const authorization = request.headers.authorization;
    const token = authorization?.startsWith('Bearer ')
      ? authorization.slice('Bearer '.length)
      : undefined;
    if (!token) {
      throw this.invalidSession();
    }

    const session = await this.prisma.authSession.findFirst({
      where: {
        tokenHash: hashSessionToken(token),
        revokedAt: null,
        expiresAt: { gt: new Date() },
      },
      select: { id: true, userId: true },
    });
    if (!session) {
      throw this.invalidSession();
    }
    request.actor = { userId: session.userId, sessionId: session.id };
    return true;
  }

  private invalidSession(): DomainError {
    return new DomainError(
      401,
      'SESSION_INVALID',
      'Требуется действующая сессия.',
    );
  }
}
