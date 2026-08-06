import { randomUUID } from 'node:crypto';
import type { NestFastifyApplication } from '@nestjs/platform-fastify';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createApp } from '../../src/bootstrap';
import { PrismaService } from '../../src/platform/database/prisma.service';

describe('event chats', () => {
  let app: NestFastifyApplication;
  let prisma: PrismaService;
  let cityId: string;
  let categoryId: string;
  const prefix = `chats-${Date.now()}`;

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
      where: { organizer: { email: { startsWith: prefix } } },
    });
    await prisma.user.deleteMany({ where: { email: { startsWith: prefix } } });
    await app.close();
  });

  const register = async (name: string) => {
    const response = await request(app.getHttpServer())
      .post('/v1/auth/register')
      .send({
        email: `${prefix}-${name}@example.com`,
        password: 'safe-test-password',
        birthDate: '1990-01-10',
      })
      .expect(201);
    const token = response.body.sessionToken as string;
    await request(app.getHttpServer())
      .patch('/v1/me')
      .set('Authorization', `Bearer ${token}`)
      .send({ displayName: name, cityId, categoryIds: [categoryId] })
      .expect(200);
    return { token, userId: response.body.user.id as string };
  };

  const create = async (
    token: string,
    mode: 'automatic' | 'approval_required' = 'automatic',
  ) =>
    request(app.getHttpServer())
      .post('/v1/events')
      .set('Authorization', `Bearer ${token}`)
      .set('Idempotency-Key', randomUUID())
      .send({
        title: 'Чат для координации',
        categoryId,
        cityId,
        description: 'Проверяем организационные сообщения участников события.',
        meetingPlace: 'У входа в городской парк',
        startsAt: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(),
        capacity: 8,
        participationMode: mode,
      })
      .expect(201);

  it('restricts access, paginates messages and replays a network retry', async () => {
    const organizer = await register('Организатор');
    const participant = await register('Участник');
    const outsider = await register('Посторонний');
    const event = await create(organizer.token, 'approval_required');
    const eventId = event.body.id as string;

    await request(app.getHttpServer())
      .put(`/v1/events/${eventId}/participation`)
      .set('Authorization', `Bearer ${participant.token}`)
      .expect(200);
    await request(app.getHttpServer())
      .get(`/v1/events/${eventId}/messages`)
      .set('Authorization', `Bearer ${participant.token}`)
      .expect(404);
    await request(app.getHttpServer())
      .post(`/v1/events/${eventId}/messages`)
      .set('Authorization', `Bearer ${participant.token}`)
      .set('Idempotency-Key', randomUUID())
      .send({ text: 'Я пока жду подтверждения.' })
      .expect(404);

    const application = await prisma.eventParticipation.findFirstOrThrow({
      where: { eventId, userId: participant.userId },
    });
    await request(app.getHttpServer())
      .put(`/v1/events/${eventId}/applications/${application.id}/decision`)
      .set('Authorization', `Bearer ${organizer.token}`)
      .send({ decision: 'approve' })
      .expect(200);

    const key = randomUUID();
    const first = await request(app.getHttpServer())
      .post(`/v1/events/${eventId}/messages`)
      .set('Authorization', `Bearer ${participant.token}`)
      .set('Idempotency-Key', key)
      .send({ text: 'Я буду на месте на десять минут раньше.' })
      .expect(201);
    const replay = await request(app.getHttpServer())
      .post(`/v1/events/${eventId}/messages`)
      .set('Authorization', `Bearer ${participant.token}`)
      .set('Idempotency-Key', key)
      .send({ text: 'Я буду на месте на десять минут раньше.' })
      .expect(201);
    expect(replay.body).toEqual(first.body);
    expect(await prisma.eventMessage.count({ where: { eventId } })).toBe(1);

    await prisma.eventMessage.createMany({
      data: Array.from({ length: 3 }, (_, index) => ({
        eventId,
        authorId: organizer.userId,
        text: `Организационное сообщение ${index}`,
      })),
    });
    const page = await request(app.getHttpServer())
      .get(`/v1/events/${eventId}/messages?limit=2`)
      .set('Authorization', `Bearer ${organizer.token}`)
      .expect(200);
    expect(page.body.items).toHaveLength(2);
    expect(page.body.nextCursor).toEqual(expect.any(String));
    expect(JSON.stringify(page.body)).not.toContain('birthDate');
    await request(app.getHttpServer())
      .get(
        `/v1/events/${eventId}/messages?cursor=${page.body.nextCursor as string}&limit=2`,
      )
      .set('Authorization', `Bearer ${organizer.token}`)
      .expect(200)
      .expect(({ body }) => expect(body.items).toHaveLength(2));

    await request(app.getHttpServer())
      .get(`/v1/events/${eventId}/messages`)
      .set('Authorization', `Bearer ${outsider.token}`)
      .expect(404);
    await request(app.getHttpServer())
      .get('/v1/me/chats')
      .set('Authorization', `Bearer ${participant.token}`)
      .expect(200)
      .expect(({ body }) =>
        expect(body.items).toEqual(
          expect.arrayContaining([expect.objectContaining({ eventId })]),
        ),
      );
  });

  it('makes terminal chats read-only and serializes leave against sending', async () => {
    const organizer = await register('Terminal организатор');
    const participant = await register('Terminal участник');
    const event = await create(organizer.token);
    const eventId = event.body.id as string;
    await request(app.getHttpServer())
      .put(`/v1/events/${eventId}/participation`)
      .set('Authorization', `Bearer ${participant.token}`)
      .expect(200);

    const [sent, left] = await Promise.all([
      request(app.getHttpServer())
        .post(`/v1/events/${eventId}/messages`)
        .set('Authorization', `Bearer ${participant.token}`)
        .set('Idempotency-Key', randomUUID())
        .send({ text: 'Отправляю одновременно с отказом.' }),
      request(app.getHttpServer())
        .delete(`/v1/events/${eventId}/participation`)
        .set('Authorization', `Bearer ${participant.token}`),
    ]);
    expect(left.status).toBe(200);
    expect([201, 404]).toContain(sent.status);
    await request(app.getHttpServer())
      .post(`/v1/events/${eventId}/messages`)
      .set('Authorization', `Bearer ${participant.token}`)
      .set('Idempotency-Key', randomUUID())
      .send({ text: 'После отказа писать нельзя.' })
      .expect(404);

    await request(app.getHttpServer())
      .post(`/v1/events/${eventId}/cancel`)
      .set('Authorization', `Bearer ${organizer.token}`)
      .set('Idempotency-Key', randomUUID())
      .expect(200);
    await request(app.getHttpServer())
      .get(`/v1/events/${eventId}/messages`)
      .set('Authorization', `Bearer ${organizer.token}`)
      .expect(200)
      .expect(({ body }) => expect(body.readOnly).toBe(true));
    await request(app.getHttpServer())
      .post(`/v1/events/${eventId}/messages`)
      .set('Authorization', `Bearer ${organizer.token}`)
      .set('Idempotency-Key', randomUUID())
      .send({ text: 'После отмены писать нельзя.' })
      .expect(409)
      .expect(({ body }) => expect(body.code).toBe('CHAT_READ_ONLY'));
  });
});
