import { randomUUID } from 'node:crypto';
import { rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { NestFastifyApplication } from '@nestjs/platform-fastify';
import request from 'supertest';
import sharp from 'sharp';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createApp } from '../../src/bootstrap';
import { PrismaService } from '../../src/platform/database/prisma.service';

describe('event media', () => {
  let app: NestFastifyApplication;
  let prisma: PrismaService;
  let cityId: string;
  let categoryId: string;
  const testPrefix = `event-media-${Date.now()}`;
  const mediaRoot = join(tmpdir(), `vmeste-event-media-${randomUUID()}`);
  const originalMediaRoot = process.env.MEDIA_ROOT;

  beforeAll(async () => {
    process.env.MEDIA_ROOT = mediaRoot;
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
    try {
      if (prisma) {
        await prisma.event.deleteMany({
          where: { organizer: { email: { startsWith: testPrefix } } },
        });
        await prisma.user.deleteMany({
          where: { email: { startsWith: testPrefix } },
        });
      }
    } finally {
      if (app) await app.close();
      await rm(mediaRoot, { recursive: true, force: true });
      if (originalMediaRoot === undefined) delete process.env.MEDIA_ROOT;
      else process.env.MEDIA_ROOT = originalMediaRoot;
    }
  });

  const register = async (role: string) => {
    const response = await request(app.getHttpServer())
      .post('/v1/auth/register')
      .send({
        email: `${testPrefix}-${role}@example.com`,
        password: 'safe-test-password',
        birthDate: '1990-01-10',
      })
      .expect(201);
    const token = response.body.sessionToken as string;
    await request(app.getHttpServer())
      .patch('/v1/me')
      .set('Authorization', `Bearer ${token}`)
      .send({
        displayName: `Организатор ${role}`,
        cityId,
        categoryIds: [categoryId],
      })
      .expect(200);
    return { token, userId: response.body.user.id as string };
  };

  const createEvent = async (token: string) =>
    request(app.getHttpServer())
      .post('/v1/events')
      .set('Authorization', `Bearer ${token}`)
      .set('Idempotency-Key', randomUUID())
      .send({
        title: 'Событие с обложкой',
        categoryId,
        description: 'Активность для проверки локального media storage.',
        cityId,
        meetingPlace: 'У входа в городской парк',
        startsAt: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(),
        capacity: 8,
        participationMode: 'automatic',
      })
      .expect(201);

  it('validates, stores, serves and removes an event image', async () => {
    const organizer = await register('owner');
    const outsider = await register('outsider');
    const created = await createEvent(organizer.token);
    const eventId = created.body.id as string;
    const image = await sharp({
      create: {
        width: 32,
        height: 24,
        channels: 3,
        background: '#2d6cdf',
      },
    })
      .png()
      .toBuffer();
    const idempotencyKey = randomUUID();

    const uploaded = await request(app.getHttpServer())
      .put(`/v1/events/${eventId}/image`)
      .set('Authorization', `Bearer ${organizer.token}`)
      .set('Idempotency-Key', idempotencyKey)
      .attach('image', image, {
        filename: 'cover.png',
        contentType: 'image/png',
      })
      .expect(200);
    const imageUrl = uploaded.body.imageUrl as string;
    expect(imageUrl).toMatch(/^\/v1\/media\/[0-9a-f-]+\.webp$/);
    expect(uploaded.body).toMatchObject({
      version: 2,
      contentVersion: 2,
    });

    const replay = await request(app.getHttpServer())
      .put(`/v1/events/${eventId}/image`)
      .set('Authorization', `Bearer ${organizer.token}`)
      .set('Idempotency-Key', idempotencyKey)
      .attach('image', image, {
        filename: 'cover.png',
        contentType: 'image/png',
      })
      .expect(200);
    expect(replay.body).toEqual(uploaded.body);

    await request(app.getHttpServer())
      .get(imageUrl)
      .set('Authorization', `Bearer ${organizer.token}`)
      .expect('Content-Type', /image\/webp/)
      .expect('Cache-Control', /private/)
      .expect(200);
    await request(app.getHttpServer()).get(imageUrl).expect(401);

    await request(app.getHttpServer())
      .put(`/v1/events/${eventId}/image`)
      .set('Authorization', `Bearer ${outsider.token}`)
      .set('Idempotency-Key', randomUUID())
      .attach('image', image, {
        filename: 'cover.png',
        contentType: 'image/png',
      })
      .expect(403)
      .expect(({ body }) => expect(body.code).toBe('FORBIDDEN'));

    await request(app.getHttpServer())
      .put(`/v1/events/${eventId}/image`)
      .set('Authorization', `Bearer ${organizer.token}`)
      .set('Idempotency-Key', randomUUID())
      .attach('image', image, {
        filename: 'cover.jpg',
        contentType: 'image/jpeg',
      })
      .expect(400)
      .expect(({ body }) => expect(body.code).toBe('VALIDATION_ERROR'));

    await request(app.getHttpServer())
      .put(`/v1/events/${eventId}/image`)
      .set('Authorization', `Bearer ${organizer.token}`)
      .set('Idempotency-Key', randomUUID())
      .attach('image', Buffer.alloc(5 * 1024 * 1024 + 1), {
        filename: 'too-large.png',
        contentType: 'image/png',
      })
      .expect(400)
      .expect(({ body }) => expect(body.code).toBe('VALIDATION_ERROR'));

    await request(app.getHttpServer())
      .delete(`/v1/events/${eventId}/image`)
      .set('Authorization', `Bearer ${organizer.token}`)
      .expect(204);
    await request(app.getHttpServer())
      .get(imageUrl)
      .set('Authorization', `Bearer ${organizer.token}`)
      .expect(404);
    await request(app.getHttpServer())
      .delete(`/v1/events/${eventId}/image`)
      .set('Authorization', `Bearer ${organizer.token}`)
      .expect(204);
  });
});
