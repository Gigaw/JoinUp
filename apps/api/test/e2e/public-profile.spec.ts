import type { NestFastifyApplication } from '@nestjs/platform-fastify';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createApp } from '../../src/bootstrap';
import { PrismaService } from '../../src/platform/database/prisma.service';

describe('public profile', () => {
  let app: NestFastifyApplication;
  let prisma: PrismaService;
  const prefix = `public-profile-${Date.now()}`;

  beforeAll(async () => {
    app = await createApp();
    await app.init();
    await app.getHttpAdapter().getInstance().ready();
    prisma = app.get(PrismaService);
  });

  afterAll(async () => {
    await prisma.event.deleteMany({
      where: { organizer: { email: { startsWith: prefix } } },
    });
    await prisma.user.deleteMany({ where: { email: { startsWith: prefix } } });
    await app.close();
  });

  it('returns only the allowed public projection and future published events', async () => {
    const register = async (role: string) => {
      const response = await request(app.getHttpServer())
        .post('/v1/auth/register')
        .send({
          email: `${prefix}-${role}@example.com`,
          password: 'safe-test-password',
          birthDate: '1992-06-15',
        })
        .expect(201);
      return {
        id: response.body.user.id as string,
        token: response.body.sessionToken as string,
      };
    };
    const [viewer, organizer, incomplete] = await Promise.all([
      register('viewer'),
      register('organizer'),
      register('incomplete'),
    ]);
    const city = await prisma.city.findFirstOrThrow({
      where: { isSupported: true },
    });
    const category = await prisma.category.findFirstOrThrow({
      where: { isActive: true },
    });

    await request(app.getHttpServer())
      .patch('/v1/me')
      .set('Authorization', `Bearer ${organizer.token}`)
      .send({
        displayName: 'Мария',
        bio: 'Собираю людей на настольные игры.',
        cityId: city.id,
        categoryIds: [category.id],
        showAge: true,
      })
      .expect(200);

    const createEvent = (
      title: string,
      startsAt: Date,
      status: 'published' | 'cancelled',
    ) =>
      prisma.event.create({
        data: {
          organizerId: organizer.id,
          cityId: city.id,
          categoryId: category.id,
          title,
          description: 'Описание тестовой активности для публичного профиля.',
          meetingPlace: 'Тестовое место',
          startsAt,
          capacity: 4,
          participationMode: 'automatic',
          status,
          participations: {
            create: {
              userId: organizer.id,
              status: 'going',
              seenEventVersion: 1,
            },
          },
        },
      });
    const now = Date.now();
    const [future] = await Promise.all([
      createEvent(
        'Ближайшая встреча',
        new Date(now + 48 * 60 * 60 * 1000),
        'published',
      ),
      createEvent(
        'Прошедшая встреча',
        new Date(now - 48 * 60 * 60 * 1000),
        'published',
      ),
      createEvent(
        'Отменённая встреча',
        new Date(now + 72 * 60 * 60 * 1000),
        'cancelled',
      ),
    ]);

    await request(app.getHttpServer())
      .get(`/v1/users/${organizer.id}`)
      .expect(401);

    const profile = await request(app.getHttpServer())
      .get(`/v1/users/${organizer.id}`)
      .set('Authorization', `Bearer ${viewer.token}`)
      .expect(200);

    expect(profile.body).toMatchObject({
      id: organizer.id,
      displayName: 'Мария',
      bio: 'Собираю людей на настольные игры.',
      city: { id: city.id },
      interests: [{ id: category.id }],
      upcomingEvents: [{ id: future.id, title: 'Ближайшая встреча' }],
    });
    expect(profile.body).toHaveProperty('age');
    expect(profile.body).not.toHaveProperty('birthDate');
    expect(profile.body).not.toHaveProperty('email');
    expect(profile.body).not.toHaveProperty('showAge');
    expect(profile.body).not.toHaveProperty('sessions');
    expect(profile.body).not.toHaveProperty('participations');
    expect(profile.body.upcomingEvents).toHaveLength(1);
    expect(profile.body.upcomingEvents[0]).not.toHaveProperty('participants');
    expect(profile.body.upcomingEvents[0]).not.toHaveProperty('organizer');

    await request(app.getHttpServer())
      .get(`/v1/users/${incomplete.id}`)
      .set('Authorization', `Bearer ${viewer.token}`)
      .expect(404)
      .expect(({ body }) => expect(body.code).toBe('RESOURCE_NOT_FOUND'));

    await request(app.getHttpServer())
      .get('/v1/users/00000000-0000-4000-8000-000000000000')
      .set('Authorization', `Bearer ${viewer.token}`)
      .expect(404)
      .expect(({ body }) => expect(body.code).toBe('RESOURCE_NOT_FOUND'));
  });
});
