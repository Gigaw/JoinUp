import { randomUUID } from 'node:crypto';
import type { NestFastifyApplication } from '@nestjs/platform-fastify';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createApp } from '../../src/bootstrap';
import { PrismaService } from '../../src/platform/database/prisma.service';

describe('event management', () => {
  let app: NestFastifyApplication;
  let prisma: PrismaService;
  let cityId: string;
  let categoryId: string;
  const testPrefix = `event-management-${Date.now()}`;

  beforeAll(async () => {
    app = await createApp();
    await app.init();
    await app.getHttpAdapter().getInstance().ready();
    prisma = app.get(PrismaService);
    cityId = (
      await prisma.city.findFirstOrThrow({ where: { isSupported: true } })
    ).id;
    categoryId = (
      await prisma.category.findFirstOrThrow({ where: { isActive: true } })
    ).id;
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

  const register = async (role: string, completeOnboarding = true) => {
    const response = await request(app.getHttpServer())
      .post('/v1/auth/register')
      .send({
        email: `${testPrefix}-${role}@example.com`,
        password: 'safe-test-password',
        birthDate: '1990-01-10',
      })
      .expect(201);
    const token = response.body.sessionToken as string;
    const userId = response.body.user.id as string;
    if (completeOnboarding) {
      await request(app.getHttpServer())
        .patch('/v1/me')
        .set('Authorization', `Bearer ${token}`)
        .send({
          displayName: `Организатор ${role}`,
          cityId,
          categoryIds: [categoryId],
        })
        .expect(200);
    }
    return { token, userId };
  };

  const eventInput = (
    suffix: string,
    participationMode: 'automatic' | 'approval_required' = 'automatic',
    capacity = 8,
  ) => ({
    title: `Событие ${suffix}`,
    categoryId,
    description: 'Подробное описание тестового события для проверки API.',
    cityId,
    meetingPlace: 'Площадка рядом с центральным парком',
    startsAt: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(),
    endsAt: new Date(Date.now() + 50 * 60 * 60 * 1000).toISOString(),
    capacity,
    participationMode,
  });

  const createEvent = async (token: string, suffix: string) =>
    request(app.getHttpServer())
      .post('/v1/events')
      .set('Authorization', `Bearer ${token}`)
      .set('Idempotency-Key', randomUUID())
      .send(eventInput(suffix))
      .expect(201);

  it('creates an event atomically and replays the idempotent response', async () => {
    const incomplete = await register('incomplete', false);
    await request(app.getHttpServer())
      .post('/v1/events')
      .set('Authorization', `Bearer ${incomplete.token}`)
      .set('Idempotency-Key', randomUUID())
      .send(eventInput('без профиля'))
      .expect(409)
      .expect(({ body }) => expect(body.code).toBe('ONBOARDING_INCOMPLETE'));

    const organizer = await register('create');
    await request(app.getHttpServer())
      .post('/v1/events')
      .set('Authorization', `Bearer ${organizer.token}`)
      .send(eventInput('без ключа'))
      .expect(409)
      .expect(({ body }) => expect(body.code).toBe('IDEMPOTENCY_KEY_REQUIRED'));

    await request(app.getHttpServer())
      .post('/v1/events')
      .set('Authorization', `Bearer ${organizer.token}`)
      .set('Idempotency-Key', randomUUID())
      .send({
        ...eventInput('в прошлом'),
        startsAt: new Date(Date.now() - 60_000).toISOString(),
        endsAt: null,
      })
      .expect(400)
      .expect(({ body }) => expect(body.code).toBe('VALIDATION_ERROR'));

    const key = randomUUID();
    const input = eventInput('создание');
    const first = await request(app.getHttpServer())
      .post('/v1/events')
      .set('Authorization', `Bearer ${organizer.token}`)
      .set('Idempotency-Key', key)
      .send(input)
      .expect(201);
    const replay = await request(app.getHttpServer())
      .post('/v1/events')
      .set('Authorization', `Bearer ${organizer.token}`)
      .set('Idempotency-Key', key)
      .send(input)
      .expect(201);

    expect(replay.body).toEqual(first.body);
    expect(first.body).toMatchObject({
      organizer: { id: organizer.userId },
      participantsCount: 1,
      capacity: 8,
      status: 'published',
      version: 1,
      contentVersion: 1,
    });
    expect(first.body.availableActions).toContain('edit');
    expect(first.body.availableActions).toContain('cancel');
    expect(first.body.participants).toHaveLength(1);
    expect(
      await prisma.event.count({
        where: { organizerId: organizer.userId, title: input.title },
      }),
    ).toBe(1);
    expect(
      await prisma.eventParticipation.count({
        where: {
          eventId: first.body.id as string,
          userId: organizer.userId,
          status: 'going',
        },
      }),
    ).toBe(1);

    await request(app.getHttpServer())
      .post('/v1/events')
      .set('Authorization', `Bearer ${organizer.token}`)
      .set('Idempotency-Key', key)
      .send({ ...input, title: 'Другой запрос' })
      .expect(409)
      .expect(({ body }) => expect(body.code).toBe('IDEMPOTENCY_KEY_REUSED'));
  });

  it('protects ownership, capacity and optimistic event edits', async () => {
    const organizer = await register('edit-owner');
    const outsider = await register('edit-outsider');
    const created = await createEvent(organizer.token, 'редактирование');
    const eventId = created.body.id as string;

    await request(app.getHttpServer())
      .patch(`/v1/events/${eventId}`)
      .set('Authorization', `Bearer ${outsider.token}`)
      .set('Idempotency-Key', randomUUID())
      .send({ expectedVersion: 1, title: 'Чужое изменение' })
      .expect(403)
      .expect(({ body }) => expect(body.code).toBe('FORBIDDEN'));

    await prisma.eventParticipation.createMany({
      data: [
        {
          eventId,
          userId: outsider.userId,
          status: 'going',
          seenEventVersion: 1,
        },
        {
          eventId,
          userId: (await register('edit-participant')).userId,
          status: 'going',
          seenEventVersion: 1,
        },
      ],
    });
    await request(app.getHttpServer())
      .patch(`/v1/events/${eventId}`)
      .set('Authorization', `Bearer ${organizer.token}`)
      .set('Idempotency-Key', randomUUID())
      .send({ expectedVersion: 1, capacity: 2 })
      .expect(409)
      .expect(({ body }) =>
        expect(body.code).toBe('CAPACITY_BELOW_PARTICIPANTS'),
      );

    const concurrent = await Promise.all([
      request(app.getHttpServer())
        .patch(`/v1/events/${eventId}`)
        .set('Authorization', `Bearer ${organizer.token}`)
        .set('Idempotency-Key', randomUUID())
        .send({ expectedVersion: 1, title: 'Первое изменение' }),
      request(app.getHttpServer())
        .patch(`/v1/events/${eventId}`)
        .set('Authorization', `Bearer ${organizer.token}`)
        .set('Idempotency-Key', randomUUID())
        .send({ expectedVersion: 1, title: 'Второе изменение' }),
    ]);
    expect(concurrent.map(({ status }) => status).sort()).toEqual([200, 409]);
    expect(concurrent.find(({ status }) => status === 409)?.body.code).toBe(
      'EVENT_VERSION_CONFLICT',
    );

    const current = await request(app.getHttpServer())
      .get(`/v1/events/${eventId}`)
      .set('Authorization', `Bearer ${organizer.token}`)
      .expect(200);
    const key = randomUUID();
    const updateBody = {
      expectedVersion: current.body.version as number,
      meetingPlace: 'Новое место встречи у стадиона',
      capacity: 6,
    };
    const updated = await request(app.getHttpServer())
      .patch(`/v1/events/${eventId}`)
      .set('Authorization', `Bearer ${organizer.token}`)
      .set('Idempotency-Key', key)
      .send(updateBody)
      .expect(200);
    const replay = await request(app.getHttpServer())
      .patch(`/v1/events/${eventId}`)
      .set('Authorization', `Bearer ${organizer.token}`)
      .set('Idempotency-Key', key)
      .send(updateBody)
      .expect(200);

    expect(replay.body).toEqual(updated.body);
    expect(updated.body).toMatchObject({
      meetingPlace: updateBody.meetingPlace,
      capacity: 6,
      version: (current.body.version as number) + 1,
      contentVersion: (current.body.contentVersion as number) + 1,
    });
  });

  it('cancels without deletion and rejects later changes', async () => {
    const organizer = await register('cancel-owner');
    const outsider = await register('cancel-outsider');
    const created = await createEvent(organizer.token, 'отмена');
    const eventId = created.body.id as string;

    await request(app.getHttpServer())
      .post(`/v1/events/${eventId}/cancel`)
      .set('Authorization', `Bearer ${outsider.token}`)
      .set('Idempotency-Key', randomUUID())
      .expect(403)
      .expect(({ body }) => expect(body.code).toBe('FORBIDDEN'));

    const key = randomUUID();
    const cancelled = await request(app.getHttpServer())
      .post(`/v1/events/${eventId}/cancel`)
      .set('Authorization', `Bearer ${organizer.token}`)
      .set('Idempotency-Key', key)
      .expect(200);
    const replay = await request(app.getHttpServer())
      .post(`/v1/events/${eventId}/cancel`)
      .set('Authorization', `Bearer ${organizer.token}`)
      .set('Idempotency-Key', key)
      .expect(200);
    const repeatedIntent = await request(app.getHttpServer())
      .post(`/v1/events/${eventId}/cancel`)
      .set('Authorization', `Bearer ${organizer.token}`)
      .set('Idempotency-Key', randomUUID())
      .expect(200);

    expect(replay.body).toEqual(cancelled.body);
    expect(repeatedIntent.body).toEqual(cancelled.body);
    expect(cancelled.body).toMatchObject({
      id: eventId,
      status: 'cancelled',
      version: 2,
      contentVersion: 2,
      availableActions: [],
    });
    expect(await prisma.event.count({ where: { id: eventId } })).toBe(1);

    await request(app.getHttpServer())
      .patch(`/v1/events/${eventId}`)
      .set('Authorization', `Bearer ${organizer.token}`)
      .set('Idempotency-Key', randomUUID())
      .send({ expectedVersion: 2, title: 'Позднее изменение' })
      .expect(409)
      .expect(({ body }) => expect(body.code).toBe('EVENT_CANCELLED'));

    const list = await request(app.getHttpServer())
      .get('/v1/events')
      .query({ cityId })
      .set('Authorization', `Bearer ${organizer.token}`)
      .expect(200);
    expect(
      list.body.items.some((event: { id: string }) => event.id === eventId),
    ).toBe(false);
  });

  it('rejects edits and cancellation after the event starts', async () => {
    const organizer = await register('started-owner');
    const created = await createEvent(organizer.token, 'начавшееся');
    const eventId = created.body.id as string;
    await prisma.event.update({
      where: { id: eventId },
      data: {
        startsAt: new Date(Date.now() - 60_000),
        endsAt: null,
      },
    });

    await request(app.getHttpServer())
      .patch(`/v1/events/${eventId}`)
      .set('Authorization', `Bearer ${organizer.token}`)
      .set('Idempotency-Key', randomUUID())
      .send({ expectedVersion: 1, title: 'Слишком позднее изменение' })
      .expect(409)
      .expect(({ body }) => expect(body.code).toBe('EVENT_STARTED'));

    await request(app.getHttpServer())
      .post(`/v1/events/${eventId}/cancel`)
      .set('Authorization', `Bearer ${organizer.token}`)
      .set('Idempotency-Key', randomUUID())
      .expect(409)
      .expect(({ body }) => expect(body.code).toBe('EVENT_STARTED'));
  });

  it('withdraws pending applications and lets confirmed participants leave', async () => {
    const organizer = await register('leave-owner');
    const attendee = await register('leave-attendee');
    const created = await createEvent(organizer.token, 'отказ участника');
    const eventId = created.body.id as string;

    await request(app.getHttpServer())
      .put(`/v1/events/${eventId}/participation`)
      .set('Authorization', `Bearer ${attendee.token}`)
      .expect(200);
    const left = await request(app.getHttpServer())
      .delete(`/v1/events/${eventId}/participation`)
      .set('Authorization', `Bearer ${attendee.token}`)
      .expect(200);
    const replay = await request(app.getHttpServer())
      .delete(`/v1/events/${eventId}/participation`)
      .set('Authorization', `Bearer ${attendee.token}`)
      .expect(200);
    expect(left.body).toMatchObject({
      participation: { status: 'cancelled' },
      participantsCount: 1,
    });
    expect(replay.body).toEqual(left.body);

    await request(app.getHttpServer())
      .delete(`/v1/events/${eventId}/participation`)
      .set('Authorization', `Bearer ${organizer.token}`)
      .expect(409)
      .expect(({ body }) => expect(body.code).toBe('ORGANIZER_CANNOT_LEAVE'));

    const approvalEvent = await request(app.getHttpServer())
      .post('/v1/events')
      .set('Authorization', `Bearer ${organizer.token}`)
      .set('Idempotency-Key', randomUUID())
      .send(eventInput('отзыв заявки', 'approval_required'))
      .expect(201);
    await request(app.getHttpServer())
      .put(`/v1/events/${approvalEvent.body.id as string}/participation`)
      .set('Authorization', `Bearer ${attendee.token}`)
      .expect(200);
    const withdrawn = await request(app.getHttpServer())
      .delete(`/v1/events/${approvalEvent.body.id as string}/participation`)
      .set('Authorization', `Bearer ${attendee.token}`)
      .expect(200);
    expect(withdrawn.body).toMatchObject({
      participation: { status: 'withdrawn' },
      participantsCount: 1,
    });
  });

  it('serializes approval decisions and rejects remaining pending applications', async () => {
    const organizer = await register('decision-owner');
    const firstApplicant = await register('decision-first');
    const secondApplicant = await register('decision-second');
    const outsider = await register('decision-outsider');
    const created = await request(app.getHttpServer())
      .post('/v1/events')
      .set('Authorization', `Bearer ${organizer.token}`)
      .set('Idempotency-Key', randomUUID())
      .send(eventInput('решение по заявке', 'approval_required', 2))
      .expect(201);
    const eventId = created.body.id as string;

    const applications = await Promise.all(
      [firstApplicant, secondApplicant].map(async (applicant) => {
        const response = await request(app.getHttpServer())
          .put(`/v1/events/${eventId}/participation`)
          .set('Authorization', `Bearer ${applicant.token}`)
          .expect(200);
        return response.body.participation.id as string;
      }),
    );

    const pendingApplications = await request(app.getHttpServer())
      .get(`/v1/events/${eventId}/applications`)
      .set('Authorization', `Bearer ${organizer.token}`)
      .query({ status: 'pending' })
      .expect(200);
    expect(
      pendingApplications.body.items.map(({ id }: { id: string }) => id),
    ).toEqual(expect.arrayContaining(applications));
    await request(app.getHttpServer())
      .get(`/v1/events/${eventId}/applications`)
      .set('Authorization', `Bearer ${outsider.token}`)
      .expect(403)
      .expect(({ body }) => expect(body.code).toBe('FORBIDDEN'));

    await request(app.getHttpServer())
      .put(`/v1/events/${eventId}/applications/${applications[0]}/decision`)
      .set('Authorization', `Bearer ${outsider.token}`)
      .send({ decision: 'approve' })
      .expect(403)
      .expect(({ body }) => expect(body.code).toBe('FORBIDDEN'));

    const decisions = await Promise.all(
      applications.map((participationId) =>
        request(app.getHttpServer())
          .put(`/v1/events/${eventId}/applications/${participationId}/decision`)
          .set('Authorization', `Bearer ${organizer.token}`)
          .send({ decision: 'approve' }),
      ),
    );
    expect(decisions.map(({ status }) => status).sort()).toEqual([200, 409]);

    const participations = await prisma.eventParticipation.findMany({
      where: { eventId, id: { in: applications } },
      orderBy: { id: 'asc' },
      select: { id: true, status: true },
    });
    expect(participations.map(({ status }) => status).sort()).toEqual([
      'going',
      'rejected',
    ]);
    const approved = participations.find(({ status }) => status === 'going');
    if (!approved) throw new Error('Approved participation was not found');
    const replay = await request(app.getHttpServer())
      .put(`/v1/events/${eventId}/applications/${approved.id}/decision`)
      .set('Authorization', `Bearer ${organizer.token}`)
      .send({ decision: 'approve' })
      .expect(200);
    expect(replay.body).toMatchObject({
      participation: { id: approved.id, status: 'going' },
      isFull: true,
    });
  });
});
