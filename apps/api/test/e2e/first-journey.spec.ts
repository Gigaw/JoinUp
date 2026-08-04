import type { NestFastifyApplication } from '@nestjs/platform-fastify';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createApp } from '../../src/bootstrap';
import { PrismaService } from '../../src/platform/database/prisma.service';

describe('first user journey', () => {
  let app: NestFastifyApplication;
  let prisma: PrismaService;
  const testPrefix = `journey-${Date.now()}`;
  const email = `${testPrefix}@example.com`;

  beforeAll(async () => {
    app = await createApp();
    await app.init();
    await app.getHttpAdapter().getInstance().ready();
    prisma = app.get(PrismaService);
  });

  afterAll(async () => {
    await prisma.event.deleteMany({
      where: { organizer: { email: { startsWith: testPrefix } } },
    });
    await prisma.user.deleteMany({
      where: { email: { startsWith: testPrefix } },
    });
    await app.close();
  });

  it('registers, completes onboarding, logs in and joins idempotently', async () => {
    const registration = await request(app.getHttpServer())
      .post('/v1/auth/register')
      .send({
        email,
        password: 'safe-test-password',
        birthDate: '1997-06-15',
      })
      .expect(201);
    expect(registration.body.user).toMatchObject({
      email,
      showAge: false,
      onboardingCompleted: false,
    });
    const registrationToken = registration.body.sessionToken as string;
    const userId = registration.body.user.id as string;

    await request(app.getHttpServer()).get('/v1/me').expect(401);
    const meBeforeOnboarding = await request(app.getHttpServer())
      .get('/v1/me')
      .set('Authorization', `Bearer ${registrationToken}`)
      .expect(200);
    expect(meBeforeOnboarding.body).toMatchObject({
      email,
      birthDate: '1997-06-15',
      displayName: null,
      showAge: false,
      onboardingCompleted: false,
    });

    const cities = await request(app.getHttpServer())
      .get('/v1/cities')
      .expect(200);
    const cityId = cities.body[0].id as string;
    expect(cities.body[0]).toHaveProperty('slug');

    const categories = await request(app.getHttpServer())
      .get('/v1/categories')
      .expect(200);
    const categoryId = categories.body[0].id as string;

    const partialProfile = await request(app.getHttpServer())
      .patch('/v1/me')
      .set('Authorization', `Bearer ${registrationToken}`)
      .send({ displayName: '  Алексей  ' })
      .expect(200);
    expect(partialProfile.body).toMatchObject({
      displayName: 'Алексей',
      onboardingCompleted: false,
    });

    const completedProfile = await request(app.getHttpServer())
      .patch('/v1/me')
      .set('Authorization', `Bearer ${registrationToken}`)
      .send({
        cityId,
        categoryIds: [categoryId],
        showAge: true,
      })
      .expect(200);
    expect(completedProfile.body).toMatchObject({
      id: userId,
      displayName: 'Алексей',
      showAge: true,
      city: { id: cityId },
      interests: [{ id: categoryId }],
      onboardingCompleted: true,
    });

    const invalidLogin = await request(app.getHttpServer())
      .post('/v1/auth/login')
      .send({ email, password: 'wrong-password' })
      .expect(401);
    expect(invalidLogin.body.code).toBe('INVALID_CREDENTIALS');

    const login = await request(app.getHttpServer())
      .post('/v1/auth/login')
      .send({ email: email.toUpperCase(), password: 'safe-test-password' })
      .expect(200);
    expect(login.body.user).toMatchObject({
      id: userId,
      onboardingCompleted: true,
    });
    const token = login.body.sessionToken as string;

    const list = await request(app.getHttpServer())
      .get('/v1/events')
      .query({ cityId })
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    expect(list.body.items.length).toBeGreaterThan(0);
    const seededEvent = list.body.items.find(
      (item: { title?: string }) => item.title === 'Волейбол вечером',
    ) as { id: string } | undefined;
    expect(seededEvent).toBeDefined();
    const eventId = seededEvent!.id;

    const details = await request(app.getHttpServer())
      .get(`/v1/events/${eventId}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    expect(details.body).toMatchObject({
      id: eventId,
      myParticipation: null,
    });
    const initialParticipantsCount = details.body.participantsCount as number;
    expect(details.body.organizer).not.toHaveProperty('birthDate');
    expect(details.body.organizer).not.toHaveProperty('email');

    const firstJoin = await request(app.getHttpServer())
      .put(`/v1/events/${eventId}/participation`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    const repeatedJoin = await request(app.getHttpServer())
      .put(`/v1/events/${eventId}/participation`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(firstJoin.body).toMatchObject({
      participantsCount: initialParticipantsCount + 1,
      capacity: 8,
    });
    expect(repeatedJoin.body).toEqual(firstJoin.body);

    const detailsAfterJoin = await request(app.getHttpServer())
      .get(`/v1/events/${eventId}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    const participantDetails = detailsAfterJoin.body as unknown as {
      participants: Array<{ id?: string; displayName?: string; age?: number }>;
    };
    const publicParticipant = participantDetails.participants.find(
      (participant: { id?: string }) => participant.id === userId,
    );
    expect(publicParticipant).toMatchObject({
      id: userId,
      displayName: 'Алексей',
    });
    expect(publicParticipant).toHaveProperty('age');
    expect(publicParticipant).not.toHaveProperty('birthDate');
    expect(publicParticipant).not.toHaveProperty('email');
    expect(publicParticipant).not.toHaveProperty('showAge');
    expect(
      await prisma.eventParticipation.count({
        where: { eventId, user: { email } },
      }),
    ).toBe(1);
  });

  it('serializes concurrent joins for the final place', async () => {
    const register = async (role: string) => {
      const response = await request(app.getHttpServer())
        .post('/v1/auth/register')
        .send({
          email: `${testPrefix}-${role}@example.com`,
          password: 'safe-test-password',
          birthDate: '1990-01-10',
        })
        .expect(201);
      return {
        token: response.body.sessionToken as string,
        userId: response.body.user.id as string,
      };
    };
    const [organizer, first, second] = await Promise.all([
      register('organizer'),
      register('first'),
      register('second'),
    ]);
    const city = await prisma.city.findFirstOrThrow({
      where: { isSupported: true },
    });
    const category = await prisma.category.findFirstOrThrow({
      where: { isActive: true },
    });
    const event = await prisma.event.create({
      data: {
        organizerId: organizer.userId,
        cityId: city.id,
        categoryId: category.id,
        title: 'Последнее место',
        description: 'Тест конкурентного присоединения к событию.',
        meetingPlace: 'Тестовая площадка',
        startsAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        capacity: 2,
        participationMode: 'automatic',
        participations: {
          create: {
            userId: organizer.userId,
            status: 'going',
            seenEventVersion: 1,
          },
        },
      },
    });

    const responses = await Promise.all([
      request(app.getHttpServer())
        .put(`/v1/events/${event.id}/participation`)
        .set('Authorization', `Bearer ${first.token}`),
      request(app.getHttpServer())
        .put(`/v1/events/${event.id}/participation`)
        .set('Authorization', `Bearer ${second.token}`),
    ]);

    expect(responses.map(({ status }) => status).sort()).toEqual([200, 409]);
    expect(responses.find(({ status }) => status === 409)?.body.code).toBe(
      'EVENT_FULL',
    );
    expect(
      await prisma.eventParticipation.count({
        where: { eventId: event.id, status: 'going' },
      }),
    ).toBe(2);
  });
});
