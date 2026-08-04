import { Inject, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { hash, verify } from 'argon2';
import { readConfig } from '../../../platform/config/app-config';
import { PrismaService } from '../../../platform/database/prisma.service';
import type { SessionEnvelopeDto } from '../../../platform/http/api.dto';
import { DomainError } from '../../../platform/http/domain.error';
import { AgePolicy } from '../domain/age.policy';
import type { LoginDto, RegisterDto } from '../transport/http/auth.dto';
import { createSessionToken } from './token';

@Injectable()
export class AuthService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async register(input: RegisterDto): Promise<SessionEnvelopeDto> {
    const email = input.email.trim().toLowerCase();
    const birthDate = AgePolicy.assertAdult(input.birthDate);
    const passwordHash = await hash(input.password, { type: 2 });
    const session = createSessionToken();
    const expiresAt = this.sessionExpiry();

    try {
      const user = await this.prisma.$transaction(async (transaction) => {
        const created = await transaction.user.create({
          data: { email, passwordHash, birthDate },
        });
        await transaction.authSession.create({
          data: {
            userId: created.id,
            tokenHash: session.hash,
            expiresAt,
          },
        });
        return created;
      });
      return this.envelope(session.token, expiresAt, user);
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new DomainError(
          409,
          'EMAIL_ALREADY_EXISTS',
          'Пользователь с таким email уже зарегистрирован.',
        );
      }
      throw error;
    }
  }

  async login(input: LoginDto): Promise<SessionEnvelopeDto> {
    const email = input.email.trim().toLowerCase();
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user || !(await verify(user.passwordHash, input.password))) {
      throw new DomainError(
        401,
        'INVALID_CREDENTIALS',
        'Неверный email или пароль.',
      );
    }

    const session = createSessionToken();
    const expiresAt = this.sessionExpiry();
    await this.prisma.authSession.create({
      data: { userId: user.id, tokenHash: session.hash, expiresAt },
    });
    return this.envelope(session.token, expiresAt, user);
  }

  async logout(sessionId: string): Promise<void> {
    await this.prisma.authSession.updateMany({
      where: { id: sessionId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  private sessionExpiry(): Date {
    const { sessionTtlDays } = readConfig();
    return new Date(Date.now() + sessionTtlDays * 24 * 60 * 60 * 1000);
  }

  private envelope(
    token: string,
    expiresAt: Date,
    user: {
      id: string;
      email: string;
      birthDate: Date;
      showAge: boolean;
      onboardingCompleted: boolean;
    },
  ): SessionEnvelopeDto {
    return {
      sessionToken: token,
      expiresAt: expiresAt.toISOString(),
      user: {
        id: user.id,
        email: user.email,
        birthDate: user.birthDate.toISOString().slice(0, 10),
        showAge: user.showAge,
        onboardingCompleted: user.onboardingCompleted,
      },
    };
  }
}
