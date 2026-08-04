import { Inject, Injectable } from '@nestjs/common';
import type { MeDto } from '../../../platform/http/api.dto';
import { DomainError } from '../../../platform/http/domain.error';
import { ProfileUpdateError, type ProfilePatch } from '../domain/profile';
import {
  USERS_REPOSITORY,
  type ProfileRecord,
  type UsersRepository,
} from './users.repository';

@Injectable()
export class UsersService {
  constructor(
    @Inject(USERS_REPOSITORY) private readonly repository: UsersRepository,
  ) {}

  async getMe(userId: string): Promise<MeDto> {
    const profile = await this.repository.findMe(userId);
    if (!profile) throw this.notFound();
    return this.present(profile);
  }

  async updateMe(userId: string, patch: ProfilePatch): Promise<MeDto> {
    try {
      const normalizedPatch = {
        ...patch,
        ...(patch.displayName !== undefined
          ? { displayName: patch.displayName.trim() }
          : {}),
      };
      if (normalizedPatch.displayName !== undefined) {
        const length = normalizedPatch.displayName.length;
        if (length < 1 || length > 80) {
          throw new DomainError(
            400,
            'VALIDATION_ERROR',
            'Имя должно содержать от 1 до 80 символов.',
          );
        }
      }
      return this.present(
        await this.repository.updateProfile(userId, normalizedPatch),
      );
    } catch (error) {
      if (!(error instanceof ProfileUpdateError)) throw error;
      if (error.code === 'CITY_NOT_SUPPORTED') {
        throw new DomainError(409, error.code, 'Город пока не поддерживается.');
      }
      if (error.code === 'CATEGORY_NOT_ACTIVE') {
        throw new DomainError(409, error.code, 'Одна из категорий недоступна.');
      }
      throw this.notFound();
    }
  }

  private present(profile: ProfileRecord): MeDto {
    return {
      id: profile.id,
      email: profile.email,
      birthDate: profile.birthDate.toISOString().slice(0, 10),
      displayName: profile.displayName,
      showAge: profile.showAge,
      avatarUrl: profile.avatarObjectKey
        ? `/v1/media/${profile.avatarObjectKey}`
        : null,
      bio: profile.bio,
      city: profile.city,
      interests: [...profile.interests]
        .sort((left, right) => left.sortOrder - right.sortOrder)
        .map(({ id, slug, name }) => ({ id, slug, name })),
      onboardingCompleted: profile.onboardingCompletedAt !== null,
      createdAt: profile.createdAt.toISOString(),
      updatedAt: profile.updatedAt.toISOString(),
    };
  }

  private notFound(): DomainError {
    return new DomainError(404, 'RESOURCE_NOT_FOUND', 'Профиль не найден.');
  }
}
