import { Inject, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../../platform/database/prisma.service';
import type {
  ProfileRecord,
  UsersRepository,
} from '../../application/users.repository';
import {
  canCompleteOnboarding,
  type ProfilePatch,
  ProfileUpdateError,
} from '../../domain/profile';

const profileInclude = Prisma.validator<Prisma.UserInclude>()({
  city: true,
  interests: { include: { category: true } },
});

type PrismaProfile = Prisma.UserGetPayload<{ include: typeof profileInclude }>;

@Injectable()
export class PrismaUsersRepository implements UsersRepository {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async findMe(userId: string): Promise<ProfileRecord | null> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: profileInclude,
    });
    return user ? this.map(user) : null;
  }

  async updateProfile(
    userId: string,
    patch: ProfilePatch,
  ): Promise<ProfileRecord> {
    return this.prisma.$transaction(async (transaction) => {
      const current = await transaction.user.findUnique({
        where: { id: userId },
        include: profileInclude,
      });
      if (!current) throw new ProfileUpdateError('USER_NOT_FOUND');

      let hasSupportedCity = current.city?.isSupported ?? false;
      if (patch.cityId !== undefined) {
        const city = await transaction.city.findFirst({
          where: { id: patch.cityId, isSupported: true },
          select: { id: true },
        });
        if (!city) throw new ProfileUpdateError('CITY_NOT_SUPPORTED');
        hasSupportedCity = true;
      }

      let activeInterestsCount = current.interests.filter(
        ({ category }) => category.isActive,
      ).length;
      if (patch.categoryIds !== undefined) {
        const categories = await transaction.category.findMany({
          where: { id: { in: patch.categoryIds }, isActive: true },
          select: { id: true },
        });
        if (categories.length !== patch.categoryIds.length) {
          throw new ProfileUpdateError('CATEGORY_NOT_ACTIVE');
        }
        activeInterestsCount = categories.length;
      }

      const displayName = patch.displayName ?? current.displayName;
      const completesOnboarding = canCompleteOnboarding({
        displayName,
        hasSupportedCity,
        activeInterestsCount,
      });
      const onboardingCompletedAt =
        current.onboardingCompletedAt ??
        (completesOnboarding ? new Date() : null);

      await transaction.user.update({
        where: { id: userId },
        data: {
          ...(patch.displayName !== undefined
            ? { displayName: patch.displayName }
            : {}),
          ...(patch.showAge !== undefined ? { showAge: patch.showAge } : {}),
          ...(patch.bio !== undefined ? { bio: patch.bio } : {}),
          ...(patch.cityId !== undefined ? { cityId: patch.cityId } : {}),
          onboardingCompletedAt,
        },
      });

      if (patch.categoryIds !== undefined) {
        await transaction.userInterest.deleteMany({ where: { userId } });
        await transaction.userInterest.createMany({
          data: patch.categoryIds.map((categoryId) => ({ userId, categoryId })),
        });
      }

      const updated = await transaction.user.findUnique({
        where: { id: userId },
        include: profileInclude,
      });
      if (!updated) throw new ProfileUpdateError('USER_NOT_FOUND');
      return this.map(updated);
    });
  }

  private map(user: PrismaProfile): ProfileRecord {
    return {
      id: user.id,
      email: user.email,
      birthDate: user.birthDate,
      displayName: user.displayName,
      showAge: user.showAge,
      avatarObjectKey: user.avatarObjectKey,
      bio: user.bio,
      city: user.city
        ? {
            id: user.city.id,
            slug: user.city.slug,
            name: user.city.name,
            timeZone: user.city.timeZone,
          }
        : null,
      interests: user.interests.map(({ category }) => ({
        id: category.id,
        slug: category.slug,
        name: category.name,
        sortOrder: category.sortOrder,
      })),
      onboardingCompletedAt: user.onboardingCompletedAt,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }
}
